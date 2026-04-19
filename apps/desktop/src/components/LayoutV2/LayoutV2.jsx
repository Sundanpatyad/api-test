import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useTeamStore } from '@/store/teamStore';
import { useProjectStore } from '@/store/projectStore';
import { useCollectionStore } from '@/store/collectionStore';
import { useRequestStore } from '@/store/requestStore';
import TopBarV2 from './TopBarV2';
import SidebarV2 from './SidebarV2';
import EmptyState from './EmptyState';
import RequestBuilder from '@/components/RequestBuilder/RequestBuilder';
import WSRequestBuilder from '@/components/RequestBuilder/WSRequestBuilder';
import SIORequestBuilder from '@/components/RequestBuilder/SIORequestBuilder';
import Dashboard from '@/components/Dashboard/Dashboard';
import ResponseViewer from '@/components/ResponseViewer/ResponseViewer';
import ApiDocsPanel from '@/components/ApiDocs/ApiDocsPanel';
import InlineDocViewer from '@/components/ResponseViewer/InlineDocViewer';

export default function LayoutV2({
  onShowTeamModal,
  onShowProjectModal,
  onShowCollectionModal,
  onShowImportModal,
  onOpenEnvPanel,
}) {
  const {
    responseHeight,
    setResponseHeight,
    sidebarWidth,
    setSidebarWidth,
    sidebarV2Open,
    toggleSidebarV2,
    workspaceOrientation,
    toggleOrientation,
    activeV2Nav,
    theme,
  } = useUIStore();

  const [rightPanelTab, setRightPanelTab] = useState('Response');

  const { teams, currentTeam } = useTeamStore();
  const { projects, currentProject } = useProjectStore();
  const { currentCollection } = useCollectionStore();
  const { currentRequest } = useRequestStore();

  // Check if user needs onboarding (no teams or projects)
  const needsOnboarding = teams.length === 0 || projects.length === 0 || !currentProject;

  // Split percentage for vertical mode — default 50/50
  const [splitPercent, setSplitPercent] = useState(50);

  return (
    <div className="v2-app">
      {/* ── Top bar ── */}
      <TopBarV2
        sidebarOpen={sidebarV2Open}
        onToggleSidebar={toggleSidebarV2}
        orientation={workspaceOrientation}
        onToggleOrientation={toggleOrientation}
      />

      {/* ── Body row ── */}
      <div className="v2-body">

        {/* Left sidebar (collapsible) */}
        {sidebarV2Open && (
          <>
            <SidebarV2
              key="sidebar-v2"
              onShowTeamModal={onShowTeamModal}
              onShowProjectModal={onShowProjectModal}
              onShowCollectionModal={onShowCollectionModal}
              onShowImportModal={onShowImportModal}
              onOpenEnvPanel={onOpenEnvPanel}
              width={sidebarWidth}
            />
            {/* Sidebar Drag Handle */}
            <div
              className="v2-drag-col"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startW = sidebarWidth;
                const onMove = (e) => setSidebarWidth(startW + (e.clientX - startX));
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            />
          </>
        )}

        {/* Main workspace */}
        <div className="v2-workspace">

          {activeV2Nav === 'dashboard' ? (
             <Dashboard />
          ) : activeV2Nav === 'docs' ? (
             <ApiDocsPanel />
          ) : needsOnboarding ? (
             <EmptyState
               onShowTeamModal={onShowTeamModal}
               onShowProjectModal={onShowProjectModal}
             />
          ) : (
             <>
                {/* Breadcrumb bar */}
                <div className="v2-breadcrumb">
                  <div className="v2-breadcrumb-left">
                    <svg className="v2-breadcrumb-bolt" width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="v2-breadcrumb-seg v2-breadcrumb-static">
                      {activeV2Nav === 'dashboard' ? 'Dashboard' : 'API Endpoints'}
                    </span>
                    {activeV2Nav !== 'dashboard' && currentCollection && (
                      <>
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="v2-breadcrumb-seg">{currentCollection.name}</span>
                      </>
                    )}
                    {currentRequest?.name && (
                      <>
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="v2-breadcrumb-seg v2-breadcrumb-active">{currentRequest.name}</span>
                      </>
                    )}
                  </div>
                </div>

                 {/* ── VERTICAL SPLIT (side-by-side) ── */}
                 {workspaceOrientation === 'vertical' ? (
                   <div className="v2-split-row">
                     {currentRequest?.protocol === 'ws' ? (
                       <div className="v2-card" style={{ flex: 1, minWidth: 0 }}>
                         <WSRequestBuilder />
                       </div>
                     ) : currentRequest?.protocol === 'socketio' ? (
                       <div className="v2-card" style={{ flex: 1, minWidth: 0 }}>
                         <SIORequestBuilder />
                       </div>
                     ) : (
                       <>
                         {/* Request card */}
                         <div className="v2-card" style={{ width: `${splitPercent}%`, flexShrink: 0 }}>
                           <div className="v2-card-title">
                             <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)' }}>
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                             </svg>
                             Request URL
                           </div>
                           <div className="v2-card-body">
                             <RequestBuilder />
                           </div>
                         </div>

                         {/* Drag handle */}
                         <div
                           className="v2-drag-col"
                           onMouseDown={(e) => {
                             e.preventDefault();
                             const container = e.currentTarget.parentElement;
                             const containerW = container.getBoundingClientRect().width;
                             const startX = e.clientX;
                             const startPct = splitPercent;
                             const onMove = (e) => {
                               const deltaPct = ((e.clientX - startX) / containerW) * 100;
                               setSplitPercent(Math.max(20, Math.min(80, startPct + deltaPct)));
                             };
                             const onUp = () => {
                               window.removeEventListener('mousemove', onMove);
                               window.removeEventListener('mouseup', onUp);
                             };
                             window.addEventListener('mousemove', onMove);
                             window.addEventListener('mouseup', onUp);
                           }}
                         />

                         {/* Response / Docs card */}
                         <div className="v2-card" style={{ flex: 1, minWidth: 0 }}>
                           <div className="v2-card-title flex items-center justify-between w-full" style={{ padding: 0, height: 35 }}>
                             <div className="flex h-full">
                               <button 
                                 onClick={() => setRightPanelTab('Response')}
                                 className={`flex items-center gap-2 px-4 h-full border-b-[2px] transition-colors ${rightPanelTab === 'Response' ? 'border-accent text-tx-primary bg-surface-2' : 'border-transparent text-surface-500 hover:text-tx-secondary'}`}
                               >
                                 <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                 </svg>
                                 Response
                               </button>
                               <button 
                                 onClick={() => setRightPanelTab('Documentation')}
                                 className={`flex items-center gap-2 px-4 h-full border-b-[2px] transition-colors ${rightPanelTab === 'Documentation' ? 'border-accent text-tx-primary bg-surface-2' : 'border-transparent text-surface-500 hover:text-tx-secondary'}`}
                               >
                                 <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                 </svg>
                                 Docs
                               </button>
                             </div>
                           </div>
                           <div className="v2-card-body">
                             {rightPanelTab === 'Response' ? <ResponseViewer /> : <InlineDocViewer />}
                           </div>
                         </div>
                       </>
                     )}
                   </div>
                 ) : (
                   /* ── HORIZONTAL SPLIT (stacked) ── */
                   <div className="v2-split-col">
                     {currentRequest?.protocol === 'ws' ? (
                        <div className="v2-card" style={{ flex: 1, minHeight: 0 }}>
                           <WSRequestBuilder />
                        </div>
                     ) : currentRequest?.protocol === 'socketio' ? (
                        <div className="v2-card" style={{ flex: 1, minHeight: 0 }}>
                           <SIORequestBuilder />
                        </div>
                     ) : (
                       <>
                         {/* Request card */}
                         <div className="v2-card v2-card-h-request">
                           <div className="v2-card-title">
                             <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)' }}>
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                             </svg>
                             Request URL
                           </div>
                           <div className="v2-card-body">
                             <RequestBuilder />
                           </div>
                         </div>

                         {/* Drag handle */}
                         <div
                           className="v2-drag-row"
                           onMouseDown={(e) => {
                             e.preventDefault();
                             const startY = e.clientY;
                             const startH = responseHeight;
                             const onMove = (e) =>
                               setResponseHeight(Math.max(150, Math.min(600, startH + (startY - e.clientY))));
                             const onUp = () => {
                               window.removeEventListener('mousemove', onMove);
                               window.removeEventListener('mouseup', onUp);
                             };
                             window.addEventListener('mousemove', onMove);
                             window.addEventListener('mouseup', onUp);
                           }}
                         />

                         {/* Response / Docs card */}
                         <div className="v2-card" style={{ height: responseHeight, flexShrink: 0 }}>
                           <div className="v2-card-title flex items-center justify-between w-full" style={{ padding: 0, height: 35 }}>
                             <div className="flex h-full">
                               <button 
                                 onClick={() => setRightPanelTab('Response')}
                                 className={`flex items-center gap-2 px-4 h-full border-b-[2px] transition-colors ${rightPanelTab === 'Response' ? 'border-accent text-tx-primary bg-surface-2' : 'border-transparent text-surface-500 hover:text-tx-secondary'}`}
                               >
                                 <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                 </svg>
                                 Response
                               </button>
                               <button 
                                 onClick={() => setRightPanelTab('Documentation')}
                                 className={`flex items-center gap-2 px-4 h-full border-b-[2px] transition-colors ${rightPanelTab === 'Documentation' ? 'border-accent text-tx-primary bg-surface-2' : 'border-transparent text-surface-500 hover:text-tx-secondary'}`}
                               >
                                 <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                 </svg>
                                 Docs
                               </button>
                             </div>
                           </div>
                           <div className="v2-card-body">
                             {rightPanelTab === 'Response' ? <ResponseViewer /> : <InlineDocViewer />}
                           </div>
                         </div>
                       </>
                     )}
                   </div>
                 )}
             </>
          )}
        </div>
      </div>
    </div>
  );
}
