# OpenFang Project

## What This Is

OpenFang 是一个开源的 Agent 操作系统，用 Rust 编写（14 个 crate）。它提供了一个完整的 Agent 运行时环境，支持 Hands (SOP - 标准操作流程)、A2A 协议、预算控制、审批流程等功能。

核心概念：
- **Hand (SOP)**: 预构建的领域完整 Agent 配置，用户从市场激活。与普通 Agent（你与之聊天）不同，Hands 为你工作（你定期检查它们）。
- **Agent**: 可以对话、执行任务、使用工具的 AI 实体
- **Skill**: 可复用的工具集合，扩展 Agent 能力
- **Channel**: 外部集成通道（Slack、Discord、WhatsApp 等）

## Core Value

让用户能够轻松部署、管理和监控自主运行的 AI Agent，同时保持对成本和行为的控制。

## Context

**技术栈:**
- 后端: Rust (14 crates) - Axum Web 框架
- 前端: React + TypeScript + Tailwind CSS + Framer Motion
- 构建工具: Cargo (Rust), pnpm (前端)
- 实时通信: WebSocket

**项目状态:**
- 已完成功能: Chat 页面 Claymorphism 重设计、基础 Hands 系统、Agent 管理
- 当前工作: 无活跃里程碑
- 上次提交: Chat 页面重设计完成 (2026-03-24)

## Validated Requirements

- [x] **CHAT-01**: 用户可以与 Agent 进行实时对话
- [x] **HAND-01**: 用户可以查看和激活 Hands (SOP)
- [x] **AGENT-01**: 用户可以创建、配置和管理 Agent
- [x] **UI-01**: Claymorphism 设计系统应用于 Chat 页面

## Out of Scope

*暂无*

## Key Decisions

1. **Hand vs SOP 命名**: 内部代码使用 "Hand"，用户界面显示 "SOP"
2. **设计系统**: Claymorphism 风格 - 柔和渐变、圆角、阴影、紫色主题
3. **API 基础 URL**: `http://127.0.0.1:4200`

## Current Milestone: v0.1 Dynamic Hand with steps

**Goal:** 让 Hands 拥有可动态编辑的步骤机制，支持 Agent 创建/修改步骤，并用 React Flow 可视化

**Target features:**
- 用户可以通过 Agent 动态创建 Hand
- Hand 拥有固定的步骤机制（可编辑、可 Agent 修改）
- 步骤数据可通过 API 获取
- Hands 详情页使用 React Flow 渲染步骤流程图
- 用户可以将 Agent 执行流程总结成固定步骤的 Hand

**关键设计要点:**
- 步骤类型：顺序执行、条件分支、循环、等待用户输入
- 步骤状态：待执行、执行中、已完成、失败、等待中
- 数据模型：HandDefinition 扩展 steps 字段，每个步骤包含 id、name、type、config、next_steps
- React Flow：使用 @xyflow/react 渲染节点和边

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-25*
