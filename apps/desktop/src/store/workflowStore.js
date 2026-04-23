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
      executingNodeId: null,
      executionResult: null,
      executionProgress: { completed: 0, total: 0, percentage: 0 },
      showConfigPanel: false,
      showResultsLog: false,
      
      // Workflows list
      workflows: [],
      
      // UI state
      selectedNode: null,

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
            save_session: false,
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

      toggleNodeSession: (nodeId) => {
        set((state) => ({
          currentWorkflow: {
            ...state.currentWorkflow,
            nodes: state.currentWorkflow.nodes.map((node) =>
              node.id === nodeId
                ? { ...node, data: { ...node.data, save_session: !node.data.save_session } }
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

      setNodes: (nodes) => {
        set((state) => ({
          currentWorkflow: {
            ...state.currentWorkflow,
            nodes,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      setEdges: (edges) => {
        set((state) => ({
          currentWorkflow: {
            ...state.currentWorkflow,
            edges,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      // ─── Execution ─────────────────────────────────────────────

      executeWorkflow: async () => {
        const workflow = { ...get().currentWorkflow };
        
        // Backend expects id to be a string, not null
        if (!workflow.id) {
          workflow.id = `temp_${uuidv4()}`;
        }
        
        const { resolveVariables } = (await import('./environmentStore')).useEnvironmentStore.getState();

        if (workflow.nodes.length === 0) {
          toast.error('Workflow must contain at least one node');
          return;
        }

        // Clear previous results and set loading state
        const clearedNodes = workflow.nodes.map(n => ({
          ...n,
          data: { ...n.data, executionStatus: null, executionDuration: null }
        }));

        set({ 
          isExecuting: true, 
          executingNodeId: null,
          executionResult: null, 
          currentWorkflow: { ...workflow, nodes: clearedNodes },
          executionProgress: { completed: 0, total: workflow.nodes.length, percentage: 0 } 
        });

        try {
          // Pre-resolve environment variables and map to snake_case for Rust
          const resolvedNodes = workflow.nodes.map(node => {
            const baseNode = {
              ...node,
              data: {
                ...node.data,
                timeout: typeof node.data.timeout === 'string' 
                  ? parseInt(resolveVariables(node.data.timeout)) 
                  : node.data.timeout
              }
            };

            if (node.type === 'api') {
              return {
                ...baseNode,
                data: {
                  ...baseNode.data,
                  url: resolveVariables(node.data.url),
                  headers: (node.data.headers || []).map(h => ({
                    ...h,
                    value: resolveVariables(h.value)
                  })),
                  body: node.data.body ? (
                    typeof node.data.body === 'string' 
                      ? resolveVariables(node.data.body) 
                      : JSON.parse(resolveVariables(JSON.stringify(node.data.body)))
                  ) : null
                }
              };
            }
            return baseNode;
          });

          const resolvedWorkflow = {
            ...workflow,
            nodes: resolvedNodes,
            created_at: workflow.createdAt || new Date().toISOString(),
            updated_at: workflow.updatedAt || new Date().toISOString(),
            project_id: workflow.projectId || '',
            team_id: workflow.teamId || '',
          };

          const result = await invoke('execute_workflow', {
            workflowJson: JSON.stringify(resolvedWorkflow),
          });

          set({ executionResult: result, isExecuting: false, executingNodeId: null });
          
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
          set({ isExecuting: false, executingNodeId: null });
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
            try {
              // Update existing
              const { data } = await api.put(`/api/workflow/${workflow.id}`, workflow);
              set({ currentWorkflow: data.workflow });
              toast.success('Workflow saved');
              return { success: true, workflow: data.workflow };
            } catch (putError) {
              // If PUT fails with 404, the workflow might have been deleted or we're in a new DB
              if (putError.response?.status === 404) {
                console.log('Workflow not found for update, attempting to create new...');
                const { data } = await api.post('/api/workflow', workflow);
                set({ currentWorkflow: data.workflow });
                toast.success('Workflow saved (as new)');
                return { success: true, workflow: data.workflow };
              }
              throw putError;
            }
          } else {
            // Create new
            const { data } = await api.post('/api/workflow', workflow);
            set({ currentWorkflow: data.workflow });
            toast.success('Workflow created');
            return { success: true, workflow: data.workflow };
          }
        } catch (error) {
          console.error('Failed to save workflow:', error);
          toast.error(`Failed to save: ${error.response?.data?.error || error.message}`);
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
          const { activeEnvironment } = (await import('./environmentStore')).useEnvironmentStore.getState();
          const workflow = get().currentWorkflow;

          await api.post('/api/workflow-execution', {
            ...executionResult,
            teamId: workflow.teamId,
            environmentId: activeEnvironment?._id || null,
            environmentName: activeEnvironment?.name || 'No Environment'
          });
        } catch (error) {
          console.error('Failed to save execution:', error);
        }
      },

      openWorkflow: (workflow) => {
        set({
          currentWorkflow: workflow,
          selectedNode: null,
          showConfigPanel: false,
          isExecuting: false,
          executionResult: null,
        });
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
