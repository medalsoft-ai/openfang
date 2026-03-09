# Chat.tsx 全面对齐 Alpine 功能计划

## 当前状态
- ✅ 语法错误已修复，可编译通过
- ✅ tsconfig 暂时关闭 noUnusedLocals
- ⏳ 需要全面对齐 Alpine 功能

## 功能对比矩阵

| 功能 | Alpine | React | 优先级 |
|------|--------|-------|--------|
| WebSocket 连接管理 | ✅ 完整 | ⚠️ 基础 | P0 |
| 消息分组显示 | ✅ grouped class | ❌ 未使用 | P1 |
| 工具卡片展开/折叠 | ✅ 完整 | ⚠️ 框架 | P0 |
| 工具图片/音频展示 | ✅ 完整 | ❌ 缺失 | P1 |
| Session 创建/切换 | ✅ 完整 | ⚠️ UI 存在 | P0 |
| 模型切换器搜索 | ✅ 完整 | ⚠️ 基础 | P1 |
| 语音录音 | ✅ 完整 | ⚠️ 状态存在 | P2 |
| 文件拖放上传 | ✅ 完整 | ⚠️ 基础 | P1 |
| 斜杠命令执行 | ✅ 完整 | ⚠️ 框架 | P0 |
| 消息搜索高亮 | ✅ 完整 | ⚠️ UI 存在 | P1 |
| Tips 轮播 | ✅ 完整 | ⚠️ 状态存在 | P2 |
| Token 计数 | ✅ 显示 | ❌ 缺失 | P2 |
| 专注模式 | ✅ 全局状态 | ⚠️ 基础 | P2 |
| 键盘快捷键 | ✅ 完整 | ❌ 缺失 | P1 |
| 消息复制 | ✅ 悬停按钮 | ❌ 缺失 | P1 |
| 智能滚动 | ✅ 用户感知 | ⚠️ 基础 | P2 |

## 详细任务分解

### Phase 1: 核心消息功能 (P0)

#### 1.1 WebSocket 消息处理完善
**文件**: `Chat.tsx` (第280-500行)

Alpine 参考: `chat.js` 第500-700行

需要实现:
- typing 消息状态处理 (start/tool/stop)
- phase 进度消息显示
- tool_start/tool_end/tool_result 完整生命周期
- 消息去重和排序逻辑
- context_pressure 处理

#### 1.2 工具卡片完整功能
**文件**: `Chat.tsx` (消息渲染部分)

Alpine 参考: `index_body.html` 第633-671行, `chat.js` tool 相关函数

需要实现:
- 工具卡片展开/折叠状态
- 工具运行中 spinner
- 生成的图片展示 (_imageUrls)
- 音频播放组件 (_audioFile)
- 工具结果格式化 (formatToolJson)
- 错误状态展示

#### 1.3 Session 管理 API 集成
**文件**: `Chat.tsx`, `api/client.ts`

Alpine 参考: `chat.js` session 相关函数

API 端点:
- POST `/api/agents/{id}/sessions` - 创建 Session
- GET `/api/agents/{id}/sessions` - 获取 Session 列表
- POST `/api/agents/{id}/sessions/{sid}/switch` - 切换 Session
- POST `/api/agents/{id}/session/reset` - 重置 Session

#### 1.4 斜杠命令完整执行
**文件**: `Chat.tsx` (executeSlashCommand)

Alpine 参考: `chat.js` 第323-479行

需要实现:
- /help - 显示命令列表
- /agents - 跳转到 Agents 页面
- /new - 重置 Session
- /compact - 触发 compaction
- /stop - 停止 Agent
- /usage - 显示使用量
- /think - 切换思考模式
- /context - 显示上下文
- /verbose - 切换详细度
- /queue - 检查队列
- /status - 系统状态
- /model - 切换模型
- /clear - 清空消息
- /exit - 断开连接
- /budget - 预算状态
- /peers - 网络状态
- /a2a - A2A 代理列表

### Phase 2: 交互体验优化 (P1)

#### 2.1 消息搜索高亮
**文件**: `Chat.tsx`

Alpine 参考: `chat.js` search 相关

需要实现:
- 实时搜索过滤
- 搜索结果计数
- 搜索高亮样式
- Esc 关闭搜索

#### 2.2 模型切换器完善
**文件**: `Chat.tsx`

Alpine 参考: `chat.js` 第229-277行

需要实现:
- 模型缓存 (5分钟)
- Provider 筛选下拉框
- 模型能力图标 (vision/tools)
- 模型 Tier 标签
- Context window 显示

#### 2.3 文件上传/拖放
**文件**: `Chat.tsx`

Alpine 参考: `chat.js` 附件相关

需要实现:
- 多文件上传
- 图片预览
- 上传进度
- 附件删除

#### 2.4 键盘快捷键
**文件**: `Chat.tsx` (useEffect)

Alpine 参考: `chat.js` 第147-163行

需要实现:
- Ctrl+/ - 聚焦输入框并输入 /
- Ctrl+M - 打开模型切换器
- Ctrl+F - 打开消息搜索
- Ctrl+Shift+F - 切换专注模式

#### 2.5 消息复制功能
**文件**: `Chat.tsx`

Alpine 参考: `index_body.html` 第611-616行

需要实现:
- 悬停显示复制按钮
- 复制反馈 (copied 状态)
- 复制图标切换

### Phase 3: 高级功能 (P2)

#### 3.1 语音录音
**文件**: `Chat.tsx`

Alpine 参考: `chat.js` 录音相关

需要实现:
- MediaRecorder 集成
- 录音时长显示
- 上传录音文件
- 语音转文字 (STT)

#### 3.2 Tips 轮播
**文件**: `Chat.tsx`

Alpine 参考: `chat.js` 第66-81行

需要实现:
- 自动轮播 (30秒)
- 可关闭 (localStorage)
- 底部提示栏 UI

#### 3.3 Token 计数
**文件**: `Chat.tsx`

需要实现:
- 估算 token 数 (字符/4)
- 输入框底部显示
- Session 使用量统计

#### 3.4 专注模式
**文件**: `Chat.tsx`, 全局状态

需要实现:
- 全局 focusMode 状态
- 快捷键切换
- 侧边栏隐藏动画

#### 3.5 智能滚动
**文件**: `Chat.tsx`

Alpine 参考: `chat.js` scroll 相关

需要实现:
- 用户滚动时暂停自动滚动
- 新消息提示
- 滚动到底部按钮

## 技术实现要点

### 状态管理
```typescript
// 需要在 Chat.tsx 中完善的状态
const [typingState, setTypingState] = useState<'idle' | 'start' | 'tool' | 'stop'>('idle');
const [typingTool, setTypingTool] = useState<string>('');
const [phaseInfo, setPhaseInfo] = useState<{ phase?: string; detail?: string } | null>(null);
```

### API 客户端扩展
```typescript
// api/client.ts 需要添加
async createSession(agentId: string, title?: string): Promise<Session>
async listSessions(agentId: string): Promise<Session[]>
async switchSession(agentId: string, sessionId: string): Promise<void>
async resetSession(agentId: string): Promise<void>
async compactSession(agentId: string): Promise<{ message: string }>
async stopAgent(agentId: string): Promise<{ message: string }>
async switchModel(agentId: string, model: string): Promise<{ provider?: string }>
```

### WebSocket 消息类型
```typescript
// 需要处理的消息类型
type WsMessage =
  | { type: 'text_delta'; content: string }
  | { type: 'tool'; tool: ToolCall }
  | { type: 'tool_start' | 'tool_end' | 'tool_result'; ... }
  | { type: 'typing'; state: 'start' | 'tool' | 'stop'; tool?: string }
  | { type: 'phase'; phase: string; detail?: string }
  | { type: 'context_pressure'; context_pressure: 'low' | 'medium' | 'high' | 'critical' }
  | { type: 'response'; ... }
  | { type: 'done' }
  | { type: 'error'; ... }
```

## 测试清单

- [ ] WebSocket 连接和重连
- [ ] 发送消息并接收流式响应
- [ ] 工具调用展示和交互
- [ ] Session 创建和切换
- [ ] 模型切换功能
- [ ] 所有斜杠命令
- [ ] 文件上传和拖放
- [ ] 消息搜索和高亮
- [ ] 键盘快捷键
- [ ] 专注模式切换
