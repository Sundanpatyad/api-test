import { useState, useEffect, useRef } from 'react';
import { isTauri } from '@/lib/executor';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { useUIStore } from '@/store/uiStore';
import { useCollectionStore } from '@/store/collectionStore';
import { useTeamStore } from '@/store/teamStore';
import SplashScreen from '@/components/SplashScreen/SplashScreen';
import AuthPage from '@/components/Auth/AuthPage';
import Sidebar from '@/components/Sidebar/Sidebar';
import RequestBuilder from '@/components/RequestBuilder/RequestBuilder';
import ResponseViewer from '@/components/ResponseViewer/ResponseViewer';
import EnvironmentPanel from '@/components/EnvironmentPanel/EnvironmentPanel';
import ImportModal from '@/components/ImportModal/ImportModal';
import CreateTeamModal, {
  CreateProjectModal,
  CreateCollectionModal,
  InviteModal,
} from '@/components/Modals/Modals';
import EnvironmentSelector from '@/components/EnvironmentSelector/EnvironmentSelector';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  const { user, fetchMe } = useAuthStore();
  const { connect, isConnected, joinTeam, onRequestUpdated, onCollectionUpdated, onCollectionImported } = useSocketStore();
  const { currentTeam } = useTeamStore();
  const { updateRequest, updateCollection } = useCollectionStore();
  const {
    sidebarWidth,
    setSidebarWidth,
    responseHeight,
    setResponseHeight,
    showImportModal,
    showTeamModal,
    showProjectModal,
    showCollectionModal,
    showEnvironmentPanel,
    showInviteModal,
    theme,
  } = useUIStore();

  // Fetch user on mount
  useEffect(() => { fetchMe(); }, []);

  // Apply theme class to <html> so CSS variables switch correctly
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  // Connect socket when user logs in
  useEffect(() => {
    if (user) {
      connect();
    }
  }, [user]);

  // Join socket room whenever the current team changes
  useEffect(() => {
    if (user && currentTeam && isConnected) {
      joinTeam(currentTeam._id, user);
    }
  }, [currentTeam, isConnected]);

  // Real-time listeners
  useEffect(() => {
    if (!isConnected) return;

    const offRequest = onRequestUpdated(({ request }) => {
      updateRequest(request);
    });
    const offCollection = onCollectionUpdated(({ collection }) => {
      updateCollection(collection);
    });
    const offImport = onCollectionImported(({ collection }) => {
      updateCollection(collection);
    });

    return () => {
      offRequest?.();
      offCollection?.();
      offImport?.();
    };
  }, [isConnected]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (!user) {
    return (
      <>
        <AuthPage />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: theme === 'light' ? '#FFFFFF' : '#1C2128',
              color: theme === 'light' ? '#1F2328' : '#E6EDF3',
              border: `1px solid ${theme === 'light' ? '#D0D7DE' : '#30363D'}`,
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'Poppins, sans-serif',
            },
          }}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div style={{ width: sidebarWidth }} className="flex-shrink-0 h-full overflow-hidden flex flex-col">
        <Sidebar />
      </div>

      {/* Sidebar resize handle */}
      <div
        className="w-1 cursor-col-resize bg-surface-700/30 hover:bg-brand-500/50 transition-colors flex-shrink-0 relative group"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startW = sidebarWidth;
          const onMove = (e) => setSidebarWidth(startW + (e.clientX - startX));
          const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between h-10 px-3 border-b border-[var(--border-1)] bg-surface-900 flex-shrink-0">
          <div className="flex items-center gap-2">
            {currentTeam && (
              <span className="text-surface-500 text-xs">
                {currentTeam.name}
              </span>
            )}
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success' : 'bg-surface-600'} animate-pulse-slow`} title={isConnected ? 'Real-time connected' : 'Offline'} />
          </div>

          {/* Right side: env selector + browser mode banner */}
          <div className="flex items-center gap-2">
            <EnvironmentSelector />
            {!isTauri() && (
              <div className="flex items-center gap-1.5 bg-warning/10 border border-warning/20 text-warning text-[10px] px-2.5 py-1 rounded-lg">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Browser mode
              </div>
            )}
          </div>
        </div>

        {/* Request builder */}
        <div className="flex-1 overflow-hidden">
          <RequestBuilder />
        </div>

        {/* Response height resize handle */}
        <div
          className="h-1 cursor-row-resize bg-surface-700/30 hover:bg-brand-500/50 transition-colors flex-shrink-0"
          onMouseDown={(e) => {
            e.preventDefault();
            const startY = e.clientY;
            const startH = responseHeight;
            const onMove = (e) => setResponseHeight(startH + (startY - e.clientY));
            const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        />

        {/* Response viewer */}
        <div style={{ height: responseHeight }} className="flex-shrink-0 border-t border-[var(--border-1)] overflow-hidden bg-surface-850">
          <ResponseViewer />
        </div>
      </div>

      {/* Modals */}
      {showEnvironmentPanel  && <EnvironmentPanel />}
      {showImportModal       && <ImportModal />}
      {showTeamModal         && <CreateTeamModal />}
      {showProjectModal      && <CreateProjectModal />}
      {showCollectionModal   && <CreateCollectionModal />}
      {showInviteModal       && <InviteModal />}

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: theme === 'light' ? '#FFFFFF' : '#1C2128',
            color: theme === 'light' ? '#1F2328' : '#E6EDF3',
            border: `1px solid ${theme === 'light' ? '#D0D7DE' : '#30363D'}`,
            borderRadius: '12px',
            fontSize: '13px',
            fontFamily: 'Poppins, sans-serif',
          },
        }}
      />
    </div>
  );
}
