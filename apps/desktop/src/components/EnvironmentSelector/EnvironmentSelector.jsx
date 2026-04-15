import { useState, useRef, useEffect } from 'react';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useProjectStore } from '@/store/projectStore';
import { useTeamStore } from '@/store/teamStore';
import { useUIStore } from '@/store/uiStore';

export default function EnvironmentSelector() {
  const { environments, activeEnvironment, setActiveEnvironment, fetchEnvironments } = useEnvironmentStore();
  const { currentProject } = useProjectStore();
  const { currentTeam } = useTeamStore();
  const { setShowEnvironmentPanel } = useUIStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Fetch envs when project changes
  useEffect(() => {
    if (currentProject?._id) fetchEnvironments(currentProject._id, currentTeam?._id, true);
  }, [currentProject?._id, currentTeam?._id]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (env) => {
    setActiveEnvironment(env);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setActiveEnvironment(null);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
          activeEnvironment
            ? 'bg-[var(--surface-3)] border-[var(--border-2)] text-tx-primary hover:bg-[var(--surface-2)]'
            : 'bg-[var(--surface-2)] border-transparent text-surface-400 hover:text-tx-primary'
        }`}
        title="Select active environment"
      >
        {/* Status dot */}
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeEnvironment ? 'bg-success' : 'bg-surface-600'}`} />

        <span className="max-w-[120px] truncate">
          {activeEnvironment ? activeEnvironment.name : 'No Environment'}
        </span>

        {/* Clear button */}
        {activeEnvironment && (
          <span
            onClick={handleClear}
            className="ml-0.5 text-surface-500 hover:text-danger transition-colors cursor-pointer leading-none"
            title="Clear environment"
          >
            ×
          </span>
        )}

        <svg
          className={`w-3 h-3 flex-shrink-0 transition-transform text-surface-500 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-surface-850 border border-surface-700 rounded-xl shadow-glass z-50 animate-in py-1">
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-surface-700/50 mb-1">
            <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
              Environments
            </span>
            <button
              onClick={() => { setShowEnvironmentPanel(true); setOpen(false); }}
              className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors"
            >
              Manage →
            </button>
          </div>

          {/* No environment option */}
          <button
            onClick={() => { setActiveEnvironment(null); setOpen(false); }}
            className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-all ${
              !activeEnvironment
                ? 'text-tx-primary bg-surface-700'
                : 'text-surface-400 hover:text-tx-primary hover:bg-surface-800'
            }`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-surface-600 flex-shrink-0" />
            None
          </button>

          {environments.length === 0 && (
            <div className="px-3 py-3 text-center">
              <p className="text-surface-600 text-xs">No environments yet</p>
              <button
                onClick={() => { setShowEnvironmentPanel(true); setOpen(false); }}
                className="text-brand-400 hover:text-brand-300 text-xs mt-1 transition-colors"
              >
                + Create one
              </button>
            </div>
          )}

          {environments.map((env) => (
            <button
              key={env._id}
              onClick={() => handleSelect(env)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-all ${
                activeEnvironment?._id === env._id
                  ? 'text-tx-primary bg-surface-700'
                  : 'text-surface-400 hover:text-tx-primary hover:bg-surface-800'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                activeEnvironment?._id === env._id ? 'bg-success' : 'bg-surface-600'
              }`} />
              <span className="truncate flex-1 text-left">{env.name}</span>
              {activeEnvironment?._id === env._id && (
                <span className="text-[9px] bg-success/20 text-success px-1.5 py-0.5 rounded-full">Active</span>
              )}
              <span className="text-surface-600 text-[10px]">
                {env.variables?.filter(v => v.enabled !== false).length || 0} vars
              </span>
            </button>
          ))}

          {/* Variable preview for active env */}
          {activeEnvironment?.variables?.length > 0 && (
            <div className="border-t border-surface-700/50 mt-1 pt-1 px-3 pb-2">
              <p className="text-[10px] text-surface-600 mb-1.5 font-medium">Active Variables</p>
              <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                {activeEnvironment.variables
                  .filter((v) => v.enabled !== false && v.key)
                  .slice(0, 6)
                  .map((v, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <code className="text-brand-400 font-mono">{`{{${v.key}}}`}</code>
                      <span className="text-surface-600">→</span>
                      <span className="text-surface-400 truncate font-mono">
                        {v.isSecret ? '••••••••' : v.value || '(empty)'}
                      </span>
                    </div>
                  ))}
                {activeEnvironment.variables.filter(v => v.enabled !== false && v.key).length > 6 && (
                  <p className="text-surface-600 text-[10px]">
                    +{activeEnvironment.variables.filter(v => v.enabled !== false && v.key).length - 6} more...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
