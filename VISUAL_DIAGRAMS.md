# Visual Diagrams - API Workflow Automation Platform

This document contains visual representations of the system architecture and data flow.

---

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DESKTOP APPLICATION (Tauri)                         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    FRONTEND LAYER (React)                             │ │
│  │                                                                       │ │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │ │
│  │  │ Workflow Builder│  │ Node Config Panel│  │ Execution Dashboard│  │ │
│  │  │  (React Flow)   │  │  (Form Inputs)   │  │  (Progress/Results)│  │ │
│  │  └────────┬────────┘  └────────┬─────────┘  └─────────┬──────────┘  │ │
│  │           │                    │                       │             │ │
│  │           └────────────────────┴───────────────────────┘             │ │
│  │                                │                                     │ │
│  │                    ┌───────────▼──────────┐                         │ │
│  │                    │  Workflow Store      │                         │ │
│  │                    │  (Zustand)           │                         │ │
│  │                    └───────────┬──────────┘                         │ │
│  └────────────────────────────────┼────────────────────────────────────┘ │
│                                   │                                       │
│                                   │ invoke('execute_workflow')            │
│                                   │                                       │
│  ┌────────────────────────────────▼────────────────────────────────────┐ │
│  │                    RUST EXECUTION ENGINE                            │ │
│  │                                                                     │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  1. Workflow Parser                                          │  │ │
│  │  │     • Parse JSON → Rust structs                              │  │ │
│  │  │     • Build directed graph (petgraph)                        │  │ │
│  │  │     • Topological sort for execution order                   │  │ │
│  │  │     • Validate graph structure (no cycles)                   │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                              │                                      │ │
│  │                              ▼                                      │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  2. Execution Orchestrator                                   │  │ │
│  │  │     • Loop through nodes in order                            │  │ │
│  │  │     • For each node:                                         │  │ │
│  │  │       - Apply data mappings                                  │  │ │
│  │  │       - Execute node                                         │  │ │
│  │  │       - Validate response                                    │  │ │
│  │  │       - Store result in context                              │  │ │
│  │  │     • Track execution time                                   │  │ │
│  │  │     • Handle errors gracefully                               │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                              │                                      │ │
│  │         ┌────────────────────┼────────────────────┐                │ │
│  │         │                    │                    │                │ │
│  │         ▼                    ▼                    ▼                │ │
│  │  ┌──────────┐        ┌──────────┐        ┌──────────┐            │ │
│  │  │   Data   │        │   HTTP   │        │Response  │            │ │
│  │  │  Mapper  │        │ Executor │        │Validator │            │ │
│  │  │          │        │          │        │          │            │ │
│  │  │ {{var}}  │        │ reqwest  │        │ Status   │            │ │
│  │  │ JSONPath │        │ async    │        │ Body     │            │ │
│  │  │Transform │        │ SSRF ✓   │        │ Headers  │            │ │
│  │  └──────────┘        └──────────┘        └──────────┘            │ │
│  │                                                                     │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  3. Return Execution Result                                  │  │ │
│  │  │     • Total duration                                         │  │ │
│  │  │     • Success/failed/skipped counts                          │  │ │
│  │  │     • Per-node results with timing                           │  │ │
│  │  │     • Validation results                                     │  │ │
│  │  │     • Error details (if any)                                 │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────┬───────────────────────────────────┘ │
│                                    │                                     │
│                                    │ Result JSON                         │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    FRONTEND (Display Results)                       │ │
│  │  • Update node status (success/failed)                              │ │
│  │  • Show execution time per node                                     │ │
│  │  • Display validation results                                       │ │
│  │  • Show request/response details                                    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP (Save workflow/execution)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Node.js + Express)                         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  API Routes (Storage Only - NO Execution Logic)                    │   │
│  │                                                                     │   │
│  │  POST   /api/workflow              → Create workflow               │   │
│  │  GET    /api/workflow              → List workflows                │   │
│  │  GET    /api/workflow/:id          → Get workflow                  │   │
│  │  PUT    /api/workflow/:id          → Update workflow               │   │
│  │  DELETE /api/workflow/:id          → Delete workflow               │   │
│  │                                                                     │   │
│  │  POST   /api/workflow-execution    → Save execution result         │   │
│  │  GET    /api/workflow-execution    → List executions               │   │
│  │  GET    /api/workflow-execution/:id → Get execution details        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE (MongoDB/Firestore)                        │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐  │
│  │  workflows           │  │  workflow_executions │  │  users/teams    │  │
│  │  ─────────           │  │  ───────────────────  │  │  ───────────    │  │
│  │  • _id               │  │  • _id                │  │  • _id          │  │
│  │  • name              │  │  • workflowId         │  │  • name         │  │
│  │  • description       │  │  • workflowName       │  │  • email        │  │
│  │  • teamId            │  │  • teamId             │  │  • teamId       │  │
│  │  • projectId         │  │  • executedBy         │  │  (existing)     │  │
│  │  • nodes[]           │  │  • start_time         │  └─────────────────┘  │
│  │  • edges[]           │  │  • end_time           │                       │
│  │  • createdBy         │  │  • duration           │                       │
│  │  • version           │  │  • status             │                       │
│  │  • createdAt         │  │  • node_results[]     │                       │
│  │  • updatedAt         │  │  • createdAt          │                       │
│  └──────────────────────┘  └──────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Workflow Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER CREATES WORKFLOW                           │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Visual Flow Builder   │
                    │  (React Flow)          │
                    │                        │
                    │  ┌──────┐   ┌──────┐  │
                    │  │Node 1│──▶│Node 2│  │
                    │  │ GET  │   │ POST │  │
                    │  │/users│   │/posts│  │
                    │  └──────┘   └──────┘  │
                    └────────────┬───────────┘
                                 │
                                 │ User clicks "Execute"
                                 ▼
                    ┌────────────────────────┐
                    │  Workflow Store        │
                    │  (Zustand)             │
                    │                        │
                    │  executeWorkflow()     │
                    └────────────┬───────────┘
                                 │
                                 │ invoke('execute_workflow', { workflowJson })
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         RUST EXECUTION ENGINE                           │
│                                                                         │
│  Step 1: Parse Workflow                                                │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │  • Deserialize JSON → Workflow struct                         │    │
│  │  • Build directed graph (DiGraph<Node, Edge>)                 │    │
│  │  • Validate: no cycles, at least one node                     │    │
│  │  • Topological sort → [node1, node2, node3, ...]             │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                 │                                       │
│                                 ▼                                       │
│  Step 2: Execute Nodes in Order                                        │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │  FOR EACH node IN execution_order:                           │    │
│  │                                                               │    │
│  │    2.1 Apply Data Mappings                                   │    │
│  │    ┌─────────────────────────────────────────────────────┐   │    │
│  │    │  • Find {{variable}} patterns in URL/headers/body   │   │    │
│  │    │  • Extract value from previous node results         │   │    │
│  │    │  • Example: {{node1.body.id}} → 123                 │   │    │
│  │    │  • Apply transformations (uppercase, base64, etc.)  │   │    │
│  │    └─────────────────────────────────────────────────────┘   │    │
│  │                                                               │    │
│  │    2.2 Execute HTTP Request                                  │    │
│  │    ┌─────────────────────────────────────────────────────┐   │    │
│  │    │  • Build reqwest::Request                           │   │    │
│  │    │  • Add headers, params, body                        │   │    │
│  │    │  • Set timeout                                      │   │    │
│  │    │  • Send request (async)                             │   │    │
│  │    │  • Receive response                                 │   │    │
│  │    │  • Parse JSON body                                  │   │    │
│  │    └─────────────────────────────────────────────────────┘   │    │
│  │                                                               │    │
│  │    2.3 Validate Response                                     │    │
│  │    ┌─────────────────────────────────────────────────────┐   │    │
│  │    │  FOR EACH validation IN node.validations:          │   │    │
│  │    │    • Status validation: status === 200             │   │    │
│  │    │    • Body validation: body.field === expected      │   │    │
│  │    │    • Header validation: header exists              │   │    │
│  │    │    • Record pass/fail                              │   │    │
│  │    └─────────────────────────────────────────────────────┘   │    │
│  │                                                               │    │
│  │    2.4 Store Result in Context                               │    │
│  │    ┌─────────────────────────────────────────────────────┐   │    │
│  │    │  context["node1"] = {                               │   │    │
│  │    │    status: 200,                                     │   │    │
│  │    │    body: { id: 123, name: "John" },                │   │    │
│  │    │    headers: { ... }                                 │   │    │
│  │    │  }                                                  │   │    │
│  │    └─────────────────────────────────────────────────────┘   │    │
│  │                                                               │    │
│  │    2.5 Record Metrics                                        │    │
│  │    ┌─────────────────────────────────────────────────────┐   │    │
│  │    │  • Execution time: 150ms                            │   │    │
│  │    │  • Response size: 1.2KB                             │   │    │
│  │    │  • Status: success/failed                           │   │    │
│  │    └─────────────────────────────────────────────────────┘   │    │
│  │                                                               │    │
│  │  END FOR                                                      │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                 │                                       │
│                                 ▼                                       │
│  Step 3: Build Execution Result                                        │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │  WorkflowExecution {                                          │    │
│  │    id: "exec-123",                                            │    │
│  │    workflow_id: "wf-456",                                     │    │
│  │    status: "success",                                         │    │
│  │    duration: 350ms,                                           │    │
│  │    success_count: 2,                                          │    │
│  │    failed_count: 0,                                           │    │
│  │    node_results: [                                            │    │
│  │      { node_id: "node1", status: "success", duration: 150ms },│    │
│  │      { node_id: "node2", status: "success", duration: 200ms } │    │
│  │    ]                                                          │    │
│  │  }                                                            │    │
│  └───────────────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ Return result to frontend
                                 ▼
                    ┌────────────────────────┐
                    │  Frontend Updates UI   │
                    │                        │
                    │  ✅ Node 1: Success    │
                    │     150ms              │
                    │                        │
                    │  ✅ Node 2: Success    │
                    │     200ms              │
                    │                        │
                    │  Total: 350ms          │
                    └────────────┬───────────┘
                                 │
                                 │ Save to backend (optional)
                                 ▼
                    ┌────────────────────────┐
                    │  POST /api/workflow-   │
                    │       execution        │
                    │                        │
                    │  Store in database     │
                    └────────────────────────┘
```

---

## 3. Data Mapping Example

```
Workflow: Get User → Get User's Posts

┌─────────────────────────────────────────────────────────────────┐
│  Node 1: Get User                                               │
│  ─────────────────                                              │
│  GET https://api.example.com/users/1                            │
│                                                                 │
│  Response:                                                      │
│  {                                                              │
│    "id": 123,                                                   │
│    "name": "John Doe",                                          │
│    "email": "john@example.com"                                  │
│  }                                                              │
│                                                                 │
│  Stored in context as:                                          │
│  context["node1"] = {                                           │
│    status: 200,                                                 │
│    body: { id: 123, name: "John Doe", ... },                   │
│    headers: { ... }                                             │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Data flows to next node
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 2: Get User's Posts                                       │
│  ─────────────────────────                                      │
│  Configuration:                                                 │
│  GET https://api.example.com/users/{{node1.body.id}}/posts     │
│                                                                 │
│  Data Mapper processes:                                         │
│  1. Find pattern: {{node1.body.id}}                            │
│  2. Extract from context:                                       │
│     context["node1"]["body"]["id"] = 123                        │
│  3. Substitute:                                                 │
│     https://api.example.com/users/123/posts                     │
│                                                                 │
│  Final Request:                                                 │
│  GET https://api.example.com/users/123/posts                    │
│                                                                 │
│  Response:                                                      │
│  [                                                              │
│    { "id": 1, "title": "Post 1", "userId": 123 },              │
│    { "id": 2, "title": "Post 2", "userId": 123 }               │
│  ]                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Hierarchy

```
App.jsx
│
├─ WorkflowBuilder/
│  │
│  ├─ WorkflowCanvas.jsx (React Flow)
│  │  │
│  │  ├─ nodes/
│  │  │  ├─ ApiNode.jsx
│  │  │  ├─ DelayNode.jsx
│  │  │  ├─ ConditionNode.jsx (future)
│  │  │  └─ TransformNode.jsx (future)
│  │  │
│  │  ├─ Background
│  │  ├─ Controls
│  │  └─ MiniMap
│  │
│  ├─ NodeConfigPanel.jsx
│  │  │
│  │  ├─ BasicConfig (name, method, URL)
│  │  ├─ HeadersEditor
│  │  ├─ BodyEditor
│  │  ├─ DataMappingEditor
│  │  └─ ValidationRulesEditor
│  │
│  └─ WorkflowToolbar.jsx
│     ├─ Save Button
│     ├─ Execute Button
│     └─ Add Node Buttons
│
├─ WorkflowExecution/
│  │
│  ├─ ExecutionDashboard.jsx
│  │  ├─ Start/Stop Controls
│  │  ├─ Progress Bar
│  │  └─ Status Summary
│  │
│  ├─ ExecutionProgress.jsx
│  │  └─ Real-time node status updates
│  │
│  ├─ NodeResultCard.jsx
│  │  ├─ Request Details
│  │  ├─ Response Details
│  │  ├─ Validation Results
│  │  └─ Execution Time
│  │
│  └─ ValidationResults.jsx
│     └─ Pass/Fail indicators
│
└─ WorkflowHistory/
   │
   ├─ HistoryPanel.jsx
   │  └─ List of past executions
   │
   └─ ExecutionDetails.jsx
      └─ Detailed view of execution
```

---

## 5. State Management (Zustand)

```
workflowStore.js
│
├─ State
│  ├─ currentWorkflow: Workflow
│  ├─ workflows: Workflow[]
│  ├─ isExecuting: boolean
│  ├─ executionResult: WorkflowExecution | null
│  ├─ executionProgress: { completed, total, percentage }
│  ├─ selectedNode: string | null
│  └─ showConfigPanel: boolean
│
├─ Workflow Actions
│  ├─ setCurrentWorkflow(workflow)
│  ├─ updateWorkflowField(field, value)
│  ├─ newWorkflow()
│  ├─ saveWorkflow() → API
│  ├─ fetchWorkflows(teamId) → API
│  └─ deleteWorkflow(id) → API
│
├─ Node Actions
│  ├─ addNode(type, position)
│  ├─ updateNode(nodeId, updates)
│  ├─ deleteNode(nodeId)
│  └─ setSelectedNode(nodeId)
│
├─ Edge Actions
│  ├─ addEdge(edge)
│  └─ deleteEdge(edgeId)
│
└─ Execution Actions
   ├─ executeWorkflow() → Tauri
   ├─ cancelExecution() → Tauri
   ├─ updateExecutionProgress(progress)
   └─ saveExecution(result) → API
```

---

## 6. File Structure

```
apps/desktop/
│
├─ src-tauri/
│  ├─ src/
│  │  ├─ main.rs
│  │  ├─ security.rs
│  │  ├─ workflow/
│  │  │  ├─ mod.rs
│  │  │  ├─ models.rs          ← Data structures
│  │  │  ├─ parser.rs          ← Graph parser
│  │  │  ├─ executor.rs        ← Main executor
│  │  │  ├─ data_mapper.rs     ← Variable substitution
│  │  │  ├─ validator.rs       ← Response validation
│  │  │  └─ metrics.rs         ← Performance tracking
│  │  └─ commands/
│  │     ├─ mod.rs
│  │     ├─ http.rs            ← Existing HTTP executor
│  │     ├─ files.rs
│  │     ├─ json.rs
│  │     └─ workflow.rs        ← NEW: Workflow commands
│  └─ Cargo.toml               ← Add petgraph, jsonpath-rust
│
└─ src/
   ├─ components/
   │  ├─ WorkflowBuilder/
   │  │  ├─ WorkflowCanvas.jsx
   │  │  ├─ NodeConfigPanel.jsx
   │  │  ├─ DataMappingEditor.jsx
   │  │  ├─ ValidationRulesEditor.jsx
   │  │  └─ nodes/
   │  │     ├─ ApiNode.jsx
   │  │     └─ DelayNode.jsx
   │  ├─ WorkflowExecution/
   │  │  ├─ ExecutionDashboard.jsx
   │  │  ├─ ExecutionProgress.jsx
   │  │  ├─ NodeResultCard.jsx
   │  │  └─ ValidationResults.jsx
   │  └─ WorkflowHistory/
   │     ├─ HistoryPanel.jsx
   │     └─ ExecutionDetails.jsx
   └─ store/
      └─ workflowStore.js      ← NEW: Workflow state

apps/backend/
│
├─ models/
│  ├─ Workflow.js              ← NEW: Workflow model
│  └─ WorkflowExecution.js     ← NEW: Execution model
│
└─ app/api/
   ├─ workflow/
   │  ├─ route.js              ← NEW: List/Create workflows
   │  └─ [id]/route.js         ← NEW: Get/Update/Delete workflow
   └─ workflow-execution/
      ├─ route.js              ← NEW: List/Save executions
      └─ [id]/route.js         ← NEW: Get execution details
```

---

## 7. Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                               │
│  • React 18                                                 │
│  • React Flow (visual builder)                             │
│  • Zustand (state management)                              │
│  • Tailwind CSS (styling)                                  │
│  • Lucide React (icons)                                    │
│  • React Hot Toast (notifications)                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      DESKTOP RUNTIME                        │
│  • Tauri 1.6 (Rust + WebView)                              │
│  • IPC Commands (frontend ↔ Rust)                          │
│  • File System Access                                       │
│  • OAuth Plugin                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      RUST ENGINE                            │
│  • Rust 1.70+                                               │
│  • Tokio (async runtime)                                    │
│  • Reqwest (HTTP client)                                    │
│  • Serde (serialization)                                    │
│  • Petgraph (graph algorithms)                              │
│  • JSONPath-Rust (data extraction)                          │
│  • Regex (pattern matching)                                 │
│  • Chrono (time tracking)                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      BACKEND                                │
│  • Node.js 18+                                              │
│  • Express.js (REST API)                                    │
│  • Mongoose (MongoDB ODM)                                   │
│  • JWT (authentication)                                     │
│  • Socket.IO (real-time sync)                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                               │
│  • MongoDB Atlas (cloud)                                    │
│  • Collections:                                             │
│    - workflows                                              │
│    - workflow_executions                                    │
│    - users, teams, projects (existing)                      │
└─────────────────────────────────────────────────────────────┘
```

---

These diagrams should help you visualize the complete system architecture and understand how all the pieces fit together!
