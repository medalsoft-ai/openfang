---
phase: 03-execution-engine
plan: 00
type: meta
wave: 0
depends_on: []
files_modified: []
autonomous: true
requirements:
  - HAND-STEP-07
  - API-04
  - API-05
  - UI-04
must_haves:
  truths:
    - 5 wave plans exist for Execution Engine phase
    - Plans cover: SQLite storage, state machine, API, WebSocket, integration
    - Each plan has 2-3 tasks with concrete acceptance criteria
  artifacts:
    - path: ".planning/phases/03-execution-engine/03-01-store-PLAN.md"
      provides: "Wave 1: SQLite schema and ExecutionStore"
    - path: ".planning/phases/03-execution-engine/03-02-executor-PLAN.md"
      provides: "Wave 2: Variable resolver and HandExecutor"
    - path: ".planning/phases/03-execution-engine/03-03-api-PLAN.md"
      provides: "Wave 3: API endpoints"
    - path: ".planning/phases/03-execution-engine/03-04-websocket-PLAN.md"
      provides: "Wave 4: WebSocket and UI status"
    - path: ".planning/phases/03-execution-engine/03-05-integration-PLAN.md"
      provides: "Wave 5: Hand execution prompt and integration"
---

# Phase 3: Execution Engine — Master Plan

## Goal
步骤可以被 LLM 执行，并跟踪执行状态

## Success Criteria
1. Hand 激活时，步骤被注入到 Agent system prompt 中
2. Agent 理解并按步骤顺序执行（通过 prompt engineering）
3. 步骤执行状态被跟踪：pending, running, completed, failed, waiting
4. GET /api/hands/{id}/steps/{step_id}/status 返回当前状态
5. POST /api/hands/{id}/steps/{step_id}/execute 手动触发步骤执行
6. UI 实时显示步骤执行状态（颜色/动画指示器）
7. 步骤输出被捕获，可供后续步骤使用（变量替换）
8. 支持 wait-for-input 步骤暂停执行等待用户输入

## Wave Structure

| Wave | Plan | Focus | Files | Key Deliverable | Requirements |
|------|------|-------|-------|-----------------|--------------|
| 1 | 03-01 | SQLite + ExecutionStore | migration.rs, execution_store.rs | Migration v9 + CRUD operations | HAND-STEP-07 |
| 2 | 03-02 | Variable Resolver + State Machine | step_variable_resolver.rs, hand_executor.rs | {{step_id.output}} resolution, state transitions | HAND-STEP-07, HAND-STEP-08 |
| 3 | 03-03 | API Endpoints | routes.rs, server.rs | Status/execute/retry endpoints | API-04, API-05 |
| 4 | 03-04 | WebSocket + UI | ws.rs, StepNode.tsx | Real-time status broadcast + visual indicators | UI-04 |
| 5 | 03-05 | Integration | hand_execution_prompt.rs, agent_loop.rs | Prompt injection + hand_report_step tool | HAND-STEP-07 |

## Dependency Graph

```
Wave 1 (SQLite + Store)
    |
    v
Wave 2 (Resolver + Executor)
    |
    v
Wave 3 (API Endpoints)
    |
    v
Wave 4 (WebSocket + UI)
    |
    v
Wave 5 (Integration + Live Test)
```

## Plans

### Wave 1: SQLite Schema and ExecutionStore
**File**: `03-01-store-PLAN.md`

**Tasks**:
1. Add Migration v9 for hand_executions and step_executions tables
2. Create ExecutionStore module with async CRUD operations

**Acceptance**:
- SCHEMA_VERSION = 9
- Tables created with proper indexes
- ExecutionStore can persist and retrieve execution records

---

### Wave 2: Variable Resolver and State Machine
**File**: `03-02-executor-PLAN.md`

**Tasks**:
1. Create Variable Resolver Module (regex-based {{step_id.output}} interpolation)
2. Create Hand Executor State Machine (pending→running→completed/failed/waiting)

**Acceptance**:
- Variable resolver handles nested JSON and multiple variables
- State machine prevents invalid transitions
- HandExecutor manages execution lifecycle

---

### Wave 3: API Endpoints
**File**: `03-03-api-PLAN.md`

**Tasks**:
1. Add Execution Types and API Endpoints (status, execute, list, retry)
2. Register Routes and Wire Kernel

**Acceptance**:
- GET /api/hands/{id}/steps/{step_id}/status returns 200
- POST /api/hands/{id}/steps/{step_id}/execute returns 202
- POST /api/hands/{id}/executions/{exec_id}/retry works

---

### Wave 4: WebSocket and UI Status
**File**: `03-04-websocket-PLAN.md`

**Tasks**:
1. Add Step Status Broadcast to WebSocket
2. Add Execution Status to StepNode Component
3. Wire WebSocket to Hands Page

**Acceptance**:
- WebSocket broadcasts step_status_change messages
- StepNode shows color-coded status indicators
- Running steps pulse, waiting steps bounce
- UI updates in real-time

---

### Wave 5: Integration and Live Test
**File**: `03-05-integration-PLAN.md`

**Tasks**:
1. Create Hand Execution Prompt Template
2. Create hand_report_step Tool
3. Integrate with Agent Loop
4. Live Integration Test (checkpoint)

**Acceptance**:
- Hand steps injected into Agent prompt
- Agent uses hand_report_step tool
- wait-for-input steps pause execution
- Full end-to-end test passes

## Execution Order

Execute waves sequentially:
```bash
# Wave 1
/gsd:execute-phase 03 --plan 03-01

# Wave 2
/gsd:execute-phase 03 --plan 03-02

# Wave 3
/gsd:execute-phase 03 --plan 03-03

# Wave 4
/gsd:execute-phase 03 --plan 03-04

# Wave 5
/gsd:execute-phase 03 --plan 03-05
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LLM doesn't follow step sequence | Clear prompt instructions + tool validation |
| WebSocket broadcast blocks | Bounded broadcast channel (100 messages) |
| SQLite write contention | WAL mode + spawn_blocking |
| Variable resolution edge cases | One-level resolution, missing vars preserved |
| Long wait-for-input | SQLite persistence, resume on daemon restart |

## References

- **Context**: `.planning/phases/03-execution-engine/03-CONTEXT.md`
- **Research**: `.planning/phases/03-execution-engine/03-RESEARCH.md`
- **Validation**: `.planning/phases/03-execution-engine/03-VALIDATION.md`
- **State**: `.planning/STATE.md`
- **Roadmap**: `.planning/ROADMAP.md`
