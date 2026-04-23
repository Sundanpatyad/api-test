use crate::workflow::{Workflow, WorkflowExecution, WorkflowExecutor};
use reqwest::Client;
use tauri::{State, Window};

#[tauri::command]
pub async fn execute_workflow(
    workflow_json: String,
    client: State<'_, Client>,
    cookie_jar: State<'_, crate::AppCookieJar>,
    window: Window,
) -> Result<WorkflowExecution, String> {
    // Parse workflow from JSON
    let workflow: Workflow = serde_json::from_str(&workflow_json)
        .map_err(|e| format!("Failed to parse workflow: {}", e))?;

    // Create executor
    let mut executor = WorkflowExecutor::new(
        workflow,
        client.inner().clone(),
        Some(cookie_jar.inner().clone()),
        Some(window),
    );

    // Execute workflow
    executor.execute()
        .await
        .map_err(|e| format!("Workflow execution failed: {}", e))
}

#[tauri::command]
pub async fn validate_workflow(workflow_json: String) -> Result<bool, String> {
    // Parse workflow
    let workflow: Workflow = serde_json::from_str(&workflow_json)
        .map_err(|e| format!("Failed to parse workflow: {}", e))?;

    // Validate structure
    let mut parser = crate::workflow::parser::WorkflowParser::new(workflow);
    parser.parse()
        .map(|_| true)
        .map_err(|e| format!("Workflow validation failed: {}", e))
}

#[tauri::command]
pub async fn cancel_workflow_execution() -> Result<(), String> {
    // TODO: Implement cancellation logic
    // This would require storing execution state and checking cancellation flag
    Ok(())
}
