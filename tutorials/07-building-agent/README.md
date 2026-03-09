# 第七章：实战构建Agent

> 从零开始构建、配置、测试和部署你的第一个OpenFang Agent

## 本章目标

完成本章后，你将：
- 掌握Agent Manifest的编写规范
- 能够创建自定义Agent配置
- 学会添加和配置工具
- 理解LLM Provider的接入方式
- 掌握Agent的测试与调试技巧
- 了解生产环境部署的最佳实践

## 目录

1. [创建最小Agent](#1-创建最小agent) - 快速上手
2. [编写Agent Manifest](#2-编写agent-manifest) - 配置详解
3. [添加自定义工具](#3-添加自定义工具) - 扩展能力
4. [接入LLM Provider](#4-接入llm-provider) - 模型配置
5. [测试与调试](#5-测试与调试) - 验证功能
6. [部署运行](#6-部署运行) - 生产环境
7. [最佳实践](#7-最佳实践) - 工程规范

---

## 1. 创建最小Agent

### 1.1 理解Agent结构

在OpenFang中，一个Agent本质上是一个TOML配置文件（Manifest），定义了：
- **我是谁** - 名称、描述、作者
- **我用什么模型** - LLM提供商和参数
- **我能做什么** - 工具和能力列表
- **我的限制** - 资源配额和权限

**对比Node.js：**
```javascript
// Node.js中的Agent概念
const agent = {
  name: "my-agent",
  llm: new OpenAI({ apiKey: process.env.OPENAI_KEY }),
  tools: [new FileReadTool(), new WebSearchTool()],
  systemPrompt: "You are a helpful assistant."
};
```

```toml
# OpenFang中的Agent Manifest
name = "my-agent"
description = "My first agent"
version = "0.1.0"

[model]
provider = "openai"
model = "gpt-4"
api_key_env = "OPENAI_API_KEY"
system_prompt = "You are a helpful assistant."

[capabilities]
tools = ["file_read", "web_search"]
```

### 1.2 创建你的第一个Agent

**步骤1：创建Agent目录**

```bash
# 创建自定义Agent目录
mkdir -p ~/.openfang/agents/my-first-agent
cd ~/.openfang/agents/my-first-agent
```

**步骤2：编写最小Manifest**

创建 `agent.toml`：

```toml
name = "my-first-agent"
version = "0.1.0"
description = "A simple greeting agent"
author = "your-name"
module = "builtin:chat"

[model]
provider = "groq"
model = "llama-3.3-70b-versatile"
max_tokens = 4096
temperature = 0.6
system_prompt = """You are a friendly greeting agent.

Your job is to:
1. Greet users warmly
2. Answer simple questions
3. Be concise and helpful

When asked a factual question, use web_search to find current information."""

[resources]
max_llm_tokens_per_hour = 100000

[capabilities]
tools = ["web_search", "web_fetch", "memory_store", "memory_recall"]
network = ["*"]
memory_read = ["*"]
memory_write = ["self.*"]
```

**步骤3：启动Agent**

```bash
# 方法1：使用模板系统
openfang agent new my-first-agent

# 方法2：直接加载（如果daemon正在运行）
curl -X POST http://127.0.0.1:4200/api/agents \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "manifest_toml": "$(cat agent.toml | sed 's/"/\\"/g')"
}
EOF

# 方法3：通过CLI交互模式
openfang chat my-first-agent
```

### 1.3 验证Agent运行

```bash
# 列出所有Agent
openfang agent list

# 查看Agent详情
curl http://127.0.0.1:4200/api/agents/{agent-id}

# 发送测试消息
curl -X POST http://127.0.0.1:4200/api/agents/{agent-id}/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

---

## 2. 编写Agent Manifest

### 2.1 Manifest完整结构

```toml
# ============================================
# 基础信息 (必需)
# ============================================
name = "agent-name"           # 唯一标识，小写+连字符
version = "0.1.0"             # 语义化版本
description = "描述"           # 一句话说明用途
author = "your-name"          # 作者标识
module = "builtin:chat"       # 执行模块 (内置或WASM路径)

# ============================================
# 标签和分类
# ============================================
tags = ["coding", "assistant", "rust"]  # 用于搜索和分组

# ============================================
# LLM模型配置 (必需)
# ============================================
[model]
provider = "groq"             # 提供商: anthropic, openai, gemini, groq, ollama
model = "llama-3.3-70b-versatile"  # 模型ID
api_key_env = "GROQ_API_KEY"  # 环境变量名（安全考虑）
max_tokens = 4096             # 最大生成token数
temperature = 0.6             # 创造性 (0.0-1.0)
system_prompt = "..."         # 系统提示词

# 备用模型链（当主模型失败时自动切换）
[[fallback_models]]
provider = "gemini"
model = "gemini-2.0-flash"
api_key_env = "GEMINI_API_KEY"

[[fallback_models]]
provider = "openai"
model = "gpt-3.5-turbo"
api_key_env = "OPENAI_API_KEY"

# ============================================
# 资源配额 (可选，有默认值)
# ============================================
[resources]
max_llm_tokens_per_hour = 100000      # 每小时最大token消耗
max_memory_bytes = 268435456          # 256MB WASM内存限制
max_cpu_time_ms = 30000               # 每次调用30秒CPU时间
max_tool_calls_per_minute = 60        # 每分钟工具调用次数
max_cost_per_hour_usd = 1.0           # 每小时成本上限

# ============================================
# 能力声明 (必需)
# ============================================
[capabilities]
# 工具列表（显式声明）
tools = [
  "file_read",      # 读取文件
  "file_write",     # 写入文件
  "file_list",      # 列出目录内容
  "shell_exec",     # 执行shell命令
  "web_search",     # 网络搜索
  "web_fetch",      # 抓取网页
  "memory_store",   # 存储长期记忆
  "memory_recall",  # 检索记忆
  "agent_send",     # 发送消息给其他agent
  "agent_list"      # 列出可用agents
]

# 网络访问权限
network = ["*"]                    # ["*"] = 允许所有, 或指定 ["api.example.com:443"]

# 记忆访问权限
memory_read = ["*"]                # ["*"] = 读取所有, ["self.*"] = 仅自己
memory_write = ["self.*", "shared.*"]  # 写入权限

# Agent间通信
agent_spawn = true                 # 能否创建子agent
agent_message = ["*"]              # 能给哪些agent发消息

# Shell命令白名单（当tools包含shell_exec时）
shell = ["cargo *", "git *", "npm *", "python *"]

# ============================================
# 调度模式 (可选，默认reactive)
# ============================================
[schedule]
mode = "reactive"  # reactive(事件驱动), periodic(定时), proactive(主动), continuous(持续)

# 定时模式示例
# [schedule]
# mode = "periodic"
# cron = "0 */6 * * *"  # 每6小时运行一次

# ============================================
# 自主运行配置 (可选)
# ============================================
[autonomous]
max_iterations = 50           # 每次唤醒最大迭代次数
max_restarts = 10             # 最大重启次数
heartbeat_interval_secs = 30  # 心跳间隔
quiet_hours = "0 22 * * *"    # 安静时间（不主动执行）

# ============================================
# 工具配置 (可选)
# ============================================
[tools.tool-name]
params = { key = "value" }

# ============================================
# 元数据 (可选)
# ============================================
[metadata]
category = "productivity"
language = "zh-CN"
```

### 2.2 不同场景的Manifest模板

**模板1：代码助手**

```toml
name = "code-assistant"
version = "0.1.0"
description = "Expert in Rust and TypeScript development"
author = "openfang"
module = "builtin:chat"
tags = ["coding", "rust", "typescript"]

[model]
provider = "anthropic"
model = "claude-sonnet-4-20250514"
api_key_env = "ANTHROPIC_API_KEY"
max_tokens = 8192
temperature = 0.3
system_prompt = """You are an expert software engineer.

METHODOLOGY:
1. READ - Understand the codebase first
2. PLAN - Think before writing
3. IMPLEMENT - Write clean, tested code
4. VERIFY - Confirm the solution works

QUALITY STANDARDS:
- Follow existing code style
- Handle errors properly (no unwrap in production)
- Write minimal, focused changes
- Add tests for new functionality"""

[[fallback_models]]
provider = "groq"
model = "llama-3.3-70b-versatile"
api_key_env = "GROQ_API_KEY"

[resources]
max_llm_tokens_per_hour = 200000

[capabilities]
tools = ["file_read", "file_write", "file_list", "shell_exec", "web_fetch", "web_search", "memory_store", "memory_recall"]
network = ["*"]
memory_read = ["*"]
memory_write = ["self.*"]
shell = ["cargo *", "rustc *", "git *", "npm *", "node *", "python *"]
```

**模板2：研究分析师**

```toml
name = "research-analyst"
version = "0.1.0"
description = "Deep research and synthesis agent"
author = "openfang"
module = "builtin:chat"
tags = ["research", "analysis"]

[model]
provider = "gemini"
model = "gemini-2.5-flash"
api_key_env = "GEMINI_API_KEY"
max_tokens = 4096
temperature = 0.4
system_prompt = """You are a research analyst.

RESEARCH METHODOLOGY:
1. DECOMPOSE - Break questions into sub-questions
2. SEARCH - Use multiple query variations
3. DEEP DIVE - Read full sources, not snippets
4. CROSS-REFERENCE - Compare multiple sources
5. SYNTHESIZE - Create structured reports

OUTPUT FORMAT:
- Direct answer
- Key findings (numbered, with sources)
- Sources used (URLs)
- Confidence level (high/medium/low)"""

[resources]
max_llm_tokens_per_hour = 150000

[capabilities]
tools = ["web_search", "web_fetch", "file_read", "file_write", "memory_store", "memory_recall"]
network = ["*"]
memory_read = ["*"]
memory_write = ["self.*", "shared.*"]
```

**模板3：定时任务Agent**

```toml
name = "daily-reporter"
version = "0.1.0"
description = "Generates daily summary reports"
author = "openfang"
module = "builtin:chat"

[model]
provider = "groq"
model = "llama-3.3-70b-versatile"
api_key_env = "GROQ_API_KEY"
max_tokens = 2048
temperature = 0.5
system_prompt = "Generate concise daily reports from data sources."

# 每早8点运行
[schedule]
mode = "periodic"
cron = "0 8 * * *"

[autonomous]
max_iterations = 10
heartbeat_interval_secs = 60

[resources]
max_llm_tokens_per_hour = 50000

[capabilities]
tools = ["file_read", "file_write", "web_fetch", "memory_store", "memory_recall"]
network = ["*"]
memory_read = ["*"]
memory_write = ["shared.daily-reports.*"]
```

---

## 3. 添加自定义工具

### 3.1 工具类型概述

OpenFang支持三种工具类型：

1. **内置工具** - OpenFang原生提供
2. **MCP工具** - 通过Model Context Protocol连接外部服务
3. **技能工具** - 可复用的工具集合

### 3.2 使用内置工具

```toml
[capabilities]
tools = [
  # 文件操作
  "file_read",           # 读取文件内容
  "file_write",          # 写入文件
  "file_list",           # 列出目录内容

  # 网络操作
  "web_search",          # 搜索引擎查询
  "web_fetch",           # 抓取网页内容

  # 系统操作
  "shell_exec",          # 执行shell命令（需配置白名单）

  # 记忆操作
  "memory_store",        # 存储长期记忆
  "memory_recall",       # 检索记忆

  # Agent协作
  "agent_send",          # 向其他Agent发送消息
  "agent_list",          # 列出可用Agents

  # 工作流
  "workflow_start",      # 启动工作流
  "workflow_status"      # 检查工作流状态
]

# Shell命令白名单（重要安全设置）
shell = [
  "cargo *",             # 允许所有cargo命令
  "git *",               # 允许所有git命令
  "npm *",               # 允许npm命令
  "python *.py",         # 允许运行.py文件
  "ls -la",              # 允许特定命令
  "cat *"                # 允许查看文件
]
```

### 3.3 连接MCP服务器

MCP（Model Context Protocol）允许Agent使用外部工具服务。

**步骤1：在~/.openfang/config.toml中配置MCP**

```toml
# 文件系统MCP服务器
[[mcp_servers]]
name = "filesystem"
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]

# GitHub MCP服务器
[[mcp_servers]]
name = "github"
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = { GITHUB_PERSONAL_ACCESS_TOKEN = "${GITHUB_TOKEN}" }

# PostgreSQL MCP服务器
[[mcp_servers]]
name = "postgres"
command = "npx"
args = ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"]
```

**步骤2：在Agent Manifest中启用MCP**

```toml
name = "github-assistant"
version = "0.1.0"
description = "Agent with GitHub access"

[model]
provider = "groq"
model = "llama-3.3-70b-versatile"
api_key_env = "GROQ_API_KEY"

# 启用MCP服务器
mcp_servers = ["github", "filesystem"]

[capabilities]
tools = ["file_read", "file_write", "memory_store", "memory_recall"]
# Agent会自动获得MCP服务器提供的工具
```

### 3.4 创建自定义技能

技能是一组可复用的工具配置。

**创建技能目录结构：**

```bash
mkdir -p ~/.openfang/skills/data-analysis
cd ~/.openfang/skills/data-analysis
```

**编写skill.toml：**

```toml
name = "data-analysis"
version = "0.1.0"
description = "Data processing and visualization tools"
author = "your-name"

[tools.pandas]
command = "python"
script = """
import pandas as pd
import json

def analyze_csv(file_path, operations):
    df = pd.read_csv(file_path)
    results = {}

    for op in operations:
        if op['type'] == 'describe':
            results['describe'] = df.describe().to_dict()
        elif op['type'] == 'groupby':
            results['groupby'] = df.groupby(op['column']).agg(op['agg']).to_dict()

    return json.dumps(results)

if __name__ == '__main__':
    import sys
    args = json.loads(sys.argv[1])
    print(analyze_csv(args['file'], args['ops']))
"""

[tools.visualize]
command = "python"
script = """
import matplotlib.pyplot as plt
import json

def create_chart(data, chart_type, output_path):
    fig, ax = plt.subplots()

    if chart_type == 'bar':
        ax.bar(data['x'], data['y'])
    elif chart_type == 'line':
        ax.plot(data['x'], data['y'])

    plt.savefig(output_path)
    return json.dumps({"success": True, "path": output_path})

if __name__ == '__main__':
    import sys
    args = json.loads(sys.argv[1])
    print(create_chart(args['data'], args['type'], args['output']))
"""
```

**在Agent中使用技能：**

```toml
name = "data-scientist"
version = "0.1.0"
description = "Data analysis specialist"

skills = ["data-analysis"]  # 引用技能

[model]
provider = "anthropic"
model = "claude-sonnet-4-20250514"
api_key_env = "ANTHROPIC_API_KEY"

[capabilities]
tools = ["file_read", "file_write", "shell_exec"]
shell = ["python *"]
```

---

## 4. 接入LLM Provider

### 4.1 支持的Provider

OpenFang支持多种LLM提供商：

| Provider | 模型示例 | 特点 |
|---------|---------|------|
| **anthropic** | claude-sonnet-4-20250514 | 高质量，适合复杂任务 |
| **openai** | gpt-4, gpt-3.5-turbo | 稳定，生态丰富 |
| **gemini** | gemini-2.5-flash | Google，速度快 |
| **groq** | llama-3.3-70b-versatile | 快且便宜 |
| **ollama** | llama2, codellama | 本地运行，免费 |

### 4.2 配置API密钥

**环境变量方式（推荐）：**

```bash
# ~/.bashrc 或 ~/.zshrc
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GEMINI_API_KEY="AIza..."
export GROQ_API_KEY="gsk_..."
```

**配置文件方式（~/.openfang/config.toml）：**

```toml
[default_model]
provider = "anthropic"
model = "claude-sonnet-4-20250514"
api_key_env = "ANTHROPIC_API_KEY"
```

### 4.3 Provider特定配置

**Anthropic配置：**

```toml
[model]
provider = "anthropic"
model = "claude-sonnet-4-20250514"
api_key_env = "ANTHROPIC_API_KEY"
max_tokens = 4096
temperature = 0.7
system_prompt = "..."

# Anthropic特定：使用Claude的特殊功能
[model.params]
enable_extended_thinking = true  # 启用深度思考模式
```

**OpenAI配置：**

```toml
[model]
provider = "openai"
model = "gpt-4"
api_key_env = "OPENAI_API_KEY"
max_tokens = 4096
temperature = 0.7

# OpenAI特定：函数调用优化
[model.params]
function_call = "auto"
```

**Ollama本地模型：**

```toml
[model]
provider = "ollama"
model = "llama2:13b"
base_url = "http://localhost:11434"  # Ollama默认地址
api_key_env = ""  # 本地运行不需要API key
max_tokens = 2048
```

### 4.4 模型路由（高级）

根据查询复杂度自动选择模型：

```toml
[routing]
simple_model = "claude-haiku-4-5-20251001"      # 简单查询（<100 tokens）
medium_model = "claude-sonnet-4-20250514"       # 中等复杂度
complex_model = "claude-opus-4-20250514"        # 复杂任务（>500 tokens）
simple_threshold = 100
complex_threshold = 500
```

### 4.5 备用模型链

当主模型失败时自动切换：

```toml
[model]
provider = "anthropic"
model = "claude-sonnet-4-20250514"
api_key_env = "ANTHROPIC_API_KEY"

# 第一个备用
[[fallback_models]]
provider = "groq"
model = "llama-3.3-70b-versatile"
api_key_env = "GROQ_API_KEY"

# 第二个备用
[[fallback_models]]
provider = "gemini"
model = "gemini-2.0-flash"
api_key_env = "GEMINI_API_KEY"

# 最后的备用（便宜稳定）
[[fallback_models]]
provider = "openai"
model = "gpt-3.5-turbo"
api_key_env = "OPENAI_API_KEY"
```

---

## 5. 测试与调试

### 5.1 本地测试流程

**步骤1：语法检查**

```bash
# 验证TOML语法
toml-test agent.toml

# 或者使用Python
python3 -c "import tomllib; tomllib.load(open('agent.toml', 'rb'))"
```

**步骤2：启动Daemon**

```bash
# 确保daemon未运行
pkill -f openfang

# 启动daemon（前台运行便于查看日志）
RUST_LOG=debug cargo run --release --bin openfang -- start

# 或使用已有二进制文件
RUST_LOG=info openfang start
```

**步骤3：加载Agent**

```bash
# 方法1：使用模板系统
openfang agent new my-agent

# 方法2：直接API调用
curl -X POST http://127.0.0.1:4200/api/agents \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "manifest_toml": "name = \"test-agent\"\nversion = \"0.1.0\"\ndescription = \"Test\"\n[model]\nprovider = \"groq\"\nmodel = \"llama-3.3-70b-versatile\"\n"
}
EOF
```

**步骤4：功能测试**

```bash
# 获取Agent ID
AGENT_ID=$(curl -s http://127.0.0.1:4200/api/agents | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

# 测试基本对话
curl -s -X POST "http://127.0.0.1:4200/api/agents/$AGENT_ID/message" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, who are you?"}' | python3 -m json.tool

# 测试工具调用
curl -s -X POST "http://127.0.0.1:4200/api/agents/$AGENT_ID/message" \
  -H "Content-Type: application/json" \
  -d '{"message": "Search for latest Rust programming news"}' | python3 -m json.tool
```

### 5.2 调试技巧

**查看Agent日志：**

```bash
# 查看所有Agent
curl http://127.0.0.1:4200/api/agents | python3 -m json.tool

# 查看特定Agent详情
curl http://127.0.0.1:4200/api/agents/{agent-id} | python3 -m json.tool

# 查看Agent状态
openfang agent status {agent-id}
```

**监控资源使用：**

```bash
# 查看预算/成本
curl http://127.0.0.1:4200/api/budget | python3 -m json.tool

# 查看Agent级别的成本
curl http://127.0.0.1:4200/api/budget/agents | python3 -m json.tool
```

**使用测试模式：**

```bash
# 在单进程模式下运行（不启动daemon）
openfang run --manifest agent.toml --message "Test message"

# 查看详细日志
RUST_LOG=trace openfang run --manifest agent.toml
```

### 5.3 常见问题排查

**问题1：Agent启动失败**

```bash
# 检查manifest语法
cat agent.toml | python3 -c "import sys, tomllib; print(tomllib.load(sys.stdin.buffer))"

# 检查必需字段
 grep -E "^(name|version|description|author|module)\s*=" agent.toml
```

**问题2：模型调用失败**

```bash
# 检查API key
env | grep -E "(ANTHROPIC|OPENAI|GEMINI|GROQ)_API_KEY"

# 测试API连通性
curl -H "Authorization: Bearer $GROQ_API_KEY" \
  https://api.groq.com/openai/v1/models
```

**问题3：工具调用无响应**

```bash
# 检查工具权限
curl http://127.0.0.1:4200/api/agents/{agent-id} | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['manifest']['capabilities']['tools'])"

# 检查网络权限
curl http://127.0.0.1:4200/api/agents/{agent-id} | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['manifest']['capabilities']['network'])"
```

---

## 6. 部署运行

### 6.1 部署模式

OpenFang支持三种部署模式：

| 模式 | 适用场景 | 特点 |
|-----|---------|------|
| **开发模式** | 本地开发测试 | 单进程，快速迭代 |
| **Daemon模式** | 个人日常使用 | 后台服务，多Agent管理 |
| **生产模式** | 服务器部署 | 高可用，监控，持久化 |

### 6.2 开发模式

```bash
# 直接运行Agent（不启动daemon）
openfang run --manifest ./agent.toml

# 带交互的调试模式
openfang run --manifest ./agent.toml --interactive

# 单次执行
openfang run --manifest ./agent.toml --message "Calculate 2+2"
```

### 6.3 Daemon模式

```bash
# 启动daemon
openfang start

# 检查状态
openfang status

# 查看日志
openfang logs --follow

# 停止daemon
openfang stop
```

### 6.4 生产部署

**步骤1：系统服务配置（systemd）**

创建 `/etc/systemd/system/openfang.service`：

```ini
[Unit]
Description=OpenFang Agent OS
After=network.target

[Service]
Type=simple
User=openfang
Group=openfang
WorkingDirectory=/opt/openfang
Environment="RUST_LOG=info"
Environment="GROQ_API_KEY=gsk_..."
Environment="ANTHROPIC_API_KEY=sk-ant-..."
ExecStart=/usr/local/bin/openfang start
ExecStop=/usr/local/bin/openfang stop
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**步骤2：启动服务**

```bash
# 重载systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start openfang

# 开机自启
sudo systemctl enable openfang

# 查看状态
sudo systemctl status openfang
```

**步骤3：Nginx反向代理（可选）**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**步骤4：Docker部署**

创建 `Dockerfile`：

```dockerfile
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/openfang /usr/local/bin/openfang
COPY --from=builder /app/agents /opt/openfang/agents

ENV RUST_LOG=info
ENV OPENFANG_CONFIG=/etc/openfang/config.toml

EXPOSE 4200

CMD ["openfang", "start"]
```

构建和运行：

```bash
# 构建镜像
docker build -t openfang:latest .

# 运行容器
docker run -d \
  --name openfang \
  -p 4200:4200 \
  -e GROQ_API_KEY="gsk_..." \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -v /path/to/config:/etc/openfang \
  openfang:latest
```

---

## 7. 最佳实践

### 7.1 项目结构

推荐的项目结构：

```
my-openfang-agents/
├── README.md
├── agents/
│   ├── code-reviewer/
│   │   ├── agent.toml
│   │   └── tests/
│   │       └── basic_test.sh
│   ├── documentation/
│   │   ├── agent.toml
│   │   └── prompts/
│   │       └── doc_template.md
│   └── testing/
│       ├── agent.toml
│       └── test_scripts/
├── shared/
│   ├── prompts/
│   │   └── common_instructions.md
│   └── tools/
│       └── custom_analyzer.py
└── scripts/
    ├── deploy.sh
    └── test_all.sh
```

### 7.2 系统提示词工程

**好的系统提示词结构：**

```toml
system_prompt = """You are {role}, a specialist in {domain}.

CORE COMPETENCIES:
1. {capability_1}
   - Detail A
   - Detail B
2. {capability_2}

METHODOLOGY:
1. Step one
2. Step two
3. Step three

QUALITY STANDARDS:
- Standard A
- Standard B

OUTPUT FORMAT:
- Format requirement
- Structure requirement

TOOLS AVAILABLE:
- tool_a: description
- tool_b: description

OPERATIONAL GUIDELINES:
- Guideline 1
- Guideline 2"""
```

**示例：代码审查Agent**

```toml
system_prompt = """You are Code Reviewer, an expert in software quality assurance.

CORE COMPETENCIES:
1. Static Analysis
   - Identify code smells and anti-patterns
   - Check for security vulnerabilities
   - Verify error handling completeness

2. Style Compliance
   - Enforce project conventions
   - Check naming consistency
   - Verify documentation completeness

REVIEW METHODOLOGY:
1. UNDERSTAND - Read the PR description and context
2. SCAN - Get an overview of all changed files
3. DEEP DIVE - Review each file line by line
4. SYNTHESIZE - Summarize findings by severity

QUALITY STANDARDS:
- No unchecked errors in Rust (no unwrap/expect without justification)
- All public functions must have doc comments
- Variable names must be descriptive
- Complex logic needs inline comments

OUTPUT FORMAT:
## Summary
Brief overview of the changes

## Critical Issues (must fix)
- [ ] Issue 1 with line reference
- [ ] Issue 2 with line reference

## Warnings (should fix)
- [ ] Warning 1
- [ ] Warning 2

## Suggestions (optional)
- Improvement 1
- Improvement 2

## Positive Findings
- Well done aspect 1
- Well done aspect 2"""
```

### 7.3 安全配置

**最小权限原则：**

```toml
[capabilities]
# 不要给 [*]，显式声明每个工具
tools = [
  "file_read",
  "file_write",    # 如果不需要写文件，删除此项
  # "shell_exec",  # 如果不需要shell，注释掉
]

# 限制网络访问
network = [
  "api.github.com:443",
  "crates.io:443",
  # 不要给 "*"
]

# 限制shell命令
shell = [
  "cargo check",
  "cargo build",
  "cargo test",
  # 不要给 "*"
]

# 限制记忆访问
memory_read = ["self.*", "shared.project.*"]  # 只能读自己和项目共享
memory_write = ["self.*"]                      # 只能写自己
```

**API密钥管理：**

```bash
# 永远不要提交到git
echo "*.key" >> .gitignore
echo ".env" >> .gitignore

# 使用环境变量
export GROQ_API_KEY="$(cat ~/.secrets/groq.key)"

# 或使用密码管理器
export ANTHROPIC_API_KEY="$(pass show api-keys/anthropic)"
```

### 7.4 版本控制

**Agent版本策略：**

```toml
# 遵循语义化版本
version = "1.2.3"
# 1 - 重大变更（不兼容的行为改变）
# 2 - 新功能（向后兼容）
# 3 - 修复（向后兼容）
```

**Git工作流：**

```bash
# Agent开发分支策略
git checkout -b agent/code-reviewer-v2
# 修改 agent.toml
git add agents/code-reviewer/agent.toml
git commit -m "feat(code-reviewer): add security audit capability

- Add shell_exec tool for running cargo audit
- Update system prompt with security focus
- Bump version to 1.1.0"

# 测试后再合并
git checkout main
git merge agent/code-reviewer-v2
```

### 7.5 监控与维护

**健康检查脚本：**

```bash
#!/bin/bash
# health_check.sh

set -e

API_URL="http://127.0.0.1:4200"

# 检查daemon运行
check_daemon() {
    if ! curl -s "$API_URL/api/health" > /dev/null; then
        echo "ERROR: Daemon not running"
        exit 1
    fi
    echo "✓ Daemon healthy"
}

# 检查Agent数量
check_agents() {
    AGENT_COUNT=$(curl -s "$API_URL/api/agents" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
    if [ "$AGENT_COUNT" -eq 0 ]; then
        echo "WARNING: No agents running"
    else
        echo "✓ $AGENT_COUNT agents active"
    fi
}

# 检查预算
check_budget() {
    BUDGET=$(curl -s "$API_URL/api/budget" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('hourly_cost', 0))")
    if (( $(echo "$BUDGET > 10" | bc -l) )); then
        echo "WARNING: High cost this hour: \$$BUDGET"
    else
        echo "✓ Budget OK: \$$BUDGET/hour"
    fi
}

check_daemon
check_agents
check_budget

echo "All checks passed!"
```

**定期维护任务：**

```bash
# 添加到crontab
# 每天凌晨2点清理旧日志
0 2 * * * /opt/openfang/scripts/cleanup_logs.sh

# 每周一检查更新
0 9 * * 1 /opt/openfang/scripts/check_updates.sh

# 每月1日备份配置
0 3 1 * * /opt/openfang/scripts/backup_configs.sh
```

---

## 动手练习

### 练习1：创建个人助理Agent

创建一个帮助你管理日常任务的Agent：

```toml
name = "personal-assistant"
version = "0.1.0"
description = "Manages daily tasks and reminders"

[model]
provider = "groq"
model = "llama-3.3-70b-versatile"
system_prompt = """You are a personal productivity assistant.

CAPABILITIES:
- Task management: help organize to-do items
- Reminders: schedule and track deadlines
- Research: look up information when needed
- Summarization: condense long documents

WORKFLOW:
1. When given a task, break it down into steps
2. Store important context in memory
3. Follow up on pending items
4. Provide daily summaries

Always be concise and actionable."""

[capabilities]
tools = ["memory_store", "memory_recall", "web_search", "web_fetch", "file_read", "file_write"]
memory_read = ["*"]
memory_write = ["self.*", "shared.tasks.*"]
```

**测试场景：**
1. "帮我规划本周的学习计划"
2. "记住我明天下午3点有个会议"
3. "搜索Rust异步编程最佳实践"

### 练习2：创建代码审查Agent

基于提供的模板，创建一个专门审查Rust代码的Agent，要求：
- 只能访问项目目录
- 可以运行cargo check和cargo test
- 重点关注内存安全和错误处理

### 练习3：创建定时报告Agent

创建一个每天早上生成昨日代码提交摘要的Agent：
- 使用schedule配置定时运行
- 调用git log获取提交
- 使用LLM生成摘要
- 写入到shared.memory中

---

## 本章总结

通过本章学习，你已经掌握了：

1. **Agent基础** - Manifest结构和必需字段
2. **配置详解** - 模型、资源、能力、调度的完整配置
3. **工具扩展** - 内置工具、MCP服务器和自定义技能
4. **LLM接入** - 多提供商配置和故障转移
5. **测试调试** - 本地测试、问题排查和日志分析
6. **部署运维** - 开发、Daemon、生产三种模式
7. **最佳实践** - 工程化、安全、版本控制

**下一步：**
- 阅读 [第六章：内存系统](../06-memory-system/README.md) 了解记忆机制
- 探索OpenFang源码中的agents/目录，学习更多示例
- 尝试构建自己的Agent并贡献到社区

---

## 参考资源

- [OpenFang Agent Manifest Schema](https://github.com/RightNow-AI/openfang/blob/main/crates/openfang-types/src/agent.rs)
- [TOML语言规范](https://toml.io/en/)
- [MCP协议文档](https://modelcontextprotocol.io/)
- [系统提示词最佳实践](https://docs.anthropic.com/claude/docs/system-prompts)
