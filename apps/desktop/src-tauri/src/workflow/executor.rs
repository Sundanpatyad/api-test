use super::data_mapper::DataMapper;
use super::models::*;
use super::parser::WorkflowParser;
use super::validator::ResponseValidator;
use anyhow::{Context, Result};
use chrono::Utc;
use petgraph::graph::NodeIndex;
use reqwest::Client;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use std::collections::HashMap;
use std::time::Instant;
use std::sync::Arc;
use std::str::FromStr;
use tauri::Window;
use crate::AppCookieJar;

pub struct WorkflowExecutor {
    workflow: Workflow,
    client: Client,
    cookie_jar: Option<AppCookieJar>,
    data_mapper: DataMapper,
    window: Option<Window>,
}

impl WorkflowExecutor {
    pub fn new(workflow: Workflow, client: Client, cookie_jar: Option<AppCookieJar>, window: Option<Window>) -> Self {
        Self {
            workflow,
            client,
            cookie_jar,
            data_mapper: DataMapper::new(),
            window,
        }
    }

    /// Execute the entire workflow
    pub async fn execute(&mut self) -> Result<WorkflowExecution> {
        let execution_start = Instant::now();
        let start_time = Utc::now().to_rfc3339();

        // Parse workflow and build execution graph
        let mut parser = WorkflowParser::new(self.workflow.clone());
        let graph = parser.parse()?;
        let execution_order = parser.get_execution_order(&graph)?;

        // Execute nodes in order
        let mut node_results = Vec::new();
        let mut success_count = 0;
        let mut failed_count = 0;
        let mut skipped_count = 0;

        for node_idx in execution_order {
            let node = &graph[node_idx];
            
            // Emit progress event
            self.emit_progress(node_results.len(), graph.node_count()).await;
            
            // Emit node started event
            if let Some(window) = &self.window {
                let _ = window.emit("node_execution_started", node.id.clone());
            }

            match self.execute_node(node).await {
                Ok(result) => {
                    if result.status == NodeStatus::Success {
                        success_count += 1;
                    } else if result.status == NodeStatus::Failed {
                        failed_count += 1;
                    } else {
                        skipped_count += 1;
                    }

                    // Store result for data mapping
                    self.data_mapper.store_node_result(&node.id, result.extracted_data.clone());

                    node_results.push(result);
                }
                Err(e) => {
                    failed_count += 1;
                    node_results.push(NodeExecutionResult {
                        node_id: node.id.clone(),
                        node_name: node.data.name.clone(),
                        start_time: Utc::now().to_rfc3339(),
                        end_time: Utc::now().to_rfc3339(),
                        duration: 0,
                        status: NodeStatus::Failed,
                        request: None,
                        response: None,
                        validations: vec![],
                        error: Some(ErrorDetails {
                            message: e.to_string(),
                            error_type: "execution".to_string(),
                            stack: None,
                        }),
                        extracted_data: HashMap::new(),
                    });

                    // Optionally stop on first error
                    // break;
                }
            }
        }

        let duration = execution_start.elapsed().as_millis() as u64;
        let end_time = Utc::now().to_rfc3339();

        let status = if failed_count == 0 {
            ExecutionStatus::Success
        } else if success_count > 0 {
            ExecutionStatus::Partial
        } else {
            ExecutionStatus::Failed
        };

        Ok(WorkflowExecution {
            id: uuid::Uuid::new_v4().to_string(),
            workflow_id: self.workflow.id.clone(),
            workflow_name: self.workflow.name.clone(),
            start_time,
            end_time,
            duration,
            status,
            total_nodes: graph.node_count(),
            success_count,
            failed_count,
            skipped_count,
            node_results,
        })
    }

    /// Execute a single node
    async fn execute_node(&self, node: &WorkflowNode) -> Result<NodeExecutionResult> {
        let node_start = Instant::now();
        let start_time = Utc::now().to_rfc3339();

        match node.node_type {
            NodeType::Api => self.execute_api_node(node, node_start, start_time).await,
            NodeType::Delay => self.execute_delay_node(node, node_start, start_time).await,
            _ => anyhow::bail!("Node type {:?} not implemented", node.node_type),
        }
    }

    /// Execute an API node
    async fn execute_api_node(
        &self,
        node: &WorkflowNode,
        node_start: Instant,
        start_time: String,
    ) -> Result<NodeExecutionResult> {
        // Apply data mappings
        let mapped_node = self.data_mapper.apply_mappings(node)?;

        let method = mapped_node.data.method.as_ref()
            .context("API node missing method")?;
        let url = mapped_node.data.url.as_ref()
            .context("API node missing URL")?;

        // 3. HTTP method and URL
        let url_obj = ::url::Url::parse(url).context("Invalid URL format")?;
        let host = url_obj.host_str().unwrap_or("").to_string();

        let mut request = self.client.request(
            method.parse().context("Invalid HTTP method")?,
            url,
        );

        // Add headers
        let mut header_map = HeaderMap::new();
        if let Some(headers) = &mapped_node.data.headers {
            for header in headers {
                if header.enabled {
                    if let (Ok(name), Ok(val)) = (
                        HeaderName::from_str(&header.key),
                        HeaderValue::from_str(&header.value),
                    ) {
                        header_map.insert(name, val);
                    }
                }
            }
        }

        // Attach cookies from jar
        if !host.is_empty() {
            if let Some(jar_wrapper) = &self.cookie_jar {
                if let Ok(jar) = jar_wrapper.0.lock() {
                    if let Some(cookies) = jar.get(&host) {
                        if !cookies.is_empty() {
                            println!("DEBUG: Attaching {} cookies from jar for host {}", cookies.len(), host);
                            let mut cookie_components = Vec::new();
                            for (k, v) in cookies.iter() {
                                if v.is_empty() {
                                    cookie_components.push(k.clone());
                                } else {
                                    cookie_components.push(format!("{}={}", k, v));
                                }
                            }
                            if let Ok(val) = HeaderValue::from_str(&cookie_components.join("; ")) {
                                header_map.insert(reqwest::header::COOKIE, val);
                            }
                        }
                    }
                }
            }
        }

        request = request.headers(header_map);

        // Add body
        if let Some(body) = &mapped_node.data.body {
            request = request.json(body);
        }

        // Set timeout
        let timeout = mapped_node.data.timeout.unwrap_or(30);
        request = request.timeout(std::time::Duration::from_secs(timeout));

        // Execute request
        let response = request.send().await
            .context("Failed to execute request")?;

        // Handle saving session
        if mapped_node.data.save_session.unwrap_or(false) && !host.is_empty() {
            if let Some(jar_wrapper) = &self.cookie_jar {
                let set_cookies = response.headers().get_all(reqwest::header::SET_COOKIE);
                for cookie in set_cookies.iter() {
                    if let Ok(c_str) = cookie.to_str() {
                        // Parse key=value
                        let parts: Vec<&str> = c_str.split(';').collect();
                        if let Some(first_part) = parts.first() {
                            let kv: Vec<&str> = first_part.splitn(2, '=').collect();
                            if let Ok(mut jar) = jar_wrapper.0.lock() {
                                let host_jar = jar.entry(host.clone()).or_insert_with(HashMap::new);
                                let key = kv[0].trim().to_string();
                                let val = if kv.len() > 1 { kv[1].trim().to_string() } else { "".to_string() };
                                println!("DEBUG: Saving cookie {}={} for host {}", key, val, host);
                                host_jar.insert(key, val);
                            }
                        }
                    }
                }
            }
        }

        // Extract response details
        let status = response.status().as_u16();
        let status_text = response.status().to_string();
        let headers: HashMap<String, String> = response.headers()
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();

        let body_bytes = response.bytes().await?;
        let body_size = body_bytes.len();
        let body: serde_json::Value = serde_json::from_slice(&body_bytes)
            .unwrap_or_else(|_| serde_json::Value::String(
                String::from_utf8_lossy(&body_bytes).to_string()
            ));

        let response_details = ResponseDetails {
            status,
            status_text: status_text.clone(),
            headers: headers.clone(),
            body: body.clone(),
            size: body_size,
        };

        // Run validations
        let validations = ResponseValidator::validate(
            &mapped_node.data.validations,
            &response_details,
        );

        let all_passed = if validations.is_empty() {
            status < 400
        } else {
            validations.iter().all(|v| v.passed)
        };

        let node_status = if all_passed {
            NodeStatus::Success
        } else {
            NodeStatus::Failed
        };

        // Extract data for future nodes
        let mut extracted_data = HashMap::new();
        extracted_data.insert("status".to_string(), serde_json::json!(status));
        extracted_data.insert("body".to_string(), body.clone());
        extracted_data.insert("headers".to_string(), serde_json::json!(headers));

        let duration = node_start.elapsed().as_millis() as u64;
        let end_time = Utc::now().to_rfc3339();

        Ok(NodeExecutionResult {
            node_id: node.id.clone(),
            node_name: node.data.name.clone(),
            start_time,
            end_time,
            duration,
            status: node_status,
            request: Some(RequestDetails {
                method: method.clone(),
                url: url.clone(),
                headers: mapped_node.data.headers.as_ref()
                    .map(|h| h.iter()
                        .filter(|kv| kv.enabled)
                        .map(|kv| (kv.key.clone(), kv.value.clone()))
                        .collect())
                    .unwrap_or_default(),
                body: mapped_node.data.body.clone(),
            }),
            response: Some(response_details),
            validations,
            error: None,
            extracted_data,
        })
    }

    /// Execute a delay node
    async fn execute_delay_node(
        &self,
        node: &WorkflowNode,
        node_start: Instant,
        start_time: String,
    ) -> Result<NodeExecutionResult> {
        // Extract delay duration from node data
        let delay_ms = node.data.timeout.unwrap_or(1000);
        
        tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;

        let duration = node_start.elapsed().as_millis() as u64;
        let end_time = Utc::now().to_rfc3339();

        Ok(NodeExecutionResult {
            node_id: node.id.clone(),
            node_name: node.data.name.clone(),
            start_time,
            end_time,
            duration,
            status: NodeStatus::Success,
            request: None,
            response: None,
            validations: vec![],
            error: None,
            extracted_data: HashMap::new(),
        })
    }

    /// Emit progress event to frontend
    async fn emit_progress(&self, completed: usize, total: usize) {
        if let Some(window) = &self.window {
            let _ = window.emit("workflow_progress", serde_json::json!({
                "completed": completed,
                "total": total,
                "percentage": (completed as f64 / total as f64 * 100.0) as u32,
            }));
        }
    }
}
