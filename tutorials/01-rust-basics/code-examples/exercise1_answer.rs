// 练习 1 答案

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
        Self {
            name: name.to_string(),
            state: AgentState::Idle,
        }
    }

    fn start_task(&mut self, task: String) -> Result<(), String> {
        match &self.state {
            AgentState::Idle => {
                self.state = AgentState::Running {
                    task,
                    start_time: "now".to_string(), // 简化处理
                };
                Ok(())
            }
            _ => Err(format!("Cannot start task: Agent is not idle")),
        }
    }

    fn stop(&mut self) -> Result<(), String> {
        match &self.state {
            AgentState::Running { .. } => {
                self.state = AgentState::Idle;
                Ok(())
            }
            _ => Err("Cannot stop: Agent is not running".to_string()),
        }
    }

    fn describe(&self) -> String {
        match &self.state {
            AgentState::Idle => format!("Agent {} is idle", self.name),
            AgentState::Running { task, .. } => {
                format!("Agent {} is working on {}", self.name, task)
            }
            AgentState::Error { message } => {
                format!("Agent {} encountered error: {}", self.name, message)
            }
        }
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
