import { useState, useEffect } from 'react';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useProjectStore } from '@/store/projectStore';
import { useTeamStore } from '@/store/teamStore';
import { useUIStore } from '@/store/uiStore';
import toast from 'react-hot-toast';

const ENV_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316'];

export default function EnvironmentPanel() {
  const {
    environments, activeEnvironment,
    setActiveEnvironment, fetchEnvironments,
    createEnvironment, updateEnvironment,
    saveVariables, deleteEnvironment,
    duplicateEnvironment,
  } = useEnvironmentStore();
  const { projects, currentProject, setCurrentProject } = useProjectStore();
  const { currentTeam } = useTeamStore();
  const { setShowEnvironmentPanel } = useUIStore();

  const [selectedEnvId, setSelectedEnvId] = useState(activeEnvironment?._id || null);
  const [editedVars, setEditedVars] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', color: '#6366f1' });
  const [isCreating, setIsCreating] = useState(false);

  // Edit env name
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  const selectedEnv = environments.find((e) => e._id === selectedEnvId);

  // Auto-select first project if none is selected
  useEffect(() => {
    if (!currentProject && projects.length > 0) {
      setCurrentProject(projects[0]);
    }
  }, [projects]);

  useEffect(() => {
    if (currentProject?._id) {
      fetchEnvironments(currentProject._id, currentTeam?._id, true);
    }
  }, [currentProject?._id]);

  useEffect(() => {
    if (selectedEnv) {
      setEditedVars(JSON.parse(JSON.stringify(selectedEnv.variables || [])));
      setIsDirty(false);
      setNewName(selectedEnv.name);
    }
  }, [selectedEnvId, environments]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectEnv = (env) => {
    if (isDirty && selectedEnvId) {
      if (!window.confirm('You have unsaved changes. Discard?')) return;
    }
    setSelectedEnvId(env._id);
    setIsDirty(false);
  };

  const handleActivate = (env) => {
    setActiveEnvironment(env);
    toast.success(`🟢 Active: ${env.name}`);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !currentProject || !currentTeam) return;
    setIsCreating(true);
    const result = await createEnvironment(
      createForm.name.trim(),
      currentProject._id,
      currentTeam._id,
      { description: createForm.description, color: createForm.color }
    );
    setIsCreating(false);
    if (result.success) {
      setShowCreate(false);
      setCreateForm({ name: '', description: '', color: '#6366f1' });
      setSelectedEnvId(result.environment._id);
      toast.success(`Environment "${result.environment.name}" created`);
    } else {
      toast.error(result.error);
    }
  };

  const handleSaveVars = async () => {
    if (!selectedEnvId) return;
    setIsSaving(true);
    const result = await saveVariables(selectedEnvId, editedVars);
    setIsSaving(false);
    if (result.success) {
      setIsDirty(false);
      toast.success('Variables saved');
    } else {
      toast.error(result.error);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === selectedEnv.name) { setEditingName(false); return; }
    const result = await updateEnvironment(selectedEnvId, { name: newName.trim() });
    if (result.success) { toast.success('Renamed'); setEditingName(false); }
    else toast.error(result.error);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${selectedEnv.name}"? This cannot be undone.`)) return;
    const result = await deleteEnvironment(selectedEnvId);
    if (result.success) {
      setSelectedEnvId(null);
      toast.success('Deleted');
    } else toast.error(result.error);
  };

  const handleDuplicate = async () => {
    const result = await duplicateEnvironment(selectedEnvId);
    if (result.success) {
      setSelectedEnvId(result.environment._id);
      toast.success(`Duplicated as "${result.environment.name}"`);
    } else toast.error(result.error);
  };

  // Variable helpers
  const setVars = (vars) => { setEditedVars(vars); setIsDirty(true); };
  const addVar  = () => setVars([...editedVars, { key: '', value: '', description: '', isSecret: false, enabled: true }]);
  const updateVar = (i, upd) => setVars(editedVars.map((v, idx) => (idx === i ? upd : v)));
  const deleteVar = (i) => setVars(editedVars.filter((_, idx) => idx !== i));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && setShowEnvironmentPanel(false)}
    >
      <div className="bg-surface-1 border border-surface-700 rounded-2xl shadow-glass w-full max-w-4xl h-[80vh] flex flex-col animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <h2 className="text-sm font-semibold text-tx-primary">Environments</h2>
            <span className="text-surface-500 text-xs">
              {currentProject?.name || 'No project selected'}
            </span>
          </div>
          <button onClick={() => setShowEnvironmentPanel(false)} className="text-surface-500 hover:text-tx-primary transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — env list */}
          <div className="w-52 border-r border-surface-700 flex flex-col flex-shrink-0">
            <div className="flex-1 overflow-y-auto p-2">
              {environments.map((env) => (
                <div key={env._id} className="group flex items-center gap-1 mb-0.5">
                  {/* Color dot */}
                  <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: env.color || '#6366f1' }} />
                  <button
                    onClick={() => handleSelectEnv(env)}
                    className={`flex-1 text-left px-2 py-1.5 rounded-lg text-xs transition-all ${
                      selectedEnvId === env._id
                        ? 'bg-surface-700 text-tx-primary'
                        : 'text-surface-400 hover:text-tx-primary hover:bg-surface-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {activeEnvironment?._id === env._id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                      )}
                      {env.isGlobal && <span className="text-[9px] text-brand-400">GLOBAL</span>}
                      <span className="truncate">{env.name}</span>
                    </div>
                    <div className="text-tx-muted text-[10px] mt-0.5">
                      {env.variables?.filter(v => v.enabled).length || 0} vars
                    </div>
                  </button>
                  {/* Set active button */}
                  <button
                    onClick={() => handleActivate(env)}
                    className={`opacity-0 group-hover:opacity-100 text-xs px-1 py-1 rounded transition-all ${
                      activeEnvironment?._id === env._id
                        ? 'text-success'
                        : 'text-tx-muted hover:text-success'
                    }`}
                    title={activeEnvironment?._id === env._id ? 'Active' : 'Set as active'}
                  >
                    ●
                  </button>
                </div>
              ))}

              {environments.length === 0 && (
                <p className="text-tx-muted text-xs p-2 text-center">No environments yet</p>
              )}
            </div>

            {/* Create button */}
            <div className="p-2 border-t border-[var(--border-1)] flex-shrink-0">
              {showCreate ? (
                <form onSubmit={handleCreate} className="flex flex-col gap-1.5">
                  <input
                    autoFocus
                    className="input py-1 text-xs"
                    placeholder="Environment name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                  <input
                    className="input py-1 text-xs"
                    placeholder="Description (optional)"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  />
                  <div className="flex gap-1">
                    {ENV_COLORS.map((c) => (
                      <button
                        key={c} type="button"
                        onClick={() => setCreateForm({ ...createForm, color: c })}
                        className={`w-4 h-4 rounded-full transition-all ${createForm.color === c ? 'ring-1 ring-white scale-110' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button type="submit" className="btn-primary text-xs py-1 flex-1" disabled={isCreating}>
                      {isCreating ? '...' : 'Create'}
                    </button>
                    <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost text-xs py-1 flex-1">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : currentProject ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors py-1 px-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  New Environment
                </button>
              ) : (
                <p className="text-tx-muted text-[10px] px-1 py-1 text-center leading-snug">
                  Select a project in the sidebar to create environments
                </p>
              )}
            </div>
          </div>

          {/* Main — variable editor */}
          {selectedEnv ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Env header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-1)] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedEnv.color || '#6366f1' }} />
                  {editingName ? (
                    <input
                      autoFocus
                      className="input py-0.5 text-sm font-medium"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onBlur={handleRename}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
                    />
                  ) : (
                    <button
                      onDoubleClick={() => setEditingName(true)}
                      className="text-sm font-semibold text-tx-primary hover:text-brand-300 transition-colors"
                      title="Double-click to rename"
                    >
                      {selectedEnv.name}
                    </button>
                  )}
                  {activeEnvironment?._id === selectedEnvId && (
                    <span className="text-[9px] bg-success/20 text-success px-1.5 py-0.5 rounded-full font-semibold">ACTIVE</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {activeEnvironment?._id !== selectedEnvId && (
                    <button onClick={() => handleActivate(selectedEnv)} className="text-xs text-surface-400 hover:text-success border border-surface-700 hover:border-success/50 px-2 py-1 rounded-lg transition-all">
                      Set Active
                    </button>
                  )}
                  <button onClick={handleDuplicate} className="text-xs text-surface-400 hover:text-tx-primary border border-surface-700 hover:border-surface-600 px-2 py-1 rounded-lg transition-all" title="Duplicate">
                    ⎘ Copy
                  </button>
                  <button onClick={handleDelete} className="text-xs text-surface-400 hover:text-danger border border-surface-700 hover:border-danger/50 px-2 py-1 rounded-lg transition-all">
                    Delete
                  </button>
                </div>
              </div>

              {/* Variables table */}
              <div className="flex-1 overflow-y-auto p-3">
                {/* Column labels */}
                <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 items-center text-[10px] font-semibold text-surface-500 uppercase tracking-wider px-1 mb-2">
                  <span className="w-8">On</span>
                  <span>Key</span>
                  <span>Value</span>
                  <span className="w-12 text-center">Secret</span>
                  <span className="w-6" />
                </div>

                {editedVars.map((v, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 items-center mb-1.5 group">
                    <input
                      type="checkbox"
                      checked={v.enabled !== false}
                      onChange={(e) => updateVar(i, { ...v, enabled: e.target.checked })}
                      className="w-3.5 h-3.5 accent-brand-500"
                    />
                    <input
                      type="text"
                      placeholder="variable_key"
                      value={v.key}
                      onChange={(e) => updateVar(i, { ...v, key: e.target.value })}
                      className={`input py-1.5 text-xs font-mono ${!v.enabled ? 'opacity-50' : ''}`}
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <input
                      type={v.isSecret ? 'password' : 'text'}
                      placeholder={v.isSecret ? '••••••••' : 'value'}
                      value={v.value}
                      onChange={(e) => updateVar(i, { ...v, value: e.target.value })}
                      className={`input py-1.5 text-xs font-mono ${!v.enabled ? 'opacity-50' : ''}`}
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <button
                      onClick={() => updateVar(i, { ...v, isSecret: !v.isSecret })}
                      className={`text-sm px-2 py-1 rounded-lg transition-all ${
                        v.isSecret
                          ? 'text-warning bg-warning/10 border border-warning/30'
                          : 'text-tx-muted hover:text-tx-primary border border-surface-700'
                      }`}
                      title={v.isSecret ? 'Secret (click to make visible)' : 'Click to make secret'}
                    >
                      {v.isSecret ? '🔒' : '👁'}
                    </button>
                    <button
                      onClick={() => deleteVar(i)}
                      className="opacity-0 group-hover:opacity-100 text-tx-muted hover:text-danger transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {editedVars.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-tx-muted text-xs mb-2">No variables yet.</p>
                    <p className="text-surface-700 text-xs">
                      Use <code className="bg-surface-800 px-1 rounded text-brand-400">{'{{variable_name}}'}</code> in your requests to reference variables.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-[var(--border-1)] flex items-center justify-between flex-shrink-0">
                <button onClick={addVar} className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Variable
                </button>
                <div className="flex items-center gap-2">
                  {isDirty && <span className="text-warning text-xs">Unsaved changes</span>}
                  <button
                    onClick={handleSaveVars}
                    disabled={isSaving || !isDirty}
                    className="btn-primary text-xs py-1.5 px-4 disabled:opacity-40"
                  >
                    {isSaving ? 'Saving...' : 'Save Variables'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-tx-muted text-sm">
              {environments.length === 0
                ? 'Create an environment to get started'
                : 'Select an environment to manage its variables'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
