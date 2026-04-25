# Frontend Workflow Builder Implementation

This guide covers building the visual workflow builder using React Flow.

---

## Phase 2: Visual Flow Builder

### Step 2.1: Install Dependencies

```bash
cd apps/desktop
npm install reactflow @xyflow/react
npm install lucide-react  # Already installed
```

### Step 2.2: Create Workflow Store

Create `apps/desktop/src/store/workflowStore.js`:

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import api from '@/lib/api';
import { invoke } from '@tauri-apps/api/tauri';
import toast from 'react-hot-toast';

const defaultWorkflow = () => ({
  id: null,
  name: 'Untitled Workflow',
  description: '',
  nodes: [],
  edges: [],
  teamId: null,
  projectId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useWorkflowStore = create(
  persist(
    (set, get) => ({
      // Current workflow being edited
      currentWorkflow: defaultWorkflow(),
      
      // Execution state
      isExecuting: false,
      executionResult: null,
      executionProgress: { completed: 0, total: 0, percentage: 0 },
      
      // Workflows list
      workflows: [],
      
      // UI state
      selectedNode: null,
      showConfigPanel: false,

      // ─── Workflow Management ───────────────────────────────────
      
      setCurrentWorkflow: (workflow) => {
        set({ 
          currentWorkflow: workflow || defaultWorkflow(),
          selectedNode: null,
        });
      },

      updateWorkflowField: (field, value) => {
        set((state) => ({
          currentWorkflow: {
            ...state.currentWorkflow,
            [field]: value,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      newWorkflow: () => {
        set({
          currentWorkflow: defaultWorkflow(),
          selectedNode: null,
          executionResult: null,
        });
      },

      // ─── Node Management ───────────────────────────────────────

      addNode: (nodeType, position) => {
        const newNode = {
          id: uuidv4(),
          type: nodeType,
          position: position || { x: 100, y: 100 },
          data: {
            name: `${nodeType} Node`,
            method: nodeType === 'api' ? 'GET' : undefined,
            url: nodeType === 'api' ? '' : undefined,
            headers: [],
            params: [],
            body: null,
            data_mappings: [],
            validations: [],
            timeout: 30,
            retries: 0,
          },
        };

        set((state) => ({
          currentWorkflow: {
            ...state.currentWorkflow,
            nodes: [...state.currentWorkflow.nodes, newNode],
            updatedAt: new Date().toISOString(),
          },
          selectedNode: newNode.id,
          showConfigPanel: true,
        }));
      },

      updateNode: (nodeId, updates) => {
        set((state) => ({
          currentWorkflow: {
            ...state.currentWorkflow,
            nodes: state.currentWorkflow.nodes.map((node) =>
              node.id === nodeId
                ? { ...node, data: { ...node.data, ...updates } }
                : node
            ),
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      deleteNode: (nodeId) => {
        set((state) => ({
          currentWorkflow: {
            ...state.currentWorkflow,
            nodes: state.currentWorkflow.nodes.filter((n) => n.id !== nodeId),
            edges: state.currentWorkflow.edges.filter(
              (e) => e.source !== nodeId && e.target !== nodeId
            ),
            updatedAt: new Date().toISOString(),
          },
          selectedNode: state.selectedNode === nodeId ? null : state.selectedNode,
        }));
      },

      setSelectedNode: (nodeId) => {
        set({ selectedNode: nodeId, showConfigPanel: !!nodeId });
      },

      // ─── Edge Management ───────────────────────────────────────

      addEdge: (edge) => {
        set((state) => ({
          currentWorkflow: {
            ...state.currentWorkflow,
            edges: [...state.currentWorkflow.edges, { ...edge, id: uuidv4() }],
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      deleteEdge: (edgeId) => {
        set((state) => ({
          currentWorkflow: {
            ...state.currentWorkflow,
            edges: state.currentWorkflow.edges.filter((e) => e.id !== edgeId),
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      // ─── Execution ─────────────────────────────────────────────

      executeWorkflow: async () => {
        const workflow = get().currentWorkflow;

        if (workflow.nodes.length === 0) {
          toast.error('Workflow must contain at least one node');
          return;
        }

        set({ isExecuting: true, executionResult: null, executionProgress: { completed: 0, total: workflow.nodes.length, percentage: 0 } });

        try {
          const result = await invoke('execute_workflow', {
            workflowJson: JSON.stringify(workflow),
          });

          set({ executionResult: result, isExecuting: false });
          
          if (result.status === 'success') {
            toast.success(`Workflow completed successfully! ${result.success_count}/${result.total_nodes} nodes passed`);
          } else if (result.status === 'partial') {
            toast.error(`Workflow partially completed. ${result.failed_count} nodes failed`);
          } else {
            toast.error('Workflow execution failed');
          }

          // Save execution to backend
          if (navigator.onLine && workflow.id) {
            await get().saveExecution(result);
          }

          return result;
        } catch (error) {
          console.error('Workflow execution error:', error);
          toast.error(`Execution failed: ${error}`);
          set({ isExecuting: false });
          throw error;
        }
      },

      updateExecutionProgress: (progress) => {
        set({ executionProgress: progress });
      },

      cancelExecution: async () => {
        try {
          await invoke('cancel_workflow_execution');
          set({ isExecuting: false });
          toast.success('Execution cancelled');
        } catch (error) {
          console.error('Failed to cancel execution:', error);
        }
      },

      // ─── Backend Integration ───────────────────────────────────

      saveWorkflow: async () => {
        const workflow = get().currentWorkflow;

        if (!navigator.onLine) {
          toast.error('You are offline. Cannot save workflow.');
          return { success: false };
        }

        try {
          if (workflow.id) {
            // Update existing
            const { data } = await api.put(`/api/workflow/${workflow.id}`, workflow);
            set({ currentWorkflow: data.workflow });
            toast.success('Workflow saved');
            return { success: true, workflow: data.workflow };
          } else {
            // Create new
            const { data } = await api.post('/api/workflow', workflow);
            set({ currentWorkflow: data.workflow });
            toast.success('Workflow created');
            return { success: true, workflow: data.workflow };
          }
        } catch (error) {
          console.error('Failed to save workflow:', error);
          toast.error('Failed to save workflow');
          return { success: false, error };
        }
      },

      fetchWorkflows: async (teamId, projectId) => {
        if (!navigator.onLine) return;

        try {
          const params = new URLSearchParams();
          if (teamId) params.append('teamId', teamId);
          if (projectId) params.append('projectId', projectId);

          const { data } = await api.get(`/api/workflow?${params.toString()}`);
          set({ workflows: data.workflows || [] });
        } catch (error) {
          console.error('Failed to fetch workflows:', error);
        }
      },

      deleteWorkflow: async (workflowId) => {
        if (!navigator.onLine) {
          toast.error('You are offline. Cannot delete workflow.');
          return { success: false };
        }

        try {
          await api.delete(`/api/workflow/${workflowId}`);
          set((state) => ({
            workflows: state.workflows.filter((w) => w.id !== workflowId),
          }));
          toast.success('Workflow deleted');
          return { success: true };
        } catch (error) {
          console.error('Failed to delete workflow:', error);
          toast.error('Failed to delete workflow');
          return { success: false, error };
        }
      },

      saveExecution: async (executionResult) => {
        try {
          await api.post('/api/workflow-execution', executionResult);
        } catch (error) {
          console.error('Failed to save execution:', error);
        }
      },

      // ─── Reset ─────────────────────────────────────────────────

      reset: () => {
        set({
          currentWorkflow: defaultWorkflow(),
          isExecuting: false,
          executionResult: null,
          selectedNode: null,
          showConfigPanel: false,
        });
      },
    }),
    {
      name: 'payloadx-workflow',
      partialize: (state) => ({
        currentWorkflow: state.currentWorkflow,
        workflows: state.workflows,
      }),
    }
  )
);
```

### Step 2.3: Create Workflow Canvas Component

Create `apps/desktop/src/components/WorkflowBuilder/WorkflowCanvas.jsx`:

```javascript
import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '@/store/workflowStore';
import ApiNode from './nodes/ApiNode';
import DelayNode from './nodes/DelayNode';
import { Plus } from 'lucide-react';

const nodeTypes = {
  api: ApiNode,
  delay: DelayNode,
};

export default function WorkflowCanvas() {
  const {
    currentWorkflow,
    addNode,
    updateNode,
    deleteNode,
    addEdge: addWorkflowEdge,
    deleteEdge,
    setSelectedNode,
    executionResult,
  } = useWorkflowStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(currentWorkflow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(currentWorkflow.edges);

  // Sync nodes and edges with workflow store
  useEffect(() => {
    setNodes(currentWorkflow.nodes);
    setEdges(currentWorkflow.edges);
  }, [currentWorkflow.nodes, currentWorkflow.edges]);

  // Update workflow when nodes change
  useEffect(() => {
    if (JSON.stringify(nodes) !== JSON.stringify(currentWorkflow.nodes)) {
      useWorkflowStore.setState((state) => ({
        currentWorkflow: {
          ...state.currentWorkflow,
          nodes,
        },
      }));
    }
  }, [nodes]);

  // Update workflow when edges change
  useEffect(() => {
    if (JSON.stringify(edges) !== JSON.stringify(currentWorkflow.edges)) {
      useWorkflowStore.setState((state) => ({
        currentWorkflow: {
          ...state.currentWorkflow,
          edges,
        },
      }));
    }
  }, [edges]);

  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      addWorkflowEdge(newEdge);
    },
    [setEdges, addWorkflowEdge]
  );

  const onNodeClick = useCallback(
    (event, node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // Highlight nodes based on execution result
  const nodesWithStatus = nodes.map((node) => {
    if (!executionResult) return node;

    const result = executionResult.node_results.find((r) => r.node_id === node.id);
    if (!result) return node;

    return {
      ...node,
      data: {
        ...node.data,
        executionStatus: result.status,
        executionDuration: result.duration,
      },
    };
  });

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodesWithStatus}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        style={{ background: 'var(--bg-primary)' }}
      >
        <Background color="var(--border-1)" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.data.executionStatus === 'success') return '#10b981';
            if (node.data.executionStatus === 'failed') return '#ef4444';
            return 'var(--surface-2)';
          }}
        />
      </ReactFlow>

      {/* Add Node Toolbar */}
      <div className="absolute top-4 left-4 flex gap-2">
        <button
          onClick={() => addNode('api', { x: 100, y: 100 })}
          className="flex items-center gap-2 px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} />
          API Node
        </button>
        <button
          onClick={() => addNode('delay', { x: 100, y: 200 })}
          className="flex items-center gap-2 px-3 py-2 bg-surface-2 text-text-primary rounded-lg hover:bg-surface-3 transition-colors"
        >
          <Plus size={16} />
          Delay Node
        </button>
      </div>
    </div>
  );
}
```

### Step 2.4: Create API Node Component

Create `apps/desktop/src/components/WorkflowBuilder/nodes/ApiNode.jsx`:

```javascript
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Globe, CheckCircle, XCircle, Clock } from 'lucide-react';

function ApiNode({ data, selected }) {
  const getStatusColor = () => {
    if (data.executionStatus === 'success') return 'border-green-500 bg-green-500/10';
    if (data.executionStatus === 'failed') return 'border-red-500 bg-red-500/10';
    return 'border-border-1 bg-surface-2';
  };

  const getStatusIcon = () => {
    if (data.executionStatus === 'success') return <CheckCircle size={16} className="text-green-500" />;
    if (data.executionStatus === 'failed') return <XCircle size={16} className="text-red-500" />;
    return <Globe size={16} className="text-text-secondary" />;
  };

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[200px] transition-all ${
        selected ? 'border-brand-500 shadow-lg' : getStatusColor()
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-center gap-2 mb-2">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="text-sm font-medium text-text-primary">{data.name}</div>
          <div className="text-xs text-text-secondary">
            {data.method} {data.url || 'No URL'}
          </div>
        </div>
      </div>

      {data.executionDuration !== undefined && (
        <div className="flex items-center gap-1 text-xs text-text-secondary mt-2">
          <Clock size={12} />
          {data.executionDuration}ms
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export default memo(ApiNode);
```

### Step 2.5: Create Delay Node Component

Create `apps/desktop/src/components/WorkflowBuilder/nodes/DelayNode.jsx`:

```javascript
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Timer } from 'lucide-react';

function DelayNode({ data, selected }) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[180px] transition-all ${
        selected ? 'border-brand-500 shadow-lg' : 'border-border-1 bg-surface-2'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-center gap-2">
        <Timer size={16} className="text-text-secondary" />
        <div className="flex-1">
          <div className="text-sm font-medium text-text-primary">{data.name}</div>
          <div className="text-xs text-text-secondary">
            Wait {data.timeout || 1000}ms
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export default memo(DelayNode);
```

---

## Step 2.6: Create Node Configuration Panel

Create `apps/desktop/src/components/WorkflowBuilder/NodeConfigPanel.jsx`:

```javascript
import { useWorkflowStore } from '@/store/workflowStore';
import { X, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function NodeConfigPanel() {
  const { currentWorkflow, selectedNode, updateNode, setSelectedNode, showConfigPanel } = useWorkflowStore();

  if (!showConfigPanel || !selectedNode) return null;

  const node = currentWorkflow.nodes.find((n) => n.id === selectedNode);
  if (!node) return null;

  const handleUpdate = (field, value) => {
    updateNode(selectedNode, { [field]: value });
  };

  const addHeader = () => {
    const headers = node.data.headers || [];
    handleUpdate('headers', [...headers, { id: uuidv4(), key: '', value: '', enabled: true }]);
  };

  const updateHeader = (index, field, value) => {
    const headers = [...(node.data.headers || [])];
    headers[index] = { ...headers[index], [field]: value };
    handleUpdate('headers', headers);
  };

  const removeHeader = (index) => {
    const headers = [...(node.data.headers || [])];
    headers.splice(index, 1);
    handleUpdate('headers', headers);
  };

  return (
    <div className="w-96 h-full bg-surface-2 border-l border-border-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-1">
        <h3 className="text-lg font-semibold text-text-primary">Node Configuration</h3>
        <button
          onClick={() => setSelectedNode(null)}
          className="p-1 hover:bg-surface-3 rounded transition-colors"
        >
          <X size={20} className="text-text-secondary" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Name</label>
          <input
            type="text"
            value={node.data.name}
            onChange={(e) => handleUpdate('name', e.target.value)}
            className="w-full px-3 py-2 bg-surface-1 border border-border-1 rounded-lg text-text-primary focus:outline-none focus:border-brand-500"
          />
        </div>

        {node.type === 'api' && (
          <>
            {/* Method */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Method</label>
              <select
                value={node.data.method}
                onChange={(e) => handleUpdate('method', e.target.value)}
                className="w-full px-3 py-2 bg-surface-1 border border-border-1 rounded-lg text-text-primary focus:outline-none focus:border-brand-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">URL</label>
              <input
                type="text"
                value={node.data.url || ''}
                onChange={(e) => handleUpdate('url', e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className="w-full px-3 py-2 bg-surface-1 border border-border-1 rounded-lg text-text-primary focus:outline-none focus:border-brand-500"
              />
              <p className="text-xs text-text-secondary mt-1">
                Use {`{{nodeId.field}}`} to reference previous nodes
              </p>
            </div>

            {/* Headers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-primary">Headers</label>
                <button
                  onClick={addHeader}
                  className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {(node.data.headers || []).map((header, index) => (
                  <div key={header.id} className="flex gap-2">
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) => updateHeader(index, 'key', e.target.value)}
                      placeholder="Key"
                      className="flex-1 px-2 py-1 bg-surface-1 border border-border-1 rounded text-sm text-text-primary"
                    />
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) => updateHeader(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-2 py-1 bg-surface-1 border border-border-1 rounded text-sm text-text-primary"
                    />
                    <button
                      onClick={() => removeHeader(index)}
                      className="p-1 hover:bg-surface-3 rounded"
                    >
                      <Trash2 size={14} className="text-text-secondary" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeout */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Timeout (seconds)</label>
              <input
                type="number"
                value={node.data.timeout || 30}
                onChange={(e) => handleUpdate('timeout', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-surface-1 border border-border-1 rounded-lg text-text-primary focus:outline-none focus:border-brand-500"
              />
            </div>
          </>
        )}

        {node.type === 'delay' && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Delay (milliseconds)</label>
            <input
              type="number"
              value={node.data.timeout || 1000}
              onChange={(e) => handleUpdate('timeout', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-surface-1 border border-border-1 rounded-lg text-text-primary focus:outline-none focus:border-brand-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Next Steps

1. **Create Execution Dashboard** - See `EXECUTION_DASHBOARD.md`
2. **Add Backend Routes** - See `BACKEND_ROUTES.md`
3. **Test End-to-End** - Build and test the complete flow

Your workflow automation platform is taking shape! 🚀
