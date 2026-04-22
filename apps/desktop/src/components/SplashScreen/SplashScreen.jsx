import { useEffect, useState } from 'react';
import logoImg from '@/assets/logo.png';

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
    <div className="fixed inset-0 bg-[#060606] flex flex-col items-center justify-center z-50 overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative flex flex-col items-center w-full max-w-lg">
        
        {/* Mockup Container (The "Pock up") */}
        <div className="relative w-full h-[320px] mb-12 animate-fade-up">
          {/* Subtle glow behind mockup */}
          <div className="absolute -inset-4 bg-white/[0.02] blur-3xl rounded-[30px]" />
          
          <div className="relative h-full bg-[#0d0d0d] rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden flex flex-col">
            {/* Mock Header */}
            <div className="h-9 border-b border-white/[0.03] bg-white/[0.01] flex items-center px-4 gap-1.5">
               <div className="w-2 h-2 rounded-full bg-white/[0.05] border border-white/[0.1]"></div>
               <div className="w-2 h-2 rounded-full bg-white/[0.05] border border-white/[0.1]"></div>
               <div className="w-2 h-2 rounded-full bg-white/[0.05] border border-white/[0.1]"></div>
            </div>
            
            {/* Mock Content (Centered Logo) */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
               <div className="relative group">
                 <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.1] flex items-center justify-center relative overflow-hidden">
                    <img src={logoImg} alt="PayloadX" className="w-9 h-9 opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent -skew-x-12 animate-shimmer" />
                 </div>
                 {/* Logo Glow */}
                 <div className="absolute -inset-4 rounded-3xl bg-white/[0.02] -z-10 animate-pulse" />
               </div>
               
               <div className="mt-6 text-center">
                 <h1 className="text-xl font-bold text-white tracking-tight">PayloadX</h1>
                 <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em] mt-1">API Studio</p>
               </div>
            </div>
            
            {/* Progress Bar (Integrated into mockup bottom) */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.02]">
              <div 
                className="h-full bg-white/[0.2] transition-all duration-700 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status Text (Below Mockup) */}
        <div className="flex flex-col items-center gap-4 animate-fade-in">
           <div className="flex items-center gap-3">
             <div className="w-3 h-3 border border-white/10 border-t-white/40 rounded-full animate-spin"></div>
             <span className="text-[11px] text-slate-500 font-medium uppercase tracking-widest">{statusText}</span>
           </div>
        </div>

        {/* Footer Attribution */}
        <div className="absolute bottom-[-100px] left-0 right-0 text-center opacity-20">
          <p className="text-[9px] text-slate-500 uppercase tracking-[0.25em] font-medium">
            Project by <span className="text-slate-300">Sundan Sharma</span>
          </p>
        </div>
      </div>
    </div>
  );
}