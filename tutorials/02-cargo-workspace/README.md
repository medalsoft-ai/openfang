# 第二章：Cargo 工作空间详解

> 从 npm monorepo 到 Cargo Workspace：OpenFang 的 14 个 crate 架构剖析

## 本章目标

完成本章后，你将：
- 理解 OpenFang 14 个 crate 的分层架构设计
- 掌握 Cargo workspace 与 npm monorepo 的核心差异
- 学会在 workspace 中添加新 crate
- 掌握依赖管理和编译优化技巧

## 目录

1. [OpenFang 架构概览](#1-openfang-架构概览) - 14 个 crate 的分层设计
2. [Cargo Workspace vs npm Monorepo](#2-cargo-workspace-vs-npm-monorepo) - 概念对照
3. [Workspace 配置详解](#3-workspace-配置详解) - 根 Cargo.toml 完全解析
4. [Crate 依赖关系](#4-crate-依赖关系) - 谁依赖谁？
5. [添加新 Crate](#5-添加新-crate) - 实战步骤
6. [编译优化配置](#6-编译优化配置) - 加速构建
7. [动手练习](#7-动手练习)

---

## 1. OpenFang 架构概览

### 1.1 分层架构图

OpenFang 采用**分层架构**，14 个 crate 按职责分为 5 层：

```
┌─────────────────────────────────────────────────────────────┐
│  应用层 (Applications)                                       │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │openfang-cli  │  │openfang-desktop│  用户界面入口         │
│  │  (CLI工具)   │  │  (桌面GUI)   │                        │
│  └──────┬───────┘  └──────┬───────┘                        │
└─────────┼─────────────────┼────────────────────────────────┘
          │                 │
┌─────────▼─────────────────▼────────────────────────────────┐
│  API 层                                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              openfang-api (HTTP/WebSocket)              ││
│  │         REST API + WebSocket 实时通信                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│  内核层 (Kernel)                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              openfang-kernel (核心内核)                  ││
│  │      Agent生命周期 + 消息路由 + 系统协调                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│  运行时层 (Runtime)                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │openfang-     │ │openfang-     │ │openfang-     │        │
│  │runtime       │ │skills        │ │hands         │        │
│  │(Agent执行)   │ │(技能系统)    │ │(能力包)      │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │openfang-     │ │openfang-     │ │openfang-     │        │
│  │channels      │ │extensions    │ │migrate       │        │
│  │(通道桥接)    │ │(扩展系统)    │ │(迁移工具)    │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│  基础设施层 (Infrastructure)                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │openfang-     │ │openfang-     │ │openfang-     │        │
│  │types         │ │memory        │ │wire          │        │
│  │(基础类型)    │ │(内存/存储)   │ │(网络协议)    │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 各 Crate 职责

| Crate | 职责 | 类比 (Node.js 世界) |
|-------|------|-------------------|
| `openfang-types` | 核心类型定义：Agent、Message、Task 等结构体 | 相当于共享的 TypeScript interface 库 |
| `openfang-memory` | 内存管理和持久化存储 (SQLite) | 类似于 ORM + 缓存层 |
| `openfang-runtime` | Agent 代码执行环境 (WASM 沙箱) | 类似于 Docker 容器或 VM |
| `openfang-wire` | OpenFang Protocol (OFP) 网络通信 | 自定义 TCP/UDP 协议实现 |
| `openfang-kernel` | 核心内核：Agent 生命周期、消息路由 | 类似于 Node.js 事件循环 + 进程管理 |
| `openfang-api` | HTTP API 和 WebSocket 服务器 | Express.js/Fastify 服务器 |
| `openfang-channels` | 外部消息通道 (Discord、Slack、邮件) | 各种消息队列适配器 |
| `openfang-skills` | 技能系统：注册、加载、市场 | npm 包管理器 + 插件系统 |
| `openfang-hands` | 能力包：精选的自主功能集合 | 预设的自动化脚本库 |
| `openfang-extensions` | 扩展系统：MCP 服务器、OAuth2 | 第三方集成 SDK |
| `openfang-migrate` | 从其他框架迁移数据 | 数据库迁移工具 |
| `openfang-cli` | 命令行界面 | CLI 工具 (如 `npm`、`docker`) |
| `openfang-desktop` | 桌面 GUI (Tauri) | Electron 应用 |

---

## 2. Cargo Workspace vs npm Monorepo

### 2.1 核心概念对比

| 特性 | Cargo Workspace | npm Monorepo (pnpm/npm) |
|------|-----------------|------------------------|
| **配置位置** | 根目录 `Cargo.toml` | 根目录 `package.json` + `pnpm-workspace.yaml` |
| **包单元** | crate (Rust 库/二进制) | package (Node.js 模块) |
| **依赖声明** | 每个 crate 的 `Cargo.toml` | 每个包的 `package.json` |
| **共享依赖** | `[workspace.dependencies]` 统一版本 | 根 `package.json` devDependencies |
| **本地依赖** | `path = "../crate-name"` | `"*"` 或 `workspace:*` |
| **构建工具** | `cargo build` / `cargo test` | `pnpm build` / `npm run test` |
| **锁文件** | `Cargo.lock` | `pnpm-lock.yaml` / `package-lock.json` |
| **发布** | `cargo publish` | `npm publish` |

### 2.2 依赖声明对比

**npm/pnpm (JavaScript):**
```json
{
  "name": "@openfang/api",
  "version": "0.3.4",
  "dependencies": {
    "@openfang/types": "workspace:*",
    "@openfang/kernel": "workspace:*",
    "express": "^4.18.0"
  }
}
```

**Cargo (Rust):**
```toml
[package]
name = "openfang-api"
version.workspace = true  # 使用 workspace 定义的版本

[dependencies]
openfang-types = { path = "../openfang-types" }  # 本地依赖
openfang-kernel = { path = "../openfang-kernel" }
tokio = { workspace = true }  # 使用 workspace 共享版本
```

### 2.3 关键差异详解

#### 差异 1：显式路径 vs 隐式解析

Cargo 要求**显式指定本地依赖路径**：
```toml
openfang-types = { path = "../openfang-types" }
```

npm/pnpm 通过 workspace 配置自动解析：
```json
"@openfang/types": "workspace:*"
```

#### 差异 2：统一版本管理

Cargo 的 `[workspace.dependencies]` 允许统一声明所有依赖版本：
```toml
[workspace.dependencies]
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
```

子 crate 只需引用：
```toml
tokio = { workspace = true }
```

npm 没有内置的"workspace 依赖版本"概念，通常需要工具如 `syncpack` 来统一版本。

#### 差异 3：构建产物

| 特性 | Cargo | npm |
|------|-------|-----|
| 库 crate | 编译为 `.rlib` (Rust 静态库) | 直接发布源码 |
| 二进制 crate | 编译为可执行文件 | 通过 `bin` 字段指定入口 |
| 增量编译 | 支持，按 crate 粒度 | 通常按包粒度 |

---

## 3. Workspace 配置详解

### 3.1 根 Cargo.toml 结构

OpenFang 的根 `Cargo.toml` 位于项目根目录，包含 4 个主要部分：

```toml
# 1. Workspace 成员声明
[workspace]
resolver = "2"  # 依赖解析器版本
members = [
    "crates/openfang-types",
    "crates/openfang-memory",
    "crates/openfang-runtime",
    "crates/openfang-wire",
    "crates/openfang-api",
    "crates/openfang-kernel",
    "crates/openfang-cli",
    "crates/openfang-channels",
    "crates/openfang-migrate",
    "crates/openfang-skills",
    "crates/openfang-desktop",
    "crates/openfang-hands",
    "crates/openfang-extensions",
    "xtask",  # 构建工具脚本
]

# 2. 共享包元数据
[workspace.package]
version = "0.3.4"
edition = "2021"
license = "Apache-2.0 OR MIT"
repository = "https://github.com/RightNow-AI/openfang"
rust-version = "1.75"

# 3. 共享依赖版本
[workspace.dependencies]
# Async runtime
tokio = { version = "1", features = ["full"] }
tokio-stream = "0.1"

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"
toml = "0.8"

# Error handling
thiserror = "2"
anyhow = "1"

# ... 更多依赖

# 4. 编译优化配置
[profile.release]
lto = true
codegen-units = 1
strip = true
opt-level = 3
```

### 3.2 各部分详解

#### [workspace] - 工作空间定义

```toml
[workspace]
resolver = "2"
members = ["crates/openfang-types", ...]
```

- `resolver = "2"`：Rust 2021 版的依赖解析器，解决特性合并问题
- `members`：所有参与 workspace 的 crate 路径列表
- **类比 npm**：相当于 `pnpm-workspace.yaml` 中的 `packages` 字段

#### [workspace.package] - 共享包元数据

```toml
[workspace.package]
version = "0.3.4"
edition = "2021"
license = "Apache-2.0 OR MIT"
```

子 crate 通过 `workspace = true` 继承：
```toml
[package]
name = "openfang-api"
version.workspace = true
edition.workspace = true
license.workspace = true
```

**优势**：修改版本号只需改一处，避免版本不一致。

#### [workspace.dependencies] - 共享依赖

这是 Cargo Workspace 最强大的功能之一：

```toml
[workspace.dependencies]
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
chrono = { version = "0.4", features = ["serde"] }
```

子 crate 使用简写语法：
```toml
[dependencies]
tokio = { workspace = true }
serde = { workspace = true }
chrono = { workspace = true }
```

**好处**：
1. **版本统一**：整个 workspace 使用相同版本的 tokio
2. **特性统一**：所有 crate 的 tokio 都有 `"full"` 特性
3. **易于升级**：改一处即可升级所有 crate 的依赖

#### [profile.release] - 发布编译优化

```toml
[profile.release]
lto = true              # 链接时优化
codegen-units = 1       # 单代码生成单元（最大化优化）
strip = true            # 剥离符号信息
opt-level = 3           # 最高优化级别
```

**对比 npm**：npm 包通常不编译，直接发布源码。Rust 需要编译为机器码，因此需要优化配置。

---

## 4. Crate 依赖关系

### 4.1 依赖图

```
openfang-cli
├── openfang-kernel
│   ├── openfang-types
│   ├── openfang-memory
│   ├── openfang-runtime
│   ├── openfang-skills
│   ├── openfang-hands
│   ├── openfang-extensions
│   └── openfang-wire
├── openfang-api
│   ├── openfang-kernel (及所有依赖)
│   ├── openfang-channels
│   └── openfang-migrate
└── ...

openfang-desktop
├── openfang-kernel
└── openfang-api
```

### 4.2 关键依赖模式

#### 模式 1：基础类型 crate

`openfang-types` 是最底层，**不依赖任何其他 OpenFang crate**：

```toml
[dependencies]
serde = { workspace = true }
chrono = { workspace = true }
# 只有外部依赖，没有 openfang-* 依赖
```

**设计原则**：基础类型应该自包含，避免循环依赖。

#### 模式 2：中间层 crate

`openfang-runtime` 依赖 `openfang-types` 和 `openfang-memory`：

```toml
[dependencies]
openfang-types = { path = "../openfang-types" }
openfang-memory = { path = "../openfang-memory" }
openfang-skills = { path = "../openfang-skills" }
tokio = { workspace = true }
```

#### 模式 3：聚合层 crate

`openfang-kernel` 是核心，依赖几乎所有其他 crate：

```toml
[dependencies]
openfang-types = { path = "../openfang-types" }
openfang-memory = { path = "../openfang-memory" }
openfang-runtime = { path = "../openfang-runtime" }
openfang-skills = { path = "../openfang-skills" }
openfang-hands = { path = "openfang-hands" }
openfang-extensions = { path = "../openfang-extensions" }
openfang-wire = { path = "../openfang-wire" }
openfang-channels = { path = "../openfang-channels" }
```

### 4.3 避免循环依赖

Cargo **禁止**循环依赖。如果 A 依赖 B，B 就不能依赖 A。

**解决方案**：将共享类型提取到基础 crate。

```
错误：A → B → A

正确：A → C ← B
       (C 是基础类型 crate)
```

OpenFang 中，`openfang-types` 就是这个 C，所有 crate 都依赖它。

---

## 5. 添加新 Crate

### 5.1 实战：添加 `openfang-analytics` crate

假设我们要添加一个数据分析 crate。

#### 步骤 1：创建目录结构

```bash
mkdir -p crates/openfang-analytics/src
touch crates/openfang-analytics/src/lib.rs
```

#### 步骤 2：编写 Cargo.toml

```toml
[package]
name = "openfang-analytics"
version.workspace = true
edition.workspace = true
license.workspace = true
description = "Analytics and metrics for OpenFang"

[dependencies]
# OpenFang 内部依赖
openfang-types = { path = "../openfang-types" }
openfang-memory = { path = "../openfang-memory" }

# Workspace 共享依赖
tokio = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
tracing = { workspace = true }
chrono = { workspace = true }

# 专属依赖（如果需要）
metrics = "0.22"

[dev-dependencies]
tokio-test = { workspace = true }
tempfile = { workspace = true }
```

#### 步骤 3：编写 lib.rs

```rust
//! OpenFang Analytics - 数据分析和指标收集

pub mod metrics;
pub mod reports;

use openfang_types::Agent;
use std::collections::HashMap;

/// 收集 Agent 执行指标
pub struct AnalyticsCollector {
    agent_metrics: HashMap<String, AgentMetrics>,
}

#[derive(Default)]
pub struct AgentMetrics {
    pub messages_processed: u64,
    pub tokens_consumed: u64,
    pub avg_response_time_ms: f64,
}

impl AnalyticsCollector {
    pub fn new() -> Self {
        Self {
            agent_metrics: HashMap::new(),
        }
    }

    pub fn record_message(&mut self, agent_id: &str, tokens: u64, duration_ms: f64) {
        let metrics = self.agent_metrics
            .entry(agent_id.to_string())
            .or_default();

        metrics.messages_processed += 1;
        metrics.tokens_consumed += tokens;

        // 移动平均
        let n = metrics.messages_processed as f64;
        metrics.avg_response_time_ms =
            (metrics.avg_response_time_ms * (n - 1.0) + duration_ms) / n;
    }
}
```

#### 步骤 4：添加到 Workspace

编辑根目录 `Cargo.toml`，在 `members` 数组中添加：

```toml
[workspace]
members = [
    "crates/openfang-types",
    "crates/openfang-memory",
    # ... 其他 crates
    "crates/openfang-analytics",  # <-- 添加这一行
    "xtask",
]
```

#### 步骤 5：在其他 Crate 中使用

在 `openfang-kernel/Cargo.toml` 中添加：

```toml
[dependencies]
openfang-analytics = { path = "../openfang-analytics" }
```

### 5.2 添加二进制 Crate

如果要添加一个独立工具（如 `openfang-backup`）：

```toml
[package]
name = "openfang-backup"
version.workspace = true
edition.workspace = true

[[bin]]
name = "openfang-backup"
path = "src/main.rs"

[dependencies]
openfang-types = { path = "../openfang-types" }
openfang-memory = { path = "../openfang-memory" }
clap = { workspace = true }
tokio = { workspace = true }
```

构建后会在 `target/release/openfang-backup` 生成可执行文件。

---

## 6. 编译优化配置

### 6.1 开发编译优化

开发时默认编译配置较慢，可以创建 `.cargo/config.toml`：

```toml
[build]
# 使用所有 CPU 核心
jobs = 0

[profile.dev]
# 开发时只做必要优化，加快编译
opt-level = 0
debug = true

# 或者折中方案：少量优化
[profile.dev-opt]
inherits = "dev"
opt-level = 1
```

### 6.2 发布编译优化

OpenFang 的发布配置已经优化：

```toml
[profile.release]
lto = true              # 链接时优化，消除跨 crate 边界
codegen-units = 1       # 单代码生成单元，允许更多优化
strip = true            # 剥离调试符号，减小体积
opt-level = 3           # 最高优化级别
```

**效果对比**（以 openfang-cli 为例）：

| 配置 | 编译时间 | 二进制大小 | 运行时性能 |
|------|---------|-----------|-----------|
| `dev` (默认) | ~30s | ~150MB | 基准 |
| `release` (无 lto) | ~2min | ~25MB | 1.5x |
| `release` (完全优化) | ~5min | ~12MB | 2-3x |

### 6.3 选择性编译

只编译特定 crate：

```bash
# 只编译库（跳过二进制）
cargo build --workspace --lib

# 只编译特定 crate
cargo build -p openfang-types
cargo build -p openfang-kernel

# 只运行特定 crate 的测试
cargo test -p openfang-memory
```

### 6.4 缓存优化

安装 `sccache` 加速重复编译：

```bash
cargo install sccache

# 添加到 ~/.cargo/config.toml
[build]
rustc-wrapper = "sccache"
```

---

## 7. 动手练习

### 练习 1：探索依赖关系

**目标**：理解 crate 之间的依赖关系。

```bash
# 查看依赖树
cargo tree -p openfang-kernel --depth 2

# 查看哪些 crate 依赖 openfang-types
cargo tree -i openfang-types

# 检查是否有重复依赖版本
cargo tree -d
```

**预期输出**（部分）：
```
openfang-kernel v0.3.4
├── openfang-types v0.3.4
├── openfang-memory v0.3.4
│   └── openfang-types v0.3.4
├── openfang-runtime v0.3.4
│   ├── openfang-types v0.3.4
│   └── ...
```

### 练习 2：创建工具 Crate

**目标**：创建一个 `openfang-hello` 工具 crate。

1. 创建目录 `crates/openfang-hello`
2. 编写 `Cargo.toml`：
   - 继承 workspace 元数据
   - 依赖 `openfang-types`
   - 依赖 `clap` (用于 CLI)

3. 编写 `src/main.rs`：

```rust
use clap::Parser;

#[derive(Parser)]
#[command(name = "openfang-hello")]
struct Args {
    #[arg(short, long)]
    name: String,
}

fn main() {
    let args = Args::parse();
    println!("Hello, {}! Welcome to OpenFang.", args.name);
}
```

4. 添加到 workspace
5. 构建并运行：

```bash
cargo build -p openfang-hello --release
./target/release/openfang-hello --name Alice
```

### 练习 3：分析编译时间

**目标**：理解不同编译配置的影响。

```bash
# 清理缓存
cargo clean

# 记录开发编译时间
time cargo build --workspace --lib

# 清理
cargo clean

# 记录发布编译时间
time cargo build --workspace --release

# 对比二进制大小
ls -lh target/debug/openfang-cli 2>/dev/null || echo "Debug binary not built"
ls -lh target/release/openfang-cli 2>/dev/null || echo "Release binary not built"
```

### 练习 4：Workspace 依赖实验

**目标**：体验 workspace 依赖管理。

1. 查看根 `Cargo.toml` 中的 `[workspace.dependencies]`
2. 查看 `openfang-api/Cargo.toml` 如何使用 `tokio = { workspace = true }`
3. 尝试修改根 `Cargo.toml` 中的 tokio 版本（注意：这会影响所有 crate）
4. 运行测试确保一切正常：

```bash
cargo test --workspace
```

---

## 总结

### 核心概念回顾

| 概念 | JavaScript (npm) | Rust (Cargo) |
|------|-----------------|--------------|
| 工作空间配置 | `pnpm-workspace.yaml` | 根 `Cargo.toml` `[workspace]` |
| 包元数据 | `package.json` | `[package]` section |
| 依赖声明 | `dependencies` 字段 | `[dependencies]` section |
| 本地依赖 | `workspace:*` | `path = "../crate"` |
| 共享版本 | `syncpack` 等工具 | `[workspace.dependencies]` |
| 构建产物 | 源码发布 | 编译为机器码 |

### OpenFang 架构要点

1. **分层设计**：types → memory/runtime/wire → kernel → api → cli/desktop
2. **14 个 crate**：每个职责单一，通过依赖组合功能
3. **无循环依赖**：所有 crate 都依赖 types，但 types 不依赖任何 crate
4. **统一版本**：通过 `workspace.package` 和 `workspace.dependencies` 管理

### 下一步

完成本章后，你已经理解了 OpenFang 的代码组织方式。接下来：
- [第三章：类型与 Trait](../03-types-traits/README.md) - 深入 OpenFang 的类型系统
- [第四章：LLM 驱动](../04-llm-driver/README.md) - 理解 Agent 如何与 LLM 交互

---

## 参考资源

- [Cargo Workspace 官方文档](https://doc.rust-lang.org/cargo/reference/workspaces.html)
- [Rust 模块系统](https://doc.rust-lang.org/book/ch07-00-managing-growing-projects-with-packages-crates-and-modules.html)
- [OpenFang 源码](https://github.com/RightNow-AI/openfang)
