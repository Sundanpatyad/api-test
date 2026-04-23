# API Workflow Automation - Implementation Guide

This guide provides step-by-step instructions to transform your existing PayloadX API Studio into a full-featured workflow automation platform.

---

## 📋 Prerequisites

- Existing PayloadX codebase
- Rust toolchain installed
- Node.js 18+
- Basic understanding of:
  - Rust async programming
  - React and Zustand
  - Graph data structures

---

## 🚀 Phase 1: Rust Execution Engine

### Step 1.1: Update Cargo Dependencies

Add required dependencies to `apps/desktop/src-tauri/Cargo.toml`:

```toml
[dependencies]
# Existing dependencies...
tauri = { version = "1.6", features = ["shell-open", "fs-read-file", "fs-write-file", "fs-exists", "dialog-open", "dialog-save"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.11", features = ["json", "cookies", "multipart"] }
tokio = { version = "1", features = ["full"] }
url = "2.5"

# NEW: Add these for workflow execution
petgraph = "0.6"           # Graph algorithms (topological sort)
jsonpath-rust = "0.3"      # JSONPath for data extraction
regex = "1.10"             # Regex for validation
chrono = "0.4"             # Time tracking
thiserror = "1.0"          # Error handling
anyhow = "1.0"             # Error context
```

### Step 1.2: Create Workflow Module Structure

Create the following directory structure:

```bash
mkdir -p apps/desktop/src-tauri/src/workflow
touch apps/desktop/src-tauri/src/workflow/mod.rs
touch apps/desktop/src-tauri/src/workflow/models.rs
touch apps/desktop/src-tauri/src/workflow/parser.rs
touch apps/desktop/src-tauri/src/workflow/executor.rs
touch apps/desktop/src-tauri/src/workflow/data_mapper.rs
touch apps/desktop/src-tauri/src/workflow/validator.rs
touch apps/desktop/src-tauri/src/workflow/metrics.rs
```

### Step 1.3: Define Data Models

Create `apps/desktop/src-tauri/src/workflow/models.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub nodes: Vec<WorkflowNode>,
    pub edges: Vec<WorkflowEdge>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowNode {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: NodeType,
    pub position: Position,
    pub data: NodeData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NodeType {
    Api,
    Condition,
    Delay,
    Transform,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeData {
    pub name: String,
    
    // API specific fields
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<Vec<KeyValue>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<Vec<KeyValue>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<serde_json::Value>,
    
    // Data mapping
    #[serde(default)]
    pub data_mappings: Vec<DataMapping>,
    
    // Validations
    #[serde(default)]
    pub validations: Vec<Validation>,
    
    // Execution config
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retries: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyValue {
    pub key: String,
    pub value: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataMapping {
    pub target_field: String,
    pub source_expression: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transform: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Validation {
    #[serde(rename = "type")]
    pub validation_type: ValidationType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
    pub operator: ValidationOperator,
    pub expected: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ValidationType {
    Status,
    Body,
    Header,
    Schema,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ValidationOperator {
    Equals,
    Contains,
    Matches,
    Exists,
    Gt,
    Lt,
    Gte,
    Lte,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    #[serde(rename = "type")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edge_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub condition: Option<String>,
}

// Execution Results

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowExecution {
    pub id: String,
    pub workflow_id: String,
    pub workflow_name: String,
    pub start_time: String,
    pub end_time: String,
    pub duration: u64,
    pub status: ExecutionStatus,
    pub total_nodes: usize,
    pub success_count: usize,
    pub failed_count: usize,
    pub skipped_count: usize,
    pub node_results: Vec<NodeExecutionResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExecutionStatus {
    Success,
    Failed,
    Partial,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeExecutionResult {
    pub node_id: String,
    pub node_name: String,
    pub start_time: String,
    pub end_time: String,
    pub duration: u64,
    pub status: NodeStatus,
    pub request: Option<RequestDetails>,
    pub response: Option<ResponseDetails>,
    pub validations: Vec<ValidationResult>,
    pub error: Option<ErrorDetails>,
    pub extracted_data: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NodeStatus {
    Success,
    Failed,
    Skipped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestDetails {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseDetails {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: serde_json::Value,
    pub size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    #[serde(rename = "type")]
    pub validation_type: String,
    pub passed: bool,
    pub expected: serde_json::Value,
    pub actual: serde_json::Value,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorDetails {
    pub message: String,
    #[serde(rename = "type")]
    pub error_type: String,
    pub stack: Option<String>,
}
```

### Step 1.4: Implement Workflow Parser

Create `apps/desktop/src-tauri/src/workflow/parser.rs`:

```rust
use super::models::*;
use anyhow::{Context, Result};
use petgraph::graph::{DiGraph, NodeIndex};
use std::collections::HashMap;

pub struct WorkflowParser {
    workflow: Workflow,
    node_map: HashMap<String, NodeIndex>,
}

impl WorkflowParser {
    pub fn new(workflow: Workflow) -> Self {
        Self {
            workflow,
            node_map: HashMap::new(),
        }
    }

    /// Parse workflow and build execution graph
    pub fn parse(&mut self) -> Result<DiGraph<WorkflowNode, WorkflowEdge>> {
        let mut graph = DiGraph::new();

        // Add all nodes to graph
        for node in &self.workflow.nodes {
            let idx = graph.add_node(node.clone());
            self.node_map.insert(node.id.clone(), idx);
        }

        // Add edges
        for edge in &self.workflow.edges {
            let source_idx = self.node_map.get(&edge.source)
                .context(format!("Source node {} not found", edge.source))?;
            let target_idx = self.node_map.get(&edge.target)
                .context(format!("Target node {} not found", edge.target))?;
            
            graph.add_edge(*source_idx, *target_idx, edge.clone());
        }

        // Validate graph (no cycles for now)
        self.validate_graph(&graph)?;

        Ok(graph)
    }

    /// Validate workflow graph structure
    fn validate_graph(&self, graph: &DiGraph<WorkflowNode, WorkflowEdge>) -> Result<()> {
        // Check for cycles using DFS
        if petgraph::algo::is_cyclic_directed(graph) {
            anyhow::bail!("Workflow contains cycles");
        }

        // Ensure at least one node
        if graph.node_count() == 0 {
            anyhow::bail!("Workflow must contain at least one node");
        }

        Ok(())
    }

    /// Get execution order using topological sort
    pub fn get_execution_order(&self, graph: &DiGraph<WorkflowNode, WorkflowEdge>) -> Result<Vec<NodeIndex>> {
        petgraph::algo::toposort(graph, None)
            .map_err(|_| anyhow::anyhow!("Failed to determine execution order"))
    }
}
```

### Step 1.5: Implement Data Mapper

Create `apps/desktop/src-tauri/src/workflow/data_mapper.rs`:

```rust
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
            Some("base64") => {
                if let Value::String(s) = value {
                    Ok(Value::String(base64::encode(s)))
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
```

### Step 1.6: Implement Response Validator

Create `apps/desktop/src-tauri/src/workflow/validator.rs`:

```rust
use super::models::*;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct ResponseValidator;

impl ResponseValidator {
    pub fn validate(
        validations: &[Validation],
        response: &ResponseDetails,
    ) -> Vec<ValidationResult> {
        validations.iter()
            .map(|v| Self::validate_single(v, response))
            .collect()
    }

    fn validate_single(validation: &Validation, response: &ResponseDetails) -> ValidationResult {
        match validation.validation_type {
            ValidationType::Status => Self::validate_status(validation, response),
            ValidationType::Body => Self::validate_body(validation, response),
            ValidationType::Header => Self::validate_header(validation, response),
            _ => ValidationResult {
                validation_type: format!("{:?}", validation.validation_type),
                passed: false,
                expected: validation.expected.clone(),
                actual: Value::Null,
                message: Some("Validation type not implemented".to_string()),
            },
        }
    }

    fn validate_status(validation: &Validation, response: &ResponseDetails) -> ValidationResult {
        let actual = Value::Number(response.status.into());
        let passed = Self::compare_values(&actual, &validation.expected, &validation.operator);

        ValidationResult {
            validation_type: "status".to_string(),
            passed,
            expected: validation.expected.clone(),
            actual,
            message: if !passed {
                validation.error_message.clone()
                    .or_else(|| Some(format!("Expected status {}, got {}", validation.expected, response.status)))
            } else {
                None
            },
        }
    }

    fn validate_body(validation: &Validation, response: &ResponseDetails) -> ValidationResult {
        let actual = if let Some(ref field) = validation.field {
            // Extract field from body
            Self::extract_field(&response.body, field).unwrap_or(Value::Null)
        } else {
            response.body.clone()
        };

        let passed = Self::compare_values(&actual, &validation.expected, &validation.operator);

        ValidationResult {
            validation_type: "body".to_string(),
            passed,
            expected: validation.expected.clone(),
            actual,
            message: if !passed {
                validation.error_message.clone()
            } else {
                None
            },
        }
    }

    fn validate_header(validation: &Validation, response: &ResponseDetails) -> ValidationResult {
        let header_name = validation.field.as_ref().unwrap();
        let actual = response.headers.get(header_name)
            .map(|v| Value::String(v.clone()))
            .unwrap_or(Value::Null);

        let passed = Self::compare_values(&actual, &validation.expected, &validation.operator);

        ValidationResult {
            validation_type: "header".to_string(),
            passed,
            expected: validation.expected.clone(),
            actual,
            message: if !passed {
                validation.error_message.clone()
            } else {
                None
            },
        }
    }

    fn compare_values(actual: &Value, expected: &Value, operator: &ValidationOperator) -> bool {
        match operator {
            ValidationOperator::Equals => actual == expected,
            ValidationOperator::Contains => {
                if let (Value::String(a), Value::String(e)) = (actual, expected) {
                    a.contains(e.as_str())
                } else {
                    false
                }
            }
            ValidationOperator::Exists => !actual.is_null(),
            ValidationOperator::Gt => {
                if let (Some(a), Some(e)) = (actual.as_f64(), expected.as_f64()) {
                    a > e
                } else {
                    false
                }
            }
            ValidationOperator::Lt => {
                if let (Some(a), Some(e)) = (actual.as_f64(), expected.as_f64()) {
                    a < e
                } else {
                    false
                }
            }
            _ => false,
        }
    }

    fn extract_field(json: &Value, path: &str) -> Option<Value> {
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = json;

        for part in parts {
            current = current.get(part)?;
        }

        Some(current.clone())
    }
}
```

---

## 📄 Next Steps

Continue with:
- **Step 1.7**: Implement Executor
- **Step 1.8**: Create Tauri Commands
- **Phase 2**: Frontend Flow Builder
- **Phase 3**: Execution Dashboard
- **Phase 4**: Backend Integration

See `RUST_EXECUTOR_COMPLETE.md` for the complete executor implementation.
