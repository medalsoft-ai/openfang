# 第四章：LLM 驱动实现解析

> 理解 OpenFang 如何抽象多种 LLM 提供商，以及如何实现一个完整的驱动

## 本章目标

完成本章后，你将：
- 理解 `LlmDriver` trait 的设计哲学
- 掌握 Provider 工厂模式的实现
- 学会设计健壮的错误处理与重试机制
- 理解流式响应（SSE/Channel）的实现原理
- 能够添加新的 LLM Provider

## 目录

1. [LlmDriver Trait 设计](#1-llmdriver-trait-设计) - 抽象的艺术
2. [Provider 工厂模式](#2-provider-工厂模式) - 灵活的多态创建
3. [错误处理与重试机制](#3-错误处理与重试机制) - 健壮性保障
4. [流式响应实现](#4-流式响应实现) - 实时交互
5. [添加新 Provider](#5-添加新-provider) - 实战指南
6. [OpenAI 兼容驱动详解](#6-openai-兼容驱动详解) - 通用实现
7. [Anthropic 专用驱动对比](#7-anthropic-专用驱动对比) - 特殊处理

---

## 1. LlmDriver Trait 设计

### 1.1 为什么需要 Trait 抽象

**JavaScript 的思路（直接依赖）：**
```javascript
class AgentService {
    constructor() {
        // 直接依赖具体实现
        this.openai = new OpenAIClient({ apiKey: process.env.OPENAI_KEY });
        this.anthropic = new AnthropicClient({ apiKey: process.env.ANTHROPIC_KEY });
    }

    async complete(provider, messages) {
        if (provider === 'openai') {
            return this.openai.chat.completions.create({ messages });
        } else if (provider === 'anthropic') {
            return this.anthropic.messages.create({ messages });
        }
        // 更多 if-else...
    }
}
```

**Rust 的思路（Trait 抽象）：**
```rust
// crates/openfang-runtime/src/llm_driver.rs
#[async_trait]
pub trait LlmDriver: Send + Sync {
    /// 发送完成请求并获取响应
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, LlmError>;

    /// 流式完成请求，通过 channel 发送增量事件
    async fn stream(
        &self,
        request: CompletionRequest,
        tx: tokio::sync::mpsc::Sender<StreamEvent>,
    ) -> Result<CompletionResponse, LlmError> {
        // 默认实现：包装 complete() 方法
        let response = self.complete(request).await?;
        let text = response.text();
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

**关键设计决策：**

| 特性 | 说明 |
|------|------|
| `async_trait` | 允许 trait 方法使用 async/await |
| `Send + Sync` | 确保线程安全，可跨线程共享 |
| 默认实现 | `stream()` 提供基于 `complete()` 的默认实现，减少重复代码 |
| 关联类型 | 使用具体类型而非泛型，简化使用 |

### 1.2 请求与响应类型

```rust
/// 完成请求
#[derive(Debug, Clone)]
pub struct CompletionRequest {
    pub model: String,
    pub messages: Vec<Message>,
    pub tools: Vec<ToolDefinition>,
    pub max_tokens: u32,
    pub temperature: f32,
    pub system: Option<String>,
    pub thinking: Option<ThinkingConfig>,
}

/// 完成响应
#[derive(Debug, Clone)]
pub struct CompletionResponse {
    pub content: Vec<ContentBlock>,
    pub stop_reason: StopReason,
    pub tool_calls: Vec<ToolCall>,
    pub usage: TokenUsage,
}

/// 流式事件
#[derive(Debug, Clone)]
pub enum StreamEvent {
    TextDelta { text: String },
    ToolUseStart { id: String, name: String },
    ToolInputDelta { text: String },
    ToolUseEnd { id: String, name: String, input: serde_json::Value },
    ThinkingDelta { text: String },
    ContentComplete { stop_reason: StopReason, usage: TokenUsage },
    PhaseChange { phase: String, detail: Option<String> },
    ToolExecutionResult { name: String, result_preview: String, is_error: bool },
}
```

**设计亮点：**
- `ContentBlock` 支持文本、工具调用、思考过程等多种内容类型
- `StreamEvent` 枚举涵盖完整的交互生命周期
- 统一的 `TokenUsage` 用于成本追踪

### 1.3 错误类型设计

```rust
#[derive(Error, Debug)]
pub enum LlmError {
    #[error("HTTP error: {0}")]
    Http(String),

    #[error("API error ({status}): {message}")]
    Api {
        status: u16,
        message: String,
    },

    #[error("Rate limited, retry after {retry_after_ms}ms")]
    RateLimited {
        retry_after_ms: u64,
    },

    #[error("Parse error: {0}")]
    Parse(String),

    #[error("Missing API key: {0}")]
    MissingApiKey(String),

    #[error("Model overloaded, retry after {retry_after_ms}ms")]
    Overloaded {
        retry_after_ms: u64,
    },
}
```

**与 JavaScript 的对比：**
- JS 中通常用 `Error` 类或自定义错误类
- Rust 的枚举错误类型可以携带结构化数据（如 `retry_after_ms`）
- `thiserror` 宏自动生成 `Display` 实现

---

## 2. Provider 工厂模式

### 2.1 工厂函数实现

```rust
// crates/openfang-runtime/src/drivers/mod.rs

/// 基于提供商名称和配置创建 LLM 驱动
pub fn create_driver(config: &DriverConfig) -> Result<Arc<dyn LlmDriver>, LlmError> {
    let provider = config.provider.as_str();

    // Anthropic 使用不同的 API 格式 —— 特殊处理
    if provider == "anthropic" {
        let api_key = config
            .api_key
            .clone()
            .or_else(|| std::env::var("ANTHROPIC_API_KEY").ok())
            .ok_or_else(|| {
                LlmError::MissingApiKey("Set ANTHROPIC_API_KEY environment variable".to_string())
            })?;
        let base_url = config
            .base_url
            .clone()
            .unwrap_or_else(|| ANTHROPIC_BASE_URL.to_string());
        return Ok(Arc::new(anthropic::AnthropicDriver::new(api_key, base_url)));
    }

    // Gemini 使用不同的 API 格式 —— 特殊处理
    if provider == "gemini" || provider == "google" {
        let api_key = config
            .api_key
            .clone()
            .or_else(|| std::env::var("GEMINI_API_KEY").ok())
            .or_else(|| std::env::var("GOOGLE_API_KEY").ok())
            .ok_or_else(|| {
                LlmError::MissingApiKey(
                    "Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable".to_string(),
                )
            })?;
        let base_url = config
            .base_url
            .clone()
            .unwrap_or_else(|| GEMINI_BASE_URL.to_string());
        return Ok(Arc::new(gemini::GeminiDriver::new(api_key, base_url)));
    }

    // 其他所有提供商使用 OpenAI 兼容格式
    if let Some(defaults) = provider_defaults(provider) {
        let api_key = config
            .api_key
            .clone()
            .or_else(|| std::env::var(defaults.api_key_env).ok())
            .unwrap_or_default();

        if defaults.key_required && api_key.is_empty() {
            return Err(LlmError::MissingApiKey(format!(
                "Set {} environment variable for provider '{}'",
                defaults.api_key_env, provider
            )));
        }

        let base_url = config
            .base_url
            .clone()
            .unwrap_or_else(|| defaults.base_url.to_string());

        return Ok(Arc::new(openai::OpenAIDriver::new(api_key, base_url)));
    }

    // 未知提供商 —— 如果设置了 base_url，视为自定义 OpenAI 兼容端点
    if let Some(ref base_url) = config.base_url {
        let api_key = config.api_key.clone().unwrap_or_default();
        return Ok(Arc::new(openai::OpenAIDriver::new(api_key, base_url.clone())));
    }

    Err(LlmError::Api {
        status: 0,
        message: format!("Unknown provider '{}'", provider),
    })
}
```

### 2.2 Provider 配置元数据

```rust
/// 提供商元数据：基础 URL 和 API key 环境变量名
struct ProviderDefaults {
    base_url: &'static str,
    api_key_env: &'static str,
    key_required: bool,
}

/// 获取已知提供商的默认配置
fn provider_defaults(provider: &str) -> Option<ProviderDefaults> {
    match provider {
        "groq" => Some(ProviderDefaults {
            base_url: GROQ_BASE_URL,
            api_key_env: "GROQ_API_KEY",
            key_required: true,
        }),
        "openrouter" => Some(ProviderDefaults {
            base_url: OPENROUTER_BASE_URL,
            api_key_env: "OPENROUTER_API_KEY",
            key_required: true,
        }),
        "ollama" => Some(ProviderDefaults {
            base_url: OLLAMA_BASE_URL,
            api_key_env: "OLLAMA_API_KEY",
            key_required: false,  // 本地服务不需要 API key
        }),
        // ... 更多提供商
        _ => None,
    }
}
```

**设计优势：**
- **开闭原则**：添加新 Provider 只需修改 `provider_defaults`，不影响已有代码
- **环境变量回退**：支持从配置文件或环境变量读取 API key
- **本地服务支持**：Ollama、vLLM 等本地服务不需要 API key
- **自定义端点**：任意 OpenAI 兼容端点只需设置 `base_url`

### 2.3 使用示例

```rust
// 创建 Groq 驱动
let groq_config = DriverConfig {
    provider: "groq".to_string(),
    api_key: None,  // 从 GROQ_API_KEY 环境变量读取
    base_url: None,
};
let driver = create_driver(&groq_config)?;

// 创建自定义 OpenAI 兼容端点
let custom_config = DriverConfig {
    provider: "my-llm".to_string(),
    api_key: Some("secret".to_string()),
    base_url: Some("http://localhost:8080/v1".to_string()),
};
let driver = create_driver(&custom_config)?;  // 使用 OpenAIDriver
```

---

## 3. 错误处理与重试机制

### 3.1 分层错误处理策略

```rust
// crates/openfang-runtime/src/drivers/anthropic.rs
async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, LlmError> {
    let max_retries = 3;

    for attempt in 0..=max_retries {
        let resp = self.client
            .post(&url)
            .header("x-api-key", self.api_key.as_str())
            .json(&api_request)
            .send()
            .await
            .map_err(|e| LlmError::Http(e.to_string()))?;

        let status = resp.status().as_u16();

        // 处理速率限制（429）和模型过载（529）
        if status == 429 || status == 529 {
            if attempt < max_retries {
                let retry_ms = (attempt + 1) as u64 * 2000;  // 指数退避
                warn!(status, retry_ms, "Rate limited, retrying");
                tokio::time::sleep(Duration::from_millis(retry_ms)).await;
                continue;  // 重试
            }
            return Err(if status == 429 {
                LlmError::RateLimited { retry_after_ms: 5000 }
            } else {
                LlmError::Overloaded { retry_after_ms: 5000 }
            });
        }

        // 处理其他错误
        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(LlmError::Api { status, message: body });
        }

        // 成功，解析响应
        let body = resp.text().await.map_err(|e| LlmError::Http(e.to_string()))?;
        let api_response: ApiResponse = serde_json::from_str(&body)
            .map_err(|e| LlmError::Parse(e.to_string()))?;

        return Ok(convert_response(api_response));
    }

    Err(LlmError::Api {
        status: 0,
        message: "Max retries exceeded".to_string(),
    })
}
```

### 3.2 OpenAI 驱动的特殊错误恢复

```rust
// crates/openfang-runtime/src/drivers/openai.rs
if !resp.status().is_success() {
    let body = resp.text().await.unwrap_or_default();

    // Groq "tool_use_failed"：模型以 XML 格式生成了工具调用
    // 解析 failed_generation 并转换为正确的工具调用响应
    if status == 400 && body.contains("tool_use_failed") {
        if let Some(response) = parse_groq_failed_tool_call(&body) {
            warn!("Recovered tool call from Groq failed_generation");
            return Ok(response);
        }
        if attempt < max_retries {
            let retry_ms = (attempt + 1) as u64 * 1500;
            tokio::time::sleep(Duration::from_millis(retry_ms)).await;
            continue;
        }
    }

    // GPT-5 / o-series：从 max_tokens 切换到 max_completion_tokens
    if status == 400 && body.contains("max_tokens")
        && body.contains("unsupported_parameter")
        && attempt < max_retries
    {
        let val = oai_request.max_tokens.unwrap();
        oai_request.max_tokens = None;
        oai_request.max_completion_tokens = Some(val);
        continue;  // 使用新参数重试
    }

    // 自动降低 max_tokens 当模型拒绝我们的值
    if status == 400 && body.contains("max_tokens") && attempt < max_retries {
        let current = oai_request.max_tokens.unwrap_or(4096);
        let cap = extract_max_tokens_limit(&body).unwrap_or(current / 2);
        oai_request.max_tokens = Some(cap);
        continue;
    }

    return Err(LlmError::Api { status, message: body });
}
```

**关键策略：**
1. **指数退避**：`retry_ms = (attempt + 1) * 2000`
2. **特殊错误恢复**：Groq 的 XML 工具调用格式问题
3. **参数自适应**：自动切换 `max_tokens` -> `max_completion_tokens`
4. **动态限制**：从错误消息中提取并应用模型的 token 限制

---

## 4. 流式响应实现

### 4.1 两种流式架构

**SSE（Server-Sent Events）方式：**
```rust
// Anthropic 使用 SSE 格式
async fn stream(&self, request: CompletionRequest, tx: Sender<StreamEvent>) -> Result<...> {
    let mut byte_stream = resp.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = byte_stream.next().await {
        let chunk = chunk_result.map_err(|e| LlmError::Http(e.to_string()))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        // SSE 消息以 "\n\n" 分隔
        while let Some(pos) = buffer.find("\n\n") {
            let event_text = buffer[..pos].to_string();
            buffer = buffer[pos + 2..].to_string();

            // 解析 event: 和 data: 行
            let mut event_type = String::new();
            let mut data = String::new();
            for line in event_text.lines() {
                if let Some(et) = line.strip_prefix("event:") {
                    event_type = et.trim_start().to_string();
                } else if let Some(d) = line.strip_prefix("data:") {
                    data = d.trim_start().to_string();
                }
            }

            // 根据事件类型处理
            match event_type.as_str() {
                "content_block_delta" => {
                    // 发送文本增量...
                }
                "message_delta" => {
                    // 发送完成事件...
                }
                _ => {}
            }
        }
    }
}
```

**OpenAI 兼容格式：**
```rust
// OpenAI 使用行分隔的 JSON
while let Some(pos) = buffer.find('\n') {
    let line = buffer[..pos].trim_end().to_string();
    buffer = buffer[pos + 1..].to_string();

    if line.is_empty() || line.starts_with(':') {
        continue;
    }

    let data = match line.strip_prefix("data:") {
        Some(d) => d.trim_start(),
        None => continue,
    };

    if data == "[DONE]" {
        continue;
    }

    let json: serde_json::Value = match serde_json::from_str(data) {
        Ok(v) => v,
        Err(_) => continue,
    };

    // 提取 choices[0].delta.content
    if let Some(text) = json["choices"][0]["delta"]["content"].as_str() {
        tx.send(StreamEvent::TextDelta { text: text.to_string() }).await?;
    }
}
```

### 4.2 工具调用的流式处理

```rust
// 跟踪累积的工具调用参数
let mut tool_accum: Vec<(String, String, String)> = Vec::new();  // (id, name, arguments)

// 在流中处理工具调用增量
if let Some(calls) = json["choices"][0]["delta"]["tool_calls"].as_array() {
    for call in calls {
        let idx = call["index"].as_u64().unwrap_or(0) as usize;

        // 确保有足够的条目
        while tool_accum.len() <= idx {
            tool_accum.push((String::new(), String::new(), String::new()));
        }

        // 更新 ID（首次发送）
        if let Some(id) = call["id"].as_str() {
            tool_accum[idx].0 = id.to_string();
        }

        // 更新函数名和参数
        if let Some(func) = call.get("function") {
            if let Some(name) = func["name"].as_str() {
                tool_accum[idx].1 = name.to_string();
                tx.send(StreamEvent::ToolUseStart {
                    id: tool_accum[idx].0.clone(),
                    name: name.to_string(),
                }).await?;
            }

            if let Some(args) = func["arguments"].as_str() {
                tool_accum[idx].2.push_str(args);
                tx.send(StreamEvent::ToolInputDelta { text: args.to_string() }).await?;
            }
        }
    }
}
```

### 4.3 Channel 通信模式

```rust
// 在 Agent 循环中使用流式响应
pub async fn run_agent_loop(
    &self,
    request: CompletionRequest,
) -> Result<AgentLoopResult, OpenFangError> {
    // 创建 channel（缓冲区大小 16）
    let (tx, mut rx) = mpsc::channel(16);

    // 在后台任务中处理流式响应
    let driver = Arc::clone(&self.driver);
    let stream_task = tokio::spawn(async move {
        driver.stream(request, tx).await
    });

    // 在主循环中接收事件并发送给客户端
    while let Some(event) = rx.recv().await {
        match event {
            StreamEvent::TextDelta { text } => {
                self.send_to_client(ClientMessage::TextChunk(text)).await?;
            }
            StreamEvent::ToolUseStart { id, name } => {
                self.send_to_client(ClientMessage::ToolStart { id, name }).await?;
            }
            StreamEvent::ToolUseEnd { id, name, input } => {
                // 执行工具调用
                let result = self.execute_tool(&name, input).await;
                // ...
            }
            StreamEvent::ContentComplete { stop_reason, usage } => {
                // 记录 token 使用情况
                self.record_usage(usage).await?;
                break;
            }
            _ => {}
        }
    }

    // 等待流式任务完成并获取最终响应
    let response = stream_task.await??;

    Ok(AgentLoopResult {
        response: response.text(),
        tool_calls: response.tool_calls,
        usage: response.usage,
    })
}
```

---

## 5. 添加新 Provider

### 5.1 实现步骤

假设我们要添加一个新的 LLM 提供商 "AwesomeAI"：

**步骤 1：创建驱动文件**

```rust
// crates/openfang-runtime/src/drivers/awesome_ai.rs

use crate::llm_driver::{CompletionRequest, CompletionResponse, LlmDriver, LlmError, StreamEvent};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

pub struct AwesomeAiDriver {
    api_key: String,
    base_url: String,
    client: reqwest::Client,
}

impl AwesomeAiDriver {
    pub fn new(api_key: String, base_url: String) -> Self {
        Self {
            api_key,
            base_url,
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl LlmDriver for AwesomeAiDriver {
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, LlmError> {
        // 1. 转换请求格式
        let api_request = convert_to_api_format(&request);

        // 2. 发送 HTTP 请求
        let resp = self.client
            .post(format!("{}/v1/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&api_request)
            .send()
            .await
            .map_err(|e| LlmError::Http(e.to_string()))?;

        // 3. 处理错误（实现重试逻辑）
        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            return Err(LlmError::Api { status, message: body });
        }

        // 4. 解析响应
        let api_response: ApiResponse = resp.json().await
            .map_err(|e| LlmError::Parse(e.to_string()))?;

        // 5. 转换为统一格式
        Ok(convert_from_api_format(api_response))
    }
}
```

**步骤 2：注册到模块**

```rust
// crates/openfang-runtime/src/drivers/mod.rs

pub mod awesome_ai;  // 添加这行

// 在 provider_defaults 中添加
fn provider_defaults(provider: &str) -> Option<ProviderDefaults> {
    match provider {
        // ... 其他提供商
        "awesomeai" => Some(ProviderDefaults {
            base_url: "https://api.awesomeai.com/v1",
            api_key_env: "AWESOMEAI_API_KEY",
            key_required: true,
        }),
        _ => None,
    }
}

// 在 create_driver 中添加特殊处理（如果需要）
if provider == "awesomeai" {
    let api_key = config.api_key.clone()
        .or_else(|| std::env::var("AWESOMEAI_API_KEY").ok())
        .ok_or_else(|| LlmError::MissingApiKey("Set AWESOMEAI_API_KEY".to_string()))?;
    let base_url = config.base_url.clone()
        .unwrap_or_else(|| "https://api.awesomeai.com/v1".to_string());
    return Ok(Arc::new(awesome_ai::AwesomeAiDriver::new(api_key, base_url)));
}
```

**步骤 3：添加到已知提供商列表**

```rust
pub fn known_providers() -> &'static [&'static str] {
    &[
        // ... 其他提供商
        "awesomeai",
    ]
}
```

### 5.2 如果是 OpenAI 兼容格式

如果新提供商兼容 OpenAI 格式，只需在 `provider_defaults` 中添加配置，**无需创建新驱动**：

```rust
"awesomeai" => Some(ProviderDefaults {
    base_url: "https://api.awesomeai.com/v1",
    api_key_env: "AWESOMEAI_API_KEY",
    key_required: true,
}),
```

工厂会自动使用 `OpenAIDriver`。

---

## 6. OpenAI 兼容驱动详解

### 6.1 统一的请求/响应转换

```rust
// 请求转换：OpenFang 类型 -> OpenAI 格式
#[derive(Debug, Serialize)]
struct OaiRequest {
    model: String,
    messages: Vec<OaiMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_completion_tokens: Option<u32>,  // GPT-5 / o-series 使用
    temperature: f32,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tools: Vec<OaiTool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_choice: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    stream: bool,
}

// 智能选择 token 参数字段
fn uses_completion_tokens(model: &str) -> bool {
    let m = model.to_lowercase();
    m.starts_with("gpt-5") || m.starts_with("o1") || m.starts_with("o3") || m.starts_with("o4")
}

let (mt, mct) = if uses_completion_tokens(&request.model) {
    (None, Some(request.max_tokens))
} else {
    (Some(request.max_tokens), None)
};
```

### 6.2 消息格式转换

```rust
// 处理多种消息内容类型
match (&msg.role, &msg.content) {
    (Role::System, MessageContent::Text(text)) => {
        oai_messages.push(OaiMessage {
            role: "system".to_string(),
            content: Some(OaiMessageContent::Text(text.clone())),
            tool_calls: None,
            tool_call_id: None,
        });
    }
    (Role::User, MessageContent::Blocks(blocks)) => {
        let mut parts: Vec<OaiContentPart> = Vec::new();
        for block in blocks {
            match block {
                ContentBlock::Text { text } => {
                    parts.push(OaiContentPart::Text { text: text.clone() });
                }
                ContentBlock::Image { media_type, data } => {
                    parts.push(OaiContentPart::ImageUrl {
                        image_url: OaiImageUrl {
                            url: format!("data:{media_type};base64,{data}"),
                        },
                    });
                }
                // ... 处理其他块类型
            }
        }
        oai_messages.push(OaiMessage {
            role: "user".to_string(),
            content: Some(OaiMessageContent::Parts(parts)),
            tool_calls: None,
            tool_call_id: None,
        });
    }
    // ... 处理 Assistant 消息和工具调用
}
```

### 6.3 工具调用格式

```rust
// OpenAI 工具格式
#[derive(Debug, Serialize)]
struct OaiTool {
    #[serde(rename = "type")]
    tool_type: String,
    function: OaiToolDef,
}

#[derive(Debug, Serialize)]
struct OaiToolDef {
    name: String,
    description: String,
    parameters: serde_json::Value,
}

// 转换工具定义
let oai_tools: Vec<OaiTool> = request.tools.iter().map(|t| OaiTool {
    tool_type: "function".to_string(),
    function: OaiToolDef {
        name: t.name.clone(),
        description: t.description.clone(),
        parameters: normalize_schema_for_provider(&t.input_schema, "openai"),
    },
}).collect();
```

---

## 7. Anthropic 专用驱动对比

### 7.1 关键差异

| 特性 | OpenAI 格式 | Anthropic 格式 |
|------|-------------|----------------|
| 系统提示 | 作为消息数组中的第一条 | 独立的 `system` 参数字段 |
| 工具调用 | `tool_calls` 数组 | `content` 中的 `tool_use` 块 |
| 流式格式 | 行分隔 JSON | SSE (`event:` + `data:`) |
| 认证头 | `Authorization: Bearer` | `x-api-key` |
| API 版本 | 路径中包含版本 | `anthropic-version` 头 |

### 7.2 系统提示处理

```rust
// Anthropic 将系统提示提取到独立参数
let system = request.system.clone().or_else(|| {
    request.messages.iter().find_map(|m| {
        if m.role == Role::System {
            match &m.content {
                MessageContent::Text(t) => Some(t.clone()),
                _ => None,
            }
        } else {
            None
        }
    })
});

// 过滤掉系统消息，不放入 messages 数组
let api_messages: Vec<ApiMessage> = request.messages
    .iter()
    .filter(|m| m.role != Role::System)
    .map(convert_message)
    .collect();

let api_request = ApiRequest {
    model: request.model,
    max_tokens: request.max_tokens,
    system,  // 独立字段
    messages: api_messages,
    tools: api_tools,
    temperature: Some(request.temperature),
    stream: false,
};
```

### 7.3 SSE 流式解析

```rust
// Anthropic 的 SSE 格式示例：
// event: content_block_start
// data: {"type": "content_block_start", "index": 0, "content_block": {...}}
//
// event: content_block_delta
// data: {"type": "content_block_delta", "index": 0, "delta": {...}}

while let Some(pos) = buffer.find("\n\n") {
    let event_text = buffer[..pos].to_string();
    buffer = buffer[pos + 2..].to_string();

    let mut event_type = String::new();
    let mut data = String::new();

    for line in event_text.lines() {
        if let Some(et) = line.strip_prefix("event:") {
            event_type = et.trim_start().to_string();
        } else if let Some(d) = line.strip_prefix("data:") {
            data = d.trim_start().to_string();
        }
    }

    let json: serde_json::Value = serde_json::from_str(&data)?;

    match event_type.as_str() {
        "content_block_start" => {
            match json["content_block"]["type"].as_str() {
                Some("tool_use") => {
                    let id = json["content_block"]["id"].as_str().unwrap_or("");
                    let name = json["content_block"]["name"].as_str().unwrap_or("");
                    tx.send(StreamEvent::ToolUseStart {
                        id: id.to_string(),
                        name: name.to_string(),
                    }).await?;
                }
                _ => {}
            }
        }
        "content_block_delta" => {
            match json["delta"]["type"].as_str() {
                Some("text_delta") => {
                    if let Some(text) = json["delta"]["text"].as_str() {
                        tx.send(StreamEvent::TextDelta { text: text.to_string() }).await?;
                    }
                }
                Some("input_json_delta") => {
                    if let Some(partial) = json["delta"]["partial_json"].as_str() {
                        tx.send(StreamEvent::ToolInputDelta { text: partial.to_string() }).await?;
                    }
                }
                _ => {}
            }
        }
        _ => {}
    }
}
```

### 7.4 思考过程支持

Anthropic 的 Claude 3.7+ 支持扩展思考模式：

```rust
// 在响应内容块中处理思考过程
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum ResponseContentBlock {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "tool_use")]
    ToolUse { id: String, name: String, input: serde_json::Value },
    #[serde(rename = "thinking")]
    Thinking { thinking: String },  // 思考过程
}

// 转换时保留思考内容
fn convert_response(api: ApiResponse) -> CompletionResponse {
    let mut content = Vec::new();

    for block in api.content {
        match block {
            ResponseContentBlock::Text { text } => {
                content.push(ContentBlock::Text { text });
            }
            ResponseContentBlock::Thinking { thinking } => {
                content.push(ContentBlock::Thinking { thinking });
            }
            // ...
        }
    }

    CompletionResponse { content, /* ... */ }
}
```

---

## 8. 动手练习

### 练习 1：实现重试逻辑

完成以下代码，实现带指数退避的重试机制：

```rust
async fn call_with_retry<F, Fut, T>(
    operation: F,
    max_retries: u32,
) -> Result<T, LlmError>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T, LlmError>>,
{
    for attempt in 0..=max_retries {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(e) => {
                // TODO: 如果是 RateLimited 或 Overloaded，等待后重试
                // 其他错误直接返回
                todo!("实现重试逻辑")
            }
        }
    }

    Err(LlmError::Api {
        status: 0,
        message: "Max retries exceeded".to_string(),
    })
}
```

**答案参考：** `code-examples/exercise1_answer.rs`

### 练习 2：创建模拟驱动

实现一个 `MockDriver` 用于测试：

```rust
pub struct MockDriver {
    preset_response: String,
    delay_ms: u64,
}

#[async_trait]
impl LlmDriver for MockDriver {
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, LlmError> {
        // TODO:
        // 1. 模拟延迟（tokio::time::sleep）
        // 2. 返回预设响应
        // 3. 如果请求中包含 "error"，返回 LlmError::Api
        todo!("实现模拟驱动")
    }
}
```

**答案参考：** `code-examples/exercise2_answer.rs`

---

## 延伸阅读

### 必读
- [OpenAI API 文档](https://platform.openai.com/docs/api-reference)
- [Anthropic Messages API](https://docs.anthropic.com/claude/reference/messages_post)
- [SSE 规范](https://html.spec.whatwg.org/multipage/server-sent-events.html)

### 选读
- [Rust Async Book](https://rust-lang.github.io/async-book/)
- [Tokio 文档](https://docs.rs/tokio/latest/tokio/)

### 下一章预告

在 [第五章：Agent 循环](../05-agent-loop/README.md) 中，我们将：
- 理解 Agent 的核心执行循环
- 学习工具调用与执行的流程
- 掌握记忆召回与上下文构建
- 实现多轮对话管理

---

准备好了吗？继续前往 [第五章 →](../05-agent-loop/README.md)
