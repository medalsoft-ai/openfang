# 第五章：Agent 循环详解

本章深入 OpenFang 的核心——Agent 执行循环。对于 Node.js 开发者，我们将对比 Rust 异步模型与 JavaScript 事件循环的差异，帮助你理解 Agent 是如何"活"起来的。

## 目录

1. [run_agent_loop 函数拆解](#1-run_agent_loop-函数拆解)
2. [Agent 生命周期管理](#2-agent-生命周期管理)
3. [工具调用循环](#3-工具调用循环)
4. [内存召回机制](#4-内存召回机制)
5. [会话管理（Session）](#5-会话管理session)
6. [与 Node.js 事件循环对比](#6-与-nodejs-事件循环对比)
7. [流式响应处理](#7-流式响应处理)

---

## 1. run_agent_loop 函数拆解

`run_agent_loop` 是 OpenFang 的心脏，位于 `crates/openfang-runtime/src/agent_loop.rs`。它驱动 Agent 从接收用户输入到生成响应的完整流程。

### 1.1 函数签名解析

```rust
pub async fn run_agent_loop(
    manifest: &AgentManifest,           // Agent 配置清单
    user_message: &str,                 // 用户输入
    session: &mut Session,              // 会话状态（可变的）
    memory: &MemorySubstrate,           // 内存存储接口
    driver: Arc<dyn LlmDriver>,         // LLM 驱动（多态）
    available_tools: &[ToolDefinition], // 可用工具列表
    kernel: Option<Arc<dyn KernelHandle>>, // 内核句柄
    // ... 其他可选参数
) -> OpenFangResult<AgentLoopResult>
```

**Node.js 对比**：这就像 Express 的路由处理函数，但 Rust 的 `async fn` 会编译成状态机，而非回调函数。

### 1.2 执行流程概览

```rust
// 简化版伪代码
pub async fn run_agent_loop(...) -> OpenFangResult<AgentLoopResult> {
    // 1. 召回相关记忆
    let memories = recall_memories(user_message).await?;

    // 2. 构建系统提示词
    let system_prompt = build_prompt(manifest, memories);

    // 3. 添加到会话历史
    session.messages.push(Message::user(user_message));

    // 4. 主循环：思考 → 行动 → 观察
    for iteration in 0..max_iterations {
        // 调用 LLM
        let response = driver.complete(request).await?;

        match response.stop_reason {
            StopReason::EndTurn => break,  // 完成响应
            StopReason::ToolUse => {       // 需要执行工具
                let results = execute_tools(response.tool_calls).await;
                messages.push(Message::tool_results(results));
            }
            StopReason::MaxTokens => {     //  token 耗尽，继续
                messages.push(Message::user("Please continue."));
            }
        }
    }

    // 5. 保存会话和记忆
    memory.save_session(session).await?;
    memory.remember(interaction_text).await?;

    Ok(AgentLoopResult { ... })
}
```

---

## 2. Agent 生命周期管理

### 2.1 生命周期阶段（LoopPhase）

OpenFang 定义了清晰的 Agent 生命周期阶段，用于 UI 状态显示：

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum LoopPhase {
    Thinking,                    // 调用 LLM 中
    ToolUse { tool_name: String }, // 执行工具
    Streaming,                   // 流式传输 token
    Done,                        // 成功完成
    Error,                       // 发生错误
}
```

**使用示例**：

```rust
// 在 Dashboard 或 CLI 中显示状态
let phase_callback = Arc::new(|phase: LoopPhase| {
    match phase {
        LoopPhase::Thinking => println!("🤔 Agent 思考中..."),
        LoopPhase::ToolUse { tool_name } => println!("🔧 执行工具: {}", tool_name),
        LoopPhase::Done => println!("✅ 完成"),
        LoopPhase::Error => println!("❌ 错误"),
        _ => {}
    }
});

run_agent_loop(..., Some(&phase_callback)).await?;
```

### 2.2 循环守卫（LoopGuard）

防止 Agent 陷入无限循环的安全机制：

```rust
pub struct LoopGuard {
    config: LoopGuardConfig,
    recent_calls: Vec<LoopCall>,  // 最近调用记录
}

pub enum LoopGuardVerdict {
    Allow,           // 允许执行
    Warn(String),    // 允许但附带警告
    Block(String),   // 阻止执行
    CircuitBreak(String), // 熔断，终止循环
}
```

**保护机制**：
- **重复调用检测**：相同工具+参数连续调用超过阈值 → Block
- **电路熔断**：总调用次数超过全局限制 → CircuitBreak
- **执行时间**：单个工具调用超时（默认 120 秒）

```rust
// 检查每次工具调用
let verdict = loop_guard.check(&tool_call.name, &tool_call.input);
match verdict {
    LoopGuardVerdict::CircuitBreak(msg) => {
        return Err(OpenFangError::Internal(msg));
    }
    LoopGuardVerdict::Block(msg) => {
        // 返回错误给 LLM，但不终止循环
        tool_result_blocks.push(ContentBlock::ToolResult {
            content: msg,
            is_error: true,
            ...
        });
        continue;
    }
    _ => {} // 继续执行
}
```

### 2.3 最大迭代限制

```rust
const MAX_ITERATIONS: u32 = 50;  // 默认最大循环次数
const MAX_CONTINUATIONS: u32 = 5; // 连续 MaxTokens 最大次数
```

**Node.js 对比**：类似于设置 `setTimeout` 或 `Promise.race` 的超时控制，但 Rust 在编译期就保证了状态管理的正确性。

---

## 3. 工具调用循环

### 3.1 工具执行流程

Agent 循环的核心是"思考-行动-观察"（ReAct）模式：

```rust
// 主循环中的工具处理分支
StopReason::ToolUse => {
    // 1. 记录 Assistant 的工具调用请求
    session.messages.push(Message {
        role: Role::Assistant,
        content: MessageContent::Blocks(assistant_blocks),
    });

    // 2. 执行每个工具调用
    let mut tool_result_blocks = Vec::new();
    for tool_call in &response.tool_calls {
        // 2.1 循环守卫检查
        let verdict = loop_guard.check(&tool_call.name, &tool_call.input);

        // 2.2 执行工具（带超时）
        let result = tokio::time::timeout(
            Duration::from_secs(TOOL_TIMEOUT_SECS),
            tool_runner::execute_tool(...)
        ).await;

        // 2.3 处理结果
        tool_result_blocks.push(ContentBlock::ToolResult {
            tool_use_id: result.tool_use_id,
            tool_name: tool_call.name.clone(),
            content: result.content,
            is_error: result.is_error,
        });
    }

    // 3. 将工具结果作为 User 消息添加（Anthropic API 要求）
    messages.push(Message {
        role: Role::User,
        content: MessageContent::Blocks(tool_result_blocks),
    });
}
```

### 3.2 工具执行器（tool_runner）

`crates/openfang-runtime/src/tool_runner.rs` 实现了具体的工具逻辑：

```rust
pub async fn execute_tool(
    tool_use_id: &str,
    tool_name: &str,
    input: &serde_json::Value,
    kernel: Option<&Arc<dyn KernelHandle>>,
    allowed_tools: Option<&[String]>,  // 权限检查
    // ... 其他上下文
) -> ToolResult {
    // 1. 能力检查：Agent 是否有权使用此工具？
    if let Some(allowed) = allowed_tools {
        if !allowed.iter().any(|t| t == tool_name) {
            return ToolResult {
                content: format!("Permission denied: '{}'", tool_name),
                is_error: true,
                ...
            };
        }
    }

    // 2. 审批检查：是否需要人工确认？
    if kernel.requires_approval(tool_name) {
        let approved = kernel.request_approval(agent_id, tool_name, summary).await?;
        if !approved {
            return ToolResult {
                content: "Execution denied: requires approval".to_string(),
                is_error: true,
                ...
            };
        }
    }

    // 3. 分发到具体工具实现
    match tool_name {
        "file_read" => tool_file_read(input, workspace_root).await,
        "file_write" => tool_file_write(input, workspace_root).await,
        "web_search" => tool_web_search(input, web_ctx).await,
        "agent_send" => tool_agent_send(input, kernel).await,
        // ... 更多工具
        _ => ToolResult {
            content: format!("Unknown tool: '{}'", tool_name),
            is_error: true,
            ...
        }
    }
}
```

### 3.3 污点追踪（Taint Tracking）

安全特性：防止外部数据流入敏感操作

```rust
// 检查 shell 命令是否包含可疑模式
fn check_taint_shell_exec(command: &str) -> Option<String> {
    let suspicious = ["curl ", "wget ", "| sh", "| bash", "base64 -d"];
    for pattern in &suspicious {
        if command.contains(pattern) {
            let tainted = TaintedValue::new(command, labels, "llm_tool_call");
            if let Err(violation) = tainted.check_sink(&TaintSink::shell_exec()) {
                return Some(violation.to_string());
            }
        }
    }
    None
}

// 检查 URL 是否包含敏感信息
fn check_taint_net_fetch(url: &str) -> Option<String> {
    let exfil_patterns = ["api_key=", "token=", "secret=", "password="];
    // ... 类似检查
}
```

---

## 4. 内存召回机制

### 4.1 向量召回 vs 文本召回

OpenFang 支持两种记忆召回方式：

```rust
// 优先使用向量召回（如果嵌入驱动可用）
let memories = if let Some(emb) = embedding_driver {
    match emb.embed_one(user_message).await {
        Ok(query_vec) => {
            // 向量相似度搜索
            memory.recall_with_embedding_async(
                user_message,
                5,  // 返回前 5 条
                Some(MemoryFilter { agent_id: Some(session.agent_id), .. }),
                Some(&query_vec),
            ).await
        }
        Err(e) => {
            // 降级到文本搜索
            memory.recall(user_message, 5, ...).await
        }
    }
} else {
    // 纯文本搜索
    memory.recall(user_message, 5, ...).await
};
```

### 4.2 记忆注入提示词

召回的记忆被注入到系统提示词中：

```rust
let mut system_prompt = manifest.model.system_prompt.clone();
if !memories.is_empty() {
    let mem_pairs: Vec<(String, String)> = memories
        .iter()
        .map(|m| (String::new(), m.content.clone()))
        .collect();
    system_prompt.push_str("\n\n");
    system_prompt.push_str(&build_memory_section(&mem_pairs));
}

// 生成的提示词片段：
// ---
// Relevant memories:
// - 用户喜欢使用 TypeScript
// - 用户之前询问过 Rust 异步编程
// ---
```

### 4.3 记忆保存

交互完成后，Agent 会自动保存记忆：

```rust
// 保存本次交互到长期记忆
let interaction_text = format!(
    "User asked: {}\nI responded: {}",
    user_message, final_response
);

// 如果有嵌入驱动，保存向量化的记忆
if let Some(emb) = embedding_driver {
    let vec = emb.embed_one(&interaction_text).await?;
    memory.remember_with_embedding_async(
        session.agent_id,
        &interaction_text,
        MemorySource::Conversation,
        "episodic",  // 记忆类型：情景记忆
        HashMap::new(),
        Some(&vec),
    ).await?;
} else {
    // 普通文本记忆
    memory.remember(...).await?;
}
```

---

## 5. 会话管理（Session）

### 5.1 Session 结构

`crates/openfang-memory/src/session.rs` 定义了会话管理：

```rust
#[derive(Debug, Clone)]
pub struct Session {
    pub id: SessionId,                    // 会话唯一 ID
    pub agent_id: AgentId,                // 所属 Agent
    pub messages: Vec<Message>,           // 消息历史
    pub context_window_tokens: u64,       // 预估 token 数
    pub label: Option<String>,            // 可选标签
}

// SessionStore 提供持久化
pub struct SessionStore {
    conn: Arc<Mutex<Connection>>,  // SQLite 连接
}
```

### 5.2 会话持久化

使用 SQLite + MessagePack 序列化：

```rust
impl SessionStore {
    pub fn save_session(&self, session: &Session) -> OpenFangResult<()> {
        let conn = self.conn.lock().map_err(...)?;
        let messages_blob = rmp_serde::to_vec_named(&session.messages)?;

        conn.execute(
            "INSERT INTO sessions (id, agent_id, messages, context_window_tokens, label, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
             ON CONFLICT(id) DO UPDATE SET messages = ?3, ...",
            params![...],
        )?;
        Ok(())
    }

    pub fn get_session(&self, session_id: SessionId) -> OpenFangResult<Option<Session>> {
        let conn = self.conn.lock().map_err(...)?;
        let row = conn.query_row(
            "SELECT agent_id, messages, context_window_tokens, label FROM sessions WHERE id = ?1",
            params![session_id.0.to_string()],
            |row| {
                let messages_blob: Vec<u8> = row.get(1)?;
                let messages: Vec<Message> = rmp_serde::from_slice(&messages_blob)?;
                Ok(Session { ... })
            }
        )?;
        Ok(Some(session))
    }
}
```

### 5.3 规范会话（Canonical Session）

跨渠道共享的记忆：

```rust
pub struct CanonicalSession {
    pub agent_id: AgentId,
    pub messages: Vec<Message>,
    pub compaction_cursor: usize,         // 压缩位置标记
    pub compacted_summary: Option<String>, // 历史摘要
    pub updated_at: String,
}

// 使用示例：Telegram 和 Discord 共享上下文
impl SessionStore {
    pub fn append_canonical(
        &self,
        agent_id: AgentId,
        new_messages: &[Message],
        compaction_threshold: Option<usize>,
    ) -> OpenFangResult<CanonicalSession> {
        let mut canonical = self.load_canonical(agent_id)?;
        canonical.messages.extend(new_messages.iter().cloned());

        // 自动压缩：超过阈值时总结旧消息
        if canonical.messages.len() > threshold {
            let summary = summarize_messages(&canonical.messages[..to_compact]);
            canonical.compacted_summary = Some(summary);
            canonical.messages = canonical.messages.split_off(to_compact);
        }

        self.save_canonical(&canonical)?;
        Ok(canonical)
    }
}
```

### 5.4 上下文预算管理

防止 token 溢出：

```rust
const MAX_HISTORY_MESSAGES: usize = 20;  // 安全阀：最多保留 20 条消息
const DEFAULT_CONTEXT_WINDOW: usize = 200_000;  // 默认上下文窗口

// 自动修剪旧消息
if messages.len() > MAX_HISTORY_MESSAGES {
    let trim_count = messages.len() - MAX_HISTORY_MESSAGES;
    messages.drain(..trim_count);
}

// 动态压缩工具结果
let content = truncate_tool_result_dynamic(&result.content, &context_budget);
```

---

## 6. 与 Node.js 事件循环对比

### 6.1 核心差异

| 特性 | Node.js | Rust (Tokio) |
|------|---------|--------------|
| **运行时模型** | 单线程事件循环 + 线程池 | 多线程 work-stealing |
| **异步原语** | Promise / async-await | Future / async-await |
| **执行保证** | 回调顺序执行，但可能穿插 | 编译期保证无数据竞争 |
| **错误处理** | try-catch / .catch() | Result<T, E> / ? 运算符 |
| **取消机制** | AbortController | tokio::select! / drop |
| **工具超时** | setTimeout + Promise.race | tokio::time::timeout |

### 6.2 代码对比示例

**Node.js 风格（伪代码）**：

```javascript
async function runAgentLoop(userMessage) {
    // 召回记忆
    const memories = await memory.recall(userMessage);

    // 主循环
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const response = await llmDriver.complete(request);

        if (response.stop_reason === 'ToolUse') {
            // 并行执行工具
            const results = await Promise.all(
                response.tool_calls.map(tool => executeTool(tool))
            );
            messages.push({ role: 'user', content: results });
        } else if (response.stop_reason === 'EndTurn') {
            break;
        }
    }

    // 保存会话
    await memory.saveSession(session);
}
```

**Rust 实现**：

```rust
pub async fn run_agent_loop(...) -> OpenFangResult<AgentLoopResult> {
    // 召回记忆
    let memories = memory.recall(user_message, 5, ...).await?;

    // 主循环
    for iteration in 0..max_iterations {
        let response = driver.complete(request).await?;

        match response.stop_reason {
            StopReason::ToolUse => {
                // 串行执行工具（保证顺序）
                let mut results = Vec::new();
                for tool_call in &response.tool_calls {
                    // 带超时
                    let result = tokio::time::timeout(
                        Duration::from_secs(120),
                        tool_runner::execute_tool(...)
                    ).await??;
                    results.push(result);
                }
                messages.push(Message::tool_results(results));
            }
            StopReason::EndTurn => break,
            _ => {}
        }
    }

    // 保存会话
    memory.save_session(session).await?;
    Ok(AgentLoopResult { ... })
}
```

### 6.3 关键概念映射

| Node.js 概念 | Rust 等价物 | 说明 |
|-------------|------------|------|
| `Promise` | `Future` | Rust Future 更轻量，不分配堆内存 |
| `await` | `.await` | 类似语法，但 Rust 在编译期生成状态机 |
| `EventEmitter` | `tokio::sync::mpsc` | 多生产者单消费者通道 |
| `setTimeout` | `tokio::time::sleep` | 非阻塞延迟 |
| `AbortController` | `tokio::select!` | 取消或超时控制 |
| `Error` 对象 | `Result<T, E>` | 强制错误处理，无异常 |

---

## 7. 流式响应处理

### 7.1 StreamEvent 枚举

`crates/openfang-runtime/src/llm_driver.rs` 定义了流式事件：

```rust
#[derive(Debug, Clone)]
pub enum StreamEvent {
    // 文本增量
    TextDelta { text: String },

    // 工具调用开始
    ToolUseStart { id: String, name: String },

    // 工具输入增量（JSON 流）
    ToolInputDelta { text: String },

    // 工具调用完成
    ToolUseEnd { id: String, name: String, input: serde_json::Value },

    // 思考过程（Claude 3.7 Sonnet）
    ThinkingDelta { text: String },

    // 响应完成
    ContentComplete { stop_reason: StopReason, usage: TokenUsage },

    // 阶段变更（用于 UI）
    PhaseChange { phase: String, detail: Option<String> },

    // 工具执行结果（由 Agent 循环发出）
    ToolExecutionResult { name: String, result_preview: String, is_error: bool },
}
```

### 7.2 流式处理流程

```rust
// 创建通道
let (tx, mut rx) = tokio::sync::mpsc::channel::<StreamEvent>(100);

// 在单独任务中消费流
tokio::spawn(async move {
    while let Some(event) = rx.recv().await {
        match event {
            StreamEvent::TextDelta { text } => {
                print!("{}", text);  // 实时输出到 UI
            }
            StreamEvent::ToolUseStart { name, .. } => {
                println!("\n🔧 开始执行: {}\n", name);
            }
            StreamEvent::ContentComplete { usage, .. } => {
                println!("\n✅ 完成，使用了 {} tokens", usage.total());
                break;
            }
            _ => {}
        }
    }
});

// 启动流式请求
let response = driver.stream(request, tx).await?;
```

### 7.3 默认流式实现

对于不支持原生流式的驱动，提供默认实现：

```rust
#[async_trait]
pub trait LlmDriver: Send + Sync {
    // 非流式请求
    async fn complete(&self, request: CompletionRequest)
        -> Result<CompletionResponse, LlmError>;

    // 流式请求（默认包装 complete）
    async fn stream(
        &self,
        request: CompletionRequest,
        tx: tokio::sync::mpsc::Sender<StreamEvent>,
    ) -> Result<CompletionResponse, LlmError> {
        let response = self.complete(request).await?;
        let text = response.text();

        // 模拟流式：一次性发送所有文本
        if !text.is_empty() {
            let _ = tx.send(StreamEvent::TextDelta { text }).await;
        }

        let _ = tx.send(StreamEvent::ContentComplete {
            stop_reason: response.stop_reason,
            usage: response.usage,
        }).await;

        Ok(response)
    }
}
```

### 7.4 Node.js 对比

**Node.js (OpenAI SDK)**：

```javascript
const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [...],
    stream: true,
});

for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

**Rust (OpenFang)**：

```rust
let (tx, mut rx) = tokio::sync::mpsc::channel(100);

// 流式任务
tokio::spawn(async move {
    while let Some(event) = rx.recv().await {
        if let StreamEvent::TextDelta { text } = event {
            print!("{}", text);
        }
    }
});

// 驱动负责发送事件
driver.stream(request, tx).await?;
```

**关键区别**：
- Node.js：使用 `for await...of` 消费异步迭代器
- Rust：使用通道（channel）进行跨任务通信，更灵活但需手动管理

---

## 总结

本章深入解析了 OpenFang 的 Agent 执行循环：

1. **run_agent_loop** 是核心入口，采用"思考-行动-观察"循环模式
2. **生命周期管理** 通过 LoopPhase 和 LoopGuard 保证安全和可观测性
3. **工具调用** 支持权限检查、人工审批、污点追踪和超时控制
4. **内存召回** 结合向量搜索和文本搜索，自动注入上下文
5. **会话管理** 使用 SQLite + MessagePack，支持规范会话跨渠道共享
6. **与 Node.js 对比** Rust 的异步模型在编译期保证安全，无回调地狱
7. **流式处理** 通过通道实现实时响应，支持文本增量和工具事件

理解这些机制将帮助你：
- 调试 Agent 行为异常
- 定制工具执行逻辑
- 优化上下文窗口使用
- 扩展流式响应处理

---

**参考代码**：
- `crates/openfang-runtime/src/agent_loop.rs` - 主循环实现
- `crates/openfang-runtime/src/tool_runner.rs` - 工具执行
- `crates/openfang-memory/src/session.rs` - 会话管理
- `crates/openfang-runtime/src/llm_driver.rs` - LLM 驱动 trait
