// 练习：实现 Agent 执行循环
// 目标：理解状态机、消息处理、工具调用链

// ============================================
// 消息类型定义
// ============================================

#[derive(Debug, Clone)]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

#[derive(Debug, Clone)]
pub struct Message {
    pub role: MessageRole,
    pub content: String,
}

impl Message {
    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::User,
            content: content.into(),
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::Assistant,
            content: content.into(),
        }
    }
}

// ============================================
// 工具定义
// ============================================

pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn execute(&self, input: &str) -> Result<String, ToolError>;
}

#[derive(Debug)]
pub enum ToolError {
    InvalidInput(String),
    ExecutionFailed(String),
}

// 示例工具：计算器
pub struct CalculatorTool;

impl Tool for CalculatorTool {
    fn name(&self) -> &str {
        "calculator"
    }

    fn description(&self) -> &str {
        "Perform basic arithmetic operations. Input format: '2 + 2'"
    }

    fn execute(&self, input: &str) -> Result<String, ToolError> {
        // TODO: 实现简单的表达式解析
        // 提示：可以只支持 "数字 运算符 数字" 格式
        todo!("实现计算器逻辑")
    }
}

// ============================================
// Agent 状态
// ============================================

#[derive(Debug)]
pub enum AgentState {
    Idle,
    Thinking,
    ExecutingTool { tool_name: String },
    Error(String),
}

// ============================================
// TODO: 实现 Agent 结构体
// ============================================

pub struct Agent {
    pub name: String,
    pub state: AgentState,
    pub messages: Vec<Message>,
    pub tools: Vec<Box<dyn Tool>>,
    // TODO: 添加其他字段
}

impl Agent {
    pub fn new(name: impl Into<String>) -> Self {
        todo!("实现构造函数")
    }

    /// 注册工具
    pub fn register_tool(&mut self, tool: Box<dyn Tool>) {
        todo!("添加工具到 tools 列表")
    }

    /// 处理用户消息（核心循环）
    pub fn process_message(&mut self, content: impl Into<String>) -> Result<String, AgentError> {
        // TODO: 实现 Agent 循环：
        // 1. 将用户消息加入 messages
        // 2. 设置状态为 Thinking
        // 3. 调用 LLM（模拟）获取响应
        // 4. 如果响应包含工具调用，执行工具
        // 5. 将结果返回给用户
        todo!("实现 Agent 执行循环")
    }

    /// 获取对话历史
    pub fn history(&self) -> &[Message] {
        &self.messages
    }

    /// 清空对话
    pub fn clear(&mut self) {
        self.messages.clear();
    }
}

#[derive(Debug)]
pub enum AgentError {
    ToolExecutionFailed(String),
    LlmError(String),
    InvalidState(String),
}

// ============================================
// 模拟 LLM 响应（用于测试）
// ============================================

pub struct MockLlm {
    responses: Vec<String>,
}

impl MockLlm {
    pub fn new() -> Self {
        Self {
            responses: vec![
                "I'll help you with that.".to_string(),
                "Using calculator: 2 + 2 = 4".to_string(),
                "Is there anything else?".to_string(),
            ],
        }
    }

    pub fn complete(&self, _messages: &[Message]) -> String {
        // TODO: 根据消息内容返回合适的响应
        // 如果消息包含 "calculate" 或 "计算器"，返回工具调用格式的响应
        self.responses[0].clone()
    }
}

// ============================================
// 使用示例
// ============================================

/*
fn main() -> Result<(), AgentError> {
    let mut agent = Agent::new("MyAssistant");

    // 注册工具
    agent.register_tool(Box::new(CalculatorTool));

    // 对话
    let response1 = agent.process_message("Hello!")?;
    println!("Agent: {}", response1);

    let response2 = agent.process_message("Calculate 10 + 20")?;
    println!("Agent: {}", response2);

    // 查看历史
    println!("\nConversation history:");
    for msg in agent.history() {
        println!("{:?}: {}", msg.role, msg.content);
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
    fn test_agent_creation() {
        let agent = Agent::new("TestAgent");
        assert_eq!(agent.name, "TestAgent");
        matches!(agent.state, AgentState::Idle);
    }

    #[test]
    fn test_tool_registration() {
        let mut agent = Agent::new("TestAgent");
        agent.register_tool(Box::new(CalculatorTool));
        assert_eq!(agent.tools.len(), 1);
        assert_eq!(agent.tools[0].name(), "calculator");
    }

    #[test]
    fn test_calculator_tool() {
        let calc = CalculatorTool;
        let result = calc.execute("2 + 3").unwrap();
        assert_eq!(result, "5");
    }

    #[test]
    fn test_message_history() {
        let mut agent = Agent::new("TestAgent");
        agent.messages.push(Message::user("Hello"));
        agent.messages.push(Message::assistant("Hi there!"));
        assert_eq!(agent.history().len(), 2);
    }
}
