# State — Milestone v0.1 Dynamic Hand with steps

## Current Position

Phase: 1 — Core Foundation
Plan: 01-03 — Steps API Endpoints (next)
Status: Wave 1 Complete — Data models implemented
Last activity: 2026-03-25 — Completed Wave 1 (01-01, 01-02)

## Active Threads

- Phase 1 Execution — Wave 1 complete, ready for Wave 2

## Execution Plan

| Wave | Plans | Description | Status |
|------|-------|-------------|--------|
| 1 | 01-01, 01-02 | Data models (Rust + TypeScript) | **Complete** |
| 2 | 01-03 | API endpoints | Ready |
| 3 | 01-04 | Agent tools | Ready |
| 4 | 01-05 | React Flow UI | Ready |
| 5 | 01-06 | Integration testing | Ready |

## Completed Work (Wave 1)

### Plan 01-01: Define Step Types in openfang-hands
- **Commit:** 4659c06
- **Files:** `crates/openfang-hands/src/steps.rs` (new), `crates/openfang-hands/src/lib.rs`
- **Deliverables:**
  - HandStep struct with id, name, step_type, next_steps
  - 6 StepType variants (execute-tool, send-message, wait-for-input, condition, loop, sub-hand)
  - TOML serialization with [[steps]] array syntax
  - 15 new unit tests (all passing)

### Plan 01-02: Add TypeScript Types for Steps
- **Commit:** f94a00a
- **Files:** `crates/openfang-webui/src/api/types.ts`, `crates/openfang-webui/src/api/client.ts`
- **Deliverables:**
  - StepTypeVariant union type
  - StepConfig discriminated union
  - HandStep interface with camelCase fields
  - React Flow node/edge types for future visualization
  - getHandSteps() and updateHandSteps() API methods

## Accumulated Context

### Previous Milestone (Chat Redesign)
- Completed: Chat 页面 Claymorphism 重设计
- Key files: crates/openfang-webui/src/pages/Chat.tsx
- Patterns: claymorphism, spring-animations, reduced-motion

### Technical Decisions Made (Phase 1 Plan)

| Decision | Choice | Location |
|----------|--------|----------|
| Step storage format | TOML extension with `[[steps]]` array | 01-01-PLAN.md |
| Step type schema | Tagged union with `type` discriminator | 01-01-PLAN.md |
| Agent tools | `hand_create` + `hand_update_steps` | 01-04-PLAN.md |
| React Flow transform | Frontend-side nodes/edges generation | 01-05-PLAN.md |

### Pending Decisions (Future Phases)
1. Agent Chat Editor prompt design — Phase 2
2. Visual vs Chat editor state sync — Phase 2
3. Step execution engine approach (prompt-based vs engine-based) — Phase 3

### Phase Summary (v3 — Dual Editor)

| Phase | Name | Key Deliverable | Requirements | Status |
|-------|------|-----------------|--------------|--------|
| 1 | Core Foundation | 完整的 Hand+Step 底层系统 | 10 | Wave 1 Complete |
| 2 | Dual Editor | 可视化编辑器 + Agent 对话编辑器 | 8 | Not Started |
| 3 | Execution Engine | 步骤执行与状态跟踪 | 4 | Not Started |
| 4 | Session to Hand | 从 Session 生成 Hand | 2 | Not Started |

## Artifacts

- `.planning/phases/01-core-foundation/01-01-define-step-types-PLAN.md` — Wave 1: Rust data models
- `.planning/phases/01-core-foundation/01-01-define-step-types-SUMMARY.md` — Wave 1 complete
- `.planning/phases/01-core-foundation/01-02-typescript-types-PLAN.md` — Wave 1: TypeScript types
- `.planning/phases/01-core-foundation/01-02-typescript-types-SUMMARY.md` — Wave 1 complete
- `.planning/phases/01-core-foundation/01-03-steps-api-endpoints-PLAN.md` — Wave 2: API endpoints
- `.planning/phases/01-core-foundation/01-04-agent-tools-PLAN.md` — Wave 3: Agent tools
- `.planning/phases/01-core-foundation/01-05-react-flow-viz-PLAN.md` — Wave 4: React Flow UI
- `.planning/phases/01-core-foundation/01-06-integration-testing-PLAN.md` — Wave 5: Integration tests
- `.planning/phases/01-core-foundation/CHANGELOG.md` — Implementation tracking
- `.planning/phases/01-core-foundation/PLAN.md.archive` — Original monolithic plan (archived)

---
*Last updated: 2026-03-25*
