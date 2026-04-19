import { useEffect, useState } from 'react';
import logo from '@/assets/logo.png';

export default function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing...');

  useEffect(() => {
    const steps = [
      { progress: 20, text: 'Loading workspace...' },
      { progress: 45, text: 'Connecting to services...' },
      { progress: 70, text: 'Restoring sessions...' },
      { progress: 90, text: 'Almost ready...' },
      { progress: 100, text: 'Welcome to PayloadX!' },
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
    <div className="fixed inset-0 bg-[#040506] flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Dynamic Metallic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative flex flex-col items-center gap-10 animate-fade-in">
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative group">
            {/* Main Logo Container with Metallic Gradient */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E6EDF3] via-[#8B949E] to-[#484F58] flex items-center justify-center p-4 shadow-2xl relative z-10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
              <img src={logo} alt="PayloadX" className="w-full h-full object-contain filter drop-shadow-md" />
              {/* Shimmer Effect */}
              <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/40 to-transparent transform rotate-45 animate-shimmer" />
            </div>
            {/* Outer Glow */}
            <div className="absolute -inset-2 rounded-2xl bg-white/10 blur-xl -z-10 group-hover:bg-white/20 transition-all duration-700" />
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white tracking-tight mb-1">PayloadX</h1>
            <p className="text-[#8B949E] text-xs font-bold tracking-[0.3em] uppercase">API Studio</p>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-[#6E7681] text-xs text-center max-w-[280px] leading-relaxed">
          High-performance API testing with <br/> refined metallic aesthetics.
        </p>

        {/* Progress Section */}
        <div className="w-72 flex flex-col gap-4 items-center mt-4">
          <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-[#8B949E] via-white to-[#8B949E] rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(255,255,255,0.3)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[#8B949E] text-[11px] font-medium transition-all duration-300">{statusText}</p>
            <p className="text-white/20 text-[10px] tabular-nums font-mono">{progress}%</p>
          </div>
        </div>

        {/* Version Footer */}
        <p className="text-white/10 text-[10px] font-mono absolute -bottom-24">VER 1.2.0 • STABLE</p>
      </div>
    </div>
  );
}
