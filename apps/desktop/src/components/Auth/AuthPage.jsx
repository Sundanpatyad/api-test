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
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden font-inter selection:bg-sky-500/20">
      {/* ── Left Side: Hero Image with Brand Overlay ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden group">
        <img
          src={heroImg}
          alt="PayloadX Studio"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2.5s] ease-out group-hover:scale-105"
        />
        {/* Soft Modern Overlay */}
        <div className="absolute inset-0 bg-[#0f0f0f]/60" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0f0f0f] via-transparent to-transparent" />

        {/* Content on Image */}
        <div className="relative z-10 w-full h-full flex flex-col justify-center p-24 animate-fade-in">
          <div className="space-y-8">
            <div className="w-12 h-1 bg-sky-500 rounded-full" />
            <h2 className="text-6xl font-bold text-white tracking-tight leading-tight">
              The Studio for <br />
              <span className="text-sky-400 italic">Modern Teams</span>
            </h2>
            <p className="text-slate-400 text-base max-w-[400px] font-medium leading-relaxed tracking-wide">
              Blazing fast API management powered by Rust. Collaborate in real-time without the bloat.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Side: Clean Auth Form ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-12 bg-[#0f0f0f] relative">
        <div className="w-full max-w-[380px] z-10 space-y-10">
          {/* Header */}
          <div className="space-y-8">
            <div className="flex flex-col items-center lg:items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center p-0 shadow-lg shadow-sky-500/20">
                <img src={logoImg} alt="logo" className="w-full h-full object-contain " />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {mode === 'login' ? 'Welcome back' : 'Create an account'}
              </h1>
              <p className="text-slate-500 text-sm font-medium">
                {mode === 'login'
                  ? 'Access your workspace and continue building.'
                  : 'Start your journey with PayloadX today.'}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 ml-1">Full Name</label>
                <input
                  className="w-full h-12 px-5 bg-white/[0.02] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:bg-white/[0.04] focus:border-sky-500 outline-none transition-all duration-200"
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 ml-1">Email address</label>
              <input
                className="w-full h-12 px-5 bg-white/[0.02] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:bg-white/[0.04] focus:border-sky-500 outline-none transition-all duration-200"
                type="email"
                placeholder="hello@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-semibold text-slate-400">Password</label>
                {mode === 'login' && <button type="button" className="text-[11px] text-sky-500/80 hover:text-sky-400 transition-colors font-medium">Forgot password?</button>}
              </div>
              <input
                className="w-full h-12 px-5 bg-white/[0.02] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:bg-white/[0.04] focus:border-sky-500 outline-none transition-all duration-200"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold rounded-full transition-all duration-300 active:scale-[0.98] mt-6 flex items-center justify-center gap-2 group disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign in' : 'Get started'}</span>
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-8">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <span>{mode === 'login' ? "Don't have an account? " : 'Already a member? '}</span>
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sky-500 font-bold hover:text-sky-400 transition-colors"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>

            <div className="flex flex-col items-center gap-1 opacity-20">
              <p className="text-[10px] font-bold text-white uppercase tracking-widest">
                PayloadX Studio
              </p>
              <span className="text-[9px] font-medium text-slate-500">v1.2.0 • Created by Sundan Sharma</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
