//! Newtype 模式演示
//!
//! 运行: cargo run --example newtype_demo

use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

/// Agent ID - 使用 Newtype 模式包装 Uuid
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

impl FromStr for AgentId {
    type Err = uuid::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(Uuid::parse_str(s)?))
    }
}

/// Session ID - 另一个 Newtype 示例
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SessionId(pub Uuid);

impl SessionId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for SessionId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for SessionId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

fn main() {
    println!("=== Newtype 模式演示 ===\n");

    // 创建新的 ID
    let agent_id = AgentId::new();
    let session_id = SessionId::new();

    println!("Agent ID: {}", agent_id);
    println!("Session ID: {}", session_id);

    // 序列化
    let json = serde_json::to_string(&agent_id).unwrap();
    println!("\n序列化后的 Agent ID: {}", json);

    // 反序列化
    let parsed: AgentId = serde_json::from_str(&json).unwrap();
    println!("反序列化后的 Agent ID: {}", parsed);

    // 从字符串解析
    let id_str = agent_id.to_string();
    let from_str = AgentId::from_str(&id_str).unwrap();
    println!("\n从字符串解析的 Agent ID: {}", from_str);

    // 验证相等性
    assert_eq!(agent_id, parsed);
    assert_eq!(agent_id, from_str);

    // 类型安全：以下代码会编译错误
    // let wrong: AgentId = session_id;  // ✗ 编译错误！

    println!("\n✓ 所有测试通过！");
}
