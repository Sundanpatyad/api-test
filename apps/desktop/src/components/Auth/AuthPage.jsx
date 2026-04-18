import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import logoImg from '@/assets/logo.png';
import heroImg from '@/assets/auth_hero.png';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { login, signup, isLoading } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!navigator.onLine) {
      toast.error('You are offline. Please check your connection.');
      return;
    }

    const result = mode === 'login'
      ? await login(form.email, form.password)
      : await signup(form.name, form.email, form.password);

    if (!result.success) toast.error(result.error);
  };

  return (
    <div className="flex h-screen bg-[#040506] overflow-hidden font-poppins selection:bg-white/20">
      {/* ── Left Side: Hero Image with Metallic Overlay ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden group">
        <img 
          src={heroImg} 
          alt="PayloadX Studio" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
        />
        {/* Advanced Metallic/Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#040506] via-[#040506]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-30" />

        {/* Content on Image */}
        <div className="relative z-10 w-full h-full flex flex-col justify-center p-20 animate-fade-in">
          <div className="space-y-6">
            <div className="w-16 h-1 bg-gradient-to-r from-white to-transparent rounded-full" />
            <h2 className="text-5xl font-bold text-white tracking-tighter leading-[1.1]">
              The Payload <br />
              <span className="bg-gradient-to-r from-white via-[#8B949E] to-[#484F58] bg-clip-text text-transparent italic">Metallic Studio</span>
            </h2>
            <p className="text-[#8B949E] text-sm max-w-[400px] font-semibold leading-relaxed uppercase tracking-[0.25em]">
              High Performance &bull; Chrome Core &bull; Rust Native
            </p>
          </div>
          
          {/* Subtle reflection effect */}
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/5 blur-[100px] rounded-full pointer-events-none" />
        </div>
      </div>

      {/* ── Right Side: Polished Auth Form ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-[#040506] relative">
        {/* Background Ambience */}
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-white/[0.03] blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-white/[0.02] blur-[100px] rounded-full pointer-events-none" />

        <div className="w-full max-w-[420px] z-10 space-y-12">
          {/* Form Header */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-[#8B949E] p-2 shadow-2xl flex items-center justify-center">
                <img src={logoImg} alt="logo" className="w-full h-full object-contain invert" />
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.4em]">
                {mode === 'login' ? 'Authentication' : 'Onboarding'}
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-white tracking-tighter">
                {mode === 'login' ? 'Welcome' : 'Join the Elite'}
              </h1>
              <p className="text-[#8B949E] text-[13px] font-medium leading-relaxed">
                {mode === 'login' ? 'Enter your credentials to access your metallic workspace.' : 'Initialize your professional API testing profile today.'}
              </p>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-[#8B949E] ml-1 uppercase tracking-widest">Full Name</label>
                <div className="relative group">
                  <input
                    className="w-full h-14 px-6 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:bg-white/[0.05] focus:border-white/20 focus:shadow-[0_0_30px_rgba(255,255,255,0.05)] outline-none transition-all duration-300"
                    type="text"
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[#8B949E] ml-1 uppercase tracking-widest">Email address</label>
              <div className="relative group">
                <input
                  className="w-full h-14 px-6 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:bg-white/[0.05] focus:border-white/20 focus:shadow-[0_0_30px_rgba(255,255,255,0.05)] outline-none transition-all duration-300"
                  type="email"
                  placeholder="hello@payloadx.design"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
               <div className="flex justify-between items-center px-1">
                 <label className="text-[11px] font-bold text-[#8B949E] uppercase tracking-widest">Password</label>
                 {mode === 'login' && <button type="button" className="text-[10px] text-[#8B949E] hover:text-white transition-colors">Forgot?</button>}
               </div>
              <div className="relative group">
                <input
                  className="w-full h-14 px-6 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:bg-white/[0.05] focus:border-white/20 focus:shadow-[0_0_30px_rgba(255,255,255,0.05)] outline-none transition-all duration-300"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full h-14 bg-white hover:bg-[#F3F4F6] text-[14px] font-black text-black rounded-2xl transition-all duration-500 active:scale-[0.98] shadow-[0_10px_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 group disabled:opacity-50 mt-4 overflow-hidden relative"
              disabled={isLoading}
            >
              {isLoading ? 'INITIATING...' : (
                <>
                  <span className="relative z-10">{mode === 'login' ? 'SIGN IN' : 'INITIALIZE ACCOUNT'}</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  {/* Internal Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/[0.02] to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </>
              )}
            </button>
          </form>

          {/* Footer Area with Metallic Touches */}
          <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-8">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#8B949E]">
              <span>{mode === 'login' ? "New to the Studio? " : 'Already a member? '}</span>
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-white font-bold hover:underline underline-offset-4 decoration-white/30 transition-all"
              >
                {mode === 'login' ? 'Create Access' : 'Sign In Now'}
              </button>
            </div>

            <div className="flex flex-col items-center gap-2 opacity-30 group cursor-default">
              <p className="text-[9px] items-center gap-2 flex uppercase tracking-[0.5em] font-black text-white group-hover:tracking-[0.6em] transition-all duration-500">
                PayloadX Studio
              </p>
              <div className="flex items-center gap-2 text-[10px] font-medium text-[#8B949E]">
                <span>MODERN METALLIC ENGINE</span>
                <span className="w-1 h-1 bg-white/40 rounded-full" />
                <span>CORE V1.2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
