import { useRef, useCallback, useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useUIStore } from '@/store/uiStore';
import { useJsonTree } from './hooks/useJsonTree';
import JsonTreeRow from './JsonTreeRow';
import JsonToolbar from './JsonToolbar';

/**
 * Virtualized JSON Tree Viewer
 * Postman-style tree view with:
 * - Expand/collapse objects and arrays
 * - Copy any value
 * - Search/filter
 * - Handle large JSON (100k+ lines)
 * - Cross-platform (Windows, Linux, macOS)
 */
export default function JsonTreeViewer({ 
  value, 
  className = '',
  defaultExpanded = false,
  rowHeight = 22
}) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(400);

  // Use the JSON tree hook
  const {
    rows,
    searchQuery,
    setSearchQuery,
    togglePath,
    expandAll,
    collapseAll,
    expandToDepth,
    isValid,
    totalRows
  } = useJsonTree(value, { defaultExpanded });

  // Filter visible rows based on search
  const visibleRows = searchQuery 
    ? rows.filter(row => row.matchesSearch)
    : rows;

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Scroll to top when search changes
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo(0);
    }
  }, [searchQuery]);

  // Row renderer for react-window
  const Row = useCallback(({ index, style }) => {
    const row = visibleRows[index];
    if (!row) return null;

    return (
      <JsonTreeRow
        row={row}
        style={style}
        onToggle={togglePath}
        isDark={isDark}
      />
    );
  }, [visibleRows, togglePath, isDark]);

  if (!isValid) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 flex items-center justify-center text-surface-400 text-sm">
          Invalid JSON
        </div>
      </div>
    );
  }

  if (!value) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 flex items-center justify-center text-surface-400 text-sm">
          No response body
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <JsonToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onExpandToDepth={expandToDepth}
        jsonString={value}
        totalRows={totalRows}
        visibleCount={visibleRows.length}
      />

      {/* Virtualized Tree */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <List
          ref={listRef}
          height={containerHeight}
          itemCount={visibleRows.length}
          itemSize={rowHeight}
          width="100%"
          overscanCount={5}
        >
          {Row}
        </List>
      </div>
    </div>
  );
}
