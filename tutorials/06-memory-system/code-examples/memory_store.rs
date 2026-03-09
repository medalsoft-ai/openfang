// 练习：实现 SQLite 内存存储
// 目标：理解 Rust 数据库操作、持久化、异步 trait

// ============================================
// 内存存储 Trait
// ============================================

pub trait MemoryStore: Send + Sync {
    /// 存储键值对
    fn set(&mut self, key: String, value: String) -> Result<(), MemoryError>;

    /// 获取值
    fn get(&self, key: &str) -> Result<Option<String>, MemoryError>;

    /// 删除键
    fn delete(&mut self, key: &str) -> Result<bool, MemoryError>;

    /// 列出所有键（支持前缀匹配）
    fn list_keys(&self, prefix: Option<&str>) -> Result<Vec<String>, MemoryError>;

    /// 搜索值包含指定内容的键
    fn search(&self, query: &str) -> Result<Vec<(String, String)>, MemoryError>;
}

#[derive(Debug)]
pub enum MemoryError {
    ConnectionFailed(String),
    QueryFailed(String),
    SerializationFailed(String),
}

impl std::fmt::Display for MemoryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MemoryError::ConnectionFailed(msg) => write!(f, "Connection failed: {}", msg),
            MemoryError::QueryFailed(msg) => write!(f, "Query failed: {}", msg),
            MemoryError::SerializationFailed(msg) => write!(f, "Serialization failed: {}", msg),
        }
    }
}

impl std::error::Error for MemoryError {}

// ============================================
// TODO: 实现内存存储（HashMap 版本）
// ============================================

use std::collections::HashMap;

pub struct InMemoryStore {
    data: HashMap<String, String>,
}

impl InMemoryStore {
    pub fn new() -> Self {
        Self {
            data: HashMap::new(),
        }
    }
}

// TODO: 为 InMemoryStore 实现 MemoryStore trait

// ============================================
// TODO: 实现 SQLite 存储
// ============================================

// 注意：需要添加依赖：rusqlite = "0.30"
// 或使用 sqlx 进行异步操作

pub struct SqliteStore {
    // TODO: 添加 db 连接字段
    // db: rusqlite::Connection,
}

impl SqliteStore {
    /// 创建/打开数据库
    pub fn new(db_path: &str) -> Result<Self, MemoryError> {
        todo!("创建 SQLite 连接，初始化表结构")
    }

    /// 初始化表
    fn init_table(&mut self) -> Result<(), MemoryError> {
        // TODO: 创建表：
        // CREATE TABLE IF NOT EXISTS memory (
        //     key TEXT PRIMARY KEY,
        //     value TEXT NOT NULL,
        //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        // )
        todo!()
    }
}

// TODO: 为 SqliteStore 实现 MemoryStore trait

// ============================================
// 扩展：实现消息存储（用于 Agent 对话）
// ============================================

#[derive(Debug, Clone)]
pub struct StoredMessage {
    pub id: String,
    pub session_id: String,
    pub role: String,  // "user" or "assistant"
    pub content: String,
    pub timestamp: u64,
}

pub trait MessageStore: Send + Sync {
    /// 存储消息
    fn save_message(&mut self, msg: StoredMessage) -> Result<(), MemoryError>;

    /// 获取会话的所有消息
    fn get_session_messages(
        &self,
        session_id: &str,
        limit: usize,
    ) -> Result<Vec<StoredMessage>, MemoryError>;

    /// 删除会话
    fn delete_session(&mut self, session_id: &str) -> Result<(), MemoryError>;
}

// TODO: 为 SqliteStore 实现 MessageStore

// ============================================
// 使用示例
// ============================================

/*
fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 内存存储（测试用）
    let mut mem_store = InMemoryStore::new();
    mem_store.set("agent.name".to_string(), "Alpha".to_string())?;
    println!("Name: {:?}", mem_store.get("agent.name")?);

    // SQLite 存储（生产用）
    let mut sqlite_store = SqliteStore::new("agent.db")?;
    sqlite_store.set("agent.version".to_string(), "1.0.0".to_string())?;

    // 列出所有键
    let keys = sqlite_store.list_keys(Some("agent."))?;
    println!("Keys: {:?}", keys);

    // 搜索
    let results = sqlite_store.search("Alpha")?;
    println!("Search results: {:?}", results);

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
    fn test_in_memory_store() {
        let mut store = InMemoryStore::new();

        // 测试 set/get
        store.set("key1".to_string(), "value1".to_string()).unwrap();
        assert_eq!(store.get("key1").unwrap(), Some("value1".to_string()));

        // 测试不存在的键
        assert_eq!(store.get("nonexistent").unwrap(), None);

        // 测试 delete
        assert!(store.delete("key1").unwrap());
        assert!(!store.delete("key1").unwrap());
    }

    #[test]
    fn test_list_keys() {
        let mut store = InMemoryStore::new();
        store.set("agent.1.name".to_string(), "Alpha".to_string()).unwrap();
        store.set("agent.2.name".to_string(), "Beta".to_string()).unwrap();
        store.set("user.1".to_string(), "Alice".to_string()).unwrap();

        let agent_keys = store.list_keys(Some("agent.")).unwrap();
        assert_eq!(agent_keys.len(), 2);

        let all_keys = store.list_keys(None).unwrap();
        assert_eq!(all_keys.len(), 3);
    }

    #[test]
    fn test_search() {
        let mut store = InMemoryStore::new();
        store.set("msg1".to_string(), "Hello world".to_string()).unwrap();
        store.set("msg2".to_string(), "Hello Rust".to_string()).unwrap();
        store.set("msg3".to_string(), "Goodbye".to_string()).unwrap();

        let results = store.search("Hello").unwrap();
        assert_eq!(results.len(), 2);
    }
}
