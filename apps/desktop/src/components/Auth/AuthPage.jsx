import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

import dashboardImg from '@/assets/dashboard.png';
import networkImg from '@/assets/network.png';
import securityImg from '@/assets/security.png';

const CAROUSEL_ITEMS = [
  {
    image: dashboardImg,
    title: 'Monitor Everything',
    subtitle: 'Lightning-fast API endpoints with real-time performance tracking and deep analytics.'
  },
  {
    image: networkImg,
    title: 'Real-time Collaboration',
    subtitle: 'Sync instantly. Build and test alongside your entire team without friction.'
  },
  {
    image: securityImg,
    title: 'Enterprise Security',
    subtitle: 'Bank-grade encryption, secure environments, and robust secret management built-in.'
  }
];

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { login, signup, isLoading } = useAuthStore();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_ITEMS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = mode === 'login'
      ? await login(form.email, form.password)
      : await signup(form.name, form.email, form.password);

    if (!result.success) toast.error(result.error);
  };

  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* Left side - Carousel (Hidden on mobile) */}
      <div className="hidden lg:flex w-[50%] relative overflow-hidden bg-black/90 border-r border-[var(--border-1)]">
        {/* Dynamic Image Background */}
        {CAROUSEL_ITEMS.map((item, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover opacity-60 scale-105 transform translate-y-[-2%] transition-transform duration-[10000ms] ease-out"
              style={{ transform: idx === currentSlide ? 'scale(1)' : 'scale(1.05)' }}
            />
          </div>
        ))}

        {/* Carousel Content */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-16 pb-24">
          <div className="flex gap-3 mb-6">
            {CAROUSEL_ITEMS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentSlide ? 'w-8 bg-brand-400' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
              />
            ))}
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 animate-slide-up">
            {CAROUSEL_ITEMS[currentSlide].title}
          </h2>
          <p className="text-lg text-surface-300 max-w-md animate-slide-up" style={{ animationDelay: '100ms' }}>
            {CAROUSEL_ITEMS[currentSlide].subtitle}
          </p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 relative">
        {/* Background blobs for form side */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="w-full max-w-sm relative animate-fade-in z-10">
          {/* Logo & Header */}
          <div className="mb-10 text-center lg:text-left flex flex-col items-center lg:items-start">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-glow mb-6">
              <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
                <path d="M6 18C6 11.373 11.373 6 18 6" stroke="white" strokeWidth="3" strokeLinecap="round" />
                <path d="M30 18C30 24.627 24.627 30 18 30" stroke="white" strokeWidth="3" strokeLinecap="round" />
                <circle cx="18" cy="18" r="4" fill="white" />
                <path d="M18 6V10M18 26V30M6 18H10M26 18H30" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-tx-primary tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-surface-500 text-sm mt-2">
              {mode === 'login' ? 'Sign in to access your workspace seamlessly.' : 'Start building APIs with your team.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {mode === 'signup' && (
              <div>
                <label className="block text-tx-primary text-xs font-semibold mb-1.5 uppercase tracking-wide">Full Name</label>
                <input
                  className="input w-full py-2.5"
                  type="text"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-tx-primary text-xs font-semibold mb-1.5 uppercase tracking-wide">Email Address</label>
              <input
                className="input w-full py-2.5"
                type="email"
                placeholder="hello@syncnest.dev"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-tx-primary text-xs font-semibold mb-1.5 uppercase tracking-wide">Password</label>
              <input
                className="input w-full py-2.5"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 text-sm font-medium mt-2 shadow-glow" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-8 text-center lg:text-left">
            <span className="text-surface-500 text-sm">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-brand-400 hover:text-brand-300 font-medium text-sm transition-colors focus:outline-none"
            >
              {mode === 'login' ? 'Sign up for free' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
