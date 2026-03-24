# Requirements — Milestone v0.1 Dynamic Hand with steps

## Active Requirements

### Hand 步骤系统 (HAND-STEP)

- [ ] **HAND-STEP-01**: 用户可以查看 Hand 的步骤流程图（React Flow 渲染）
  - Acceptance: Hands 详情页显示步骤节点和连接线
  - Steps: sequential, conditional, loop, wait-for-user

- [ ] **HAND-STEP-02**: 用户可以手动编辑 Hand 的步骤
  - Acceptance: 添加、删除、修改步骤；配置步骤参数；设置步骤间流转

- [ ] **HAND-STEP-03**: Agent 可以动态创建 Hand
  - Acceptance: Agent 通过 tool call 创建新 Hand；返回 Hand ID；新 Hand 出现在列表中

- [ ] **HAND-STEP-04**: Agent 可以修改 Hand 的步骤
  - Acceptance: Agent 通过 tool call 添加/删除/修改步骤；变更持久化到存储

- [ ] **HAND-STEP-05**: 用户可以将 Agent 执行流程总结为 Hand
  - Acceptance: 从 Agent session 中提取执行历史；生成步骤序列；保存为新 Hand

- [ ] **HAND-STEP-06**: 步骤支持多种类型
  - Types: execute-tool, send-message, wait-for-input, condition, loop, sub-hand

- [ ] **HAND-STEP-07**: 步骤执行状态跟踪
  - States: pending, running, completed, failed, waiting
  - API 提供查询步骤状态端点

- [ ] **HAND-STEP-08**: 步骤间数据传递
  - 支持步骤输出作为后续步骤输入
  - 变量插值机制

### API 扩展 (API)

- [x] **API-01**: GET /api/hands/{id}/steps — 获取 Hand 步骤
- [x] **API-02**: PUT /api/hands/{id}/steps — 更新 Hand 步骤
- [ ] **API-03**: POST /api/hands/create-from-session — 从 session 创建 Hand
- [ ] **API-04**: GET /api/hands/{id}/steps/{step_id}/status — 获取步骤状态
- [ ] **API-05**: POST /api/hands/{id}/steps/{step_id}/execute — 手动触发步骤

### UI 组件 (UI)

- [ ] **UI-01**: React Flow 集成 — 步骤流程图渲染
- [ ] **UI-02**: 步骤编辑器 — 节点拖拽、属性面板、连线编辑
- [ ] **UI-03**: 步骤类型选择器 — 创建步骤时选择类型
- [ ] **UI-04**: 执行状态指示器 — 实时显示步骤执行状态

## Future Requirements

- **HAND-STEP-F01**: Hand 版本控制 — 步骤变更历史
- **HAND-STEP-F02**: Hand 模板市场 — 分享和导入 Hand 模板
- **HAND-STEP-F03**: 步骤并行执行 — 支持并行节点
- **HAND-STEP-F04**: 条件表达式编辑器 — 可视化配置分支条件

## Out of Scope

- **HAND-STEP-O01**: 复杂工作流编排（BPMN 级别）— 当前仅支持简单线性+条件分支
- **HAND-STEP-O02**: 分布式步骤执行 — 所有步骤在同一 Agent 上下文执行
- **HAND-STEP-O03**: 步骤的热重载 — 重启 Hand 才能应用步骤变更

## Traceability

| REQ-ID | Phase | Description | Status |
|--------|-------|-------------|--------|
| HAND-STEP-01 | 1 | View Hand steps (React Flow) | Pending |
| HAND-STEP-02 | 2 | Edit Hand steps manually | Pending |
| HAND-STEP-03 | 3 | Agent creates Hand dynamically | Pending |
| HAND-STEP-04 | 3 | Agent modifies Hand steps | Pending |
| HAND-STEP-05 | 4 | Session to Hand conversion | Pending |
| HAND-STEP-06 | 1 | Step types definition | Pending |
| HAND-STEP-07 | 4 | Step execution status tracking | Pending |
| HAND-STEP-08 | 2 | Step data passing | Pending |
| API-01 | 1 | GET /api/hands/{id}/steps | Complete |
| API-02 | 1 | PUT /api/hands/{id}/steps | Complete |
| API-03 | 4 | POST /api/hands/create-from-session | Pending |
| API-04 | 4 | GET /api/hands/{id}/steps/{step_id}/status | Pending |
| API-05 | 4 | POST /api/hands/{id}/steps/{step_id}/execute | Pending |
| UI-01 | 1 | React Flow integration | Pending |
| UI-02 | 2 | Step editor component | Pending |
| UI-03 | 2 | Step type selector | Pending |
| UI-04 | 4 | Execution status indicator | Pending |

---
*Last updated: 2026-03-25*
