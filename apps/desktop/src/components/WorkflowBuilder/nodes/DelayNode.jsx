import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { useWorkflowStore } from '@/store/workflowStore';
import { Hourglass, Loader2 } from 'lucide-react';

function DelayNode({ id, data, selected }) {
  const executingNodeId = useWorkflowStore(state => state.executingNodeId);
  const isExecuting = executingNodeId === id;

  return (
    <div
      className={`px-4 py-3.5 rounded-2xl border backdrop-blur-md transition-all duration-300 min-w-[180px] ${
        isExecuting 
          ? 'border-[var(--accent)] shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)] animate-pulse'
          : selected ? 'border-[var(--accent)] shadow-glass' : 'border-[var(--border-2)]'
      }`}
      style={{ background: 'var(--surface-1)' }}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-2.5 !h-2.5 !bg-[var(--border-2)] !border-none hover:!bg-[var(--accent)] transition-colors" 
      />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-surface-2 border border-[var(--border-2)]">
          {isExecuting ? (
            <Loader2 size={14} className="text-[var(--accent)] animate-spin" />
          ) : (
            <Hourglass size={14} className="text-surface-500" />
          )}
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-bold text-[var(--text-primary)] mb-0.5">{data.name}</div>
          <div className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">
            {data.timeout || 1000}<span className="lowercase ml-0.5 opacity-50 font-normal">ms</span> Delay
          </div>
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-2.5 !h-2.5 !bg-[var(--border-2)] !border-none hover:!bg-[var(--accent)] transition-colors" 
      />
    </div>
  );
}

export default memo(DelayNode);
