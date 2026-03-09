// 练习 2：实现一个简易的内存存储
// 实现一个类似 OpenFang Memory trait 的简单版本

use std::collections::HashMap;

trait SimpleMemory {
    fn store(&mut self, key: String, value: String);
    fn retrieve(&self, key: &str) -> Option<&String>;
    fn delete(&mut self, key: &str) -> Result<(), String>;
}

struct InMemoryStore {
    // 实现存储
    data: HashMap<String, String>,
}

impl InMemoryStore {
    fn new() -> Self {
        Self {
            data: HashMap::new(),
        }
    }
}

impl SimpleMemory for InMemoryStore {
    fn store(&mut self, key: String, value: String) {
        self.data.insert(key, value);
    }

    fn retrieve(&self, key: &str) -> Option<&String> {
        self.data.get(key)
    }

    fn delete(&mut self, key: &str) -> Result<(), String> {
        match self.data.remove(key) {
            Some(_) => Ok(()),
            None => Err(format!("Key '{}' not found", key)),
        }
    }
}

fn main() {
    let mut memory = InMemoryStore::new();

    memory.store("agent.1.name".to_string(), "Alpha".to_string());
    memory.store("agent.2.name".to_string(), "Beta".to_string());

    assert_eq!(memory.retrieve("agent.1.name"), Some(&"Alpha".to_string()));

    memory.delete("agent.1.name").unwrap();
    assert_eq!(memory.retrieve("agent.1.name"), None);

    println!("All tests passed!");
}
