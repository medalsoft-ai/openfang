// 练习 1：实现一个简单的 Agent 状态机
// 完成以下代码

#[derive(Debug, Clone)]
struct Agent {
    name: String,
    state: AgentState,
}

#[derive(Debug, Clone)]
enum AgentState {
    Idle,
    Running { task: String, start_time: String },
    Error { message: String },
}

impl Agent {
    fn new(name: &str) -> Self {
        // 实现构造函数
        todo!()
    }

    fn start_task(&mut self, task: String) -> Result<(), String> {
        // 只有在 Idle 状态下才能开始任务
        todo!()
    }

    fn stop(&mut self) -> Result<(), String> {
        // 停止当前任务
        todo!()
    }

    fn describe(&self) -> String {
        // 返回 Agent 的描述
        // Idle: "Agent {name} is idle"
        // Running: "Agent {name} is working on {task}"
        // Error: "Agent {name} encountered error: {message}"
        todo!()
    }
}

fn main() {
    let mut agent = Agent::new("MyAgent");

    println!("{}", agent.describe());

    agent.start_task("Processing data".to_string()).unwrap();
    println!("{}", agent.describe());

    agent.stop().unwrap();
    println!("{}", agent.describe());
}
