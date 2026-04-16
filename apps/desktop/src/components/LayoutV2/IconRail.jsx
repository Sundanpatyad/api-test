import { useUIStore } from '@/store/uiStore';

const NAV_ITEMS = [
  {
    id: 'collections',
    label: 'Collections',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: 'environments',
    label: 'Environments',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'ai',
    label: 'AI Insights',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'docs',
    label: 'Documentation',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function IconRail({ activePanel, setActivePanel }) {
  const { theme, toggleTheme, toggleLayout } = useUIStore();

  return (
    <div className="icon-rail" style={{ background: 'var(--rail-bg)', borderRight: '1px solid var(--border-1)' }}>
      {/* Logo */}
      <div className="rail-logo">
        <div className="rail-logo-inner">
          <svg width="16" height="16" viewBox="0 0 36 36" fill="none">
            <path d="M6 18C6 11.373 11.373 6 18 6" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M30 18C30 24.627 24.627 30 18 30" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="18" cy="18" r="4" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Nav items */}
      <nav className="rail-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = activePanel === item.id;
          return (
            <RailButton
              key={item.id}
              label={item.label}
              icon={item.icon}
              isActive={isActive}
              onClick={() => setActivePanel(isActive ? null : item.id)}
            />
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="rail-footer">
        {/* Theme toggle */}
        <RailButton
          label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          icon={
            theme === 'dark' ? (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M12 3v1m0 16v1m8.66-10h-1M4.34 12H3m15.07-6.07l-.71.71M6.64 17.36l-.71.71M17.36 17.36l.71.71M6.64 6.64l.71-.71M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )
          }
          isActive={false}
          onClick={toggleTheme}
        />

        {/* Layout switcher — switch to V1 */}
        <RailButton
          label="Switch to Classic Layout"
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          }
          isActive={false}
          onClick={toggleLayout}
        />
      </div>
    </div>
  );
}

function RailButton({ label, icon, isActive, onClick }) {
  return (
    <div className="rail-btn-wrapper">
      <button
        onClick={onClick}
        className={`rail-btn ${isActive ? 'rail-btn--active' : ''}`}
        title={label}
      >
        {isActive && <span className="rail-active-bar" />}
        {icon}
      </button>
      <span className="rail-tooltip">{label}</span>
    </div>
  );
}
