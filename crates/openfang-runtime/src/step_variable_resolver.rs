//! Variable resolver for step-to-step data passing.
//!
//! Provides interpolation of `{{step_id.field}}` syntax using outputs from
//! previously executed steps in a Hand execution.

use regex_lite::Regex;
use serde_json::Value;
use std::collections::HashMap;

/// Regex pattern for matching variable references like {{step_id.field}}
static VARIABLE_REGEX: std::sync::LazyLock<Regex> = std::sync::LazyLock::new(|| {
    Regex::new(r"\{\{(\w[\w-]*)\.([\w.]+)\}\}").unwrap()
});

/// Resolver for interpolating step output variables.
#[derive(Debug, Clone)]
pub struct VariableResolver;

impl VariableResolver {
    /// Resolve variables in a JSON value using step outputs.
    ///
    /// Recursively processes strings within JSON objects and arrays,
    /// replacing `{{step_id.field}}` patterns with actual values.
    pub fn resolve(input: &Value, step_outputs: &HashMap<String, Value>) -> Value {
        match input {
            Value::String(s) => {
                let resolved = Self::resolve_string(s, step_outputs);
                Value::String(resolved)
            }
            Value::Object(map) => {
                let mut resolved = serde_json::Map::new();
                for (k, v) in map {
                    resolved.insert(k.clone(), Self::resolve(v, step_outputs));
                }
                Value::Object(resolved)
            }
            Value::Array(arr) => {
                Value::Array(arr.iter().map(|v| Self::resolve(v, step_outputs)).collect())
            }
            other => other.clone(),
        }
    }

    /// Resolve variables in a string.
    ///
    /// Replaces all `{{step_id.field}}` patterns with values from step_outputs.
    /// Missing variables keep their original syntax.
    fn resolve_string(input: &str, step_outputs: &HashMap<String, Value>) -> String {
        VARIABLE_REGEX
            .replace_all(input, |caps: &regex_lite::Captures| {
                let step_id = &caps[1];
                let field_path = &caps[2];

                step_outputs
                    .get(step_id)
                    .and_then(|output| Self::get_nested_value(output, field_path))
                    .map(|v| match v {
                        Value::String(s) => s.clone(),
                        other => other.to_string(),
                    })
                    .unwrap_or_else(|| caps[0].to_string())
            })
            .to_string()
    }

    /// Get a nested value from JSON using dot notation (e.g., "result.data.name").
    fn get_nested_value<'a>(value: &'a Value, path: &str) -> Option<&'a Value> {
        let mut current = value;
        for segment in path.split('.') {
            match current {
                Value::Object(map) => {
                    current = map.get(segment)?;
                }
                _ => return None,
            }
        }
        Some(current)
    }
}

/// Convenience function for direct variable resolution.
///
/// # Example
/// ```
/// use std::collections::HashMap;
/// use serde_json::Value;
/// use openfang_runtime::step_variable_resolver::resolve_variables;
///
/// let mut outputs = HashMap::new();
/// outputs.insert("step1".to_string(), serde_json::json!({"result": "Hello"}));
///
/// let input = serde_json::json!({"message": "{{step1.result}}"});
/// let resolved = resolve_variables(&input, &outputs);
///
/// assert_eq!(resolved["message"], "Hello");
/// ```
pub fn resolve_variables(input: &Value, step_outputs: &HashMap<String, Value>) -> Value {
    VariableResolver::resolve(input, step_outputs)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_outputs() -> HashMap<String, Value> {
        let mut outputs = HashMap::new();
        outputs.insert(
            "step1".to_string(),
            serde_json::json!({
                "result": "Hello World",
                "data": {
                    "name": "John",
                    "age": 30
                }
            }),
        );
        outputs.insert(
            "step2".to_string(),
            serde_json::json!({
                "output": 42,
                "items": ["a", "b", "c"]
            }),
        );
        outputs.insert(
            "step_with_hyphens".to_string(),
            serde_json::json!({
                "value": "hyphenated-id"
            }),
        );
        outputs
    }

    #[test]
    fn test_resolve_simple_variable() {
        let outputs = create_test_outputs();
        let input = serde_json::json!({"message": "{{step1.result}}"});
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved["message"], "Hello World");
    }

    #[test]
    fn test_resolve_nested_field() {
        let outputs = create_test_outputs();
        let input = serde_json::json!({"name": "{{step1.data.name}}"});
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved["name"], "John");
    }

    #[test]
    fn test_resolve_deeply_nested_field() {
        let outputs = create_test_outputs();
        let input = serde_json::json!({"age": "{{step1.data.age}}"});
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved["age"], "30");
    }

    #[test]
    fn test_resolve_multiple_variables() {
        let outputs = create_test_outputs();
        let input = serde_json::json!({"combined": "{{step1.result}} and {{step2.output}}"});
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved["combined"], "Hello World and 42");
    }

    #[test]
    fn test_resolve_missing_variable_keeps_original() {
        let outputs = create_test_outputs();
        let input = serde_json::json!({"message": "{{step1.missing}}"});
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved["message"], "{{step1.missing}}");
    }

    #[test]
    fn test_resolve_nonexistent_step_keeps_original() {
        let outputs = create_test_outputs();
        let input = serde_json::json!({"message": "{{nonexistent.result}}"});
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved["message"], "{{nonexistent.result}}");
    }

    #[test]
    fn test_resolve_in_json_object() {
        let outputs = create_test_outputs();
        let input = serde_json::json!({
            "tool": "search",
            "params": {
                "query": "{{step1.result}}"
            }
        });
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved["params"]["query"], "Hello World");
    }

    #[test]
    fn test_resolve_in_array() {
        let outputs = create_test_outputs();
        let input = serde_json::json!(["{{step1.result}}", "{{step2.output}}"]);
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved[0], "Hello World");
        assert_eq!(resolved[1], "42");
    }

    #[test]
    fn test_resolve_mixed_array() {
        let outputs = create_test_outputs();
        let input = serde_json::json!(["static", "{{step1.result}}", 123]);
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved[0], "static");
        assert_eq!(resolved[1], "Hello World");
        assert_eq!(resolved[2], 123);
    }

    #[test]
    fn test_resolve_no_variables() {
        let outputs = create_test_outputs();
        let input = serde_json::json!({"message": "Hello World", "count": 42});
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved["message"], "Hello World");
        assert_eq!(resolved["count"], 42);
    }

    #[test]
    fn test_resolve_empty_outputs() {
        let outputs: HashMap<String, Value> = HashMap::new();
        let input = serde_json::json!({"message": "{{step1.result}}"});
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved["message"], "{{step1.result}}");
    }

    #[test]
    fn test_resolve_step_with_hyphens() {
        let outputs = create_test_outputs();
        let input = serde_json::json!({"value": "{{step_with_hyphens.value}}"});
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved["value"], "hyphenated-id");
    }

    #[test]
    fn test_resolve_number_value() {
        let outputs = create_test_outputs();
        let input = serde_json::json!({"count": "{{step2.output}}"});
        let resolved = VariableResolver::resolve(&input, &outputs);

        // Numbers are converted to strings when interpolated
        assert_eq!(resolved["count"], "42");
    }

    #[test]
    fn test_resolve_partial_string() {
        let outputs = create_test_outputs();
        let input = serde_json::json!({"greeting": "Hello {{step1.data.name}}!"});
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved["greeting"], "Hello John!");
    }

    #[test]
    fn test_convenience_function() {
        let outputs = create_test_outputs();
        let input = serde_json::json!({"message": "{{step1.result}}"});
        let resolved = resolve_variables(&input, &outputs);

        assert_eq!(resolved["message"], "Hello World");
    }

    #[test]
    fn test_resolve_boolean_value() {
        let mut outputs = HashMap::new();
        outputs.insert(
            "step3".to_string(),
            serde_json::json!({"success": true}),
        );
        let input = serde_json::json!({"status": "{{step3.success}}"});
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved["status"], "true");
    }

    #[test]
    fn test_resolve_null_value() {
        let mut outputs = HashMap::new();
        outputs.insert(
            "step4".to_string(),
            serde_json::json!({"value": null}),
        );
        let input = serde_json::json!({"result": "{{step4.value}}"});
        let resolved = VariableResolver::resolve(&input, &outputs);

        assert_eq!(resolved["result"], "null");
    }
}
