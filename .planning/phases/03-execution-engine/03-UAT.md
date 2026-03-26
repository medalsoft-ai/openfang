---
phase: 03
phase_name: execution-engine
uat_date: 2026-03-26
session_id: ph03-uat-001
status: in-progress
---

# Phase 03: Execution Engine — User Acceptance Testing

## Phase Scope

Phase 03 implements the complete Hand execution system:
- **Wave 1 (Store)**: SQLite persistence for execution state
- **Wave 2 (Executor)**: Variable resolver + state machine
- **Wave 3 (API)**: 6 REST endpoints for execution control
- **Wave 4 (WebSocket)**: Real-time status broadcasts
- **Wave 5 (Integration)**: Agent loop integration with prompt injection

---

## Test 1: Execution Store — Database Persistence

**What to test:** Hand execution state survives daemon restart.

**Setup:**
1. Start the OpenFang daemon
2. Create a Hand with steps
3. Start execution (via API or trigger)
4. Note the execution_id from the response

**Test Steps:**
```bash
# 1. Get or create a hand with steps
curl -s http://127.0.0.1:4200/api/hands | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'])"

# 2. List executions (should show persisted state)
curl -s http://127.0.0.1:4200/api/hands/{hand_id}/executions

# 3. Stop and restart the daemon
taskkill //PID <pid> //F  # Windows, or kill on Unix
sleep 3
cargo run --release -p openfang-cli -- start &
sleep 6

# 4. Verify executions still exist after restart
curl -s http://127.0.0.1:4200/api/hands/{hand_id}/executions
```

**Expected Result:** Execution state is persisted in SQLite and survives daemon restart.

**User Response:** _______________

---

## Test 2: Variable Resolver — Step Output Substitution

**What to test:** `{{step_id.output}}` syntax resolves previous step outputs.

**Setup:**
1. Create a Hand with at least 2 steps
2. Step 1 should output some data
3. Step 2 should reference Step 1's output using variable syntax

**Test Steps:**
```bash
# Create Hand with steps that pass data:
# Step 1: "Execute Tool" calling a function that returns {"name": "Alice"}
# Step 2: "Send Message" with content: "Hello {{step1.name}}!"

# Start execution and check if variables resolve
curl -s -X POST http://127.0.0.1:4200/api/hands/{hand_id}/steps/step2/execute \
  -H "Content-Type: application/json"

# Check step output shows resolved variable
curl -s http://127.0.0.1:4200/api/hands/{hand_id}/steps/step2/status
```

**Expected Result:** Step 2's input/output shows "Hello Alice!" (not the raw `{{step1.name}}` syntax).

**User Response:** _______________

---

## Test 3: API Endpoints — Execution Control

**What to test:** All 6 execution API endpoints work correctly.

**Test Steps:**
```bash
# 1. Get step status
curl -s http://127.0.0.1:4200/api/hands/{hand_id}/steps/{step_id}/status

# 2. Execute a specific step
curl -s -X POST http://127.0.0.1:4200/api/hands/{hand_id}/steps/{step_id}/execute

# 3. List all executions for a hand
curl -s http://127.0.0.1:4200/api/hands/{hand_id}/executions

# 4. Get detailed execution info
curl -s http://127.0.0.1:4200/api/hands/{hand_id}/executions/{exec_id}

# 5. Submit input for waiting step
curl -s -X POST http://127.0.0.1:4200/api/hands/{hand_id}/executions/{exec_id}/input \
  -H "Content-Type: application/json" \
  -d '{"step_id": "step-3", "input": {"response": "user input here"}}'

# 6. Retry failed execution
curl -s -X POST http://127.0.0.1:4200/api/hands/{hand_id}/executions/{exec_id}/retry
```

**Expected Result:** All endpoints return valid JSON with expected fields (execution_id, status, timestamps).

**User Response:** _______________

---

## Test 4: WebSocket — Real-Time Status Updates

**What to test:** UI receives real-time step status changes via WebSocket.

**Setup:**
1. Open browser to OpenFang dashboard
2. Open browser DevTools → Network → WS tab
3. Navigate to a Hand with active execution
4. Watch WebSocket messages

**Test Steps:**
1. Start a Hand execution
2. Observe the WebSocket messages in DevTools
3. Each step status change should broadcast a message

**Expected WebSocket Message:**
```json
{
  "type": "step_status_change",
  "execution_id": "exec-uuid",
  "hand_id": "hand-1",
  "step_id": "step-1",
  "status": "running",
  "timestamp": "2026-03-25T10:00:00Z"
}
```

**Visual Indicators:**
- Pending: Gray dot
- Running: Blue with pulse animation
- Completed: Green dot
- Failed: Red dot
- Waiting: Yellow with bounce animation

**User Response:** _______________

---

## Test 5: Agent Loop — Hand Execution Prompt Injection

**What to test:** Agent sees Hand execution context in system prompt.

**Setup:**
1. Create a Hand with steps (at least 2 steps)
2. Activate the Hand for an Agent
3. Send a message to trigger the Agent

**Test Steps:**
1. Open browser DevTools → Network tab
2. Send message to Agent with active Hand
3. Check the system prompt in the request (or server logs if available)

**Expected in System Prompt (Section 10.5):**
```
[Hand Execution Context]

You are executing a Hand with the following steps:

[COMPLETED] Step 1: Get User Name
[CURRENT]   Step 2: Greet User
[PENDING]   Step 3: Process Request

To report step completion, use the hand_report_step tool:
- For completed steps: {"step_id": "...", "status": "completed", "output": {...}}
- For failed steps: {"step_id": "...", "status": "failed", "error": "..."}
```

**Alternative Verification:**
- Agent should naturally follow the Hand steps in sequence
- Agent should use `hand_report_step` tool after completing each step

**User Response:** _______________

---

## Test 6: End-to-End — Hand Execution Flow

**What to test:** Complete Hand execution from start to finish.

**Setup:**
1. Create a Hand with 3+ steps:
   - Step 1: Execute Tool (simple calculation)
   - Step 2: Send Message (using Step 1 output)
   - Step 3: Wait For Input

**Test Steps:**
1. Activate the Hand for an Agent
2. Send a message to start execution
3. Watch execution progress:
   - Step 1 should complete
   - Step 2 should run with resolved variables
   - Step 3 should show "waiting" status
4. Submit input via API or UI
5. Verify execution completes

**Verification Commands:**
```bash
# Check execution status throughout
curl -s http://127.0.0.1:4200/api/hands/{hand_id}/executions/{exec_id}

# Submit input when waiting
curl -s -X POST http://127.0.0.1:4200/api/hands/{hand_id}/executions/{exec_id}/input \
  -d '{"step_id": "step-3", "input": {"response": "test input"}}'
```

**Expected Result:** Execution flows through all steps, variables resolve, status updates in real-time.

**User Response:** _______________

---

## Summary

| Test | Description | Status | Notes |
|------|-------------|--------|-------|
| 1 | Execution Store Persistence | ⬜ | |
| 2 | Variable Resolver | ⬜ | |
| 3 | API Endpoints | ⬜ | |
| 4 | WebSocket Real-Time Updates | ⬜ | |
| 5 | Agent Loop Integration | ⬜ | |
| 6 | End-to-End Flow | ⬜ | |

---

*UAT Session: ph03-uat-001 | Started: 2026-03-26*
