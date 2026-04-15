import { useMemo, useRef, useState } from 'react';
import { useEnvironmentStore } from '@/store/environmentStore';

export default function VariableUrlInput({ value, onChange, placeholder }) {
  const { activeEnvironment } = useEnvironmentStore();
  const inputRef = useRef(null);
  const [tooltip, setTooltip] = useState(null); // { text, x, y }

  const segments = useMemo(() => {
    const parts = [];
    const regex = /(\{\{[^}]+\}\})/g;
    let last = 0, m;
    while ((m = regex.exec(value)) !== null) {
      if (m.index > last) parts.push({ type: 'text', text: value.slice(last, m.index) });
      const varName = m[1].slice(2, -2).trim();
      const variable = activeEnvironment?.variables?.find(
        (v) => v.key === varName && v.enabled !== false
      );
      parts.push({
        type: 'var',
        text: m[1],
        varName,
        found: Boolean(variable),
        resolvedValue: variable ? (variable.isSecret ? '••••••' : variable.value) : undefined,
      });
      last = m.index + m[1].length;
    }
    if (last < value.length) parts.push({ type: 'text', text: value.slice(last) });
    return parts;
  }, [value, activeEnvironment]);

  const hasUnresolved = segments.some(s => s.type === 'var' && !s.found);

  return (
    <div className="relative flex-1">
      {/* Container — provides border + background */}
      <div
        className={`flex items-center w-full bg-surface-800 border rounded-xl px-3 py-2 font-mono text-sm transition-colors focus-within:border-brand-500/60 ${hasUnresolved ? 'border-orange-400/40' : 'border-surface-700'
          }`}
        style={{ minHeight: '38px' }}
      >
        {/* Rendered text with colored variables — sits in flow */}
        <div className="relative w-full overflow-hidden whitespace-pre" style={{ lineHeight: '1.25rem' }}>
          {/* Transparent overlay input — captures all typing */}
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="absolute inset-0 w-full h-full bg-transparent border-0 outline-0 font-mono text-sm pl-0 pr-0"
            style={{ color: 'transparent', caretColor: '#e2e8f0', letterSpacing: 'inherit' }}
            spellCheck={false}
            autoComplete="off"
          />

          {/* Colored mirror — rendered behind the input */}
          <span aria-hidden="true" className="pointer-events-none select-none">
            {value === '' ? (
              <span className="text-surface-600">{placeholder}</span>
            ) : (
              segments.map((seg, i) =>
                seg.type === 'text' ? (
                  <span key={i} className="text-white">{seg.text}</span>
                ) : (
                  // Variable token — colored + hoverable for tooltip
                  <span
                    key={i}
                    className={`pointer-events-auto cursor-default ${seg.found ? 'text-brand-400' : 'text-orange-400'
                      }`}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        varName: seg.varName,
                        found: seg.found,
                        value: seg.resolvedValue,
                        x: rect.left,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {seg.text}
                  </span>
                )
              )
            )}
          </span>
        </div>

        {/* Warning icon */}
        {hasUnresolved && (
          <span className="ml-1.5 text-orange-400 text-xs flex-shrink-0" title="Variable not in environment">⚠</span>
        )}
      </div>

      {/* Hover tooltip — rendered at fixed position */}
      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translateY(-100%)' }}
        >
          <div className="bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 shadow-glass text-xs max-w-xs">
            <div className="flex items-center gap-1.5 mb-0.5">
              <code className={`${tooltip.found ? 'text-brand-400' : 'text-orange-400'}`}>
                {`{{${tooltip.varName}}}`}
              </code>
              {tooltip.found ? (
                <span className="text-[9px] bg-success/20 text-success px-1 rounded-full">found</span>
              ) : (
                <span className="text-[9px] bg-orange-400/20 text-orange-400 px-1 rounded-full">not set</span>
              )}
            </div>
            {tooltip.found ? (
              <p className="text-surface-300 font-mono truncate max-w-[240px]">
                → {tooltip.value || '(empty)'}
              </p>
            ) : (
              <p className="text-surface-500">
                Not defined in <span className="text-white">{activeEnvironment?.name || 'active environment'}</span>
              </p>
            )}
          </div>
          {/* Arrow */}
          <div className="w-2 h-2 bg-surface-900 border-r border-b border-surface-700 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}
