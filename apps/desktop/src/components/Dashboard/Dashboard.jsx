import React, { useMemo } from 'react';
import { useCollectionStore } from '@/store/collectionStore';
import { useRequestStore } from '@/store/requestStore';
import { useWSStore } from '@/store/wsStore';
import { useAuthStore } from '@/store/authStore';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { collections, requests } = useCollectionStore();
  const { history, setCurrentRequest, newRequest } = useRequestStore();
  const { connections } = useWSStore();
  const { currentProject } = useProjectStore();

  const stats = useMemo(() => {
    const projectCollections = collections.filter(c => c.projectId === currentProject?._id);
    const collectionIds = new Set(projectCollections.map(c => c._id));
    const projectRequests = requests.filter(r => collectionIds.has(r.collectionId));
    
    const wsCount = projectRequests.filter(r => r.protocol === 'ws').length;
    const restCount = projectRequests.filter(r => r.protocol !== 'ws').length;
    const activeWS = Object.keys(connections).filter(id => {
        const req = projectRequests.find(r => r._id === id);
        return req && req.protocol === 'ws';
    }).length;

    return {
      collections: projectCollections.length,
      rest: restCount,
      ws: wsCount,
      activeWS
    };
  }, [collections, requests, currentProject?._id, connections]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const { setActiveV2Nav } = useUIStore();
  const { collections, requests, setCurrentCollection } = useCollectionStore();

  const handleRecentClick = (entry) => {
    // Set request
    setCurrentRequest(entry.request);
    
    // Set parent collection so breadcrumbs/sidebar stay in sync
    const parentCol = collections.find(c => c._id === entry.request.collectionId);
    if (parentCol) {
      setCurrentCollection(parentCol);
    }

    // Switch view to Workspace
    setActiveV2Nav('collections');
    
    toast.success(`Opened ${entry.request.name}`);
  };

  return (
    <div className="dash-container animate-in">
      {/* ── Header ── */}
      <header className="dash-header">
        <div className="dash-welcome">
          <h1 className="dash-title">{greeting}, {user?.email?.split('@')[0] || 'User'}</h1>
          <p className="dash-subtitle">Here's what's happening in <strong>{currentProject?.name || 'your project'}</strong> today.</p>
        </div>
        <div className="dash-actions">
           <button onClick={() => newRequest()} className="dash-cta dash-cta--primary">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Request
           </button>
        </div>
      </header>

      {/* ── Stats Grid ── */}
      <div className="dash-grid">
        <StatCard 
          label="Collections" 
          value={stats.collections} 
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />}
          color="var(--accent)"
        />
        <StatCard 
          label="REST APIs" 
          value={stats.rest} 
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />}
          color="#3fb950"
        />
        <StatCard 
          label="WS Streams" 
          value={stats.ws} 
          subValue={stats.activeWS > 0 ? `${stats.activeWS} active` : null}
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />}
          color="#38bdf8"
        />
      </div>

      <div className="dash-lower-grid">
        {/* ── Recent Activity ── */}
        <div className="dash-panel dash-activity">
          <div className="dash-panel-header">
            <h2 className="dash-panel-title">Recent Activity</h2>
          </div>
          <div className="dash-list">
            {history.length === 0 ? (
              <div className="dash-empty">
                <p>No recent requests found. Start testing to see activity!</p>
              </div>
            ) : (
              history.slice(0, 6).map((entry, i) => (
                <button key={entry.id || i} onClick={() => handleRecentClick(entry)} className="dash-list-item group">
                  <div className={`dash-method-tag dash-method-tag--${entry.request.protocol === 'ws' ? 'ws' : entry.request.method}`}>
                    {entry.request.protocol === 'ws' ? 'WS' : entry.request.method}
                  </div>
                  <div className="dash-item-info">
                    <span className="dash-item-name">{entry.request.name}</span>
                    <span className="dash-item-url truncate">{entry.request.url}</span>
                  </div>
                  <div className="dash-item-time">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Quick Links ── */}
        <div className="dash-panel dash-quick-links">
           <div className="dash-panel-header">
              <h2 className="dash-panel-title">Getting Started</h2>
           </div>
           <div className="dash-links-grid">
              <QuickLink 
                title="New Collection" 
                desc="Group your related APIs"
                onClick={() => document.querySelector('[title="New collection"]')?.click()}
              />
              <QuickLink 
                title="Import Project" 
                desc="Import from Postman/Insomnia"
                onClick={() => document.querySelector('[title="Import"]')?.click()}
              />
              <QuickLink 
                title="Environments" 
                desc="Manage your variables"
                onClick={() => document.querySelector('[title="Environments"]')?.click()}
              />
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subValue, icon, color }) {
  return (
    <div className="dash-stat-card">
      <div className="dash-stat-icon" style={{ color }}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {icon}
        </svg>
      </div>
      <div className="dash-stat-content">
        <div className="dash-stat-value">
          {value}
          {subValue && <span className="dash-stat-sub">{subValue}</span>}
        </div>
        <div className="dash-stat-label">{label}</div>
      </div>
    </div>
  );
}

function QuickLink({ title, desc, onClick }) {
  return (
    <button onClick={onClick} className="dash-quick-link group">
      <div className="dash-ql-title">{title}</div>
      <div className="dash-ql-desc">{desc}</div>
      <div className="dash-ql-arrow">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
