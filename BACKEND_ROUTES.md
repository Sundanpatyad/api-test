# Backend API Routes Implementation

This document covers the backend implementation for workflow persistence.

---

## Phase 4: Backend Integration

### Step 4.1: Create Workflow Model

Create `apps/backend/models/Workflow.js`:

```javascript
import mongoose from 'mongoose';

const workflowNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true, enum: ['api', 'condition', 'delay', 'transform'] },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  data: {
    name: { type: String, required: true },
    method: String,
    url: String,
    headers: [{
      key: String,
      value: String,
      enabled: { type: Boolean, default: true },
    }],
    params: [{
      key: String,
      value: String,
      enabled: { type: Boolean, default: true },
    }],
    body: mongoose.Schema.Types.Mixed,
    data_mappings: [{
      target_field: String,
      source_expression: String,
      transform: String,
    }],
    validations: [{
      type: { type: String, enum: ['status', 'body', 'header', 'schema', 'custom'] },
      field: String,
      operator: { type: String, enum: ['equals', 'contains', 'matches', 'exists', 'gt', 'lt', 'gte', 'lte'] },
      expected: mongoose.Schema.Types.Mixed,
      error_message: String,
    }],
    timeout: Number,
    retries: Number,
  },
}, { _id: false });

const workflowEdgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  type: String,
  condition: String,
}, { _id: false });

const workflowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  nodes: [workflowNodeSchema],
  edges: [workflowEdgeSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  version: { type: Number, default: 1 },
}, {
  timestamps: true,
});

// Indexes for performance
workflowSchema.index({ teamId: 1, createdAt: -1 });
workflowSchema.index({ projectId: 1 });
workflowSchema.index({ createdBy: 1 });

export default mongoose.model('Workflow', workflowSchema);
```

### Step 4.2: Create Workflow Execution Model

Create `apps/backend/models/WorkflowExecution.js`:

```javascript
import mongoose from 'mongoose';

const validationResultSchema = new mongoose.Schema({
  type: String,
  passed: Boolean,
  expected: mongoose.Schema.Types.Mixed,
  actual: mongoose.Schema.Types.Mixed,
  message: String,
}, { _id: false });

const nodeExecutionResultSchema = new mongoose.Schema({
  node_id: String,
  node_name: String,
  start_time: String,
  end_time: String,
  duration: Number,
  status: { type: String, enum: ['success', 'failed', 'skipped'] },
  request: {
    method: String,
    url: String,
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
  },
  response: {
    status: Number,
    status_text: String,
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    size: Number,
  },
  validations: [validationResultSchema],
  error: {
    message: String,
    type: String,
    stack: String,
  },
  extracted_data: mongoose.Schema.Types.Mixed,
}, { _id: false });

const workflowExecutionSchema = new mongoose.Schema({
  workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  workflowName: { type: String, required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  duration: { type: Number, required: true },
  
  status: { type: String, enum: ['success', 'failed', 'partial'], required: true },
  
  total_nodes: { type: Number, required: true },
  success_count: { type: Number, required: true },
  failed_count: { type: Number, required: true },
  skipped_count: { type: Number, required: true },
  
  node_results: [nodeExecutionResultSchema],
  
  environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Environment' },
  environmentName: String,
}, {
  timestamps: true,
});

// Indexes
workflowExecutionSchema.index({ workflowId: 1, createdAt: -1 });
workflowExecutionSchema.index({ teamId: 1, createdAt: -1 });
workflowExecutionSchema.index({ executedBy: 1 });
workflowExecutionSchema.index({ status: 1 });

export default mongoose.model('WorkflowExecution', workflowExecutionSchema);
```

### Step 4.3: Create Workflow Routes

Create `apps/backend/app/api/workflow/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Workflow from '@/models/Workflow';

// GET /api/workflow - List workflows
export async function GET(req) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search');

    let query = {};

    if (teamId) {
      query.teamId = teamId;
    }

    if (projectId) {
      query.projectId = projectId;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const workflows = await Workflow.find(query)
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

// POST /api/workflow - Create workflow
export async function POST(req) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { name, description, teamId, projectId, nodes, edges } = body;

    if (!name || !teamId) {
      return NextResponse.json(
        { error: 'Name and teamId are required' },
        { status: 400 }
      );
    }

    const workflow = await Workflow.create({
      name,
      description,
      teamId,
      projectId,
      nodes: nodes || [],
      edges: edges || [],
      createdBy: user._id,
      version: 1,
    });

    const populatedWorkflow = await Workflow.findById(workflow._id)
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json({ workflow: populatedWorkflow }, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
```

### Step 4.4: Create Workflow Detail Routes

Create `apps/backend/app/api/workflow/[id]/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Workflow from '@/models/Workflow';

// GET /api/workflow/:id - Get single workflow
export async function GET(req, { params }) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const workflow = await Workflow.findById(params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

// PUT /api/workflow/:id - Update workflow
export async function PUT(req, { params }) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { name, description, nodes, edges } = body;

    const workflow = await Workflow.findById(params.id);

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Update fields
    if (name !== undefined) workflow.name = name;
    if (description !== undefined) workflow.description = description;
    if (nodes !== undefined) workflow.nodes = nodes;
    if (edges !== undefined) workflow.edges = edges;

    workflow.version += 1;
    await workflow.save();

    const updatedWorkflow = await Workflow.findById(workflow._id)
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json({ workflow: updatedWorkflow });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflow/:id - Delete workflow
export async function DELETE(req, { params }) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const workflow = await Workflow.findById(params.id);

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    await workflow.deleteOne();

    return NextResponse.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
```

### Step 4.5: Create Workflow Execution Routes

Create `apps/backend/app/api/workflow-execution/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import WorkflowExecution from '@/models/WorkflowExecution';

// GET /api/workflow-execution - List executions
export async function GET(req) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get('workflowId');
    const teamId = searchParams.get('teamId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = {};

    if (workflowId) {
      query.workflowId = workflowId;
    }

    if (teamId) {
      query.teamId = teamId;
    }

    if (status) {
      query.status = status;
    }

    const executions = await WorkflowExecution.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('executedBy', 'name email')
      .populate('workflowId', 'name')
      .lean();

    return NextResponse.json({ executions });
  } catch (error) {
    console.error('Error fetching executions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}

// POST /api/workflow-execution - Save execution result
export async function POST(req) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const {
      workflow_id,
      workflow_name,
      start_time,
      end_time,
      duration,
      status,
      total_nodes,
      success_count,
      failed_count,
      skipped_count,
      node_results,
      teamId,
      environmentId,
      environmentName,
    } = body;

    const execution = await WorkflowExecution.create({
      workflowId: workflow_id,
      workflowName: workflow_name,
      teamId,
      executedBy: user._id,
      start_time,
      end_time,
      duration,
      status,
      total_nodes,
      success_count,
      failed_count,
      skipped_count,
      node_results,
      environmentId,
      environmentName,
    });

    return NextResponse.json({ execution }, { status: 201 });
  } catch (error) {
    console.error('Error saving execution:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save execution' },
      { status: 500 }
    );
  }
}
```

### Step 4.6: Create Execution Detail Route

Create `apps/backend/app/api/workflow-execution/[id]/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import WorkflowExecution from '@/models/WorkflowExecution';

// GET /api/workflow-execution/:id - Get execution details
export async function GET(req, { params }) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const execution = await WorkflowExecution.findById(params.id)
      .populate('executedBy', 'name email')
      .populate('workflowId', 'name description')
      .lean();

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    return NextResponse.json({ execution });
  } catch (error) {
    console.error('Error fetching execution:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch execution' },
      { status: 500 }
    );
  }
}
```

---

## Testing Backend Routes

### Test Workflow Creation

```bash
curl -X POST http://localhost:3001/api/workflow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Workflow",
    "description": "A test workflow",
    "teamId": "TEAM_ID",
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
          "validations": []
        }
      }
    ],
    "edges": []
  }'
```

### Test Workflow List

```bash
curl http://localhost:3001/api/workflow?teamId=TEAM_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Execution Save

```bash
curl -X POST http://localhost:3001/api/workflow-execution \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "workflow_id": "WORKFLOW_ID",
    "workflow_name": "Test Workflow",
    "teamId": "TEAM_ID",
    "start_time": "2026-04-23T10:00:00Z",
    "end_time": "2026-04-23T10:00:05Z",
    "duration": 5000,
    "status": "success",
    "total_nodes": 1,
    "success_count": 1,
    "failed_count": 0,
    "skipped_count": 0,
    "node_results": []
  }'
```

---

## Frontend Integration

Update `apps/desktop/src/store/workflowStore.js` to use these endpoints:

```javascript
// Already implemented in FRONTEND_IMPLEMENTATION.md
// The store includes:
// - saveWorkflow()
// - fetchWorkflows()
// - deleteWorkflow()
// - saveExecution()
```

---

## Database Indexes

The models include indexes for optimal query performance:

**Workflow Indexes:**
- `{ teamId: 1, createdAt: -1 }` - List workflows by team
- `{ projectId: 1 }` - Filter by project
- `{ createdBy: 1 }` - Filter by creator

**WorkflowExecution Indexes:**
- `{ workflowId: 1, createdAt: -1 }` - Execution history
- `{ teamId: 1, createdAt: -1 }` - Team executions
- `{ status: 1 }` - Filter by status

---

## Security Considerations

1. **Authentication:** All routes require JWT token
2. **Authorization:** Check team membership before access
3. **Input Validation:** Validate all input fields
4. **Rate Limiting:** Add rate limiting middleware
5. **Data Sanitization:** Sanitize user input

---

## Next Steps

1. **Real-time Updates:** Add Socket.IO events for workflow updates
2. **Workflow Sharing:** Add sharing and permissions
3. **Workflow Versioning:** Track workflow versions
4. **Execution Scheduling:** Schedule workflow runs
5. **Webhooks:** Trigger workflows via webhooks

---

## Complete! 🎉

You now have a complete backend implementation for workflow persistence. Combined with the Rust execution engine and React frontend, you have a full-featured workflow automation platform!
