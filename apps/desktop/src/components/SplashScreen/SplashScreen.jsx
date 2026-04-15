import { useEffect, useState } from 'react';

export default function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing...');

  useEffect(() => {
    const steps = [
      { progress: 20, text: 'Loading workspace...' },
      { progress: 45, text: 'Connecting to services...' },
      { progress: 70, text: 'Restoring sessions...' },
      { progress: 90, text: 'Almost ready...' },
      { progress: 100, text: 'Welcome to SyncNest!' },
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i].progress);
        setStatusText(steps[i].text);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 400);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-surface-950 flex flex-col items-center justify-center z-50">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-brand-600/5 rounded-full blur-2xl" />
      </div>

      <div className="relative flex flex-col items-center gap-8 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-glow-lg splash-logo-glow">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M6 18C6 11.373 11.373 6 18 6" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M30 18C30 24.627 24.627 30 18 30" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="18" cy="18" r="4" fill="white"/>
                <path d="M18 6V10M18 26V30M6 18H10M26 18H30" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-brand-500/30 blur-lg -z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">SyncNest</h1>
            <p className="text-brand-300 text-sm font-medium tracking-widest uppercase">API Studio</p>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-surface-400 text-sm text-center max-w-xs">
          Professional API Testing with Real-time Collaboration
        </p>

        {/* Progress */}
        <div className="w-64 flex flex-col gap-3 items-center">
          <div className="w-full h-1 bg-surface-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-300 rounded-full transition-all duration-300 ease-out shadow-glow"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-surface-500 text-xs animate-pulse">{statusText}</p>
        </div>

        {/* Version */}
        <p className="text-surface-700 text-xs absolute -bottom-12">v1.0.0</p>
      </div>
    </div>
  );
}
