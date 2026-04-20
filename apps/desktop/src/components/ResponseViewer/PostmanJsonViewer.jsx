import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { ChevronRight, ChevronDown, Copy, Check, FileText } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const VIRTUAL_THRESHOLD = 500;       // lines before switching to virtual list
const OVERSCAN = 8;                  // extra rows above/below viewport
const ROW_HEIGHT = 22;               // px per line (must be fixed for virtual list)
const HUGE_JSON_BYTES  = 5_000_000;  // 5 MB → force raw view for performance

// ─── Utility: escape a string value for JSON display ─────────────────────────
function escapeStr(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// ─── Core formatter ───────────────────────────────────────────────────────────
function buildLines(value, path, depth, collapsedPaths, addTrailingComma) {
  if (value === null) {
    const text = 'null' + (addTrailingComma ? ',' : '');
    return [{
      depth, path, isCollapsible: false, isCollapsed: false,
      rawContent: text,
      parts: [
        { type: 'null', text: 'null' },
        ...(addTrailingComma ? [{ type: 'punctuation', text: ',' }] : [])
      ]
    }];
  }

  if (typeof value === 'boolean') {
    const text = String(value) + (addTrailingComma ? ',' : '');
    return [{
      depth, path, isCollapsible: false, isCollapsed: false,
      rawContent: text,
      parts: [
        { type: 'boolean', text: String(value) },
        ...(addTrailingComma ? [{ type: 'punctuation', text: ',' }] : [])
      ]
    }];
  }

  if (typeof value === 'number') {
    const text = String(value) + (addTrailingComma ? ',' : '');
    return [{
      depth, path, isCollapsible: false, isCollapsed: false,
      rawContent: text,
      parts: [
        { type: 'number', text: String(value) },
        ...(addTrailingComma ? [{ type: 'punctuation', text: ',' }] : [])
      ]
    }];
  }

  if (typeof value === 'string') {
    const inner = escapeStr(value);
    const display = `"${inner}"` + (addTrailingComma ? ',' : '');
    return [{
      depth, path, isCollapsible: false, isCollapsed: false,
      rawContent: display,
      parts: [
        { type: 'string', text: `"${inner}"` },
        ...(addTrailingComma ? [{ type: 'punctuation', text: ',' }] : [])
      ]
    }];
  }

  if (Array.isArray(value)) {
    const isCollapsed = collapsedPaths.has(path);
    if (value.length === 0) {
      const text = '[]' + (addTrailingComma ? ',' : '');
      return [{
        depth, path, isCollapsible: false, isCollapsed: false,
        rawContent: text,
        parts: [
          { type: 'bracket', text: '[]' },
          ...(addTrailingComma ? [{ type: 'punctuation', text: ',' }] : [])
        ]
      }];
    }

    if (isCollapsed) {
      const summary = `[…${value.length} item${value.length !== 1 ? 's' : ''}]` + (addTrailingComma ? ',' : '');
      return [{
        depth, path, isCollapsible: true, isCollapsed: true,
        rawContent: summary,
        parts: [
          { type: 'bracket', text: '[' },
          { type: 'dim', text: `…${value.length} item${value.length !== 1 ? 's' : ''}` },
          { type: 'bracket', text: ']' },
          ...(addTrailingComma ? [{ type: 'punctuation', text: ',' }] : [])
        ]
      }];
    }

    const lines = [];
    lines.push({
      depth, path, isCollapsible: true, isCollapsed: false,
      rawContent: '[',
      parts: [{ type: 'bracket', text: '[' }]
    });

    value.forEach((item, i) => {
      const itemPath = `${path}[${i}]`;
      const isLast   = i === value.length - 1;
      lines.push(...buildLines(item, itemPath, depth + 1, collapsedPaths, !isLast));
    });

    const closing = ']' + (addTrailingComma ? ',' : '');
    lines.push({
      depth, path, isCollapsible: true, isCollapsed: false,
      rawContent: closing,
      parts: [
        { type: 'bracket', text: ']' },
        ...(addTrailingComma ? [{ type: 'punctuation', text: ',' }] : [])
      ]
    });
    return lines;
  }

  if (typeof value === 'object') {
    const isCollapsed = collapsedPaths.has(path);
    const keys = Object.keys(value);

    if (keys.length === 0) {
      const text = '{}' + (addTrailingComma ? ',' : '');
      return [{
        depth, path, isCollapsible: false, isCollapsed: false,
        rawContent: text,
        parts: [
          { type: 'bracket', text: '{}' },
          ...(addTrailingComma ? [{ type: 'punctuation', text: ',' }] : [])
        ]
      }];
    }

    if (isCollapsed) {
      const preview = keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', …' : '');
      const summary = `{${preview}}` + (addTrailingComma ? ',' : '');
      return [{
        depth, path, isCollapsible: true, isCollapsed: true,
        rawContent: summary,
        parts: [
          { type: 'bracket', text: '{' },
          { type: 'dim', text: preview },
          { type: 'bracket', text: '}' },
          ...(addTrailingComma ? [{ type: 'punctuation', text: ',' }] : [])
        ]
      }];
    }

    const lines = [];
    lines.push({
      depth, path, isCollapsible: true, isCollapsed: false,
      rawContent: '{',
      parts: [{ type: 'bracket', text: '{' }]
    });

    keys.forEach((key, i) => {
      const isLast    = i === keys.length - 1;
      const keyPath   = `${path}.${key}`;
      const keyLabel  = `"${escapeStr(key)}"`;
      const childVal  = value[key];

      const childLines = buildLines(childVal, keyPath, depth + 1, collapsedPaths, !isLast);
      const first = childLines[0];
      lines.push({
        ...first,
        depth: depth + 1,
        path: keyPath,
        rawContent: `${keyLabel}: ${first.rawContent}`,
        parts: [
          { type: 'key',         text: keyLabel },
          { type: 'punctuation', text: ': ' },
          ...first.parts
        ]
      });

      for (let j = 1; j < childLines.length; j++) {
        lines.push(childLines[j]);
      }
    });

    const closing = '}' + (addTrailingComma ? ',' : '');
    lines.push({
      depth, path, isCollapsible: true, isCollapsed: false,
      rawContent: closing,
      parts: [
        { type: 'bracket', text: '}' },
        ...(addTrailingComma ? [{ type: 'punctuation', text: ',' }] : [])
      ]
    });
    return lines;
  }
  return [];
}

function collectAllPaths(value, path, out = new Set()) {
  if (value === null || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    if (value.length > 0) {
      out.add(path);
      value.forEach((item, i) => collectAllPaths(item, `${path}[${i}]`, out));
    }
  } else {
    const keys = Object.keys(value);
    if (keys.length > 0) {
      out.add(path);
      keys.forEach(k => collectAllPaths(value[k], `${path}.${k}`, out));
    }
  }
  return out;
}

// ─── Componentry ──────────────────────────────────────────────────────────────
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    return false;
  }
}

function JsonRow({ index, line, isDark, isCopied, onToggle, onCopy }) {
  const [hovered, setHovered] = useState(false);
  const C = {
    lineNum:    isDark ? '#6e7681' : '#8c8c8c',
    lineNumBg:  isDark ? '#1e1e1e' : '#f5f5f5',
    border:     isDark ? '#333'    : '#e0e0e0',
    hover:      isDark ? '#2a2d2e' : '#f0f0f0',
    key:        isDark ? '#9cdcfe' : '#0451a5',
    string:     isDark ? '#ce9178' : '#a31515',
    number:     isDark ? '#b5cea8' : '#098658',
    boolean:    isDark ? '#569cd6' : '#0000ff',
    null:       isDark ? '#569cd6' : '#0000ff',
    punctuation:isDark ? '#d4d4d4' : '#333333',
    bracket:    isDark ? '#ffd700' : '#795e26',
    dim:        isDark ? '#6e7681' : '#888888',
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: ROW_HEIGHT,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 12,
        backgroundColor: hovered ? C.hover : 'transparent',
      }}
    >
      <div
        onClick={onToggle}
        style={{
          width: 52, paddingRight: 8, textAlign: 'right', color: C.lineNum,
          backgroundColor: C.lineNumBg, borderRight: `1px solid ${C.border}`,
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          cursor: line.isCollapsible ? 'pointer' : 'default',
        }}
      >
        {line.isCollapsible && (
          line.isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />
        )}
        <span style={{ marginLeft: 4 }}>{index + 1}</span>
      </div>
      <div style={{ paddingLeft: 8 + line.depth * 16, flex: 1, whiteSpace: 'pre', overflow: 'hidden' }}>
        {line.parts.map((p, i) => (
          <span key={i} style={{ color: C[p.type] ?? C.punctuation }}>{p.text}</span>
        ))}
      </div>
      <div style={{ width: 32, opacity: hovered ? 1 : 0 }}>
        <button onClick={onCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.lineNum }}>
          {isCopied ? <Check size={12} color="#4caf50" /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}

function VirtualList({ lines, isDark, collapsedPaths, copiedLine, onToggle, onCopy }) {
  const outerRef = useRef(null);
  const [scroll, setScroll] = useState(0);
  const [height, setHeight] = useState(500);

  useEffect(() => {
    if (!outerRef.current) return;
    const ro = new ResizeObserver(entries => setHeight(entries[0].contentRect.height));
    ro.observe(outerRef.current);
    return () => ro.disconnect();
  }, []);

  const start = Math.max(0, Math.floor(scroll / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(lines.length - 1, Math.ceil((scroll + height) / ROW_HEIGHT) + OVERSCAN);

  return (
    <div ref={outerRef} onScroll={e => setScroll(e.target.scrollTop)} style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: lines.length * ROW_HEIGHT, position: 'relative' }}>
        {lines.slice(start, end + 1).map((line, i) => {
          const idx = start + i;
          return (
            <div key={idx} style={{ position: 'absolute', top: idx * ROW_HEIGHT, left: 0, right: 0, height: ROW_HEIGHT }}>
              <JsonRow
                index={idx} line={line} isDark={isDark} isCopied={copiedLine === idx}
                onToggle={() => onToggle(line.path)} onCopy={() => onCopy(line.rawContent, idx)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PostmanJsonViewer({ value, className = '' }) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  const [collapsedPaths, setCollapsedPaths] = useState(new Set());
  const [copiedLine, setCopiedLine] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  // Reset state on value change
  useEffect(() => {
    setCollapsedPaths(new Set());
    setShowRaw(value?.length > HUGE_JSON_BYTES);
  }, [value]);

  const { parsed, error } = useMemo(() => {
    if (!value) return { parsed: null, error: null };
    try {
      return { parsed: JSON.parse(value), error: null };
    } catch (e) {
      return { parsed: null, error: e.message };
    }
  }, [value]);

  const lines = useMemo(() => {
    if (!parsed) return [];
    return buildLines(parsed, 'root', 0, collapsedPaths, false);
  }, [parsed, collapsedPaths]);

  const handleCopy = useCallback(async (text, idx) => {
    if (await copyToClipboard(text)) {
      setCopiedLine(idx);
      setTimeout(() => setCopiedLine(null), 1500);
    }
  }, []);

  if (error || showRaw) {
    return (
      <div className={`flex flex-col h-full bg-[var(--surface-1)] ${className}`}>
        <div className="flex items-center justify-between p-2 border-b border-[var(--border-1)] bg-[var(--surface-2)]">
          <span className="text-xs text-surface-400">{error ? 'Parse Error' : 'Raw View'}</span>
          <div className="flex gap-2">
            {!error && <button onClick={() => setShowRaw(false)} className="text-xs px-2 py-1 bg-[var(--surface-3)] rounded">Tree View</button>}
            <button onClick={() => handleCopy(value, -1)} className="text-xs px-2 py-1 bg-[var(--surface-3)] rounded flex items-center gap-1">
              {copiedLine === -1 ? <Check size={12} /> : <Copy size={12} />} Copy
            </button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto font-mono text-xs whitespace-pre-wrap select-text">
          {error ? <div className="text-red-500">{error}</div> : value}
        </div>
      </div>
    );
  }

  if (!value) return <div className="h-full flex items-center justify-center text-surface-400">No response body</div>;

  return (
    <div className={`flex flex-col h-full overflow-hidden bg-[var(--surface-1)] ${className}`}>
      <div className="flex items-center justify-between p-2 border-b border-[var(--border-1)] bg-[var(--surface-2)]">
        <div className="flex gap-4 items-center">
          <span className="text-xs text-surface-400">{lines.length.toLocaleString()} lines</span>
          <button onClick={() => setCollapsedPaths(new Set())} className="text-[10px] hover:underline">Expand All</button>
          <button onClick={() => setCollapsedPaths(collectAllPaths(parsed, 'root'))} className="text-[10px] hover:underline">Collapse All</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRaw(true)} className="text-xs px-2 py-1 bg-[var(--surface-3)] rounded flex items-center gap-1"><FileText size={12} /> Raw</button>
          <button onClick={() => handleCopy(value, -1)} className="text-xs px-2 py-1 bg-[var(--surface-3)] rounded flex items-center gap-1">
            {copiedLine === -1 ? <Check size={12} /> : <Copy size={12} />} Copy
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden select-text">
        {lines.length > VIRTUAL_THRESHOLD ? (
          <VirtualList lines={lines} isDark={isDark} collapsedPaths={collapsedPaths} copiedLine={copiedLine} onToggle={p => setCollapsedPaths(prev => {
            const n = new Set(prev);
            n.has(p) ? n.delete(p) : n.add(p);
            return n;
          })} onCopy={handleCopy} />
        ) : (
          <div className="h-full overflow-auto">
            {lines.map((l, i) => (
              <JsonRow key={i} index={i} line={l} isDark={isDark} isCopied={copiedLine === i} onToggle={() => setCollapsedPaths(prev => {
                const n = new Set(prev);
                n.has(l.path) ? n.delete(l.path) : n.add(l.path);
                return n;
              })} onCopy={() => handleCopy(l.rawContent, i)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
