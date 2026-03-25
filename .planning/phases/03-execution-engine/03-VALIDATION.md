---
phase: 3
slug: execution-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | cargo test (built-in) |
| **Config file** | none — existing setup |
| **Quick run command** | `cargo test -p openfang-runtime hand_executor` |
| **Full suite command** | `cargo test --workspace` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo test -p <modified_crate>`
- **After every plan wave:** Run `cargo test --workspace`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | HAND-STEP-07 | integration | `cargo test execution_store` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | HAND-STEP-07 | unit | `cargo test step_execution` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | HAND-STEP-07 | unit | `cargo test variable_resolver` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 2 | HAND-STEP-08 | integration | `cargo test variable_interpolation` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 3 | API-04 | integration | `cargo test step_status_api` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 3 | API-05 | integration | `cargo test execution_api` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 4 | UI-04 | manual | Live WebSocket test | N/A | ⬜ pending |
| 3-05-01 | 05 | 5 | HAND-STEP-07 | e2e | `cargo test hand_execution_e2e` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `crates/openfang-runtime/src/hand_executor.rs` — module stub
- [ ] `crates/openfang-runtime/src/execution_store.rs` — SQLite operations
- [ ] `crates/openfang-runtime/src/step_variable_resolver.rs` — variable resolution
- [ ] `crates/openfang-runtime/src/hand_execution_prompt.rs` — prompt template
- [ ] Migration v9 for `hand_executions` and `step_executions` tables

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WebSocket real-time updates | UI-04 | Requires browser connection | 1. Start server 2. Open Hands page 3. Activate Hand 4. Verify status changes appear in real-time |
| wait-for-input pause/resume | HAND-STEP-07 | Requires user interaction | 1. Create Hand with wait-for-input step 2. Activate 3. Verify pause 4. Submit input 5. Verify resume |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
