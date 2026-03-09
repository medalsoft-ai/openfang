// 练习：构建完整的最小 Agent
// 目标：综合运用所有知识，创建一个可运行的 Agent

// ============================================
// 依赖声明（复制到 Cargo.toml）
// ============================================
/*
[package]
name = "minimal-agent"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
reqwest = { version = "0.11", features = ["json"] }
anyhow = "1.0"
*/

use std::collections::HashMap;

// ============================================
// Agent 配置
// ============================================

#[derive(Debug, Clone)]
pub struct AgentConfig {
    pub name: String,
    pub description: String,
    pub system_prompt: String,
    pub model: String,  // "gpt-4", "claude-3", etc.
    pub max_turns: usize,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            name: "MinimalAgent".to_string(),
            description: "A simple agent built with Rust".to_string(),
            system_prompt: "You are a helpful assistant.".to_string(),
            model: "gpt-4".to_string(),
            max_turns: 10,
        }
    }
}

// ============================================
// 消息类型
// ============================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChatMessage {
    pub role: String,  // "system", "user", "assistant"
    pub content: String,
}

// ============================================
// TODO: 实现 LLM 客户端
// ============================================

pub struct LlmClient {
    api_key: String,
    base_url: String,
    // TODO: 添加 reqwest client
}

impl LlmClient {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            base_url: "https://api.openai.com/v1".to_string(),
        }
    }

    /// 发送聊天请求
    pub async fn chat(&self, messages: Vec<ChatMessage>) -> anyhow::Result<String> {
        // TODO: 实现实际的 API 调用
        // 1. 构造请求体
        // 2. 发送 POST 请求到 /chat/completions
        // 3. 解析响应
        todo!("实现 LLM API 调用")
    }
}

// ============================================
// TODO: 实现工具系统
// ============================================

#[derive(Debug)]
pub struct ToolCall {
    pub name: String,
    pub arguments: serde_json::Value,
}

#[async_trait::async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn schema(&self) -> serde_json::Value;  // JSON Schema
    async fn execute(&self, args: serde_json::Value) -> anyhow::Result<String>;
}

// 示例：天气查询工具
pub struct WeatherTool;

#[async_trait::async_trait]
impl Tool for WeatherTool {
    fn name(&self) -> &str {
        "get_weather"
    }

    fn description(&self) -> &str {
        "Get current weather for a location"
    }

    fn schema(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City name"
                }
            },
            "required": ["location"]
        })
    }

    async fn execute(&self, args: serde_json::Value) -> anyhow::Result<String> {
        let location = args["location"].as_str().unwrap_or("unknown");
        // TODO: 调用真实天气 API
        Ok(format!("Weather in {}: Sunny, 25°C", location))
    }
}

// ============================================
// TODO: 实现 Agent 核心
// ============================================

pub struct Agent {
    pub config: AgentConfig,
    pub llm: LlmClient,
    pub tools: HashMap<String, Box<dyn Tool>>,
    pub messages: Vec<ChatMessage>,
}

impl Agent {
    pub fn new(config: AgentConfig, llm: LlmClient) -> Self {
        let mut agent = Self {
            config,
            llm,
            tools: HashMap::new(),
            messages: vec![],
        };

        // 添加系统提示
        agent.messages.push(ChatMessage {
            role: "system".to_string(),
            content: agent.config.system_prompt.clone(),
        });

        agent
    }

    /// 注册工具
    pub fn register_tool(&mut self, tool: Box<dyn Tool>) {
        self.tools.insert(tool.name().to_string(), tool);
    }

    /// 运行 Agent（单次交互）
    pub async fn run(&mut self, user_input: &str) -> anyhow::Result<String> {
        // TODO: 实现完整执行流程：
        // 1. 添加用户消息到历史
        // 2. 调用 LLM
        // 3. 解析响应，检查是否需要调用工具
        // 4. 如果调用工具，执行并返回结果给 LLM
        // 5. 返回最终回复给用户
        todo!("实现 Agent 执行循环")
    }

    /// 解析工具调用（简单实现）
    fn parse_tool_call(&self, response: &str) -> Option<ToolCall> {
        // TODO: 从 LLM 响应中解析工具调用
        // 简单格式：TOOL:tool_name:{"arg": "value"}
        None
    }

    /// 获取对话历史
    pub fn history(&self) -> &[ChatMessage] {
        &self.messages
    }

    /// 清空对话（保留系统提示）
    pub fn clear(&mut self) {
        let system = self.messages.first().cloned();
        self.messages.clear();
        if let Some(sys) = system {
            self.messages.push(sys);
        }
    }
}

// ============================================
// TODO: 实现交互式 CLI
// ============================================

/*
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 从环境变量读取 API key
    let api_key = std::env::var("OPENAI_API_KEY")
        .expect("OPENAI_API_KEY not set");

    // 创建配置
    let config = AgentConfig {
        name: "MyAssistant".to_string(),
        system_prompt: "You are a helpful coding assistant.".to_string(),
        ..Default::default()
    };

    // 创建 LLM 客户端
    let llm = LlmClient::new(api_key);

    // 创建 Agent
    let mut agent = Agent::new(config, llm);

    // 注册工具
    agent.register_tool(Box::new(WeatherTool));

    // 交互式循环
    println!("Agent: Hello! How can I help you today?");
    println!("Commands: /quit, /clear, /history");

    loop {
        print!("\nYou: ");
        std::io::Write::flush(&mut std::io::stdout())?;

        let mut input = String::new();
        std::io::stdin().read_line(&mut input)?;
        let input = input.trim();

        match input {
            "/quit" => break,
            "/clear" => {
                agent.clear();
                println!("Agent: Conversation cleared.");
                continue;
            }
            "/history" => {
                for msg in agent.history() {
                    println!("{}: {}", msg.role, msg.content);
                }
                continue;
            }
            _ => {}
        }

        match agent.run(input).await {
            Ok(response) => println!("Agent: {}", response),
            Err(e) => println!("Error: {}", e),
        }
    }

    Ok(())
}
*/

// ============================================
// 测试
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_config_default() {
        let config = AgentConfig::default();
        assert_eq!(config.name, "MinimalAgent");
        assert_eq!(config.max_turns, 10);
    }

    #[test]
    fn test_message_creation() {
        let msg = ChatMessage {
            role: "user".to_string(),
            content: "Hello".to_string(),
        };
        assert_eq!(msg.role, "user");
    }

    #[test]
    fn test_tool_registration() {
        let config = AgentConfig::default();
        let llm = LlmClient::new("fake-key".to_string());
        let mut agent = Agent::new(config, llm);

        agent.register_tool(Box::new(WeatherTool));
        assert!(agent.tools.contains_key("get_weather"));
    }

    #[tokio::test]
    async fn test_weather_tool() {
        let tool = WeatherTool;
        let args = serde_json::json!({"location": "Beijing"});
        let result = tool.execute(args).await.unwrap();
        assert!(result.contains("Beijing"));
    }
}
