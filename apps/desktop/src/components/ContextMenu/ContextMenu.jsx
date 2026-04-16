import { useEffect, useRef } from 'react';
import { useUIStore } from '@/store/uiStore';

export default function ContextMenu() {
  const { contextMenu, closeContextMenu } = useUIStore();
  const menuRef = useRef(null);

  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeContextMenu();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;

  const { x, y, items } = contextMenu;

  // Adjust position to keep menu within viewport
  const adjustPosition = () => {
    const menuWidth = 180;
    const menuHeight = items.length * 36 + 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + menuWidth > viewportWidth) {
      adjustedX = x - menuWidth;
    }
    if (y + menuHeight > viewportHeight) {
      adjustedY = y - menuHeight;
    }

    return { left: adjustedX, top: adjustedY };
  };

  const position = adjustPosition();

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        zIndex: 1000,
        background: 'var(--surface-2)',
        border: '1px solid var(--border-1)',
        borderRadius: '8px',
        padding: '4px',
        minWidth: '160px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {items.map((item, index) => (
        <div key={item.id || index}>
          {item.divider && <div className="context-menu-divider" />}
          <button
            onClick={() => {
              item.onClick();
              closeContextMenu();
            }}
            className={`context-menu-item ${item.danger ? 'context-menu-item--danger' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              color: item.danger ? 'var(--danger)' : 'var(--text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
              borderRadius: '4px',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = item.danger 
                ? 'rgba(248, 81, 73, 0.1)' 
                : 'var(--surface-3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {item.icon && (
              <span style={{ display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
