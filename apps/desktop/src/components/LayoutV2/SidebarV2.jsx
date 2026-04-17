import { useState, useEffect, useRef } from 'react';
import { useTeamStore } from '@/store/teamStore';
import { useProjectStore } from '@/store/projectStore';
import { useCollectionStore } from '@/store/collectionStore';
import { useRequestStore } from '@/store/requestStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';
import RefreshButton from '@/components/RefreshButton/RefreshButton';
import logo from '@/assets/logo.png';

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
  const { 
    teams, 
    currentTeam, 
    fetchTeams, 
    setCurrentTeam, 
    updateTeamName, 
    deleteTeam,
    isRefreshing: isRefreshingTeams,
    refreshTeams
  } = useTeamStore();
  const { 
    projects, 
    currentProject, 
    fetchProjects, 
    setCurrentProject, 
    updateProjectName, 
    deleteProject,
    isRefreshing: isRefreshingProjects,
    refreshProjects,
    getFilteredProjects
  } = useProjectStore();
  const { 
    collections, 
    currentCollection, 
    fetchCollections, 
    fetchCollectionRequests, 
    requests,
    updateCollectionName,
    deleteCollection,
    removeRequest,
    addRequest,
    isRefreshing: isRefreshingCollections,
    refreshCollections,
    refreshCollectionRequests,
    loadCollectionRequestsFromStorage,
    getFilteredCollections
  } = useCollectionStore();
  const { 
    setCurrentRequest, 
    currentRequest,
    createRequest,
    updateRequestName,
    deleteRequest,
    setNoActiveRequest
  } = useRequestStore();
  const { disconnect } = useSocketStore();
  const { isConnected } = useSocketStore();
  const { 
    theme, 
    toggleTheme, 
    toggleLayout, 
    activeV2Nav, 
    setActiveV2Nav,
    setContextMenu,
    setShowConfirmDialog,
    setShowEditNameModal
  } = useUIStore();

  const [expandedCollections, setExpandedCollections] = useState(() => {
    const saved = localStorage.getItem('sidebar_expanded_collections');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const expandedCollectionsRef = useRef(expandedCollections);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  
  // Load section expansion state from localStorage
  const [showTeamsSection, setShowTeamsSection] = useState(() => {
    const saved = localStorage.getItem('sidebar_teams_expanded');
    return saved !== null ? saved === 'true' : true;
  });
  const [showProjectsSection, setShowProjectsSection] = useState(() => {
    const saved = localStorage.getItem('sidebar_projects_expanded');
    return saved !== null ? saved === 'true' : true;
  });
  
  // Persist section expansion state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_teams_expanded', showTeamsSection);
  }, [showTeamsSection]);
  
  useEffect(() => {
    localStorage.setItem('sidebar_projects_expanded', showProjectsSection);
  }, [showProjectsSection]);

  // Filtered data based on current selection
  const filteredProjects = currentTeam ? getFilteredProjects(currentTeam._id) : [];
  const filteredCollections = currentProject ? getFilteredCollections(currentProject._id) : [];

  // ── Data fetching ──────────────────
  useEffect(() => { fetchTeams(); }, []);
  useEffect(() => { if (currentTeam) fetchProjects(currentTeam._id); }, [currentTeam?._id]);
  useEffect(() => { if (currentProject) fetchCollections(currentProject._id); }, [currentProject?._id]);

  // ── Update ref when expandedCollections changes ──────────────────
  useEffect(() => {
    expandedCollectionsRef.current = expandedCollections;
  }, [expandedCollections]);

  // ── Listen for storage events to sync expanded collections ──────────────────
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebar_expanded_collections');
      if (saved) {
        const expandedIds = JSON.parse(saved);
        setExpandedCollections(new Set(expandedIds));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ── Listen for collection import events to auto-expand ──────────────────
  useEffect(() => {
    const handleCollectionImported = (e) => {
      const collectionId = e.detail;
      const currentExpanded = expandedCollectionsRef.current;
      if (collectionId && !currentExpanded.has(collectionId)) {
        const next = new Set([...currentExpanded, collectionId]);
        setExpandedCollections(next);
        localStorage.setItem('sidebar_expanded_collections', JSON.stringify([...next]));
        // Fetch requests from API for the newly imported collection
        fetchCollectionRequests(collectionId, true);
      }
    };

    window.addEventListener('collection-imported', handleCollectionImported);
    return () => window.removeEventListener('collection-imported', handleCollectionImported);
  }, []);

  // ── Permission helpers ──────────────────
  const isTeamOwner = (team) => team?.ownerId?._id === user?._id || team?.ownerId === user?._id;
  const isTeamAdmin = (team) => {
    if (isTeamOwner(team)) return true;
    return team?.members?.some(m => 
      (m.userId?._id || m.userId) === user?._id && m.role === 'admin'
    );
  };
  const isProjectAdmin = (project) => {
    if (project?.ownerId?._id === user?._id || project?.ownerId === user?._id) return true;
    return project?.members?.some(m => 
      (m.userId?._id || m.userId) === user?._id && m.role === 'admin'
    );
  };

  // ── Context Menu Handlers ──────────────────
  const showTeamContextMenu = (e, team) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isTeamOwner(team)) return; // Only owner can edit/delete team
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          id: 'edit',
          label: 'Edit Name',
          icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
          onClick: () => setShowEditNameModal(true, {
            title: 'Edit Team Name',
            itemType: 'Team',
            currentName: team.name,
            onSave: async (name) => {
              const result = await updateTeamName(team._id, name);
              if (result.success) toast.success('Team renamed');
              else toast.error(result.error);
            }
          })
        },
        { id: 'divider', divider: true },
        {
          id: 'delete',
          label: 'Delete Team',
          danger: true,
          icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
          onClick: () => setShowConfirmDialog(true, {
            title: 'Delete Team?',
            message: 'This will permanently delete the team and all its projects, collections, and requests.',
            itemName: team.name,
            onConfirm: async () => {
              const result = await deleteTeam(team._id);
              if (result.success) toast.success('Team deleted');
              else toast.error(result.error);
            }
          })
        }
      ]
    });
  };

  const showProjectContextMenu = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProjectAdmin(project)) return; // Only admins can edit/delete project
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          id: 'edit',
          label: 'Edit Name',
          icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
          onClick: () => setShowEditNameModal(true, {
            title: 'Edit Project Name',
            itemType: 'Project',
            currentName: project.name,
            onSave: async (name) => {
              const result = await updateProjectName(project._id, name);
              if (result.success) toast.success('Project renamed');
              else toast.error(result.error);
            }
          })
        },
        { id: 'divider', divider: true },
        {
          id: 'delete',
          label: 'Delete Project',
          danger: true,
          icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
          onClick: () => setShowConfirmDialog(true, {
            title: 'Delete Project?',
            message: 'This will permanently delete the project and all its collections and requests.',
            itemName: project.name,
            onConfirm: async () => {
              const result = await deleteProject(project._id);
              if (result.success) toast.success('Project deleted');
              else toast.error(result.error);
            }
          })
        }
      ]
    });
  };

  const showCollectionContextMenu = (e, collection) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          id: 'add-request',
          label: 'Add Request',
          icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
          onClick: async () => {
            const newRequest = {
              name: 'New Request',
              method: 'GET',
              url: '',
              collectionId: collection._id,
              projectId: currentProject._id,
              teamId: currentTeam._id,
              headers: [{ id: uuidv4(), key: '', value: '', enabled: true }],
              params: [{ id: uuidv4(), key: '', value: '', enabled: true }],
              body: { mode: 'none', raw: '', rawLanguage: 'json', formData: [], urlencoded: [] },
              auth: { type: 'none' }
            };
            const result = await createRequest(newRequest);
            if (result.success) {
              setCurrentRequest(result.request);
              toast.success('Request created');
            } else {
              toast.error(result.error);
            }
          }
        },
        {
          id: 'edit',
          label: 'Edit Name',
          icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
          onClick: () => setShowEditNameModal(true, {
            title: 'Edit Collection Name',
            itemType: 'Collection',
            currentName: collection.name,
            onSave: async (name) => {
              const result = await updateCollectionName(collection._id, name);
              if (result.success) toast.success('Collection renamed');
              else toast.error(result.error);
            }
          })
        },
        { id: 'divider', divider: true },
        {
          id: 'delete',
          label: 'Delete Collection',
          danger: true,
          icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
          onClick: () => setShowConfirmDialog(true, {
            title: 'Delete Collection?',
            message: 'This will permanently delete the collection and all its requests.',
            itemName: collection.name,
            onConfirm: async () => {
              const result = await deleteCollection(collection._id);
              if (result.success) toast.success('Collection deleted');
              else toast.error(result.error);
            }
          })
        }
      ]
    });
  };

  const showRequestContextMenu = (e, request) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          id: 'edit',
          label: 'Edit Name',
          icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
          onClick: () => setShowEditNameModal(true, {
            title: 'Edit Request Name',
            itemType: 'Request',
            currentName: request.name,
            onSave: async (name) => {
              const result = await updateRequestName(request._id, name);
              if (result.success) {
                toast.success('Request renamed');
              } else {
                toast.error(result.error);
              }
            }
          })
        },
        { id: 'divider', divider: true },
        {
          id: 'delete',
          label: 'Delete Request',
          danger: true,
          icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
          onClick: () => setShowConfirmDialog(true, {
            title: 'Delete Request?',
            message: 'This will permanently delete this request.',
            itemName: request.name,
            onConfirm: async () => {
              const result = await deleteRequest(request._id, request.collectionId);
              if (result.success) {
                // 1. Remove from collection store state + localStorage
                removeRequest(request._id, request.collectionId);

                toast.success('Request deleted');

                // 2. If this was the currently open request, navigate away
                if (currentRequest?._id === request._id) {
                  // Find all remaining requests in the same collection
                  const siblings = useCollectionStore.getState().requests.filter(
                    (r) => r.collectionId === request.collectionId && r._id !== request._id
                  );

                  if (siblings.length > 0) {
                    // Open the last one (closest sibling in list order)
                    setCurrentRequest(siblings[siblings.length - 1]);
                  } else {
                    // No requests left — show empty state
                    setNoActiveRequest(true);
                  }
                }
              } else {
                toast.error(result.error);
              }
            }
          })
        }
      ]
    });
  };

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
      localStorage.setItem('sidebar_expanded_collections', JSON.stringify([...next]));
    } else {
      const next = new Set([...expandedCollections, id]);
      setExpandedCollections(next);
      localStorage.setItem('sidebar_expanded_collections', JSON.stringify([...next]));
      // Automatically fetch requests from API if they aren't in local storage/state
      fetchCollectionRequests(id);
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
              <img src={logo} alt="PayloadX" className="w-5 h-5 object-contain" />
            </div>
            <div className="sdbv2-logo-text">
              <span className="sdbv2-app-name">PayloadX Studio</span>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <RefreshButton 
                      onRefresh={async () => {
                        console.log('Sidebar: Before refresh, teams:', teams.length);
                        const result = await refreshTeams();
                        console.log('Sidebar: After refresh result:', result, 'teams now:', teams.length);
                        if (result.fromCache) {
                          toast(result.error, { icon: '📦', style: { background: '#E3B341', color: '#000' } });
                        } else if (result.success) {
                          toast.success('Teams synced');
                        } else {
                          toast.error(result.error || 'Refresh failed');
                        }
                      }} 
                      loading={isRefreshingTeams}
                      tooltip="Refresh teams"
                      size={12}
                    />
                    <button className="sdbv2-section-add" onClick={(e) => { e.stopPropagation(); onShowTeamModal(); }} title="New team">
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
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
                          onContextMenu={(e) => showTeamContextMenu(e, team)}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshButton 
                        onRefresh={async () => {
                          const result = await refreshProjects(currentTeam._id);
                          if (result.fromCache) {
                            toast(result.error, { icon: '📦', style: { background: '#E3B341', color: '#000' } });
                          } else if (result.success) {
                            toast.success('Projects synced');
                          }
                        }} 
                        loading={isRefreshingProjects}
                        tooltip="Refresh projects"
                        size={12}
                      />
                      <button className="sdbv2-section-add" onClick={(e) => { e.stopPropagation(); onShowProjectModal(); }} title="New project">
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                  </div>
                  {showProjectsSection && (
                    <div className="animate-in" style={{ paddingLeft: '8px' }}>
                      {filteredProjects.map((proj) => {
                        const isActive = currentProject?._id === proj._id;
                        return (
                          <button key={proj._id} 
                            onClick={() => {
                              if (isActive) setCurrentProject(null);
                              else setCurrentProject(proj);
                            }}
                            onContextMenu={(e) => showProjectContextMenu(e, proj)}
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
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <RefreshButton 
                        onRefresh={async () => {
                          const result = await refreshCollections(currentProject._id);
                          if (result.fromCache) {
                            toast(result.error, { icon: '📦', style: { background: '#E3B341', color: '#000' } });
                          } else if (result.success) {
                            toast.success('Collections synced');
                          }
                        }} 
                        loading={isRefreshingCollections}
                        tooltip="Refresh collections"
                        size={12}
                      />
                      <button className="sdbv2-section-add" onClick={onShowImportModal} title="Import">
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      </button>
                      <button className="sdbv2-section-add" onClick={onShowCollectionModal} title="New collection">
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {filteredCollections.map((col) => {
                      const isExp = expandedCollections.has(col._id);
                      return (
                        <div key={col._id}>
                          <button 
                            onClick={() => toggleCollection(col)}
                            onContextMenu={(e) => showCollectionContextMenu(e, col)}
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
                                <SidebarRequest 
                                  key={req._id} 
                                  request={req} 
                                  onSelect={setCurrentRequest} 
                                  isActive={currentRequest?._id === req._id}
                                  onContextMenu={(e) => showRequestContextMenu(e, req)}
                                />
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
        
        {/* Creator attribution */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-1)', opacity: 0.3, marginTop: 'auto' }}>
           <p style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted)' }}>
             Project by <span style={{ color: 'var(--text-primary)' }}>Sundan Sharma</span>
           </p>
        </div>
      </aside>
    </div>
  );
}

function SidebarRequest({ request, onSelect, isActive, onContextMenu }) {
  const color = METHOD_COLORS[request.method] || '#9A9A9A';
  return (
    <button 
      onClick={() => onSelect(request)} 
      onContextMenu={onContextMenu}
      className={`sdbv2-tree-row sdbv2-req-row ${isActive ? 'sdbv2-tree-row--active' : ''}`}
    >
      <span className="sdbv2-method-badge" style={{ color, background: `${color}18` }}>
        {request.method}
      </span>
      <span className="sdbv2-tree-text">{request.name}</span>
    </button>
  );
}
