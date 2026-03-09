//! Trait 演示 - Notifier 系统
//!
//! 运行: cargo run --example trait_demo

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
        println!("[CONSOLE] {}", message);
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
        println!("[EMAIL to {}] {}", self.to, message);
        Ok(())
    }
}

// Slack 实现（模拟）
pub struct SlackNotifier {
    channel: String,
}

#[async_trait]
impl Notifier for SlackNotifier {
    async fn send(&self, message: &str) -> Result<(), String> {
        println!("[SLACK #{}] {}", self.channel, message);
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

    pub async fn notify_all_batch(&self, messages: &[String]) -> Result<(), String> {
        for notifier in &self.notifiers {
            notifier.send_batch(messages).await?;
        }
        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<(), String> {
    println!("=== Trait 演示 - 通知系统 ===\n");

    let mut service = NotificationService::new();

    // 添加不同类型的通知器
    service.add_notifier(Box::new(ConsoleNotifier));
    service.add_notifier(Box::new(EmailNotifier {
        to: "admin@example.com".to_string(),
    }));
    service.add_notifier(Box::new(SlackNotifier {
        channel: "general".to_string(),
    }));

    // 发送单条通知
    println!("发送单条通知:");
    service.notify_all("系统启动成功").await?;

    println!();

    // 批量发送
    println!("批量发送通知:");
    let messages = vec![
        "备份完成".to_string(),
        "磁盘空间充足".to_string(),
        "无安全警告".to_string(),
    ];
    service.notify_all_batch(&messages).await?;

    println!("\n✓ 所有通知发送成功！");

    Ok(())
}
