import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useRequestStore } from '@/store/requestStore';
import { getStatusClass, formatSize, formatTime, formatBody } from '@/utils/helpers';

const RESPONSE_TABS = ['Pretty', 'Raw', 'Headers'];

export default function ResponseViewer() {
  const { response, isExecuting } = useRequestStore();
  const [activeTab, setActiveTab] = useState('Pretty');

  if (isExecuting) {
    return <LoadingState />;
  }

  if (!response) {
    return <EmptyState />;
  }

  if (response.error && response.status === 0) {
    return <ErrorState error={response.error} />;
  }

  const contentType = response.headers?.['content-type'] || '';
  const prettyBody = formatBody(response.body, contentType);
  const statusClass = getStatusClass(response.status);
  const lang = contentType.includes('json') ? 'json' : contentType.includes('xml') ? 'xml' : contentType.includes('html') ? 'html' : 'plaintext';

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-surface-700/50 bg-surface-800/30">
        <span className={statusClass}>{response.status} {response.statusText}</span>
        <div className="w-px h-3.5 bg-surface-700" />
        <span className="text-surface-400 text-xs flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          {formatTime(response.responseTimeMs)}
        </span>
        <div className="w-px h-3.5 bg-surface-700" />
        <span className="text-surface-400 text-xs flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4"/></svg>
          {formatSize(response.sizeBytes)}
        </span>

        {/* Tabs */}
        <div className="ml-auto flex items-center gap-0.5">
          {RESPONSE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeTab === tab
                  ? 'bg-surface-700 text-white'
                  : 'text-surface-500 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'Pretty' && (
          <Editor
            height="100%"
            language={lang}
            value={prettyBody}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              lineNumbers: 'off',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              scrollbar: { useShadows: false, verticalScrollbarSize: 6 },
              padding: { top: 8, bottom: 8 },
              folding: true,
            }}
          />
        )}

        {activeTab === 'Raw' && (
          <div className="h-full overflow-auto p-3">
            <pre className="text-xs text-surface-300 font-mono whitespace-pre-wrap break-all">
              {response.body}
            </pre>
          </div>
        )}

        {activeTab === 'Headers' && (
          <div className="overflow-auto h-full p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left text-surface-500 font-semibold pb-2 pr-4 w-1/3">Header</th>
                  <th className="text-left text-surface-500 font-semibold pb-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(response.headers || {}).map(([k, v]) => (
                  <tr key={k} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                    <td className="py-1.5 pr-4 font-mono text-brand-300 font-medium">{k}</td>
                    <td className="py-1.5 font-mono text-surface-300 break-all">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
      <div className="w-12 h-12 rounded-2xl bg-surface-800 flex items-center justify-center">
        <svg className="w-6 h-6 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>
      <div>
        <p className="text-surface-400 text-sm font-medium">No response yet</p>
        <p className="text-surface-600 text-xs mt-1">Press Send or ⌘+Enter to execute the request</p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-brand-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500 animate-spin" />
      </div>
      <p className="text-surface-400 text-sm">Sending request...</p>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
      <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center border border-danger/20">
        <svg className="w-6 h-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <div>
        <p className="text-danger text-sm font-semibold">Request Error</p>
        <p className="text-surface-400 text-xs mt-1 max-w-xs">{error}</p>
      </div>
    </div>
  );
}
