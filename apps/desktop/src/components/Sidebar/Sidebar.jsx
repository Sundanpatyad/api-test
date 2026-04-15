import { useEffect, useState } from 'react';
import { useTeamStore } from '@/store/teamStore';
import { useProjectStore } from '@/store/projectStore';
import { useCollectionStore } from '@/store/collectionStore';
import { useRequestStore } from '@/store/requestStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { getMethodClass, truncate } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { teams, currentTeam, fetchTeams, setCurrentTeam } = useTeamStore();
  const { projects, currentProject, fetchProjects, setCurrentProject } = useProjectStore();
  const { collections, currentCollection, fetchCollections, fetchCollectionRequests, requests } = useCollectionStore();
  const { setCurrentRequest } = useRequestStore();
  const { disconnect } = useSocketStore();
  const {
    setShowTeamModal,
    setShowProjectModal,
    setShowCollectionModal,
    setShowImportModal,
    setShowEnvironmentPanel,
    setShowInviteModal,
  } = useUIStore();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [expandedCollections, setExpandedCollections] = useState(new Set());
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    disconnect();
    logout();
    toast.success('Signed out successfully');
  };

  // Initial load
  useEffect(() => { fetchTeams(); }, []);
  useEffect(() => { if (currentTeam) fetchProjects(currentTeam._id); }, [currentTeam]);
  useEffect(() => { if (currentProject) fetchCollections(currentProject._id); }, [currentProject]);

  const toggleCollection = async (col) => {
    const id = col._id;
    if (expandedCollections.has(id)) {
      const next = new Set(expandedCollections);
      next.delete(id);
      setExpandedCollections(next);
    } else {
      setExpandedCollections(new Set([...expandedCollections, id]));
      await fetchCollectionRequests(id);
    }
  };

  const toggleFolder = (folderId) => {
    const next = new Set(expandedFolders);
    next.has(folderId) ? next.delete(folderId) : next.add(folderId);
    setExpandedFolders(next);
  };

  const filteredRequests = (collectionId) =>
    requests.filter(
      (r) =>
        r.collectionId === collectionId &&
        (searchQuery
          ? r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.url.toLowerCase().includes(searchQuery.toLowerCase())
          : true)
    );

  return (
    <aside className="flex flex-col h-full bg-surface-900 border-r border-surface-700/50 select-none">
      {/* Header */}
      <div className="p-3 border-b border-surface-700/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 36 36" fill="none">
              <path d="M6 18C6 11.373 11.373 6 18 6" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
              <path d="M30 18C30 24.627 24.627 30 18 30" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
              <circle cx="18" cy="18" r="4" fill="white"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">SyncNest Studio</span>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search requests..."
            className="input pl-8 py-1.5 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Team selector */}
      <div className="p-2 border-b border-surface-700/30">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Team</span>
          <button onClick={() => setShowTeamModal(true)} className="text-surface-500 hover:text-brand-400 transition-colors" title="New team">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {teams.map((team) => (
            <button
              key={team._id}
              onClick={() => setCurrentTeam(team)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                currentTeam?._id === team._id
                  ? 'bg-brand-500/20 text-brand-300'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'
              }`}
            >
              <div className="w-5 h-5 rounded bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                {team.name[0].toUpperCase()}
              </div>
              <span className="truncate flex-1">{team.name}</span>
              {/* Member count chip */}
              {team.members?.length > 0 && (
                <span className="text-[9px] text-surface-500 bg-surface-800 border border-surface-700 px-1 rounded-full flex-shrink-0">
                  {team.members.length + 1}
                </span>
              )}
            </button>
          ))}
          {teams.length === 0 && (
            <p className="text-surface-600 text-xs px-2 py-1">No teams yet</p>
          )}
        </div>
      </div>

      {/* Projects */}
      {currentTeam && (
        <div className="p-2 border-b border-surface-700/30">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Projects</span>
            <button onClick={() => setShowProjectModal(true)} className="text-surface-500 hover:text-brand-400 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {projects.map((project) => (
              <button
                key={project._id}
                onClick={() => setCurrentProject(project)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all w-full text-left ${
                  currentProject?._id === project._id
                    ? 'bg-surface-700 text-white'
                    : 'text-surface-400 hover:text-white hover:bg-surface-800'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color || '#6366f1' }}
                />
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Collections */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Collections</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowImportModal(true)} className="text-surface-500 hover:text-warning transition-colors" title="Import Postman collection">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              </button>
              <button onClick={() => setShowCollectionModal(true)} className="text-surface-500 hover:text-brand-400 transition-colors" title="New collection">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            {collections.map((col) => {
              const isExpanded = expandedCollections.has(col._id);
              const colRequests = filteredRequests(col._id);

              return (
                <div key={col._id}>
                  <button
                    onClick={() => toggleCollection(col)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all w-full text-left ${
                      currentCollection?._id === col._id
                        ? 'bg-surface-750 text-white'
                        : 'text-surface-400 hover:text-white hover:bg-surface-800'
                    }`}
                  >
                    <svg
                      className={`w-3 h-3 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                    <svg className="w-3.5 h-3.5 flex-shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                    </svg>
                    <span className="truncate flex-1">{col.name}</span>
                    {col.isImported && (
                      <span className="text-[9px] bg-warning/20 text-warning px-1 py-0.5 rounded">Postman</span>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="ml-3 pl-2 border-l border-surface-700/50 mt-0.5 flex flex-col gap-0.5 animate-in">
                      {/* Folders */}
                      {col.folders?.map((folder) => {
                        const folderReqs = colRequests.filter((r) => r.folderId === folder.id);
                        const isFolderExpanded = expandedFolders.has(folder.id);
                        return (
                          <div key={folder.id}>
                            <button
                              onClick={() => toggleFolder(folder.id)}
                              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-surface-400 hover:text-white hover:bg-surface-800 w-full text-left"
                            >
                              <svg className={`w-2.5 h-2.5 flex-shrink-0 transition-transform ${isFolderExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                              </svg>
                              <svg className="w-3 h-3 text-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                              </svg>
                              <span className="truncate">{folder.name}</span>
                              <span className="text-surface-600 ml-auto text-[10px]">{folderReqs.length}</span>
                            </button>
                            {isFolderExpanded && folderReqs.map((req) => (
                              <RequestItem key={req._id} request={req} onSelect={setCurrentRequest} />
                            ))}
                          </div>
                        );
                      })}

                      {/* Root-level requests */}
                      {colRequests.filter((r) => !r.folderId).map((req) => (
                        <RequestItem key={req._id} request={req} onSelect={setCurrentRequest} />
                      ))}

                      {colRequests.length === 0 && (
                        <p className="text-surface-600 text-xs px-2 py-1 italic">No requests</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="p-2 border-t border-surface-700/50 flex flex-col gap-0.5">
        <button
          onClick={() => setShowEnvironmentPanel(true)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-surface-400 hover:text-white hover:bg-surface-800 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
          Environments
        </button>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-surface-400 hover:text-white hover:bg-surface-800 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
          Team Members
        </button>

        {/* User card with logout */}
        <div className="relative mt-1">
          <button
            onClick={() => setShowLogoutConfirm((v) => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-surface-400 hover:text-white hover:bg-surface-800 transition-all w-full"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs text-white truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-surface-500 truncate leading-tight">{user?.email}</p>
            </div>
            <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${showLogoutConfirm ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          {/* Logout dropdown */}
          {showLogoutConfirm && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-850 border border-surface-700 rounded-xl shadow-glass overflow-hidden animate-in">
              <div className="px-3 py-2 border-b border-surface-700/50">
                <p className="text-[10px] text-surface-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-danger hover:bg-danger/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function RequestItem({ request, onSelect }) {
  return (
    <button
      onClick={() => onSelect(request)}
      className="flex items-center gap-2 px-2 py-1 rounded text-xs text-surface-400 hover:text-white hover:bg-surface-800 transition-all w-full text-left group"
    >
      <span className={`${getMethodClass(request.method)} flex-shrink-0 text-[9px]`}>
        {request.method}
      </span>
      <span className="truncate group-hover:text-white transition-colors">{request.name}</span>
    </button>
  );
}
