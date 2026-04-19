import { useState, useCallback, useEffect, useRef } from 'react';
import { executeHttpRequest, isTauri } from '@/lib/executor';
import { useRequestStore } from '@/store/requestStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useSocketStore } from '@/store/socketStore';
import { useTeamStore } from '@/store/teamStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import ParamsTab from './tabs/ParamsTab';
import HeadersTab from './tabs/HeadersTab';
import BodyTab from './tabs/BodyTab';
import AuthTab from './tabs/AuthTab';
import VariableUrlInput from './VariableUrlInput';
import RequestPresence from './RequestPresence';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const METHOD_COLORS = {
  GET: 'text-success',
  POST: 'text-[#58A6FF]',
  PUT: 'text-warning',
  PATCH: 'text-[#A8A8A8]',
  DELETE: 'text-danger',
  HEAD: 'text-surface-500',
  OPTIONS: 'text-info',
};

export default function RequestBuilder() {
  const { currentRequest, updateField, activeTab, setActiveTab, setIsExecuting, setResponse, addToHistory, saveRequest, noActiveRequest, setNoActiveRequest, newRequest } = useRequestStore();
  const { resolveVariables, activeEnvironment } = useEnvironmentStore();
  const { emitRequestUpdate, emitOpenRequest, emitCloseRequest } = useSocketStore();
  const { currentTeam } = useTeamStore();
  const { user } = useAuthStore();
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [showProtocolDropdown, setShowProtocolDropdown] = useState(false);

  const PROTOCOLS = [
    { id: 'http', label: 'HTTP (REST)', icon: '🌐' },
    { id: 'ws', label: 'WebSocket (Raw)', icon: '⚡' },
    { id: 'socketio', label: 'Socket.IO', icon: '⬢' },
  ];

  // ── Presence: broadcast which request is open ──────────────────────
  const prevRequestIdRef = useRef(null);
  useEffect(() => {
    const requestId = currentRequest?._id;
    const teamId = currentTeam?._id;
    if (!requestId || !teamId || !user) return;

    // Close previous if changed
    if (prevRequestIdRef.current && prevRequestIdRef.current !== requestId) {
      emitCloseRequest(teamId, prevRequestIdRef.current, user._id || user.id);
    }

    emitOpenRequest(teamId, requestId, user);
    prevRequestIdRef.current = requestId;

    return () => {
      if (requestId && teamId && user) {
        emitCloseRequest(teamId, requestId, user._id || user.id);
      }
    };
  }, [currentRequest?._id, currentTeam?._id]);
  // ──────────────────────────────────────────────────────────────────

  const executeRequest = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error('You are offline. Please check your connection.');
      return;
    }

    if (!currentRequest.url.trim()) {
      toast.error('Enter a URL first');
      return;
    }

    setIsExecuting(true);
    setResponse(null);
    let isCancelled = false;
    useRequestStore.setState({
      cancelCurrentRequest: () => {
        isCancelled = true;
        setIsExecuting(false);
        setResponse({ status: 'Cancelled', statusText: '', headers: {}, body: 'Request was cancelled by user.', responseTimeMs: 0, sizeBytes: 0 });
      }
    });

    try {
      // Resolve environment variables
      const resolvedUrl = resolveVariables(currentRequest.url);

      // Detect unresolved variables (value still contains {{...}})
      const unresolvedVars = [...(resolvedUrl.matchAll(/\{\{([^}]+)\}\}/g))].map(m => m[1].trim());
      if (unresolvedVars.length > 0) {
        const missing = unresolvedVars.join(', ');
        toast.error(`Variable${unresolvedVars.length > 1 ? 's' : ''} not found in environment: ${missing}`);
        setIsExecuting(false);
        return;
      }

      const resolvedHeaders = (currentRequest.headers || []).map((h) => ({
        ...h,
        value: resolveVariables(h.value),
      }));

      const payload = {
        method: currentRequest.method,
        url: resolvedUrl,
        headers: resolvedHeaders.filter((h) => h.enabled && h.key),
        params: (currentRequest.params || []).filter((p) => p.enabled && p.key).map((p) => ({
          ...p,
          value: resolveVariables(p.value),
        })),
        body: currentRequest.body,
        auth: currentRequest.auth,
        timeoutMs: 30000,
      };

      const response = await executeHttpRequest(payload);
      if (isCancelled) return;

      setResponse(response);
      addToHistory({
        id: uuidv4(),
        request: { ...currentRequest, url: resolvedUrl },
        // Do not store the massive response text body in localStorage history!
        response: { ...response, body: '[Body hidden in history]' },
        timestamp: Date.now(),
      });

      // Emit to socket room
      if (currentTeam && user) {
        emitRequestUpdate(currentTeam._id, currentRequest, user.id);
      }

    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : (err.message || 'Request failed');

      if (errorMsg.includes('SSRF_BLOCKED')) {
        toast.error('⛔ Blocked: Internal/private IP addresses are not allowed');
      } else if (errorMsg.includes('SSRF_INVALID_URL')) {
        toast.error('Invalid URL: Only http/https are allowed');
      } else {
        toast.error(`Error: ${errorMsg}`);
      }
      if (!isCancelled) {
        setResponse({
          status: 'Error',
          statusText: '',
          headers: {},
          body: errorMsg,
          responseTimeMs: 0,
          sizeBytes: 0,
        });
      }
    } finally {
      if (!isCancelled) setIsExecuting(false);
      useRequestStore.setState({ cancelCurrentRequest: null });
    }
  }, [currentRequest, activeEnvironment, executeHttpRequest, resolveVariables, setResponse, setIsExecuting, addToHistory, currentTeam, user, emitRequestUpdate]);

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      executeRequest();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveRequest().then((r) => {
        if (r?.success) toast.success('Request saved');
        else if (r?.error) toast.error(r.error);
      });
    }
  }, [executeRequest, saveRequest]);

  const tabs = [
    { id: 'params', label: 'Params', count: currentRequest.params?.filter((p) => p.enabled && p.key).length },
    { id: 'headers', label: 'Headers', count: currentRequest.headers?.filter((h) => h.enabled && h.key).length },
    { id: 'body', label: 'Body', badge: currentRequest.body?.mode !== 'none' ? '●' : null },
    { id: 'auth', label: 'Auth', badge: currentRequest.auth?.type !== 'none' ? '●' : null },
  ];

  const [isEditingName, setIsEditingName] = useState(false);

  // ── Empty State (all requests in collection deleted) ──────────────
  if (noActiveRequest) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '20px',
          background: 'var(--bg-primary)',
          padding: '40px',
          textAlign: 'center',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '18px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '4px',
          }}
        >
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>

        {/* Heading */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            No request available
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              maxWidth: '260px',
            }}
          >
            This collection is empty. Create a new request to get started.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => { newRequest(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '10px',
            background: 'var(--accent)',
            border: 'none',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Poppins, sans-serif',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            transition: 'opacity 0.15s, transform 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(1.03)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Request
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      {/* Request name + actions */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 min-h-[42px]">
        {/* Left: Interactive Title & Protocol Toggle */}
        <div className="flex items-center flex-1 min-w-0 pr-4 gap-3">
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
              className="input text-[13px] font-semibold h-7 flex-1 max-w-sm"
              placeholder="Request name"
              value={currentRequest.name}
              onChange={(e) => updateField('name', e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setIsEditingName(false); }}
            />
          ) : (
            <span
              onClick={() => setIsEditingName(true)}
              className="text-[13px] font-semibold text-[color:var(--text-primary)] cursor-text hover:bg-[color:var(--surface-3)] px-1.5 py-0.5 rounded transition-colors truncate"
              title="Click to edit"
            >
              {currentRequest.name || 'Untitled Request'}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Presence: who else is viewing this request */}
          <RequestPresence requestId={currentRequest?._id} />

          {/* Save Button (Icon Only) */}
          <button
            title="Save Request"
            onClick={() => saveRequest().then((r) => {
              if (r?.success) toast.success('Saved');
              else if (r) toast.error(r.error || 'Save failed');
            })}
            className="btn-ghost p-1.5 opacity-70 hover:opacity-100 border-none hover:bg-[color:var(--surface-3)] transition-all rounded-md flex items-center justify-center"
          >
            <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2 px-3 pb-2">
        
        {/* Combined Method & URL Container */}
        <div className="flex-1 flex items-center bg-[color:var(--surface-1)] border border-[color:var(--border-1)] rounded-md focus-within:border-[color:var(--accent)] focus-within:ring-1 focus-within:ring-[color:var(--accent)] hover:border-[color:var(--border-2)] transition-all overflow-visible h-8">
          
          {/* Method dropdown */}
          <div className="relative h-full flex-shrink-0">
            <button
              onClick={() => setShowMethodDropdown(!showMethodDropdown)}
              className={`flex items-center gap-1.5 px-2.5 h-full text-[11px] font-bold ${METHOD_COLORS[currentRequest.method]} hover:bg-[color:var(--surface-2)] transition-colors min-w-[80px] justify-between border-r border-[color:var(--border-1)] rounded-l-md outline-none focus:outline-none`}
            >
              {currentRequest.method}
              <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMethodDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-[color:var(--surface-1)] border border-[color:var(--border-1)] rounded-lg shadow-glass z-50 py-1 min-w-[110px] animate-in">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => { updateField('method', m); setShowMethodDropdown(false); }}
                    className={`flex items-center w-full px-2.5 py-1 text-[11px] font-bold hover:bg-surface-700 transition-colors ${METHOD_COLORS[m]}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* URL input */}
          <div className="flex-1 min-w-0 h-full">
            <VariableUrlInput
              value={currentRequest.url}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="https://api.example.com/endpoint  or  {{base_url}}/path"
            />
          </div>
        </div>

        {/* Send button */}
        <SendButton onSend={executeRequest} />
      </div>

      {/* Resolved URL preview — only when URL contains variables */}
      {currentRequest.url?.includes('{{') && (
        <div className="px-3 pb-1.5 flex items-center gap-1.5">
          <svg className="w-3 h-3 text-tx-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-[10px] text-tx-muted font-mono truncate">
            {resolveVariables(currentRequest.url)}
          </span>
          {!activeEnvironment && (
            <span className="text-[9px] text-warning bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
              No env selected
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[var(--border-1)] px-3">
        <div className="flex items-center gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium border-b-2 transition-all ${activeTab === tab.id
                ? 'border-[var(--accent)] text-[var(--text-primary)]'
                : 'border-transparent text-surface-500 hover:text-tx-secondary'
                }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}
                >
                  {tab.count}
                </span>
              )}
              {tab.badge && <span className="text-[var(--text-muted)] text-xs">{tab.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'params' && <ParamsTab />}
        {activeTab === 'headers' && <HeadersTab />}
        {activeTab === 'body' && <BodyTab />}
        {activeTab === 'auth' && <AuthTab />}
      </div>
    </div>
  );
}

function SendButton({ onSend }) {
  const { isExecuting, cancelCurrentRequest } = useRequestStore();

  if (isExecuting) {
    return (
      <button
        onClick={() => cancelCurrentRequest && cancelCurrentRequest()}
        className="btn-primary relative flex items-center gap-1.5 px-3 h-8 rounded-md font-medium transition-all duration-150 active:scale-95 group min-w-[80px] justify-center !bg-danger/90 hover:!bg-danger border-none text-xs"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Cancel
      </button>
    );
  }

  return (
    <button
      onClick={onSend}
      className="btn-primary relative flex items-center gap-1.5 px-4 h-8 rounded-md font-medium transition-all duration-150 active:scale-95 group min-w-[80px] justify-center text-xs"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
      </svg>
      <span className="text-xs">Send</span>
      <span className="absolute -bottom-6 right-0 text-[10px] text-tx-muted hidden group-hover:block whitespace-nowrap">⌘ + Enter</span>
    </button>
  );
}
