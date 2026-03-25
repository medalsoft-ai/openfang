# Phase 3 Context — Execution Engine

## Phase Information

| Field | Value |
|-------|-------|
| Phase | 3 |
| Name | Execution Engine |
| Goal | 步骤可以被 LLM 执行，并跟踪执行状态 |

## Decisions

### 1. 执行方式: Prompt-based

- **Decision:** 将 Hand 步骤图注入 Agent system prompt，LLM 自主决定执行流程
- **Rationale:**
  - 复用现有 agent_loop.rs 架构，实现简单
  - 适合相对线性的 Hand 流程
  - LLM 可根据上下文灵活调整执行策略
- **Trade-offs:**
  - 可控性低于 Engine-based
  - 依赖 LLM 遵守步骤顺序
  - 调试需要依赖日志分析

### 2. 状态持久化: SQLite

- **Decision:** 步骤执行状态持久化到 SQLite
- **Schema Design:**
  ```sql
  CREATE TABLE hand_executions (
      id TEXT PRIMARY KEY,
      hand_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      status TEXT NOT NULL, -- pending, running, completed, failed
      current_step_id TEXT,
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE step_executions (
      id TEXT PRIMARY KEY,
      execution_id TEXT NOT NULL,
      step_id TEXT NOT NULL,
      status TEXT NOT NULL, -- pending, running, completed, failed, waiting
      input TEXT, -- JSON
      output TEXT, -- JSON
      error TEXT,
      started_at DATETIME,
      completed_at DATETIME,
      FOREIGN KEY (execution_id) REFERENCES hand_executions(id)
  );
  ```
- **Rationale:**
  - 支持 `wait-for-input` 长时间等待（用户可能几小时后才回复）
  - 支持历史查询和跨会话恢复
  - 与现有 SQLite 存储（hands, agents）保持一致

### 3. 实时更新: WebSocket 推送

- **Decision:** 复用现有 WebSocket 架构，步骤状态变更主动推送到前端
- **Message Format:**
  ```json
  {
    "type": "step_status_change",
    "data": {
      "execution_id": "exec-xxx",
      "step_id": "step-1",
      "status": "running",
      "timestamp": "2026-03-25T10:30:00Z"
    }
  }
  ```
- **Integration Points:**
  - 复用 `crates/openfang-api/src/ws.rs`
  - Hand 执行时订阅到 Agent 的 WebSocket channel
  - 状态变更时广播给所有连接的客户端

### 4. 状态机: 可重试

- **Decision:** 支持失败后重试，failed → pending → running
- **State Transitions:**
  ```
  pending → running → completed
     ↑         ↓
     └──── failed ────┘ (retry)

  pending → running → waiting ──用户输入──→ pending
  ```
- **Retry Rules:**
  - 用户可手动触发重试
  - `wait-for-input` 超时自动进入 failed，可重试
  - 重试次数限制：每个步骤最多 3 次（配置化）

### 5. 变量插值: 预解析

- **Decision:** 步骤执行前一次性替换 `{{step_id.output}}` 变量
- **Resolution Order:**
  1. 收集当前 execution 所有已完成步骤的 output
  2. 正则匹配 `{{(\w+)\.(\w+)}}` 语法
  3. 替换为对应步骤 output 字段值
  4. 未解析的变量保留原样（或报错，可配置）
- **Example:**
  ```json
  // step-1 output
  {"result": "Hello World"}

  // step-2 input before resolution
  {"message": "{{step-1.result}}"}

  // step-2 input after resolution
  {"message": "Hello World"}
  ```
- **Scope:** 仅当前 Hand execution，子 Hand 变量隔离

### 6. 错误处理: 失败即停

- **Decision:** 步骤 failed 后 Hand 暂停，等待用户决定
- **User Options:**
  - **重试** — 回到 pending 重新执行该步骤
  - **跳过** — 标记为 skipped，继续执行 next_steps（需确认）
  - **终止** — 标记 Hand execution 为 failed
- **API Endpoints:**
  ```
  POST /api/hands/{id}/executions/{exec_id}/retry
  POST /api/hands/{id}/executions/{exec_id}/skip
  POST /api/hands/{id}/executions/{exec_id}/abort
  ```

## Technical Context

### Existing Components

- `crates/openfang-runtime/src/agent_loop.rs` — Agent 执行循环
- `crates/openfang-runtime/src/prompt_builder.rs` — System prompt 构建
- `crates/openfang-api/src/ws.rs` — WebSocket 连接管理
- `crates/openfang-hands/src/steps.rs` — HandStep 数据模型

### New Components Required

- `hand_executor.rs` — Hand 执行管理器（协调 Agent loop 和状态跟踪）
- `step_variable_resolver.rs` — 变量预解析器
- `execution_store.rs` — SQLite 存储层
- `hand_execution_prompt.rs` — Hand 执行专用 prompt 模板

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hands/{id}/activate` | POST | 激活 Hand，开始执行 |
| `/api/hands/{id}/executions` | GET | 查询执行历史 |
| `/api/hands/{id}/executions/{exec_id}` | GET | 查询单个执行详情 |
| `/api/hands/{id}/executions/{exec_id}/status` | GET | 查询执行状态 |
| `/api/hands/{id}/steps/{step_id}/status` | GET | 查询步骤状态 |
| `/api/hands/{id}/executions/{exec_id}/retry` | POST | 重试失败步骤 |
| `/api/hands/{id}/executions/{exec_id}/input` | POST | 提交用户输入（wait-for-input）|

### UI Components

- `ExecutionStatusBadge` — 执行状态指示器（pending/running/completed/failed/waiting）
- `ExecutionTimeline` — 步骤执行时间线
- `StepOutputPanel` — 步骤输出展示
- `UserInputModal` — wait-for-input 用户输入弹窗

## Canonical Refs

- `crates/openfang-runtime/src/agent_loop.rs` — Agent 执行循环
- `crates/openfang-runtime/src/prompt_builder.rs` — Prompt 构建
- `crates/openfang-api/src/ws.rs` — WebSocket 实现
- `crates/openfang-hands/src/steps.rs` — 步骤类型定义
- `.planning/phases/01-core-foundation/01-05-react-flow-viz-SUMMARY.md` — React Flow UI 基础
- `.planning/phases/02-design-system/02-CONTEXT.md` — Dual Editor 决策

## Deferred Ideas

- **并行步骤执行** — 当前仅支持顺序执行，未来可考虑并行节点
- **步骤超时配置** — 每个步骤可配置独立超时（当前使用全局 120s）
- **执行回放** — 从历史 execution 重新播放执行过程
- **条件表达式编辑器** — 可视化编辑 condition 步骤表达式

---
*Created: 2026-03-25*
*Next: Run `/gsd:plan-phase 3` to create implementation plans*
