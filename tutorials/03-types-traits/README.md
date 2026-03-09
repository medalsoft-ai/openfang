# 第三章：类型系统与 Trait 详解

> 从 TypeScript 到 Rust：类型系统的进化之路

## 本章目标

完成本章后，你将：
- 理解 Rust 的类型系统与 TypeScript 的关键差异
- 掌握 Newtype 模式及其在 OpenFang 中的应用
- 深入理解 Trait 及其与 TypeScript 接口的区别
- 学会使用 async_trait 处理异步接口
- 理解 Trait 对象与泛型的选择场景

## 目录

1. [Rust 类型系统概述](#1-rust-类型系统概述) - 与 TypeScript 的对比
2. [Newtype 模式](#2-newtype-模式) - 类型安全的利器
3. [Capability 枚举设计](#3-capability-枚举设计) - 权限系统的类型安全
4. [KernelHandle Trait](#4-kernelhandle-trait) - 解耦的核心设计
5. [async_trait 详解](#5-asynctrait-详解) - 异步接口的桥梁
6. [Trait 对象 vs 泛型](#6-trait-对象-vs-泛型) - 动态与静态分发
7. [动手练习](#7-动手练习)

---

## 1. Rust 类型系统概述

### 1.1 与 TypeScript 的核心差异

**TypeScript（结构性类型系统）：**
```typescript
// 只要形状相同，就是兼容的
interface User {
  id: string;
  name: string;
}

const user1: User = { id: "1", name: "Alice" };
const user2: User = { id: "2", name: "Bob", age: 25 }; // 可以，有额外字段

// 类型兼容性基于结构
interface Point2D { x: number; y: number; }
interface Point3D { x: number; y: number; z: number; }

const p3d: Point3D = { x: 1, y: 2, z: 3 };
const p2d: Point2D = p3d; // 可以，因为 Point3D 有 x 和 y
```

**Rust（名义性类型系统）：**
```rust
// 类型兼容性基于名称，不是结构
struct User {
    id: String,
    name: String,
}

struct Point2D {
    x: f64,
    y: f64,
}

struct Point3D {
    x: f64,
    y: f64,
    z: f64,
}

fn main() {
    let p3d = Point3D { x: 1.0, y: 2.0, z: 3.0 };
    // let p2d: Point2D = p3d;  // ✗ 编译错误！不同类型

    // 需要显式转换
    let p2d = Point2D { x: p3d.x, y: p3d.y };
}
```

**关键区别：**
- TypeScript：鸭子类型，结构兼容即可
- Rust：名义类型，必须显式声明关系

### 1.2 零成本抽象

Rust 的类型系统在编译期做尽可能多的检查，运行时没有额外开销。

**OpenFang 中的例子：**

```rust
// crates/openfang-types/src/agent.rs
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AgentId(pub Uuid);

impl AgentId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for AgentId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for AgentId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::str::FromStr for AgentId {
    type Err = uuid::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(Uuid::parse_str(s)?))
    }
}
```

这段代码定义了 `AgentId`，它在编译时提供类型安全，但运行时就是一个 `Uuid`，没有任何额外开销。

---

## 2. Newtype 模式

### 2.1 什么是 Newtype 模式？

Newtype 模式是用一个元组结构体包装一个已有类型，创建一个新的、语义不同的类型。

**TypeScript 中的类似做法：**
```typescript
// 使用 branded types
type AgentId = string & { __brand: 'AgentId' };
type SessionId = string & { __brand: 'SessionId' };

function createAgentId(): AgentId {
  return crypto.randomUUID() as AgentId;
}

const agentId = createAgentId();
const sessionId = crypto.randomUUID() as SessionId;

// 可以混用（不够安全）
const x: AgentId = sessionId; // 运行时不会报错
```

**Rust 的 Newtype 模式：**
```rust
// crates/openfang-types/src/agent.rs
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AgentId(pub Uuid);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SessionId(pub Uuid);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct UserId(pub Uuid);

fn main() {
    let agent_id = AgentId::new();
    let session_id = SessionId::new();

    // 不能混用！
    // let wrong: AgentId = session_id;  // ✗ 编译错误！
}
```

### 2.2 OpenFang 中的 Newtype 应用

```rust
// crates/openfang-types/src/agent.rs

// AgentId 的实现
impl AgentId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for AgentId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for AgentId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::str::FromStr for AgentId {
    type Err = uuid::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(Uuid::parse_str(s)?))
    }
}
```

**Newtype 的好处：**

1. **类型安全**：编译器防止 ID 类型混用
2. **语义清晰**：`AgentId` 比裸 `String` 或 `Uuid` 更有意义
3. **零成本**：运行时没有额外开销
4. **可扩展**：可以在 impl 块中添加方法

### 2.3 与 TypeScript 的对比

| 特性 | TypeScript | Rust |
|------|-----------|------|
| 类型安全 | 编译时检查（可绕过） | 编译时保证 |
| 运行时开销 | 无 | 无 |
| 代码生成 | 擦除类型 | 单态化（零成本） |
| 混用防护 | 弱（branded type） | 强（不同类型） |

---

## 3. Capability 枚举设计

### 3.1 权限系统的类型安全

OpenFang 使用 capability-based 安全模型，每个权限都是一个枚举变体。

**TypeScript 实现（不够安全）：**
```typescript
type Capability =
  | { type: 'FileRead', pattern: string }
  | { type: 'FileWrite', pattern: string }
  | { type: 'NetConnect', host: string }
  | { type: 'LlmMaxTokens', max: number };

// 可以构造无效的组合
const cap: Capability = {
  type: 'FileRead',
  pattern: '/etc/passwd',
  extra: 'field'  // 允许额外字段
};
```

**Rust 实现（精确控制）：**
```rust
// crates/openfang-types/src/capability.rs
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum Capability {
    // -- File system --
    FileRead(String),
    FileWrite(String),

    // -- Network --
    NetConnect(String),
    NetListen(u16),

    // -- Tools --
    ToolInvoke(String),
    ToolAll,

    // -- LLM --
    LlmQuery(String),
    LlmMaxTokens(u64),

    // -- Agent interaction --
    AgentSpawn,
    AgentMessage(String),
    AgentKill(String),

    // -- Memory --
    MemoryRead(String),
    MemoryWrite(String),

    // -- Shell --
    ShellExec(String),
    EnvRead(String),

    // -- OFP --
    OfpDiscover,
    OfpConnect(String),
    OfpAdvertise,

    // -- Economic --
    EconSpend(f64),
    EconEarn,
    EconTransfer(String),
}
```

### 3.2 枚举变体的数据承载

Rust 枚举的每个变体可以携带不同类型的数据：

```rust
// 变体携带不同类型和数量的数据
Capability::FileRead(String)           // 1个String
Capability::NetListen(u16)             // 1个u16
Capability::AgentSpawn                 // 无数据
Capability::EconSpend(f64)             // 1个f64
```

**对比 TypeScript 的 discriminated union：**
```typescript
type FileRead = { type: 'FileRead', value: string };
type NetListen = { type: 'NetListen', value: number };
type AgentSpawn = { type: 'AgentSpawn' };

// 需要手动确保每个变体都有 type 字段
// Rust 的 #[serde(tag = "type", content = "value")] 自动生成
```

### 3.3 权限匹配逻辑

```rust
// crates/openfang-types/src/capability.rs

pub fn capability_matches(granted: &Capability, required: &Capability) -> bool {
    match (granted, required) {
        // ToolAll 授予任何 ToolInvoke
        (Capability::ToolAll, Capability::ToolInvoke(_)) => true,

        // 相同变体，检查模式匹配
        (Capability::FileRead(g), Capability::FileRead(r)) => glob_matches(g, r),
        (Capability::NetConnect(g), Capability::NetConnect(r)) => glob_matches(g, r),

        // 数值能力：检查边界
        (Capability::LlmMaxTokens(g), Capability::LlmMaxTokens(r)) => g >= r,
        (Capability::EconSpend(g), Capability::EconSpend(r)) => g >= r,

        // 简单布尔能力
        (Capability::AgentSpawn, Capability::AgentSpawn) => true,
        (Capability::OfpDiscover, Capability::OfpDiscover) => true,

        // 不同变体永不匹配
        _ => false,
    }
}
```

**关键概念：**
- **穷尽匹配**：Rust 强制处理所有变体
- **模式解构**：可以直接提取变体内的数据
- **编译期检查**：忘记处理变体会编译错误

### 3.4 权限继承验证

```rust
// crates/openfang-types/src/capability.rs

pub fn validate_capability_inheritance(
    parent_caps: &[Capability],
    child_caps: &[Capability],
) -> Result<(), String> {
    for child_cap in child_caps {
        let is_covered = parent_caps
            .iter()
            .any(|parent_cap| capability_matches(parent_cap, child_cap));
        if !is_covered {
            return Err(format!(
                "Privilege escalation denied: child requests {:?} but parent does not have a matching grant",
                child_cap
            ));
        }
    }
    Ok(())
}
```

这个函数确保子 Agent 的权限不超过父 Agent，防止权限提升攻击。

---

## 4. KernelHandle Trait

### 4.1 Trait 是什么？

Trait 定义了类型的行为接口，类似于 TypeScript 的 interface，但更强大。

**TypeScript Interface：**
```typescript
interface KernelHandle {
  spawnAgent(manifest: string, parentId?: string): Promise<[string, string]>;
  sendToAgent(agentId: string, message: string): Promise<string>;
  listAgents(): AgentInfo[];
  killAgent(agentId: string): void;
}

// 任何对象只要实现了这些方法就满足接口
const mockHandle: KernelHandle = {
  spawnAgent: async () => ["id", "name"],
  sendToAgent: async () => "response",
  listAgents: () => [],
  killAgent: () => {}
};
```

**Rust Trait：**
```rust
// crates/openfang-runtime/src/kernel_handle.rs

#[async_trait]
pub trait KernelHandle: Send + Sync {
    async fn spawn_agent(
        &self,
        manifest_toml: &str,
        parent_id: Option<&str>,
    ) -> Result<(String, String), String>;

    async fn send_to_agent(&self, agent_id: &str, message: &str) -> Result<String, String>;

    fn list_agents(&self) -> Vec<AgentInfo>;

    fn kill_agent(&self, agent_id: &str) -> Result<(), String>;
}
```

### 4.2 关键差异

| 特性 | TypeScript Interface | Rust Trait |
|------|---------------------|------------|
| 实现方式 | 结构性（鸭子类型） | 显式 impl |
| 方法默认实现 | 不支持 | 支持 |
| 关联类型 | 有限 | 强大 |
| 泛型约束 | 支持 | 更强大（where 子句） |
| 孤儿规则 | 无 | 有（限制 impl） |

### 4.3 KernelHandle 的设计解析

```rust
// crates/openfang-runtime/src/kernel_handle.rs

#[async_trait]
pub trait KernelHandle: Send + Sync {
    // 异步方法：创建 Agent
    async fn spawn_agent(
        &self,
        manifest_toml: &str,
        parent_id: Option<&str>,
    ) -> Result<(String, String), String>;

    // 异步方法：发送消息
    async fn send_to_agent(&self, agent_id: &str, message: &str) -> Result<String, String>;

    // 同步方法：列出所有 Agent
    fn list_agents(&self) -> Vec<AgentInfo>;

    // 同步方法：终止 Agent
    fn kill_agent(&self, agent_id: &str) -> Result<(), String>;

    // 内存操作
    fn memory_store(&self, key: &str, value: serde_json::Value) -> Result<(), String>;
    fn memory_recall(&self, key: &str) -> Result<Option<serde_json::Value>, String>;

    // 任务队列
    async fn task_post(
        &self,
        title: &str,
        description: &str,
        assigned_to: Option<&str>,
        created_by: Option<&str>,
    ) -> Result<String, String>;

    // 默认实现的方法
    async fn cron_create(
        &self,
        agent_id: &str,
        job_json: serde_json::Value,
    ) -> Result<String, String> {
        let _ = (agent_id, job_json);
        Err("Cron scheduler not available".to_string())
    }

    // 权限检查（默认自动通过）
    fn requires_approval(&self, tool_name: &str) -> bool {
        let _ = tool_name;
        false
    }
}
```

**设计要点：**

1. **Send + Sync**：线程安全约束
   - `Send`：可以在线程间转移所有权
   - `Sync`：可以在线程间共享引用

2. **异步方法**：使用 `async_trait` 宏支持

3. **默认实现**：提供默认行为，实现者可以选择性覆盖

4. **错误处理**：使用 `Result` 类型显式处理错误

### 4.4 Trait 解决的问题

```rust
// 问题：runtime 和 kernel 互相依赖
// kernel 使用 runtime 来运行 Agent
// runtime 需要回调 kernel 来 spawn/send

// 解决方案：Trait 抽象
// runtime 只依赖 KernelHandle trait，不依赖具体 Kernel
// kernel 实现 KernelHandle，注入到 runtime

pub struct Runtime<H: KernelHandle> {
    kernel: H,
}

impl<H: KernelHandle> Runtime<H> {
    pub async fn spawn_sub_agent(&self, manifest: &str) -> Result<String, String> {
        self.kernel.spawn_agent(manifest, None).await
    }
}
```

这避免了循环依赖，实现了关注点分离。

---

## 5. async_trait 详解

### 5.1 为什么需要 async_trait？

Rust 目前不支持在 trait 中直接定义异步方法。

**不能这样写：**
```rust
pub trait MyTrait {
    async fn do_something(&self);  // ✗ 编译错误！
}
```

**需要这样写：**
```rust
use async_trait::async_trait;

#[async_trait]
pub trait MyTrait {
    async fn do_something(&self);  // ✓ 可以了
}
```

### 5.2 async_trait 的工作原理

`async_trait` 宏将异步方法转换为返回 `Pin<Box<dyn Future>>` 的普通方法：

```rust
// 你写的代码
#[async_trait]
pub trait LlmDriver: Send + Sync {
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, LlmError>;
}

// 宏展开后的代码（简化）
pub trait LlmDriver: Send + Sync {
    fn complete<'a>(
        &'a self,
        request: CompletionRequest,
    ) -> Pin<Box<dyn Future<Output = Result<CompletionResponse, LlmError>> + Send + 'a>>;
}
```

### 5.3 OpenFang 中的 LlmDriver Trait

```rust
// crates/openfang-runtime/src/llm_driver.rs

#[async_trait]
pub trait LlmDriver: Send + Sync {
    /// 发送 completion 请求并获取响应
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, LlmError>;

    /// 流式 completion，发送增量事件到 channel
    /// 默认实现基于 complete()
    async fn stream(
        &self,
        request: CompletionRequest,
        tx: tokio::sync::mpsc::Sender<StreamEvent>,
    ) -> Result<CompletionResponse, LlmError> {
        let response = self.complete(request).await?;
        let text = response.text();
        if !text.is_empty() {
            let _ = tx.send(StreamEvent::TextDelta { text }).await;
        }
        let _ = tx
            .send(StreamEvent::ContentComplete {
                stop_reason: response.stop_reason,
                usage: response.usage,
            })
            .await;
        Ok(response)
    }
}
```

**关键设计：**

1. **complete**：核心方法，必须实现
2. **stream**：有默认实现，可覆盖
3. **Send + Sync**：确保线程安全

### 5.4 实现 LlmDriver

```rust
// 为 Anthropic 驱动实现 LlmDriver
pub struct AnthropicDriver {
    api_key: String,
    client: reqwest::Client,
}

#[async_trait]
impl LlmDriver for AnthropicDriver {
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, LlmError> {
        // 实现 Anthropic API 调用
        let response = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .json(&request)
            .send()
            .await
            .map_err(|e| LlmError::Http(e.to_string()))?;

        // 解析响应...
    }
}
```

---

## 6. Trait 对象 vs 泛型

### 6.1 两种使用 Trait 的方式

**方式一：泛型（静态分发）**
```rust
pub struct Runtime<H: KernelHandle> {
    kernel: H,
}

impl<H: KernelHandle> Runtime<H> {
    pub fn new(kernel: H) -> Self {
        Self { kernel }
    }
}

// 使用
let runtime = Runtime::new(kernel);
```

**方式二：Trait 对象（动态分发）**
```rust
pub struct Runtime {
    kernel: Box<dyn KernelHandle>,
}

impl Runtime {
    pub fn new(kernel: Box<dyn KernelHandle>) -> Self {
        Self { kernel }
    }
}

// 或使用 Arc 共享所有权
pub struct Runtime {
    kernel: Arc<dyn KernelHandle>,
}
```

### 6.2 对比分析

| 特性 | 泛型（静态分发） | Trait 对象（动态分发） |
|------|---------------|---------------------|
| 编译期/运行期 | 编译期确定 | 运行期确定 |
| 性能 | 零成本抽象 | 有轻微开销（虚表查找） |
| 代码大小 | 单态化（可能膨胀） | 固定大小 |
| 灵活性 | 编译时固定 | 运行时切换 |
| 使用场景 | 大多数情况 | 需要动态类型时 |

### 6.3 OpenFang 的选择

**KernelHandle 使用 Trait 对象：**
```rust
// crates/openfang-runtime/src/runtime.rs
pub struct AgentRuntime {
    kernel: Arc<dyn KernelHandle>,
}
```

原因：
1. **解耦**：runtime 不需要知道具体的 kernel 类型
2. **灵活性**：可以在运行时切换不同的 kernel 实现
3. **共享所有权**：使用 `Arc` 允许多个 Agent 共享同一个 kernel

**LlmDriver 也使用 Trait 对象：**
```rust
pub struct AgentLoop {
    driver: Arc<dyn LlmDriver>,
}
```

### 6.4 如何选择？

**使用泛型当：**
- 性能至关重要
- 类型在编译时确定
- 不想有虚表开销

**使用 Trait 对象当：**
- 需要运行时多态
- 类型数量不确定
- 需要存储在集合中
- 需要减少编译时间/代码大小

### 6.5 代码示例对比

**泛型版本（编译时确定）：**
```rust
// 为每个具体类型生成一份代码
fn process<H: KernelHandle>(kernel: &H) {
    kernel.list_agents();
}

process(&kernel1);  // 生成 process::<Kernel1>
process(&kernel2);  // 生成 process::<Kernel2>
```

**Trait 对象版本（运行时确定）：**
```rust
// 只有一份代码
fn process(kernel: &dyn KernelHandle) {
    kernel.list_agents();  // 运行时查找虚表
}

process(&kernel1);  // 运行时确定类型
process(&kernel2);  // 同上
```

---

## 7. 动手练习

### 练习 1：实现自定义 Newtype

创建一个新的 ID 类型 `TaskId`，实现所有必要的 trait：

```rust
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct TaskId(pub Uuid);

impl TaskId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for TaskId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for TaskId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl FromStr for TaskId {
    type Err = uuid::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(Uuid::parse_str(s)?))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_id() {
        let id1 = TaskId::new();
        let id2 = TaskId::new();
        assert_ne!(id1, id2);

        let s = id1.to_string();
        let id3: TaskId = s.parse().unwrap();
        assert_eq!(id1, id3);
    }
}
```

### 练习 2：实现 Capability 匹配

实现一个简单的权限检查函数：

```rust
use openfang_types::capability::{Capability, capability_matches};

fn check_permission(
    granted: &[Capability],
    required: &Capability,
) -> Result<(), String> {
    if granted.iter().any(|g| capability_matches(g, required)) {
        Ok(())
    } else {
        Err(format!("Permission denied: {:?}", required))
    }
}

fn main() {
    let caps = vec![
        Capability::FileRead("/data/*".to_string()),
        Capability::NetConnect("*.example.com:443".to_string()),
        Capability::LlmMaxTokens(10000),
    ];

    // 应该通过
    assert!(check_permission(&caps, &Capability::FileRead("/data/test.txt".to_string())).is_ok());

    // 应该失败
    assert!(check_permission(&caps, &Capability::FileWrite("/data/test.txt".to_string())).is_err());

    println!("All tests passed!");
}
```

### 练习 3：实现自定义 Trait

实现一个简单的 `Notifier` trait，支持多种通知方式：

```rust
use async_trait::async_trait;

#[async_trait]
pub trait Notifier: Send + Sync {
    async fn send(&self, message: &str) -> Result<(), String>;

    // 批量发送（默认实现）
    async fn send_batch(&self, messages: &[String]) -> Result<(), String> {
        for msg in messages {
            self.send(msg).await?;
        }
        Ok(())
    }
}

// Console 实现
pub struct ConsoleNotifier;

#[async_trait]
impl Notifier for ConsoleNotifier {
    async fn send(&self, message: &str) -> Result<(), String> {
        println!("[NOTIFICATION] {}", message);
        Ok(())
    }
}

// Email 实现（模拟）
pub struct EmailNotifier {
    to: String,
}

#[async_trait]
impl Notifier for EmailNotifier {
    async fn send(&self, message: &str) -> Result<(), String> {
        println!("Sending email to {}: {}", self.to, message);
        // 实际实现会调用邮件服务
        Ok(())
    }
}

// 使用 Trait 对象
pub struct NotificationService {
    notifiers: Vec<Box<dyn Notifier>>,
}

impl NotificationService {
    pub fn new() -> Self {
        Self { notifiers: vec![] }
    }

    pub fn add_notifier(&mut self, notifier: Box<dyn Notifier>) {
        self.notifiers.push(notifier);
    }

    pub async fn notify_all(&self, message: &str) -> Result<(), String> {
        for notifier in &self.notifiers {
            notifier.send(message).await?;
        }
        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<(), String> {
    let mut service = NotificationService::new();

    service.add_notifier(Box::new(ConsoleNotifier));
    service.add_notifier(Box::new(EmailNotifier {
        to: "admin@example.com".to_string()
    }));

    service.notify_all("System alert!").await?;

    Ok(())
}
```

### 练习 4：类型安全的配置系统

设计一个类型安全的 Agent 配置系统：

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub name: String,
    pub max_tokens: u32,
    pub temperature: f32,
}

// 使用 Newtype 模式确保类型安全
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Temperature(u32);  // 0-100，表示 0.00-1.00

impl Temperature {
    pub fn new(value: f32) -> Result<Self, String> {
        if value < 0.0 || value > 1.0 {
            return Err("Temperature must be between 0.0 and 1.0".to_string());
        }
        Ok(Self((value * 100.0) as u32))
    }

    pub fn as_f32(&self) -> f32 {
        self.0 as f32 / 100.0
    }
}

#[derive(Debug, Clone)]
pub struct SafeAgentConfig {
    pub name: String,
    pub max_tokens: u32,
    pub temperature: Temperature,
}

impl SafeAgentConfig {
    pub fn new(
        name: String,
        max_tokens: u32,
        temperature: f32,
    ) -> Result<Self, String> {
        Ok(Self {
            name,
            max_tokens,
            temperature: Temperature::new(temperature)?,
        })
    }
}

fn main() -> Result<(), String> {
    // 类型安全：不能传入无效的 temperature
    let config = SafeAgentConfig::new(
        "MyAgent".to_string(),
        4096,
        0.7,
    )?;

    println!("Temperature: {}", config.temperature.as_f32());

    // 这会编译错误：
    // let config = SafeAgentConfig::new("Test".to_string(), 100, 1.5)?;

    Ok(())
}
```

---

## 延伸阅读

### Rust 官方文档
- [Traits](https://doc.rust-lang.org/book/ch10-02-traits.html) - Rust Book 第10章
- [Advanced Traits](https://doc.rust-lang.org/book/ch19-03-advanced-traits.html) - Rust Book 第19章
- [Newtype Pattern](https://doc.rust-lang.org/rust-by-example/generics/new_types.html) - Rust by Example

### 相关 crate 文档
- [async_trait](https://docs.rs/async-trait/latest/async_trait/) - 异步 trait 宏
- [serde](https://serde.rs/) - 序列化框架
- [thiserror](https://docs.rs/thiserror/latest/thiserror/) - 错误处理宏

### OpenFang 源码
- `crates/openfang-types/src/agent.rs` - AgentId 等类型定义
- `crates/openfang-types/src/capability.rs` - Capability 枚举
- `crates/openfang-runtime/src/kernel_handle.rs` - KernelHandle trait
- `crates/openfang-runtime/src/llm_driver.rs` - LlmDriver trait

---

## 本章小结

1. **Rust 类型系统**：名义性类型系统，编译期保证类型安全
2. **Newtype 模式**：创建语义不同的新类型，零运行时开销
3. **枚举**：可以携带数据，支持穷尽匹配
4. **Trait**：定义行为接口，支持默认实现
5. **async_trait**：使 trait 支持异步方法
6. **Trait 对象 vs 泛型**：动态分发 vs 静态分发，按需选择

掌握这些概念后，你就能理解 OpenFang 中类型系统的设计哲学：**利用类型系统保证正确性，在编译期捕获错误**。

---

*下一章：[LLM 驱动](./04-llm-driver/README.md) - 深入解析 OpenFang 如何抽象多供应商 LLM 调用*
