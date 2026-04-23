use super::models::*;
use anyhow::{Context, Result};
use regex::Regex;
use serde_json::Value;
use std::collections::HashMap;

pub struct DataMapper {
    context: HashMap<String, Value>,
}

impl DataMapper {
    pub fn new() -> Self {
        Self {
            context: HashMap::new(),
        }
    }

    /// Store node execution result for future reference
    pub fn store_node_result(&mut self, node_id: &str, data: HashMap<String, Value>) {
        self.context.insert(node_id.to_string(), Value::Object(
            data.into_iter()
                .map(|(k, v)| (k, v))
                .collect()
        ));
    }

    /// Apply data mappings to a node's configuration
    pub fn apply_mappings(&self, node: &WorkflowNode) -> Result<WorkflowNode> {
        let mut mapped_node = node.clone();

        // Apply mappings to URL
        if let Some(ref url) = mapped_node.data.url {
            mapped_node.data.url = Some(self.substitute_variables(url)?);
        }

        // Apply mappings to headers
        if let Some(ref headers) = mapped_node.data.headers {
            mapped_node.data.headers = Some(
                headers.iter()
                    .map(|h| Ok(KeyValue {
                        key: self.substitute_variables(&h.key)?,
                        value: self.substitute_variables(&h.value)?,
                        enabled: h.enabled,
                    }))
                    .collect::<Result<Vec<_>>>()?
            );
        }

        // Apply mappings to body
        if let Some(ref body) = mapped_node.data.body {
            mapped_node.data.body = Some(self.substitute_in_json(body)?);
        }

        // Apply explicit data mappings
        for mapping in &node.data.data_mappings {
            let value = self.extract_value(&mapping.source_expression)?;
            let transformed = self.apply_transform(value, mapping.transform.as_deref())?;
            
            // Set the value in the appropriate field
            self.set_field_value(&mut mapped_node, &mapping.target_field, transformed)?;
        }

        Ok(mapped_node)
    }

    /// Substitute variables in a string (e.g., "{{node1.response.token}}")
    fn substitute_variables(&self, input: &str) -> Result<String> {
        let re = Regex::new(r"\{\{([^}]+)\}\}").unwrap();
        let mut result = input.to_string();

        for cap in re.captures_iter(input) {
            let expression = &cap[1];
            let value = self.extract_value(expression)?;
            let value_str = match value {
                Value::String(s) => s,
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => b.to_string(),
                v => v.to_string(),
            };
            result = result.replace(&cap[0], &value_str);
        }

        Ok(result)
    }

    /// Substitute variables in JSON
    fn substitute_in_json(&self, json: &Value) -> Result<Value> {
        match json {
            Value::String(s) => {
                Ok(Value::String(self.substitute_variables(s)?))
            }
            Value::Array(arr) => {
                Ok(Value::Array(
                    arr.iter()
                        .map(|v| self.substitute_in_json(v))
                        .collect::<Result<Vec<_>>>()?
                ))
            }
            Value::Object(obj) => {
                Ok(Value::Object(
                    obj.iter()
                        .map(|(k, v)| Ok((k.clone(), self.substitute_in_json(v)?)))
                        .collect::<Result<serde_json::Map<_, _>>>()?
                ))
            }
            other => Ok(other.clone()),
        }
    }

    /// Extract value from expression (e.g., "node1.response.body.token")
    fn extract_value(&self, expression: &str) -> Result<Value> {
        let parts: Vec<&str> = expression.trim().split('.').collect();
        
        if parts.is_empty() {
            anyhow::bail!("Empty expression");
        }

        // Get the node data
        let node_id = parts[0];
        let node_data = self.context.get(node_id)
            .context(format!("Node {} not found in context", node_id))?;

        // Navigate through the path
        let mut current = node_data;
        for part in &parts[1..] {
            current = current.get(part)
                .context(format!("Field {} not found", part))?;
        }

        Ok(current.clone())
    }

    /// Apply transformation to a value
    fn apply_transform(&self, value: Value, transform: Option<&str>) -> Result<Value> {
        match transform {
            None => Ok(value),
            Some("uppercase") => {
                if let Value::String(s) = value {
                    Ok(Value::String(s.to_uppercase()))
                } else {
                    Ok(value)
                }
            }
            Some("lowercase") => {
                if let Value::String(s) = value {
                    Ok(Value::String(s.to_lowercase()))
                } else {
                    Ok(value)
                }
            }
            Some(t) => anyhow::bail!("Unknown transform: {}", t),
        }
    }

    /// Set a field value in the node using dot notation
    fn set_field_value(&self, node: &mut WorkflowNode, field_path: &str, value: Value) -> Result<()> {
        // Simplified implementation - extend as needed
        // For now, only support direct field setting
        
        if field_path.starts_with("headers.") {
            let header_name = field_path.strip_prefix("headers.").unwrap();
            if let Some(ref mut headers) = node.data.headers {
                // Find existing header or add new one
                if let Some(header) = headers.iter_mut().find(|h| h.key == header_name) {
                    header.value = value.as_str().unwrap_or("").to_string();
                } else {
                    headers.push(KeyValue {
                        key: header_name.to_string(),
                        value: value.as_str().unwrap_or("").to_string(),
                        enabled: true,
                    });
                }
            }
        }
        
        Ok(())
    }
}
