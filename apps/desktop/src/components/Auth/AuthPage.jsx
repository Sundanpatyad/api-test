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
    <div className="flex h-screen bg-bg-primary overflow-hidden font-poppins selection:bg-accent/20">
      {/* ── Left Side: Hero Image ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden group">
        <img 
          src={heroImg} 
          alt="PayloadX Studio" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
        />
        {/* Modern dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-black/20" />
        <div className="absolute inset-0 bg-black/10" />

        {/* Content on Image */}
        <div className="relative z-10 w-full h-full flex flex-col justify-end p-16 animate-fade-in">
          <div className="mb-4">
            <h2 className="text-4xl font-bold text-white tracking-tight leading-tight mb-2">
              The Payload Studio<br />
              <span className="text-accent">Anything you can Imagine</span>
            </h2>
            <div className="w-12 h-1 bg-accent rounded-full mb-6" />
            <p className="text-white/60 text-sm max-w-[400px] font-medium leading-relaxed uppercase tracking-wider">
              High Performance &bull; Real-time Sync &bull; Rust Native
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Side: Auth Form ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-bg-primary relative">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-[420px] z-10 space-y-10">
          {/* Form Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="logo" className="w-8 h-8 object-contain" />
              <div className="h-4 w-[1px] bg-border-1" />
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em]">
                {mode === 'login' ? 'Login your account' : 'Create your account'}
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-tx-primary tracking-tight">
                {mode === 'login' ? 'Welcome Back!' : 'Join PayloadX'}
              </h1>
              <p className="text-text-secondary text-[13px] font-medium">
                {mode === 'login' ? 'Enter your email and password to access dashboard' : 'Start building and testing with your team today'}
              </p>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[12px] font-semibold text-text-secondary ml-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-accent transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    className="input w-full pl-12 h-14 bg-bg-secondary border-border-1 focus:border-accent focus:shadow-[0_0_20px_rgba(90,125,154,0.2)] transition-all duration-300"
                    type="text"
                    placeholder="Sundan Sharma"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-text-secondary ml-1">Email address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-accent transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  className="input w-full pl-12 h-14 bg-bg-secondary border-border-1 focus:border-accent focus:shadow-[0_0_20px_rgba(90,125,154,0.2)] transition-all duration-300"
                  type="email"
                  placeholder="hello@payloadx.design"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="px-1">
                <label className="text-[12px] font-semibold text-text-secondary">Password</label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-accent transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  className="input w-full pl-12 h-14 bg-bg-secondary border-border-1 focus:border-accent focus:shadow-[0_0_20px_rgba(90,125,154,0.2)] transition-all duration-300"
                  type="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full h-14 bg-[#111111] hover:bg-black text-[15px] font-bold text-white rounded-xl transition-all duration-300 active:scale-[0.98] border border-white/5 flex items-center justify-center gap-2 group disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Create My Account'}
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer Area */}
          <div className="pt-6 border-t border-border-1/30 flex flex-col items-center gap-6">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span>{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}</span>
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-accent font-bold hover:text-accent-hover transition-colors"
              >
                {mode === 'login' ? 'Register Now' : 'Sign In'}
              </button>
            </div>

            <div className="flex flex-col items-center gap-1 opacity-40">
              <p className="text-[10px] items-center gap-2 flex uppercase tracking-widest font-bold">
                PayloadX Studio
              </p>
              <p className="text-[11px] font-medium text-text-muted">
                Built with 🖤 by <span className="text-accent font-bold">Sundan Sharma</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
