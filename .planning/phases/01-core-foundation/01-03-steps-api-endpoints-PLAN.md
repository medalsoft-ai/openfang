---
phase: 01
core-foundation: true
name: Implement Steps API Endpoints
description: Add GET and PUT endpoints for Hand steps with validation
wave: 2
task_count: 1
autonomous: true
gap_closure: false
requirements:
  - API-01
  - API-02
---

# Plan 01-03: Implement Steps API Endpoints

## Objective
Add REST API endpoints to get and update Hand steps with proper validation.

## Success Criteria
- GET /api/hands/{id}/steps returns step data
- PUT /api/hands/{id}/steps updates steps with validation
- Step graph validation (no cycles, all reachable)
- Changes persist to TOML files

## Files to Modify
- `crates/openfang-api/src/types.rs` (modify - add request/response types)
- `crates/openfang-api/src/routes.rs` (modify - add handlers)
- `crates/openfang-api/src/server.rs` (modify - register routes)

## Task 1: Add API Types

Add to `crates/openfang-api/src/types.rs`:

```rust
use openfang_hands::steps::HandStep;
use serde::{Deserialize, Serialize};

/// Response for GET /api/hands/{id}/steps
#[derive(Debug, Serialize)]
pub struct GetHandStepsResponse {
    pub steps: Vec<HandStep>,
}

/// Request for PUT /api/hands/{id}/steps
#[derive(Debug, Deserialize)]
pub struct UpdateHandStepsRequest {
    pub steps: Vec<HandStep>,
}

/// Error response for step validation failures
#[derive(Debug, Serialize)]
pub struct StepValidationError {
    pub field: String,
    pub message: String,
}
```

## Task 2: Implement Route Handlers

Add to `crates/openfang-api/src/routes.rs`:

```rust
use crate::types::{GetHandStepsResponse, UpdateHandStepsRequest};
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use std::collections::HashSet;

/// GET /api/hands/{id}/steps - Get steps for a Hand
pub async fn get_hand_steps(
    State(state): State<crate::AppState>,
    Path(id): Path<String>,
) -> Result<Json<GetHandStepsResponse>, StatusCode> {
    let registry = state.hands_registry.read().await;

    let hand = registry
        .get(&id)
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(GetHandStepsResponse {
        steps: hand.definition.steps.clone(),
    }))
}

/// PUT /api/hands/{id}/steps - Update steps for a Hand
pub async fn update_hand_steps(
    State(state): State<crate::AppState>,
    Path(id): Path<String>,
    Json(request): Json<UpdateHandStepsRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    // Validate step graph
    if let Err(errors) = validate_step_graph(&request.steps) {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Validation failed: {}", errors.join(", ")),
        ));
    }

    let mut registry = state.hands_registry.write().await;

    let mut hand = registry
        .get(&id)
        .map_err(|_| (StatusCode::NOT_FOUND, "Hand not found".to_string()))?;

    // Update steps
    hand.definition.steps = request.steps;

    // Save to file
    registry
        .update(hand)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

/// Validate the step graph for cycles and connectivity
fn validate_step_graph(steps: &[HandStep]) -> Result<(), Vec<String>> {
    let mut errors = Vec::new();

    if steps.is_empty() {
        return Ok(());
    }

    // Build step ID set for quick lookup
    let step_ids: HashSet<&str> = steps.iter().map(|s| s.id.as_str()).collect();

    // Check all next_steps references exist
    for step in steps {
        for next_id in &step.next_steps {
            if !step_ids.contains(next_id.as_str()) {
                errors.push(format!(
                    "Step '{}' references non-existent step '{}'",
                    step.id, next_id
                ));
            }
        }
    }

    // Check for cycles using DFS
    if let Err(cycle) = detect_cycle(steps) {
        errors.push(format!("Cycle detected in step graph: {}", cycle));
    }

    // Check for unreachable steps (optional warning)
    let unreachable = find_unreachable_steps(steps);
    if !unreachable.is_empty() {
        errors.push(format!(
            "Unreachable steps detected: {}",
            unreachable.join(", ")
        ));
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

/// Detect cycles in the step graph using DFS
fn detect_cycle(steps: &[HandStep]) -> Result<(), String> {
    let step_map: std::collections::HashMap<&str, &HandStep> =
        steps.iter().map(|s| (s.id.as_str(), s)).collect();

    let mut visiting = HashSet::new();
    let mut visited = HashSet::new();

    fn dfs<'a>(
        step_id: &'a str,
        step_map: &std::collections::HashMap<&'a str, &'a HandStep>,
        visiting: &mut HashSet<&'a str>,
        visited: &mut HashSet<&'a str>,
        path: &mut Vec<&'a str>,
    ) -> Result<(), String> {
        if visited.contains(step_id) {
            return Ok(());
        }
        if visiting.contains(step_id) {
            let cycle_start = path.iter().position(|&id| id == step_id).unwrap();
            let cycle: Vec<_> = path[cycle_start..].iter().chain(&[step_id]).copied().collect();
            return Err(cycle.join(" -> "));
        }

        visiting.insert(step_id);
        path.push(step_id);

        if let Some(step) = step_map.get(step_id) {
            for next_id in &step.next_steps {
                dfs(next_id.as_str(), step_map, visiting, visited, path)?;
            }
        }

        path.pop();
        visiting.remove(step_id);
        visited.insert(step_id);
        Ok(())
    }

    // Start DFS from all steps to catch all cycles
    for step in steps {
        if !visited.contains(step.id.as_str()) {
            let mut path = Vec::new();
            dfs(step.id.as_str(), &step_map, &mut visiting, &mut visited, &mut path)?;
        }
    }

    Ok(())
}

/// Find steps that are unreachable from any entry point
fn find_unreachable_steps(steps: &[HandStep]) -> Vec<String> {
    if steps.is_empty() {
        return Vec::new();
    }

    let step_map: std::collections::HashMap<&str, &HandStep> =
        steps.iter().map(|s| (s.id.as_str(), s)).collect();

    // Find entry points (steps not targeted by any other step)
    let all_targets: HashSet<&str> = steps
        .iter()
        .flat_map(|s| s.next_steps.iter().map(|id| id.as_str()))
        .collect();

    let entry_points: Vec<&str> = steps
        .iter()
        .map(|s| s.id.as_str())
        .filter(|id| !all_targets.contains(*id))
        .collect();

    // If no clear entry points, use the first step as entry
    let entry_points = if entry_points.is_empty() && !steps.is_empty() {
        vec![steps[0].id.as_str()]
    } else {
        entry_points
    };

    // BFS to find all reachable steps
    let mut reachable = HashSet::new();
    let mut queue: Vec<&str> = entry_points;

    while let Some(current) = queue.pop() {
        if reachable.insert(current) {
            if let Some(step) = step_map.get(current) {
                for next_id in &step.next_steps {
                    queue.push(next_id.as_str());
                }
            }
        }
    }

    // Return unreachable step IDs
    steps
        .iter()
        .map(|s| s.id.clone())
        .filter(|id| !reachable.contains(id.as_str()))
        .collect()
}
```

## Task 3: Register Routes

Modify `crates/openfang-api/src/server.rs`:

Find the router setup and add:

```rust
.route("/api/hands/:id/steps", get(routes::get_hand_steps))
.route("/api/hands/:id/steps", put(routes::update_hand_steps))
```

Make sure the order allows the `:id` parameter to work correctly.

## Verification

```bash
# Build check
cargo build --package openfang-api

# Live integration test (after building release binary):
# 1. Start daemon
# 2. Test GET: curl http://127.0.0.1:4200/api/hands/{id}/steps
# 3. Test PUT: curl -X PUT -H "Content-Type: application/json" \
#    -d '{"steps": [...]}' http://127.0.0.1:4200/api/hands/{id}/steps
```

## Dependencies
- 01-01 (Step types must be defined)

## Notes
- Validation errors should be descriptive for debugging
- Cycle detection prevents infinite loops in execution
- Unreachable steps warning helps users catch logic errors
