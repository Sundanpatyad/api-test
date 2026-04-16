import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { useTeamStore } from '@/store/teamStore';
import { isTauri } from '@/lib/executor';
import EnvironmentSelector from '@/components/EnvironmentSelector/EnvironmentSelector';

export default function TopBarV2({ onToggleSidebar, sidebarOpen, orientation, onToggleOrientation }) {
  const { theme, toggleTheme, toggleLayout } = useUIStore();
  const { user } = useAuthStore();
  const { isConnected } = useSocketStore();
  const { currentTeam } = useTeamStore();

  return (
    <header className="v2-header">
      {/* Left — sidebar toggle */}
      <div className="v2-header-left">
        <button
          onClick={onToggleSidebar}
          className="v2-header-icon-btn"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Center — Search */}
      <div className="v2-header-search">
        <div className="v2-search-box">
          <svg className="v2-search-icon" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="v2-search-input"
            placeholder="Search APIs, endpoints, logs..."
            readOnly
          />
          <kbd className="v2-search-kbd">⌘K</kbd>
        </div>
      </div>

      {/* Right — controls */}
      <div className="v2-header-right">
        {/* Environment selector */}
        <EnvironmentSelector />

        {/* Connection dot */}
        {currentTeam && (
          <div
            className="v2-conn-dot"
            style={{ background: isConnected ? 'var(--success)' : 'var(--text-muted)' }}
            title={isConnected ? 'Real-time connected' : 'Offline'}
          />
        )}

        {/* Browser mode */}
        {!isTauri() && (
          <div className="v2-browser-badge">
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Browser
          </div>
        )}

        {/* Orientation toggle */}
        <button
          onClick={onToggleOrientation}
          className="v2-header-icon-btn v2-orientation-btn"
          title={orientation === 'vertical' ? 'Switch to Horizontal split' : 'Switch to Vertical split'}
        >
          {orientation === 'vertical' ? (
            /* Vertical icon (side by side) */
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M12 3v18" />
            </svg>
          ) : (
            /* Horizontal icon (stacked) */
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 9h18M3 15h18M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
            </svg>
          )}
          <span className="v2-orientation-label">
            {orientation === 'vertical' ? 'Side by Side' : 'Stacked'}
          </span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="v2-header-icon-btn"
          title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
        >
          {theme === 'dark' ? (
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 3v1m0 16v1m8.66-10h-1M4.34 12H3m15.07-6.07l-.71.71M6.64 17.36l-.71.71M17.36 17.36l.71.71M6.64 6.64l.71-.71M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>

        {/* User avatar */}
        <div className="v2-header-avatar" title={user?.name}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
      </div>
    </header>
  );
}
