# Quick Start Guide - API Workflow Automation Platform

This guide will help you quickly get started with building the workflow automation feature.

---

## 📚 Documentation Structure

Your implementation is organized into these documents:

1. **WORKFLOW_ARCHITECTURE.md** - Complete system architecture and design
2. **IMPLEMENTATION_GUIDE.md** - Step-by-step Rust implementation (Phase 1)
3. **RUST_EXECUTOR_COMPLETE.md** - Complete Rust executor code
4. **FRONTEND_IMPLEMENTATION.md** - React Flow builder (Phase 2)
5. **QUICK_START.md** - This file (getting started)

---

## 🎯 What You're Building

Transform your existing PayloadX API testing tool into a **workflow automation platform** where users can:

- **Visually design** API workflows using a node-based graph
- **Chain APIs** together with data passing between nodes
- **Validate responses** with custom rules
- **Execute locally** using Rust (fast & secure)
- **Save workflows** to cloud for team collaboration

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  React Frontend (Visual Builder)                        │
│  • React Flow for node-based UI                        │
│  • Zustand for state management                        │
└────────────────┬────────────────────────────────────────┘
                 │ Tauri Commands
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Rust Execution Engine (Local Computation)             │
│  • Parse workflow graph                                 │
│  • Execute APIs in order                                │
│  • Map data between nodes                               │
│  • Validate responses                                   │
│  • Track performance                                    │
└────────────────┬────────────────────────────────────────┘
                 │ Results
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Node.js Backend (Storage Only)                         │
│  • Save/load workflows                                  │
│  • Save/load execution history                          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Firestore Database                                     │
│  • workflows collection                                 │
│  • workflow_executions collection                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: Rust Execution Engine (Week 1-2)
**Status:** Ready to implement  
**Files:** `IMPLEMENTATION_GUIDE.md` + `RUST_EXECUTOR_COMPLETE.md`

**What you'll build:**
- Workflow data structures (models.rs)
- Graph parser with topological sort (parser.rs)
- HTTP executor with data mapping (executor.rs)
- Variable substitution engine (data_mapper.rs)
- Response validator (validator.rs)
- Tauri commands (workflow.rs)

**Key Dependencies:**
```toml
petgraph = "0.6"           # Graph algorithms
jsonpath-rust = "0.3"      # Data extraction
reqwest = "0.11"           # HTTP client (already installed)
```

**Test Command:**
```bash
cd apps/desktop
npm run tauri:dev
```

---

### Phase 2: Visual Flow Builder (Week 3-4)
**Status:** Ready to implement  
**Files:** `FRONTEND_IMPLEMENTATION.md`

**What you'll build:**
- Workflow canvas with React Flow
- Custom node components (API, Delay, Condition)
- Node configuration panel
- Workflow store (Zustand)
- Data mapping UI

**Key Dependencies:**
```bash
npm install reactflow @xyflow/react
```

**Components:**
```
src/components/WorkflowBuilder/
├── WorkflowCanvas.jsx
├── NodeConfigPanel.jsx
├── nodes/
│   ├── ApiNode.jsx
│   └── DelayNode.jsx
```

---

### Phase 3: Execution Dashboard (Week 5)
**What you'll build:**
- Execution controls (start/stop/cancel)
- Real-time progress visualization
- Node-level results display
- Validation results viewer
- Performance metrics

**Components:**
```
src/components/WorkflowExecution/
├── ExecutionDashboard.jsx
├── ExecutionProgress.jsx
├── NodeResultCard.jsx
└── ValidationResults.jsx
```

---

### Phase 4: Backend Integration (Week 6)
**What you'll build:**
- Workflow CRUD API routes
- Execution history API routes
- Firestore models
- Frontend sync logic

**Backend Routes:**
```
POST   /api/workflow              # Create workflow
GET    /api/workflow              # List workflows
GET    /api/workflow/:id          # Get workflow
PUT    /api/workflow/:id          # Update workflow
DELETE /api/workflow/:id          # Delete workflow
POST   /api/workflow-execution    # Save execution
GET    /api/workflow-execution    # List executions
```

---

## 📦 Step-by-Step Implementation

### Step 1: Update Rust Dependencies

Edit `apps/desktop/src-tauri/Cargo.toml`:

```toml
[dependencies]
# ... existing dependencies ...

# NEW: Add these
petgraph = "0.6"
jsonpath-rust = "0.3"
regex = "1.10"
chrono = "0.4"
thiserror = "1.0"
anyhow = "1.0"
```

### Step 2: Create Rust Module Structure

```bash
cd apps/desktop/src-tauri/src
mkdir workflow
touch workflow/mod.rs
touch workflow/models.rs
touch workflow/parser.rs
touch workflow/executor.rs
touch workflow/data_mapper.rs
touch workflow/validator.rs
touch workflow/metrics.rs
touch commands/workflow.rs
```

### Step 3: Copy Rust Code

Copy the code from `RUST_EXECUTOR_COMPLETE.md` into the respective files:

1. `workflow/models.rs` - Data structures
2. `workflow/parser.rs` - Graph parser
3. `workflow/executor.rs` - Main executor
4. `workflow/data_mapper.rs` - Variable substitution
5. `workflow/validator.rs` - Response validation
6. `workflow/mod.rs` - Module exports
7. `commands/workflow.rs` - Tauri commands

### Step 4: Update main.rs

Add workflow commands to `src-tauri/src/main.rs`:

```rust
mod workflow; // Add this

use commands::workflow::{execute_workflow, validate_workflow, cancel_workflow_execution}; // Add this

// In invoke_handler, add:
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    execute_workflow,
    validate_workflow,
    cancel_workflow_execution,
])
```

### Step 5: Build and Test Rust

```bash
cd apps/desktop
npm run tauri:dev
```

If it compiles successfully, your Rust engine is ready! ✅

### Step 6: Install Frontend Dependencies

```bash
cd apps/desktop
npm install reactflow @xyflow/react
```

### Step 7: Create Frontend Components

Copy the code from `FRONTEND_IMPLEMENTATION.md`:

1. `src/store/workflowStore.js` - Workflow state management
2. `src/components/WorkflowBuilder/WorkflowCanvas.jsx` - Main canvas
3. `src/components/WorkflowBuilder/nodes/ApiNode.jsx` - API node
4. `src/components/WorkflowBuilder/nodes/DelayNode.jsx` - Delay node
5. `src/components/WorkflowBuilder/NodeConfigPanel.jsx` - Config panel

### Step 8: Add Workflow Route

Update `src/App.jsx` to add a workflow route:

```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WorkflowBuilder from '@/components/WorkflowBuilder/WorkflowBuilder';

// In your routing:
<Route path="/workflows" element={<WorkflowBuilder />} />
```

### Step 9: Create Workflow Builder Page

Create `src/components/WorkflowBuilder/WorkflowBuilder.jsx`:

```javascript
import WorkflowCanvas from './WorkflowCanvas';
import NodeConfigPanel from './NodeConfigPanel';
import { useWorkflowStore } from '@/store/workflowStore';
import { Play, Save, FileDown } from 'lucide-react';

export default function WorkflowBuilder() {
  const { currentWorkflow, executeWorkflow, saveWorkflow, isExecuting } = useWorkflowStore();

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="h-14 bg-surface-2 border-b border-border-1 flex items-center justify-between px-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">{currentWorkflow.name}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveWorkflow}
            className="flex items-center gap-2 px-4 py-2 bg-surface-3 text-text-primary rounded-lg hover:bg-surface-4 transition-colors"
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={executeWorkflow}
            disabled={isExecuting}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            <Play size={16} />
            {isExecuting ? 'Executing...' : 'Execute'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <WorkflowCanvas />
        </div>
        <NodeConfigPanel />
      </div>
    </div>
  );
}
```

### Step 10: Test the Workflow Builder

1. Start the app: `npm run tauri:dev`
2. Navigate to `/workflows`
3. Click "Add API Node"
4. Configure the node (URL, method, headers)
5. Add another node
6. Connect them
7. Click "Execute"
8. View results!

---

## 🧪 Testing Your Implementation

### Test Workflow JSON

Create a simple test workflow:

```json
{
  "id": "test-1",
  "name": "Test Workflow",
  "nodes": [
    {
      "id": "node1",
      "type": "api",
      "position": { "x": 100, "y": 100 },
      "data": {
        "name": "Get Users",
        "method": "GET",
        "url": "https://jsonplaceholder.typicode.com/users",
        "headers": [],
        "params": [],
        "data_mappings": [],
        "validations": [
          {
            "type": "status",
            "operator": "equals",
            "expected": 200
          }
        ]
      }
    }
  ],
  "edges": [],
  "created_at": "2026-04-23T00:00:00Z",
  "updated_at": "2026-04-23T00:00:00Z"
}
```

Test from browser console:

```javascript
import { invoke } from '@tauri-apps/api/tauri';

const workflow = { /* paste JSON above */ };
const result = await invoke('execute_workflow', {
  workflowJson: JSON.stringify(workflow)
});

console.log('Result:', result);
```

---

## 🐛 Troubleshooting

### Rust Compilation Errors

**Error:** `cannot find module workflow`  
**Fix:** Make sure you added `mod workflow;` to `main.rs`

**Error:** `petgraph not found`  
**Fix:** Run `cargo build` in `src-tauri/` to download dependencies

### Frontend Errors

**Error:** `reactflow is not defined`  
**Fix:** Run `npm install reactflow @xyflow/react`

**Error:** `Cannot read property 'nodes' of undefined`  
**Fix:** Initialize workflow store with default workflow

### Execution Errors

**Error:** `Failed to parse workflow`  
**Fix:** Validate your workflow JSON structure matches the Rust models

**Error:** `Node not found in context`  
**Fix:** Check that node IDs in data mappings match actual node IDs

---

## 📈 Next Steps After Basic Implementation

1. **Add Conditional Nodes** - Branch execution based on response
2. **Parallel Execution** - Execute independent nodes simultaneously
3. **Loop Support** - Iterate over arrays
4. **Transform Nodes** - Data transformation without API calls
5. **Workflow Templates** - Pre-built workflow library
6. **Scheduling** - Run workflows on a schedule
7. **Webhooks** - Trigger workflows from external events

---

## 🎓 Learning Resources

- **React Flow Docs:** https://reactflow.dev/
- **Petgraph Docs:** https://docs.rs/petgraph/
- **Tauri Commands:** https://tauri.app/v1/guides/features/command
- **Zustand Docs:** https://docs.pmnd.rs/zustand/

---

## 💡 Pro Tips

1. **Start Small:** Implement basic API nodes first, add complexity later
2. **Test Incrementally:** Test each phase before moving to the next
3. **Use Existing Code:** Leverage your existing HTTP executor from `commands/http.rs`
4. **Debug with Logs:** Add `println!` in Rust and `console.log` in React
5. **Version Control:** Commit after each working phase

---

## 🚀 You're Ready!

Start with Phase 1 (Rust Engine) and work your way through. Each phase builds on the previous one.

**Estimated Timeline:**
- Phase 1 (Rust): 1-2 weeks
- Phase 2 (Frontend): 1-2 weeks
- Phase 3 (Execution UI): 1 week
- Phase 4 (Backend): 1 week

**Total: 4-6 weeks for MVP**

Good luck building your workflow automation platform! 🎉
