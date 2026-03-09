// 练习：实现 LLM Provider 工厂模式
// 目标：理解 trait + 工厂模式 + 动态分发

// ============================================
// 定义 LlmProvider trait
// ============================================

pub trait LlmProvider {
    /// 发送消息并返回回复
    fn complete(&self, prompt: &str) -> Result<String, ProviderError>;

    /// Provider 名称
    fn name(&self) -> &str;

    /// 是否支持流式输出
    fn supports_streaming(&self) -> bool;
}

#[derive(Debug)]
pub enum ProviderError {
    ApiKeyMissing,
    RequestFailed(String),
    RateLimited,
}

impl std::fmt::Display for ProviderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProviderError::ApiKeyMissing => write!(f, "API key not configured"),
            ProviderError::RequestFailed(msg) => write!(f, "Request failed: {}", msg),
            ProviderError::RateLimited => write!(f, "Rate limited, please retry later"),
        }
    }
}

impl std::error::Error for ProviderError {}

// ============================================
// TODO: 实现 OpenAI Provider
// ============================================

pub struct OpenAiProvider {
    api_key: String,
    model: String,
}

impl OpenAiProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            model: "gpt-4".to_string(),
        }
    }
}

// TODO: 为 OpenAiProvider 实现 LlmProvider trait
// impl LlmProvider for OpenAiProvider { ... }

// ============================================
// TODO: 实现 Anthropic Provider
// ============================================

pub struct AnthropicProvider {
    api_key: String,
    model: String,
}

impl AnthropicProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            model: "claude-3-sonnet".to_string(),
        }
    }
}

// TODO: 为 AnthropicProvider 实现 LlmProvider trait

// ============================================
// TODO: 实现本地 Mock Provider（用于测试）
// ============================================

pub struct MockProvider {
    responses: Vec<String>,
    current_index: std::cell::Cell<usize>,
}

impl MockProvider {
    pub fn new() -> Self {
        Self {
            responses: vec![
                "Hello! I'm a mock AI.".to_string(),
                "This is a test response.".to_string(),
                "Mock provider at your service.".to_string(),
            ],
            current_index: std::cell::Cell::new(0),
        }
    }
}

// TODO: 为 MockProvider 实现 LlmProvider trait
// 提示：使用 current_index 循环返回 responses

// ============================================
// TODO: 实现 Provider 工厂
// ============================================

pub enum ProviderType {
    OpenAi,
    Anthropic,
    Mock,
}

pub struct ProviderFactory;

impl ProviderFactory {
    /// 根据类型创建对应的 Provider
    /// 返回 Box<dyn LlmProvider> 实现动态分发
    pub fn create(
        provider_type: ProviderType,
        api_key: Option<String>,
    ) -> Result<Box<dyn LlmProvider>, ProviderError> {
        todo!("实现工厂逻辑：根据 provider_type 创建对应的 Provider")
    }
}

// ============================================
// 测试（完成后运行 cargo test）
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_provider() {
        let mock = MockProvider::new();
        assert_eq!(mock.name(), "mock");
        assert!(!mock.supports_streaming());

        let resp1 = mock.complete("test").unwrap();
        let resp2 = mock.complete("test").unwrap();
        assert_ne!(resp1, resp2); // 应该循环返回不同响应
    }

    #[test]
    fn test_factory_creates_correct_type() {
        let provider = ProviderFactory::create(ProviderType::Mock, None).unwrap();
        assert_eq!(provider.name(), "mock");
    }

    #[test]
    fn test_openai_requires_api_key() {
        let result = ProviderFactory::create(ProviderType::OpenAi, None);
        assert!(matches!(result, Err(ProviderError::ApiKeyMissing)));
    }
}
