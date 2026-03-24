# Roadmap — Milestone v0.1 Dynamic Hand with steps

## 重新设计的阶段思路

**原则**:
- Phase 1: Core Foundation — 数据、API、Agent 创建/修改（底层能力）
- Phase 2: Dual Editor — 两种编辑方式：可视化编辑器 + Agent 对话编辑器
- Phase 3: Execution — 步骤执行与状态跟踪
- Phase 4: Session Import — 从 Session 生成 Hand

---

## Phases

- [x] **Phase 1: Core Foundation** — 数据模型 + API + Agent Tools + 基础展示
- [ ] **Phase 2: Dual Editor** — 流程图可视化编辑 + 聊天/Agent 对话编辑
- [ ] **Phase 3: Execution Engine** — 步骤执行、状态跟踪、LLM 集成
- [ ] **Phase 4: Session to Hand** — 从 Agent Session 生成 Hand

---

## Phase Details

### Phase 1: Core Foundation（核心基础）
**Goal**: Hand 拥有步骤机制，Agent 可以动态创建/修改，API 可获取，前端可展示
**Depends on**: Nothing
**Requirements**: HAND-STEP-01, HAND-STEP-03, HAND-STEP-04, HAND-STEP-06, API-01, API-02, UI-01

**Success Criteria**:
  1. HandDefinition 数据模型包含完整的 steps 字段（id, name, type, config, next_steps）
  2. 定义6种步骤类型数据结构：execute-tool, send-message, wait-for-input, condition, loop, sub-hand
  3. Agent 可以通过 tool call 创建新的 Hand（带初始步骤）
  4. Agent 可以通过 tool call 修改现有 Hand 的步骤（增删改）
  5. GET /api/hands/{id}/steps 返回步骤数据
  6. PUT /api/hands/{id}/steps 更新步骤（Agent 和用户共用同一 API）
  7. Hand 详情页使用 React Flow 渲染步骤流程图（只读模式）
  8. 步骤显示不同类型图标/颜色区分
  9. 变更持久化到存储（TOML 或 JSON）
  10. 新创建的 Hand 立即出现在 Hands 列表中

**Plans**:
- [ ] `phases/01-core-foundation/PLAN.md` — Detailed execution plan
- [ ] `phases/01-core-foundation/CHANGELOG.md` — Implementation tracking

**Tasks**:
1. [x] Task 1.1: Define Step Types in openfang-hands (Data Model) — **Complete**
2. [x] Task 1.2: Implement Steps API Endpoints (GET/PUT) — **Complete**
3. [ ] Task 1.3: Create Agent Tools (hand_create, hand_update_steps)
4. [x] Task 1.4: Add TypeScript Types for Steps — **Complete**
5. [ ] Task 1.5: Implement React Flow Visualization
6. [ ] Task 1.6: Integration Testing

**UI hint**: yes

---

### Phase 2: Dual Editor（双模式编辑器）
**Goal**: 用户可以通过两种方式编辑 Hand 步骤：流程图可视化 或 聊天对话
**Depends on**: Phase 1
**Requirements**: HAND-STEP-02, HAND-STEP-08, UI-02, UI-03

**Success Criteria**:

**A. 流程图可视化编辑（React Flow）:**
  1. Hand 详情页可切换"编辑模式"
  2. 左侧面板显示步骤类型 palette，可拖拽到画布
  3. 画布上可拖拽节点调整位置
  4. 点击节点打开右侧属性面板编辑详情（name, type, config）
  5. 可拖拽连接节点（设置 next_steps）
  6. 可删除节点和连接
  7. 支持变量插值语法 `{{step_id.output}}` 的输入提示
  8. 保存时验证步骤图（无孤立节点、无循环依赖等）

**B. 聊天/Agent 对话编辑:**
  1. Hand 详情页有"Chat Edit"入口，打开对话界面
  2. 用户可以用自然语言描述想要的流程变更
  3. Agent 理解意图并调用 `hand_update_steps` tool 修改步骤
  4. 修改前 Agent 展示变更预览（增删改的步骤清单）
  5. 用户确认后应用变更
  6. 变更后流程图实时刷新
  7. 支持增量编辑（"在步骤2后添加一个条件分支"）
  8. 支持完整重写（"重新设计整个流程为..."）

**设计要点**:
- 两种编辑方式共用同一 PUT /api/hands/{id}/steps API
- 可视化编辑适合：精确控制、复杂流程设计
- 聊天编辑适合：快速迭代、自然语言描述
- Agent 需要 Hand 编辑专用 prompt，理解步骤结构和变更语义

**Plans**: TBD
**UI hint**: yes

---

### Phase 3: Execution Engine（执行引擎）
**Goal**: 步骤可以被 LLM 执行，并跟踪执行状态
**Depends on**: Phase 2
**Requirements**: HAND-STEP-07, API-04, API-05, UI-04

**Success Criteria**:
  1. Hand 激活时，步骤被注入到 Agent system prompt 中
  2. Agent 理解并按步骤顺序执行（通过 prompt engineering）
  3. 步骤执行状态被跟踪：pending, running, completed, failed, waiting
  4. GET /api/hands/{id}/steps/{step_id}/status 返回当前状态
  5. POST /api/hands/{id}/steps/{step_id}/execute 手动触发步骤执行
  6. UI 实时显示步骤执行状态（颜色/动画指示器）
  7. 步骤输出被捕获，可供后续步骤使用（变量替换）
  8. 支持 wait-for-input 步骤暂停执行等待用户输入

**设计要点**:
- 执行引擎可以是：prompt-based（轻量）或 engine-based（严格）
- 状态存储在内存或 SQLite
- WebSocket 推送状态变更到前端

**Plans**: TBD
**UI hint**: yes

---

### Phase 4: Session to Hand（Session 转 Hand）
**Goal**: 从 Agent Session 的执行历史生成 Hand
**Depends on**: Phase 3
**Requirements**: HAND-STEP-05, API-03

**Success Criteria**:
  1. POST /api/hands/create-from-session 从 session_id 创建 Hand
  2. 分析 session 的工具调用历史，提取执行序列
  3. 生成的 Hand 包含对应的 execute-tool 步骤
  4. 用户可以在 UI 预览生成的步骤，确认后保存
  5. 支持命名和编辑生成的 Hand
  6. 生成的 Hand 与普通 Hand 完全等价

**设计要点**:
- 从 messages 中提取 tool_calls
- 智能合并连续相同类型的调用
- 生成可读性好的步骤名称

**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Foundation | 3/6 | Wave 2 Complete | 01-01, 01-02, 01-03 done |
| 2. Dual Editor | 0/1 | Not started | - |
| 3. Execution Engine | 0/1 | Not started | - |
| 4. Session to Hand | 0/1 | Not started | - |

## Coverage

**Total Requirements**: 17
**Mapped**: 17/17

| REQ-ID | Phase | Description |
|--------|-------|-------------|
| HAND-STEP-01 | 1 | View Hand steps (React Flow) |
| HAND-STEP-02 | 2 | Edit Hand steps (dual mode) |
| HAND-STEP-03 | 1 | Agent creates Hand dynamically |
| HAND-STEP-04 | 1 | Agent modifies Hand steps |
| HAND-STEP-05 | 4 | Session to Hand conversion |
| HAND-STEP-06 | 1 | Step types definition |
| HAND-STEP-07 | 3 | Step execution status tracking |
| HAND-STEP-08 | 2 | Step data passing |
| API-01 | 1 | GET /api/hands/{id}/steps |
| API-02 | 1 | PUT /api/hands/{id}/steps |
| API-03 | 4 | POST /api/hands/create-from-session |
| API-04 | 3 | GET /api/hands/{id}/steps/{step_id}/status |
| API-05 | 3 | POST /api/hands/{id}/steps/{step_id}/execute |
| UI-01 | 1 | React Flow integration (read-only) |
| UI-02 | 2 | Step editor component (visual) |
| UI-03 | 2 | Step type selector (visual) |
| UI-04 | 3 | Execution status indicator |

---
*Last updated: 2026-03-25*
