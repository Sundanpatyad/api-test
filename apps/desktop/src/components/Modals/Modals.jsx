import { useState, useEffect } from 'react';
import { useTeamStore } from '@/store/teamStore';
import { useProjectStore } from '@/store/projectStore';
import { useCollectionStore } from '@/store/collectionStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function CreateTeamModal() {
  const { createTeam, setCurrentTeam } = useTeamStore();
  const { setShowTeamModal } = useUIStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const result = await createTeam(name.trim(), description.trim());
    setLoading(false);
    if (result.success) {
      setCurrentTeam(result.team);
      toast.success(`Team "${result.team.name}" created!`);
      setShowTeamModal(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <ModalWrapper onClose={() => setShowTeamModal(false)} title="Create Team">
      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-surface-400 mb-1.5">Team Name</label>
          <input className="input" placeholder="e.g., Backend Squad" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="block text-xs font-semibold text-surface-400 mb-1.5">Description (optional)</label>
          <input className="input" placeholder="What does this team work on?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setShowTeamModal(false)} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

export function CreateProjectModal() {
  const { createProject } = useProjectStore();
  const { currentTeam } = useTeamStore();
  const { setShowProjectModal } = useUIStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [loading, setLoading] = useState(false);

  const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316'];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !currentTeam) return;
    setLoading(true);
    const result = await createProject(name.trim(), currentTeam._id, description.trim(), color);
    setLoading(false);
    if (result.success) {
      toast.success(`Project "${result.project.name}" created!`);
      setShowProjectModal(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <ModalWrapper onClose={() => setShowProjectModal(false)} title="Create Project">
      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-surface-400 mb-1.5">Project Name</label>
          <input className="input" placeholder="e.g., Payment API" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="block text-xs font-semibold text-surface-400 mb-1.5">Description</label>
          <input className="input" placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-surface-400 mb-1.5">Color</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c} type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-850 scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setShowProjectModal(false)} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading || !currentTeam}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

export function CreateCollectionModal() {
  const { createCollection } = useCollectionStore();
  const { currentProject } = useProjectStore();
  const { currentTeam } = useTeamStore();
  const { setShowCollectionModal } = useUIStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !currentProject || !currentTeam) return;
    setLoading(true);
    const result = await createCollection(name.trim(), currentProject._id, currentTeam._id, description.trim());
    setLoading(false);
    if (result.success) {
      toast.success(`Collection "${result.collection.name}" created!`);
      setShowCollectionModal(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <ModalWrapper onClose={() => setShowCollectionModal(false)} title="Create Collection">
      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-surface-400 mb-1.5">Collection Name</label>
          <input className="input" placeholder="e.g., User Management APIs" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="block text-xs font-semibold text-surface-400 mb-1.5">Description</label>
          <input className="input" placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {!currentProject && (
          <p className="text-warning text-xs bg-warning/10 border border-warning/30 rounded-xl px-3 py-2">
            ⚠️ Select a project first
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setShowCollectionModal(false)} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading || !currentProject}>
            {loading ? 'Creating...' : 'Create Collection'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

export function InviteModal() {
  const { currentTeam, inviteMember, removeMember, fetchTeamDetails } = useTeamStore();
  const { user } = useAuthStore();
  const { setShowInviteModal } = useUIStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(null); // userId being removed
  const [confirmRemove, setConfirmRemove] = useState(null); // userId pending confirm

  // Load fully-populated member list when modal opens
  useEffect(() => {
    if (currentTeam?._id) {
      fetchTeamDetails(currentTeam._id);
    }
  }, [currentTeam?._id]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim() || !currentTeam) return;
    setLoading(true);
    const result = await inviteMember(currentTeam._id, email.trim(), role);
    setLoading(false);
    if (result.success) {
      toast.success(`${email} added to team!`);
      setEmail('');
    } else {
      toast.error(result.error);
    }
  };

  const handleRemove = async (userId) => {
    setRemoving(userId);
    const result = await removeMember(currentTeam._id, userId);
    setRemoving(null);
    setConfirmRemove(null);
    if (result.success) {
      toast.success('Member removed from team');
    } else {
      toast.error(result.error);
    }
  };

  const isOwner = currentTeam?.ownerId?._id === user?._id ||
    currentTeam?.ownerId === user?._id;
  const isAdmin = isOwner || currentTeam?.members?.some(
    (m) => (m.userId?._id || m.userId) === user?._id && m.role === 'admin'
  );

  const ROLE_COLORS = {
    admin: 'bg-brand-500/20 text-brand-300 border border-brand-500/30',
    developer: 'bg-success/20 text-success border border-success/30',
    viewer: 'bg-surface-600/20 text-surface-400 border border-surface-600/30',
  };

  return (
    <ModalWrapper onClose={() => setShowInviteModal(false)} title="Team Members">
      <div className="flex flex-col gap-4">

        {/* ── Current members list ── */}
        {currentTeam && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">
              {(currentTeam.members?.length || 0) + 1} member{(currentTeam.members?.length || 0) !== 0 ? 's' : ''}
            </span>

            <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1">
              {/* Owner row */}
              {currentTeam.ownerId && (
                <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-surface-800 border border-[var(--border-1)]">
                  <div className="w-7 h-7 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-tx-primary text-xs flex-shrink-0">
                    {(currentTeam.ownerId?.name || currentTeam.ownerId)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-tx-primary truncate">
                      {currentTeam.ownerId?.name || 'Owner'}
                      {(currentTeam.ownerId?._id || currentTeam.ownerId) === user?._id && (
                        <span className="text-surface-500 ml-1">(you)</span>
                      )}
                    </p>
                    <p className="text-[10px] text-surface-500 truncate">{currentTeam.ownerId?.email || ''}</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                    owner
                  </span>
                </div>
              )}

              {/* Member rows */}
              {currentTeam.members?.map((m) => {
                const memberId = m.userId?._id || m.userId;
                const isYou = memberId === user?._id;
                const memberName = m.userId?.name || 'Member';
                const memberEmail = m.userId?.email || '';

                return (
                  <div key={memberId} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border-1)]">
                    <div className="w-7 h-7 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-tx-primary text-xs flex-shrink-0">
                      {memberName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-tx-primary truncate">
                        {memberName}
                        {isYou && <span className="text-surface-500 ml-1">(you)</span>}
                      </p>
                      <p className="text-[10px] text-surface-500 truncate">{memberEmail}</p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md flex-shrink-0 ${ROLE_COLORS[m.role] || ROLE_COLORS.viewer}`}>
                      {m.role}
                    </span>
                    {/* Remove button — only for admins/owners, cannot remove yourself */}
                    {isAdmin && !isYou && (
                      confirmRemove === memberId ? (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleRemove(memberId)}
                            disabled={removing === memberId}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30 transition-colors"
                          >
                            {removing === memberId ? '...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmRemove(null)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-surface-700 text-surface-400 hover:bg-surface-600 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemove(memberId)}
                          className="flex-shrink-0 text-tx-muted hover:text-danger transition-colors"
                          title="Remove member"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                          </svg>
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Divider ── */}
        <div className="border-t border-surface-700/50" />

        {/* ── Add member form ── */}
        {isAdmin ? (
          <form onSubmit={handleInvite} className="flex flex-col gap-3">
            <span className="text-[10px] text-surface-500 uppercase tracking-wider">Add member by email</span>
            <input
              className="input"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <div className="flex gap-2">
              <select className="input flex-1" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="admin">Admin — Full access</option>
                <option value="developer">Developer — Edit requests</option>
                <option value="viewer">Viewer — Read only</option>
              </select>
              <button type="submit" className="btn-primary px-4" disabled={loading || !currentTeam}>
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
            </div>
            {!currentTeam && (
              <p className="text-warning text-xs bg-warning/10 border border-warning/30 rounded-xl px-3 py-2">Select a team first</p>
            )}
          </form>
        ) : (
          <p className="text-surface-500 text-xs text-center py-2">Only admins can add or remove members.</p>
        )}

        <button onClick={() => setShowInviteModal(false)} className="btn-ghost w-full">Close</button>
      </div>
    </ModalWrapper>
  );
}

function ModalWrapper({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-1 border border-surface-700 rounded-2xl shadow-glass w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h2 className="text-sm font-semibold text-tx-primary">{title}</h2>
          <button onClick={onClose} className="text-surface-500 hover:text-tx-primary transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
