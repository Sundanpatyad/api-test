import { useEffect, useState } from 'react';

const steps = [
  { progress: 18, text: 'Initializing…' },
  { progress: 40, text: 'Loading workspace…' },
  { progress: 62, text: 'Connecting to services…' },
  { progress: 82, text: 'Restoring sessions…' },
  { progress: 100, text: 'Welcome to PayloadX' },
];

export default function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    let i = 0;
    const tick = () => {
      if (i >= steps.length) return;
      setProgress(steps[i].progress);
      setStatusText(steps[i].text);
      i++;
      if (i < steps.length) setTimeout(tick, 700);
      else setTimeout(onComplete, 600);
    };
    setTimeout(tick, 600);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#09090B] flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-48 bg-white/[0.05] blur-[80px] rounded-full pointer-events-none" />

      <div className="relative flex flex-col items-center animate-fade-up">
        {/* Logo tile */}
        <div className="relative mb-7">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2a2a2e] to-[#1a1a1e] border border-white/10 flex items-center justify-center overflow-hidden relative">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="8" y="6" width="5" height="20" rx="2.5" fill="rgba(255,255,255,0.9)" />
              <rect x="13" y="6" width="9" height="5" rx="2.5" fill="rgba(255,255,255,0.9)" />
              <rect x="13" y="14" width="7" height="5" rx="2.5" fill="rgba(255,255,255,0.9)" />
              <rect x="19" y="6" width="5" height="13" rx="2.5" fill="rgba(255,255,255,0.9)" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 animate-shimmer" />
          </div>
          <div className="absolute -inset-1.5 rounded-[22px] bg-white/[0.04] -z-10 animate-pulse" />
        </div>

        {/* Wordmark */}
        <h1 className="text-[28px] font-medium text-white tracking-tight mb-1.5">PayloadX</h1>
        <p className="text-[11px] text-white/30 tracking-[.22em] uppercase mb-10">API Studio</p>

        {/* Progress */}
        <div className="w-48 flex flex-col items-center gap-3.5">
          <div className="w-full h-[1.5px] bg-white/[0.07] rounded-full overflow-hidden">
            <div
              className="h-full bg-white/55 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-white/30 tracking-wide transition-opacity duration-300">{statusText}</p>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-white/[0.12] tracking-widest uppercase mt-11">
          Ver 1.2.0 &nbsp;·&nbsp; By Sundan Sharma
        </p>
      </div>
    </div>
  );
}