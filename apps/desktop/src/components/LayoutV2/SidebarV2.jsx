import { useState, useEffect } from 'react';
import { useTeamStore } from '@/store/teamStore';
import { useProjectStore } from '@/store/projectStore';
import { useCollectionStore } from '@/store/collectionStore';
import { useRequestStore } from '@/store/requestStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const NAV_ITEMS = [
  {
    id: 'collections',
    label: 'API Endpoints',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'environments',
    label: 'Environments',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    id: 'docs',
    label: 'API Docs',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'ai',
    label: 'AI Insights',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const METHOD_COLORS = {
  GET:     '#3FB950',
  POST:    '#58A6FF',
  PUT:     '#E3B341',
  PATCH:   '#A8A8A8',
  DELETE:  '#F85149',
  HEAD:    '#5A5A5A',
  OPTIONS: '#39C5CF',
};

export default function SidebarV2({
  onShowTeamModal,
  onShowProjectModal,
  onShowCollectionModal,
  onShowImportModal,
  onOpenEnvPanel,
  width,
}) {
  const { user, logout } = useAuthStore();
  const { teams, currentTeam, fetchTeams, setCurrentTeam } = useTeamStore();
  const { projects, currentProject, fetchProjects, setCurrentProject } = useProjectStore();
  const { collections, currentCollection, fetchCollections, fetchCollectionRequests, requests } = useCollectionStore();
  const { setCurrentRequest, currentRequest } = useRequestStore();
  const { disconnect } = useSocketStore();
  const { isConnected } = useSocketStore();
  const { theme, toggleTheme, toggleLayout, activeV2Nav, setActiveV2Nav } = useUIStore();

  const [expandedCollections, setExpandedCollections] = useState(new Set());
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showTeamsSection, setShowTeamsSection] = useState(true);
  const [showProjectsSection, setShowProjectsSection] = useState(true);

  // ── Data fetching ──────────────────
  useEffect(() => { fetchTeams(); }, []);
  useEffect(() => { if (currentTeam) fetchProjects(currentTeam._id); }, [currentTeam?._id]);
  useEffect(() => { if (currentProject) fetchCollections(currentProject._id); }, [currentProject?._id]);

  const handleLogout = () => {
    disconnect();
    logout();
    toast.success('Signed out successfully');
  };

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

  const toggleFolder = (fid) => {
    const next = new Set(expandedFolders);
    next.has(fid) ? next.delete(fid) : next.add(fid);
    setExpandedFolders(next);
  };

  // ── Remote Search ──────────────────
  useEffect(() => {
    if (!searchQuery.trim() || !currentProject) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await api.get(`/api/request?projectId=${currentProject._id}&search=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(data.requests || []);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, currentProject?._id]);

  return (
    <div className="sdbv2-container" style={{ width, minWidth: width }}>
      {/* Activity Bar (Vertical Rail) */}
      <nav className="sdbv2-activity-bar">
        <div className="sdbv2-activity-top">
          {NAV_ITEMS.map((item) => {
            const isActive = activeV2Nav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveV2Nav(item.id);
                  if (item.id === 'environments') onOpenEnvPanel?.();
                }}
                className={`sdbv2-activity-item ${isActive ? 'sdbv2-activity-item--active' : ''}`}
                title={item.label}
              >
                <span className="sdbv2-activity-icon">{item.icon}</span>
                {isActive && <span className="sdbv2-activity-active-bar" />}
              </button>
            );
          })}
        </div>

        <div className="sdbv2-activity-bottom">
          <div className="relative">
            <button 
              className="sdbv2-activity-avatar"
              onClick={() => setShowLogout(!showLogout)}
              title={user?.email || 'Profile'}
            >
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </button>
            
            {showLogout && (
              <div className="sdbv2-logout-menu">
                <div className="sdbv2-logout-email">{user?.email}</div>
                <button className="sdbv2-logout-btn" onClick={handleLogout}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <aside className="sdbv2-main">
        {/* Logo & App Name */}
        <div className="sdbv2-header">
          <div className="sdbv2-logo-row">
            <div className="sdbv2-logo-icon">
              <svg width="14" height="14" viewBox="0 0 36 36" fill="none">
                <path d="M6 18C6 11.373 11.373 6 18 6" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M30 18C30 24.627 24.627 30 18 30" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="18" cy="18" r="4" fill="currentColor" />
              </svg>
            </div>
            <div className="sdbv2-logo-text">
              <span className="sdbv2-app-name">SyncNest Studio</span>
              {currentTeam && (
                <span className="sdbv2-team-tag">
                  {currentTeam.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="sdbv2-search-wrap">
          <svg className="sdbv2-search-icon" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="sdbv2-search-input"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sdbv2-tree-body">
          {searchQuery ? (
            <div className="sdbv2-section">
              <div className="sdbv2-section-head">
                <span className="sdbv2-section-label">Search Results</span>
              </div>
              {isSearching ? (
                <p className="sdbv2-empty-note">Searching database...</p>
              ) : searchResults?.length > 0 ? (
                searchResults.map((req) => (
                  <SidebarRequest key={`search-${req._id}`} request={req} onSelect={setCurrentRequest} />
                ))
              ) : (
                <p className="sdbv2-empty-note">No matches found in project</p>
              )}
            </div>
          ) : (
            <>
              {/* Teams */}
              <div className="sdbv2-section">
                <div className="sdbv2-section-head" onClick={() => setShowTeamsSection(!showTeamsSection)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg className={`sdbv2-chevron ${showTeamsSection ? 'sdbv2-chevron--open' : ''}`} width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="sdbv2-section-label">Teams</span>
                  </div>
                  <button className="sdbv2-section-add" onClick={(e) => { e.stopPropagation(); onShowTeamModal(); }} title="New team">
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
                {showTeamsSection && (
                  <div className="animate-in" style={{ paddingLeft: '8px' }}>
                    {teams.map((team) => {
                      const isActive = currentTeam?._id === team._id;
                      return (
                        <button key={team._id} 
                          onClick={() => {
                            if (isActive) setCurrentTeam(null);
                            else setCurrentTeam(team);
                          }}
                          className={`sdbv2-tree-row team-row ${isActive ? 'sdbv2-tree-row--active' : ''}`}
                          style={isActive ? { outline: '1px solid rgba(255,255,255,0.12)', outlineOffset: '-1px' } : undefined}
                        >
                          <div className="sdbv2-tree-avatar">{team.name[0].toUpperCase()}</div>
                          <span className="sdbv2-tree-text">{team.name}</span>
                          {team.members?.length > 0 && (
                            <span className="sdbv2-tree-badge">{team.members.length + 1}</span>
                          )}
                        </button>
                      );
                    })}
                    {teams.length === 0 && <p className="sdbv2-empty-note">No teams yet</p>}
                  </div>
                )}
              </div>

              {/* Projects */}
              {currentTeam && (
                <div className="sdbv2-section">
                  <div className="sdbv2-section-head" onClick={() => setShowProjectsSection(!showProjectsSection)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg className={`sdbv2-chevron ${showProjectsSection ? 'sdbv2-chevron--open' : ''}`} width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="sdbv2-section-label">Projects</span>
                    </div>
                    <button className="sdbv2-section-add" onClick={(e) => { e.stopPropagation(); onShowProjectModal(); }} title="New project">
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                  {showProjectsSection && (
                    <div className="animate-in" style={{ paddingLeft: '8px' }}>
                      {projects.map((proj) => {
                        const isActive = currentProject?._id === proj._id;
                        return (
                          <button key={proj._id} 
                            onClick={() => {
                              if (isActive) setCurrentProject(null);
                              else setCurrentProject(proj);
                            }}
                            className={`sdbv2-tree-row proj-row ${isActive ? 'sdbv2-tree-row--active' : ''}`}
                            style={isActive ? { outline: `1px solid ${proj.color || 'rgba(99,102,241,0.35)'}`, outlineOffset: '-1px' } : undefined}
                          >
                            <div className="sdbv2-proj-dot" style={{ background: proj.color || '#6366f1' }} />
                            <span className="sdbv2-tree-text">{proj.name}</span>
                          </button>
                        );
                      })}
                      {projects.length === 0 && <p className="sdbv2-empty-note">No projects yet</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Collections */}
              {currentProject && (
                <div className="sdbv2-section">
                  <div className="sdbv2-section-head">
                    <span className="sdbv2-section-label">Collections</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="sdbv2-section-add" onClick={onShowImportModal} title="Import">
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      </button>
                      <button className="sdbv2-section-add" onClick={onShowCollectionModal} title="New collection">
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {collections.map((col) => {
                      const isExp = expandedCollections.has(col._id);
                      return (
                        <div key={col._id}>
                          <button onClick={() => toggleCollection(col)}
                            className={`sdbv2-tree-row ${currentCollection?._id === col._id ? 'sdbv2-tree-row--active' : ''}`}>
                            <svg className={`sdbv2-chevron ${isExp ? 'sdbv2-chevron--open' : ''}`} width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="sdbv2-tree-text">{col.name}</span>
                          </button>
                          {isExp && (
                            <div className="sdbv2-indent animate-in">
                              {(col.folders || []).map(folder => {
                                const isFolderExp = expandedFolders.has(folder._id);
                                return (
                                  <div key={folder._id}>
                                    <button onClick={() => toggleFolder(folder._id)} className="sdbv2-tree-row">
                                      <svg className={`sdbv2-chevron ${isFolderExp ? 'sdbv2-chevron--open' : ''}`} width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--warning)', flexShrink: 0 }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                      </svg>
                                      <span className="sdbv2-tree-text">{folder.name}</span>
                                    </button>
                                    {isFolderExp && requests.filter(r => r.folderId === folder._id).map(req => (
                                      <SidebarRequest key={req._id} request={req} onSelect={setCurrentRequest} isActive={currentRequest?._id === req._id} />
                                    ))}
                                  </div>
                                );
                              })}
                              {requests.filter(r => r.collectionId === col._id && !r.folderId).map(req => (
                                <SidebarRequest key={req._id} request={req} onSelect={setCurrentRequest} isActive={currentRequest?._id === req._id} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {collections.length === 0 && <p className="sdbv2-empty-note">No collections yet</p>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function SidebarRequest({ request, onSelect, isActive }) {
  const color = METHOD_COLORS[request.method] || '#9A9A9A';
  return (
    <button onClick={() => onSelect(request)} className={`sdbv2-tree-row sdbv2-req-row ${isActive ? 'sdbv2-tree-row--active' : ''}`}>
      <span className="sdbv2-method-badge" style={{ color, background: `${color}18` }}>
        {request.method}
      </span>
      <span className="sdbv2-tree-text">{request.name}</span>
    </button>
  );
}
