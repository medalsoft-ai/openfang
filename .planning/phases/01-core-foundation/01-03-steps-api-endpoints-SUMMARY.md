---
phase: 01-core-foundation
plan: 01-03-steps-api-endpoints
name: Implement Steps API Endpoints
status: complete
completed_at: 2026-03-25
task_count: 3
commits:
  - f916f57
  - 9ea01aa
  - 722c54c
---

# Phase 01 Plan 03: Implement Steps API Endpoints Summary

One-liner: Added REST API endpoints to get and update Hand steps with comprehensive validation including cycle detection and reachability checking.

## What Was Built

### API Types (crates/openfang-api/src/types.rs)
- `GetHandStepsResponse` - Response structure for GET /api/hands/{id}/steps
- `UpdateHandStepsRequest` - Request structure for PUT /api/hands/{id}/steps
- `StepValidationError` - Error details for validation failures
- Imported `openfang_hands::steps::HandStep` for type reuse

### Route Handlers (crates/openfang-api/src/routes.rs)
- `get_hand_steps` - GET handler that returns steps for a Hand
- `update_hand_steps` - PUT handler that updates steps with validation
- `validate_step_graph` - Comprehensive step graph validation
- `detect_cycle` - DFS-based cycle detection to prevent infinite loops
- `find_unreachable_steps` - BFS-based reachability checking

### Route Registration (crates/openfang-api/src/server.rs)
- Registered GET /api/hands/{hand_id}/steps
- Registered PUT /api/hands/{hand_id}/steps

## Validation Features

The step graph validation includes:

1. **Reference Validation** - Ensures all `next_steps` references point to existing steps
2. **Cycle Detection** - Uses DFS to detect and report cycles (e.g., A -> B -> A)
3. **Reachability Check** - Warns about steps that cannot be reached from any entry point

## Files Modified

| File | Changes |
|------|---------|
| `crates/openfang-api/src/types.rs` | +23 lines - Added API types for steps |
| `crates/openfang-api/src/routes.rs` | +260 lines - Added route handlers and validation |
| `crates/openfang-api/src/server.rs` | +4 lines - Registered new routes |

## API Endpoints

### GET /api/hands/{id}/steps
Returns the steps array for a Hand.

**Response:**
```json
{
  "steps": [
    {
      "id": "step1",
      "name": "Wait for User",
      "step_type": { "type": "wait-for-input", "prompt": "Enter query" },
      "next_steps": ["step2"]
    }
  ]
}
```

### PUT /api/hands/{id}/steps
Updates the steps for a Hand with validation.

**Request:**
```json
{
  "steps": [...]
}
```

**Validation Errors:**
- Returns 400 Bad Request with details if validation fails
- Reports missing references, cycles, and unreachable steps

**Success:**
- Returns 204 No Content on success
- Persists changes to TOML file in ~/.openfang/hands/{id}/HAND.toml

## Build Verification

- [x] `cargo build --workspace --lib` - Pass
- [x] `cargo test --workspace` - 1744+ tests pass
- [x] `cargo clippy --package openfang-api --package openfang-hands` - Pass (with pre-existing warning allowance)

## Deviations from Plan

None - plan executed exactly as written.

## Design Decisions

1. **TOML Persistence**: Steps are serialized to TOML and written to disk on update, ensuring durability
2. **In-Memory Update**: Uses `upsert_from_content` to refresh the in-memory definition after file write
3. **Validation First**: All validation happens before any persistence, ensuring atomic updates
4. **Error Detail**: Validation errors include specific details to help users fix issues

## Next Steps

This plan completes Wave 2 of Phase 01. The next plan (01-04) will add Agent tools for hands to create and modify steps programmatically.

## Self-Check: PASSED

- [x] All files exist and compile
- [x] All commits recorded
- [x] Tests pass
- [x] No new clippy warnings introduced
