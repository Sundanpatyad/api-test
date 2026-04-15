import { useState, useCallback } from 'react';
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

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const METHOD_COLORS = {
  GET:     'text-success',
  POST:    'text-[#58A6FF]',
  PUT:     'text-warning',
  PATCH:   'text-[#A8A8A8]',
  DELETE:  'text-danger',
  HEAD:    'text-surface-500',
  OPTIONS: 'text-info',
};

export default function RequestBuilder() {
  const { currentRequest, updateField, activeTab, setActiveTab, setIsExecuting, setResponse, addToHistory, saveRequest } = useRequestStore();
  const { resolveVariables, activeEnvironment } = useEnvironmentStore();
  const { emitRequestUpdate } = useSocketStore();
  const { currentTeam } = useTeamStore();
  const { user } = useAuthStore();
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);

  const executeRequest = useCallback(async () => {
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
    { id: 'params',   label: 'Params',   count: currentRequest.params?.filter((p) => p.enabled && p.key).length },
    { id: 'headers',  label: 'Headers',  count: currentRequest.headers?.filter((h) => h.enabled && h.key).length },
    { id: 'body',     label: 'Body',     badge: currentRequest.body?.mode !== 'none' ? '●' : null },
    { id: 'auth',     label: 'Auth',     badge: currentRequest.auth?.type !== 'none' ? '●' : null },
  ];

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      {/* Request name + actions */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <input
          className="input text-sm font-medium flex-1 max-w-xs"
          placeholder="Request name"
          value={currentRequest.name}
          onChange={(e) => updateField('name', e.target.value)}
        />
        <button
          onClick={() => saveRequest().then((r) => {
            if (r?.success) toast.success('Saved');
            else if (r) toast.error(r.error || 'Save failed');
          })}
          className="btn-ghost text-xs py-1 px-2.5"
        >
          <svg className="w-3.5 h-3.5 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
          </svg>
          Save
        </button>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2 px-3 pb-2">
        {/* Method dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMethodDropdown(!showMethodDropdown)}
            className={`flex items-center gap-1.5 bg-[var(--surface-2)] border border-[var(--border-1)] rounded-lg px-3 py-1.5 text-sm font-bold ${METHOD_COLORS[currentRequest.method]} hover:border-[var(--border-2)] transition-all min-w-[90px] justify-between`}
          >
            {currentRequest.method}
            <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          {showMethodDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-[var(--surface-1)] border border-[var(--border-1)] rounded-lg shadow-glass z-50 py-1 min-w-[110px] animate-in">
              {METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => { updateField('method', m); setShowMethodDropdown(false); }}
                  className={`flex items-center w-full px-3 py-1.5 text-sm font-bold hover:bg-surface-700 transition-colors ${METHOD_COLORS[m]}`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* URL input */}
        <VariableUrlInput
          value={currentRequest.url}
          onChange={(e) => updateField('url', e.target.value)}
          placeholder="https://api.example.com/endpoint  or  {{base_url}}/path"
        />

        {/* Send button */}
        <SendButton onSend={executeRequest} />
      </div>

      {/* Resolved URL preview — only when URL contains variables */}
      {currentRequest.url?.includes('{{') && (
        <div className="px-3 pb-1.5 flex items-center gap-1.5">
          <svg className="w-3 h-3 text-surface-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-[10px] text-surface-600 font-mono truncate">
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
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[var(--accent)] text-[var(--text-primary)]'
                  : 'border-transparent text-surface-500 hover:text-surface-300'
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
        {activeTab === 'params'  && <ParamsTab />}
        {activeTab === 'headers' && <HeadersTab />}
        {activeTab === 'body'    && <BodyTab />}
        {activeTab === 'auth'    && <AuthTab />}
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
        className="btn-primary relative flex items-center gap-2 px-5 py-1.5 rounded-lg font-medium transition-all duration-150 active:scale-95 group min-w-[90px] justify-center !bg-danger/90 hover:!bg-danger border-none"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
        </svg>
        <span className="text-sm shadow-sm font-semibold">Cancel</span>
      </button>
    );
  }

  return (
    <button
      onClick={onSend}
      className="btn-primary relative flex items-center gap-2 px-5 py-1.5 rounded-lg font-medium transition-all duration-150 active:scale-95 group min-w-[90px] justify-center"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
      </svg>
      <span className="text-sm">Send</span>
      <span className="absolute -bottom-6 right-0 text-[9px] text-surface-600 hidden group-hover:block whitespace-nowrap">⌘ + Enter</span>
    </button>
  );
}
