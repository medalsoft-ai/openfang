# State — Milestone v0.1 Dynamic Hand with steps

## Current Position

Phase: Planning
Plan: —
Status: Roadmap v3 created (dual editor approach), awaiting approval
Last activity: 2026-03-25 — Redesigned roadmap with Phase 2 as dual editor

## Active Threads

None

## Accumulated Context

### Previous Milestone (Chat Redesign)
- Completed: Chat 页面 Claymorphism 重设计
- Key files: crates/openfang-webui/src/pages/Chat.tsx
- Patterns: claymorphism, spring-animations, reduced-motion

### Technical Decisions Pending
1. React Flow version: @xyflow/react (confirmed)
2. Step storage format: TOML extension vs separate steps.json — Need decision in Phase 1
3. Agent Tool design: hand_create + hand_update_steps API shape — Need spec in Phase 1 plan
4. Agent Chat Editor prompt design: How Agent understands step editing intent
5. Visual vs Chat editor state sync: How changes reflect in real-time

### Phase Summary (v3 — Dual Editor)

| Phase | Name | Key Deliverable | Requirements |
|-------|------|-----------------|--------------|
| 1 | Core Foundation | 完整的 Hand+Step 底层系统 | 10 |
| 2 | Dual Editor | 可视化编辑器 + Agent 对话编辑器 | 8 |
| 3 | Execution Engine | 步骤执行与状态跟踪 | 4 |
| 4 | Session to Hand | 从 Session 生成 Hand | 2 |

### Phase 2 Dual Editor 详细设计

**模式 A: 流程图编辑 (Visual Editor)**
```
Hand 详情页 → 点击"Edit" → 进入编辑模式
├── 左侧: 步骤类型 Palette (拖拽源)
├── 中央: React Flow 画布 (节点 + 边)
│   ├── 拖拽节点调整位置
│   ├── 拖拽连接创建 next_steps
│   └── 点击节点打开属性面板
└── 右侧: 属性面板 (编辑 name, type, config)
```

**模式 B: 聊天编辑 (Agent Editor)**
```
Hand 详情页 → 点击"Chat Edit" → 打开对话界面
├── 用户: "在步骤2后添加一个条件分支，检查用户是否确认"
├── Agent:
│   ├── 理解意图 → 生成新步骤结构
│   ├── 展示预览: "将在步骤2后添加: 步骤3(condition) → 步骤4(if-yes), 步骤5(if-no)"
│   └── 询问确认
├── 用户: "确认"
└── Agent: 调用 hand_update_steps → 刷新流程图
```

**关键技术点:**
- 两种模式共用 PUT /api/hands/{id}/steps
- Agent 编辑器需要专用 system prompt 理解步骤结构
- 需要步骤 diff 算法展示变更预览
- 聊天编辑支持增量和全量两种模式

---
*Last updated: 2026-03-25*
