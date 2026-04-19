import { useState, useEffect, useRef, useCallback } from 'react';
import { useWSStore } from '@/store/wsStore';
import { useRequestStore } from '@/store/requestStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  idle:         { label: 'Idle',         color: 'var(--text-muted)',   bg: 'transparent' },
  connecting:   { label: 'Connecting…',  color: '#f0883e',            bg: 'rgba(240,136,62,0.1)' },
  connected:    { label: 'Connected',    color: '#3fb950',            bg: 'rgba(63,185,80,0.1)' },
  disconnected: { label: 'Disconnected', color: 'var(--text-muted)',  bg: 'transparent' },
  error:        { label: 'Error',        color: '#f85149',            bg: 'rgba(248,81,73,0.1)' },
};

const LOG_ICON = {
  sent:     '↑',
  received: '↓',
  system:   '●',
  error:    '✕',
};

const LOG_COLOR = {
  sent:     '#38bdf8',
  received: '#3fb950',
  system:   'var(--text-muted)',
  error:    '#f85149',
};

export default function WSRequestBuilder() {
  const { currentRequest, updateField, saveRequest, noActiveRequest, newRequest } = useRequestStore();
  const { resolveVariables } = useEnvironmentStore();
  const { connect, disconnect, sendMessage, clearLogs, getStatus, getLogs, connectionStatus, logs } = useWSStore();

  const [message, setMessage] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showProtocolDropdown, setShowProtocolDropdown] = useState(false);
  const logEndRef = useRef(null);
  const textareaRef = useRef(null);

  const PROTOCOLS = [
    { id: 'http', label: 'HTTP (REST)', icon: '🌐' },
    { id: 'ws', label: 'WebSocket (Raw)', icon: '⚡' },
    { id: 'socketio', label: 'Socket.IO', icon: '⬢' },
  ];

  const requestId = currentRequest?._id || 'unsaved';
  const status = connectionStatus[requestId] || 'idle';
  const currentLogs = logs[requestId] || [];
  const statusConfig = STATUS_CONFIG[status];
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentLogs.length]);

  const handleConnect = useCallback(() => {
    const url = currentRequest.url?.trim();
    if (!url) {
      toast.error('Enter a WebSocket URL first');
      return;
    }
    const resolvedUrl = resolveVariables(url);
    // Ensure ws:// or wss:// prefix
    let wsUrl = resolvedUrl;
    if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      if (wsUrl.startsWith('https://')) {
        wsUrl = wsUrl.replace('https://', 'wss://');
      } else if (wsUrl.startsWith('http://')) {
        wsUrl = wsUrl.replace('http://', 'ws://');
      } else {
        wsUrl = 'wss://' + wsUrl;
      }
    }
    connect(requestId, wsUrl);
  }, [currentRequest.url, requestId, resolveVariables, connect]);

  const handleDisconnect = useCallback(() => {
    disconnect(requestId);
  }, [requestId, disconnect]);

  const handleSend = useCallback(() => {
    if (!message.trim()) return;
    const success = sendMessage(requestId, message);
    if (success) {
      setMessage('');
      textareaRef.current?.focus();
    }
  }, [message, requestId, sendMessage]);

  const handleKeyDown = useCallback((e) => {
    // Ctrl/Cmd + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
    // Ctrl/Cmd + S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveRequest().then((r) => {
        if (r?.success) toast.success('Saved');
        else if (r?.error) toast.error(r.error);
      });
    }
  }, [handleSend, saveRequest]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  // ── Empty State ──
  if (noActiveRequest) {
    return (
      <div className="ws-empty-state">
        <div className="ws-empty-icon">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="ws-empty-title">No request selected</h3>
        <p className="ws-empty-sub">Create a new WebSocket request to get started.</p>
        <button onClick={() => newRequest()} className="ws-empty-cta">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New WebSocket Request
        </button>
      </div>
    );
  }

  return (
    <div className="ws-builder" onKeyDown={handleKeyDown}>
      {/* ── Header: Name + Save ── */}
      <div className="ws-header">
        <div className="ws-header-left gap-3">
          {/* Protocol Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProtocolDropdown(!showProtocolDropdown)}
              className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold bg-[color:var(--surface-2)] border border-[color:var(--border-1)] rounded-md hover:border-[color:var(--accent)] transition-all text-[color:var(--text-primary)]"
            >
              {currentRequest.protocol === 'http' ? 'HTTP' : currentRequest.protocol === 'ws' ? 'RAW WS' : 'SOCKET.IO'}
              <svg className={`w-3 h-3 opacity-60 transition-transform ${showProtocolDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showProtocolDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-[color:var(--surface-1)] border border-[color:var(--border-1)] rounded-lg shadow-glass z-[100] py-1 min-w-[140px] animate-in">
                {PROTOCOLS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { updateField('protocol', p.id); setShowProtocolDropdown(false); }}
                    className={`flex items-center justify-between w-full px-3 py-1.5 text-[11px] font-medium hover:bg-surface-700 transition-colors ${currentRequest.protocol === p.id ? 'text-[color:var(--accent)] bg-surface-800' : 'text-[color:var(--text-muted)]'}`}
                  >
                    <span>{p.label}</span>
                    <span className="text-[10px]">{p.icon}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isEditingName ? (
            <input
              autoFocus
              className="ws-name-input"
              placeholder="Request name"
              value={currentRequest.name}
              onChange={(e) => updateField('name', e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setIsEditingName(false); }}
            />
          ) : (
            <span className="ws-name" onClick={() => setIsEditingName(true)} title="Click to edit">
              {currentRequest.name || 'Untitled WS Request'}
            </span>
          )}
          {/* Status Badge */}
          <span className="ws-status-badge" style={{ color: statusConfig.color, background: statusConfig.bg }}>
            <span className={`ws-status-dot ${isConnected ? 'ws-status-dot--active' : ''}`} style={{ background: statusConfig.color }} />
            {statusConfig.label}
          </span>
        </div>
        <div className="ws-header-right">
          <button
            title="Save (⌘S)"
            onClick={() => saveRequest().then((r) => {
              if (r?.success) toast.success('Saved');
              else if (r) toast.error(r.error || 'Save failed');
            })}
            className="ws-icon-btn"
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── URL Bar ── */}
      <div className="ws-url-bar">
        <span className="ws-protocol-badge">WS</span>
        <input
          className="ws-url-input"
          placeholder="wss://echo.websocket.org or {{ws_url}}/socket"
          value={currentRequest.url}
          onChange={(e) => updateField('url', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isConnected) {
              e.preventDefault();
              handleConnect();
            }
          }}
        />
        {isConnected || isConnecting ? (
          <button className="ws-disconnect-btn" onClick={handleDisconnect} disabled={!isConnected && !isConnecting}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            Disconnect
          </button>
        ) : (
          <button className="ws-connect-btn" onClick={handleConnect}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Connect
          </button>
        )}
      </div>

      {/* ── Main Area: Split between Composer & Log ── */}
      <div className="ws-main">
        {/* ── Message Composer ── */}
        <div className="ws-composer">
          <div className="ws-composer-header">
            <span className="ws-section-label">Message</span>
            <span className="ws-hint">⌘ + Enter to send</span>
          </div>
          <textarea
            ref={textareaRef}
            className="ws-message-input"
            placeholder={isConnected ? '{"action":"ping","data":"hello"}' : 'Connect first to send messages…'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!isConnected}
          />
          <div className="ws-composer-footer">
            <button
              className="ws-send-btn"
              onClick={handleSend}
              disabled={!isConnected || !message.trim()}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg>
              Send
            </button>
          </div>
        </div>

        {/* ── Event Log ── */}
        <div className="ws-log-panel">
          <div className="ws-log-header">
            <span className="ws-section-label">
              Event Log
              {currentLogs.length > 0 && <span className="ws-log-count">{currentLogs.length}</span>}
            </span>
            <button className="ws-clear-btn" onClick={() => clearLogs(requestId)} title="Clear log">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
          <div className="ws-log-body">
            {currentLogs.length === 0 ? (
              <div className="ws-log-empty">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Events will appear here once connected</span>
              </div>
            ) : (
              currentLogs.map((log) => (
                <div key={log.id} className={`ws-log-entry ws-log-entry--${log.type}`}>
                  <span className="ws-log-icon" style={{ color: LOG_COLOR[log.type] }}>
                    {LOG_ICON[log.type]}
                  </span>
                  <span className="ws-log-time">{formatTime(log.timestamp)}</span>
                  <pre className="ws-log-data" style={{ color: log.type === 'error' ? '#f85149' : undefined }}>
                    {log.data}
                  </pre>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
