# API Workflow Automation Platform - Architecture Document

## 🎯 Overview

Transform PayloadX from an API testing tool into a full-featured API automation platform with visual workflow builder and local Rust-based execution engine.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DESKTOP APP (Tauri)                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              React Frontend (UI Layer)                       │  │
│  │  • Visual Flow Builder (React Flow / XYFlow)                │  │
│  │  • Node Configuration Panel                                 │  │
│  │  • Execution Dashboard                                      │  │
│  │  • Results Viewer                                           │  │
│  │  • History Panel                                            │  │
│  └────────────────────┬─────────────────────────────────────────┘  │
│                       │ Tauri Commands                             │
│                       ▼                                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           Rust Execution Engine (Core Logic)                │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  Workflow Parser                                       │ │  │
│  │  │  • Parse workflow graph                                │ │  │
│  │  │  • Validate structure                                  │ │  │
│  │  │  • Build execution DAG                                 │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  Execution Orchestrator                                │ │  │
│  │  │  • Topological sort for execution order               │ │  │
│  │  │  • Sequential/parallel execution                      │ │  │
│  │  │  • Error handling & retry logic                       │ │  │
│  │  │  • Execution state management                         │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  HTTP Executor (Existing + Enhanced)                  │ │  │
│  │  │  • Execute HTTP requests                              │ │  │
│  │  │  • Handle auth, headers, body                         │ │  │
│  │  │  • Cookie management                                  │ │  │
│  │  │  • SSRF protection                                    │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  Data Mapper                                           │ │  │
│  │  │  • Extract data from responses (JSONPath, Regex)      │ │  │
│  │  │  • Variable substitution {{node.field}}               │ │  │
│  │  │  • Environment variable resolution                    │ │  │
│  │  │  • Safe error handling for missing data               │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  Response Validator                                    │ │  │
│  │  │  • Status code validation                              │ │  │
│  │  │  • Response body assertions                            │ │  │
│  │  │  • Schema validation (JSON Schema)                    │ │  │
│  │  │  • Custom validation rules                            │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  Performance Tracker                                   │ │  │
│  │  │  • Per-node execution time                             │ │  │
│  │  │  • Total workflow duration                             │ │  │
│  │  │  • Memory usage tracking                               │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│                       ▲ Results                                     │
│                       │                                             │
│  ┌────────────────────┴─────────────────────────────────────────┐  │
│  │              Frontend (Results Display)                      │  │
│  │  • Real-time execution progress                             │  │
│  │  • Node-level results                                       │  │
│  │  • Error visualization                                      │  │
│  │  • Performance metrics                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (Save/Load only)
                              ▼
                    ┌──────────────────────┐
                    │   Backend (Node.js)  │
                    │   • Save workflows   │
                    │   • Load workflows   │
                    │   • Save executions  │
                    │   • Load history     │
                    └──────────┬───────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Firestore Database  │
                    │  • Workflows         │
                    │  • Executions        │
                    │  • Users/Teams       │
                    └──────────────────────┘
```

---

## 📊 Data Models

### Workflow Schema

```typescript
interface Workflow {
  _id: string;
  name: string;
  description?: string;
  teamId: string;
  projectId: string;
  
  // Visual graph data
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}

interface WorkflowNode {
  id: string;
  type: 'api' | 'condition' | 'delay' | 'transform';
  position: { x: number; y: number };
  
  // API Node specific
  data: {
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    headers: KeyValue[];
    params: KeyValue[];
    body?: RequestBody;
    auth?: AuthConfig;
    
    // Data mapping - reference previous nodes
    dataMappings: DataMapping[];
    
    // Validation rules
    validations: Validation[];
    
    // Execution config
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  };
}

interface WorkflowEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  type?: 'default' | 'conditional';
  condition?: string; // e.g., "{{node1.status}} === 200"
}

interface DataMapping {
  targetField: string; // e.g., "headers.Authorization"
  sourceExpression: string; // e.g., "{{node1.response.token}}"
  transform?: 'uppercase' | 'lowercase' | 'base64' | 'json_parse';
}

interface Validation {
  type: 'status' | 'body' | 'header' | 'schema' | 'custom';
  field?: string;
  operator: 'equals' | 'contains' | 'matches' | 'exists' | 'gt' | 'lt';
  expected: any;
  errorMessage?: string;
}
```

### Execution Result Schema

```typescript
interface WorkflowExecution {
  _id: string;
  workflowId: string;
  workflowName: string;
  
  // Execution metadata
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  status: 'success' | 'failed' | 'partial';
  
  // Results
  totalNodes: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  
  // Node-level results
  nodeResults: NodeExecutionResult[];
  
  // Environment used
  environmentId?: string;
  environmentName?: string;
  
  // User context
  executedBy: string;
  teamId: string;
}

interface NodeExecutionResult {
  nodeId: string;
  nodeName: string;
  
  // Execution details
  startTime: Date;
  endTime: Date;
  duration: number;
  
  // Status
  status: 'success' | 'failed' | 'skipped';
  
  // Request details
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
  };
  
  // Response details
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
    size: number;
  };
  
  // Validation results
  validations: ValidationResult[];
  
  // Error details
  error?: {
    message: string;
    type: 'network' | 'timeout' | 'validation' | 'mapping';
    stack?: string;
  };
  
  // Data extracted for next nodes
  extractedData: Record<string, any>;
}

interface ValidationResult {
  type: string;
  passed: boolean;
  expected: any;
  actual: any;
  message?: string;
}
```

---

## 🔧 Implementation Phases

### Phase 1: Core Rust Execution Engine (Week 1-2)

**Goal:** Build the foundation for workflow execution in Rust

#### Tasks:
1. **Create Workflow Data Structures**
   - Define Rust structs for Workflow, Node, Edge
   - Implement serialization/deserialization (serde)
   - Add validation logic

2. **Build Execution Orchestrator**
   - Topological sort for execution order
   - Sequential execution loop
   - Error handling and propagation

3. **Implement Data Mapper**
   - JSONPath extraction using `serde_json`
   - Variable substitution engine
   - Safe error handling for missing data

4. **Create Response Validator**
   - Status code validation
   - JSON body assertions
   - Header validation

5. **Add Performance Tracking**
   - Per-node timing
   - Memory usage tracking
   - Execution metrics

**Files to Create:**
```
apps/desktop/src-tauri/src/
├── workflow/
│   ├── mod.rs
│   ├── models.rs          # Data structures
│   ├── parser.rs          # Parse workflow JSON
│   ├── executor.rs        # Main execution engine
│   ├── data_mapper.rs     # Variable substitution
│   ├── validator.rs       # Response validation
│   └── metrics.rs         # Performance tracking
└── commands/
    └── workflow.rs        # Tauri commands
```

---

### Phase 2: Frontend Flow Builder (Week 3-4)

**Goal:** Create visual workflow builder UI

#### Tasks:
1. **Install React Flow**
   ```bash
   npm install reactflow
   ```

2. **Create Flow Builder Components**
   - Canvas component
   - Custom node components (API node, condition node)
   - Connection validation
   - Minimap and controls

3. **Node Configuration Panel**
   - API configuration form
   - Data mapping UI
   - Validation rules builder

4. **Workflow Store (Zustand)**
   - Workflow state management
   - Node/edge CRUD operations
   - Undo/redo functionality

**Files to Create:**
```
apps/desktop/src/
├── components/
│   └── WorkflowBuilder/
│       ├── WorkflowCanvas.jsx
│       ├── nodes/
│       │   ├── ApiNode.jsx
│       │   ├── ConditionNode.jsx
│       │   └── DelayNode.jsx
│       ├── NodeConfigPanel.jsx
│       ├── DataMappingEditor.jsx
│       └── ValidationRulesEditor.jsx
└── store/
    └── workflowStore.js
```

---

### Phase 3: Execution & Results (Week 5)

**Goal:** Connect frontend to Rust engine and display results

#### Tasks:
1. **Tauri Command Integration**
   - `execute_workflow` command
   - Real-time progress updates via events
   - Cancel execution support

2. **Execution Dashboard**
   - Start/stop controls
   - Real-time progress visualization
   - Node status indicators

3. **Results Viewer**
   - Node-level results display
   - Request/response inspection
   - Validation results
   - Performance metrics

**Files to Create:**
```
apps/desktop/src/components/
├── WorkflowExecution/
│   ├── ExecutionDashboard.jsx
│   ├── ExecutionProgress.jsx
│   ├── NodeResultCard.jsx
│   └── ValidationResults.jsx
└── WorkflowHistory/
    ├── HistoryPanel.jsx
    └── ExecutionDetails.jsx
```

---

### Phase 4: Backend Integration (Week 6)

**Goal:** Add persistence for workflows and executions

#### Tasks:
1. **Backend API Routes**
   - `POST /api/workflow` - Create workflow
   - `GET /api/workflow` - List workflows
   - `GET /api/workflow/:id` - Get workflow
   - `PUT /api/workflow/:id` - Update workflow
   - `DELETE /api/workflow/:id` - Delete workflow
   - `POST /api/workflow-execution` - Save execution
   - `GET /api/workflow-execution` - List executions
   - `GET /api/workflow-execution/:id` - Get execution details

2. **Firestore Collections**
   - `workflows` collection
   - `workflow_executions` collection

3. **Frontend Integration**
   - Save/load workflows
   - Fetch execution history
   - Offline-first with sync

**Files to Create:**
```
apps/backend/
├── models/
│   ├── Workflow.js
│   └── WorkflowExecution.js
└── app/api/
    ├── workflow/
    │   ├── route.js
    │   └── [id]/route.js
    └── workflow-execution/
        ├── route.js
        └── [id]/route.js
```

---

### Phase 5: Advanced Features (Week 7-8)

**Goal:** Add advanced workflow capabilities

#### Tasks:
1. **Conditional Execution**
   - Conditional edges based on response
   - Branch execution paths

2. **Parallel Execution**
   - Execute independent nodes in parallel
   - Wait for all parallel branches

3. **Loop Support**
   - Iterate over arrays
   - Retry logic with backoff

4. **Data Transformations**
   - Transform node type
   - JavaScript expression evaluation (safe sandbox)

5. **Workflow Templates**
   - Pre-built workflow templates
   - Import/export workflows

---

## 🔐 Security Considerations

### Rust Execution Engine
- ✅ SSRF protection (already implemented)
- ✅ Request timeout enforcement
- ✅ Memory limits for responses
- ⚠️ Sandbox JavaScript evaluation (if added)
- ⚠️ Rate limiting per workflow

### Data Handling
- ✅ Secure variable storage
- ✅ Encrypted sensitive data in Firestore
- ⚠️ Audit logs for workflow execution

---

## 📈 Performance Optimization

### Rust Engine
- Use `tokio` for async execution
- Connection pooling for HTTP requests
- Streaming for large responses
- Efficient JSON parsing with `serde_json`

### Frontend
- Virtual scrolling for large workflows
- Lazy loading of execution history
- Debounced auto-save
- Web Workers for heavy computations

---

## 🧪 Testing Strategy

### Unit Tests (Rust)
- Workflow parser tests
- Data mapper tests
- Validator tests
- Execution orchestrator tests

### Integration Tests
- End-to-end workflow execution
- Error handling scenarios
- Data mapping edge cases

### UI Tests
- Flow builder interactions
- Node configuration
- Execution visualization

---

## 📦 Deployment Considerations

### Desktop App
- Bundle workflows with app
- Local execution (no internet required)
- Sync to cloud when online

### Backend
- Stateless API (no execution logic)
- Horizontal scaling for storage
- CDN for static assets

---

## 🎯 Success Metrics

1. **Execution Performance**
   - Workflow execution < 100ms overhead
   - Support 100+ nodes per workflow
   - Parallel execution 3x faster than sequential

2. **User Experience**
   - Workflow creation < 5 minutes
   - Real-time execution feedback
   - Intuitive data mapping

3. **Reliability**
   - 99.9% execution success rate
   - Graceful error handling
   - Automatic retry on transient failures

---

## 🚀 Getting Started

See `IMPLEMENTATION_GUIDE.md` for step-by-step implementation instructions.
