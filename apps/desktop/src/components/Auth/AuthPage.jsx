import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import toast from 'react-hot-toast';
import logoImg from '@/assets/logo.png';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login, signup, loginWithGoogle, isLoading } = useAuthStore();
  
  const processingOAuth = useRef(false);

  const GOOGLE_CLIENT_ID = "382570154047-3o3mts9ee2nnvlkg9dmq1hdqvs26249q.apps.googleusercontent.com";

  useEffect(() => {
    // Listen for the OAuth callback from Rust
    let unlisten;
    const setupListener = async () => {
      unlisten = await listen('oauth_callback', async (event) => {
        // Prevent duplicate processing
        if (processingOAuth.current) return;
        processingOAuth.current = true;
        
        const url = new URL(event.payload);
        const params = new URLSearchParams(url.search || url.hash.substring(1));
        const code = params.get('code');
        const port = url.port || url.origin.split(':').pop();
        const redirectUri = `http://localhost:${port}/`;
        
        if (code) {
          setIsGoogleLoading(true);
          const result = await loginWithGoogle({ code, redirectUri });
          setIsGoogleLoading(false);
          if (!result.success) {
            toast.error(result.error);
            processingOAuth.current = false; // Allow retry if failed
          }
        } else {
          console.error('[Google Auth] No code found in callback URL:', event.payload);
          processingOAuth.current = false;
        }
      });
    };

    setupListener();
    return () => {
      if (unlisten) unlisten().then(u => u && u());
    };
  }, [loginWithGoogle]);

  const handleGoogleLogin = async () => {
    if (isLoading || isGoogleLoading) return;
    
    try {
      processingOAuth.current = false; // Reset for new attempt
      // 1. Start the local listener via Rust and get the port
      const port = await invoke('start_oauth_flow');
      const redirectUri = `http://localhost:${port}/`;

      // 2. Construct Google Auth URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
        `client_id=${GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid email profile')}`;

      // 3. Open in System Browser
      await invoke('system_open', { url: authUrl });
    } catch (error) {
      console.error('[Google Auth] Initialiation Failed:', error);
      toast.error('Failed to start Google login');
    }
  };

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

  // Google icon SVG
  const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  // X (Twitter) icon SVG
  const XIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );

  // Check icon for password requirements
  const CheckIcon = () => (
    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );

  // Eye icons for password visibility toggle
  const EyeOpenIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  const EyeClosedIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden font-sans">
      {/* ── Left Side: Auth Form ── */}
      <div className="w-full lg:w-[45%] flex flex-col bg-[#0a0a0a] relative">
        {/* App Logo */}
        <div className="absolute top-6 left-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <img src={logoImg} alt="PayloadX" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-white font-semibold text-sm">PayloadX</span>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 max-w-[480px] mx-auto w-full">
          <div className="space-y-6">
            {/* Heading */}
            <h1 className="text-2xl font-semibold text-white">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              <button 
                onClick={() => handleGoogleLogin()}
                className="w-full h-11 flex items-center justify-center gap-3 bg-transparent border border-slate-700 rounded-lg text-white hover:border-slate-600 transition-colors"
                disabled={isLoading}
              >
                <GoogleIcon />
                <span className="text-sm font-medium">Sign in with Google</span>
              </button>
          
            </div>

            {/* OR Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-800"></div>
              <span className="text-xs text-slate-500 uppercase">OR</span>
              <div className="flex-1 h-px bg-slate-800"></div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-400">Full Name</label>
                  <input
                    className="w-full h-11 px-4 bg-[#141414] border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:border-slate-600 outline-none transition-colors text-sm"
                    type="text"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm text-slate-400">Email*</label>
                <input
                  className="w-full h-11 px-4 bg-[#141414] border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:border-slate-600 outline-none transition-colors text-sm"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-slate-400">Password*</label>
                <div className="relative">
                  <input
                    className="w-full h-11 px-4 pr-12 bg-[#141414] border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:border-slate-600 outline-none transition-colors text-sm"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              {mode === 'signup' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckIcon />
                    <span>Must be at least 8 characters</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckIcon />
                    <span>Must contain one special character</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full h-11 bg-[#1a1a1a] hover:bg-[#252525] border border-slate-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  mode === 'login' ? 'Sign in' : 'Create account'
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-center gap-1 text-sm text-slate-500 pt-2">
              <span>{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}</span>
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-white underline hover:no-underline transition-all"
              >
                {mode === 'login' ? 'Log in' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Side: App Preview ── */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#111111] relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#111111] via-[#0d0d0d] to-[#111111]" />
        
        {/* Content */}
        <div className="relative z-10 w-full h-full flex flex-col p-12">
          {/* Header Tagline */}
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-white mb-2">
              Build and test APIs faster
            </h2>
            <p className="text-slate-500 text-base">
              Collaborate in real-time with your team. Test REST, GraphQL, and WebSocket APIs with powerful tools.
            </p>
          </div>

          {/* App Preview Card */}
          <div className="flex-1 bg-[#0d0d0d] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Mock App Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">P</span>
                </div>
                <div>
                  <div className="text-white text-sm font-medium">PayloadX Team</div>
                  <div className="text-slate-500 text-xs">hello@payloadx.com</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
            </div>

            {/* Mock App Content */}
            <div className="flex h-[calc(100%-65px)]">
              {/* Sidebar */}
              <div className="w-48 border-r border-slate-800 p-3 space-y-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800/50">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="text-sm text-white">Home</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-800/30">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-sm text-slate-400">My projects</span>
                </div>
                <div className="pt-4">
                  <div className="flex items-center justify-between px-3 mb-2">
                    <span className="text-xs text-slate-500 uppercase font-medium">Folders</span>
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-sm text-slate-400">View all</span>
                      <span className="text-xs text-slate-600">48</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-sm text-slate-400">Recent</span>
                      <span className="text-xs text-slate-600">6</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-sm text-slate-400">Favorites</span>
                      <span className="text-xs text-slate-600">4</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-sm text-slate-400">Shared</span>
                      <span className="text-xs text-slate-600">22</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Welcome back</h3>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-sm text-slate-500">Search</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-4 gap-3 mb-8">
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center mb-3">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-sm text-slate-300">GET Request</span>
                  </div>
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                      <span className="text-blue-400 text-xs font-bold">POST</span>
                    </div>
                    <span className="text-sm text-slate-300">POST Request</span>
                  </div>
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-3">
                      <span className="text-yellow-400 text-xs font-bold">PUT</span>
                    </div>
                    <span className="text-sm text-slate-300">PUT Request</span>
                  </div>
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center mb-3">
                      <span className="text-red-400 text-xs font-bold">DEL</span>
                    </div>
                    <span className="text-sm text-slate-300">DEL Request</span>
                  </div>
                </div>

                {/* API Collections Section */}
                <div>
                  <div className="flex items-center gap-6 mb-4 border-b border-slate-800 pb-3">
                    <span className="text-sm text-white font-medium">Collections</span>
                    <span className="text-sm text-slate-500">History</span>
                    <span className="text-sm text-slate-500">Environments</span>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Collection Item 1 */}
                    <div className="flex items-center gap-3 p-3 bg-slate-800/20 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <span className="text-green-400 text-xs font-bold">GET</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm text-white font-medium">Get Users</h4>
                        <p className="text-xs text-slate-500">/api/users • 200ms</p>
                      </div>
                      <div className="flex -space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-500 border border-slate-700"></div>
                      </div>
                    </div>
                    
                    {/* Collection Item 2 */}
                    <div className="flex items-center gap-3 p-3 bg-slate-800/20 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <span className="text-blue-400 text-xs font-bold">POST</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm text-white font-medium">Create Order</h4>
                        <p className="text-xs text-slate-500">/api/orders • 342ms</p>
                      </div>
                      <div className="flex -space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-purple-500 border border-slate-700"></div>
                        <div className="w-5 h-5 rounded-full bg-pink-500 border border-slate-700"></div>
                      </div>
                    </div>
                    
                    {/* Collection Item 3 */}
                    <div className="flex items-center gap-3 p-3 bg-slate-800/20 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                        <span className="text-yellow-400 text-xs font-bold">PUT</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm text-white font-medium">Update Profile</h4>
                        <p className="text-xs text-slate-500">/api/profile • 156ms</p>
                      </div>
                      <div className="flex -space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-green-500 border border-slate-700"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
