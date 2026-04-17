import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/api/auth/login', { email, password });
          localStorage.setItem('payloadx_token', data.token);
          set({ user: data.user, token: data.token, isLoading: false });
          return { success: true };
        } catch (err) {
          const error = err.response?.data?.error || 'Login failed';
          set({ isLoading: false, error });
          return { success: false, error };
        }
      },

      signup: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/api/auth/signup', { name, email, password });
          localStorage.setItem('payloadx_token', data.token);
          set({ user: data.user, token: data.token, isLoading: false });
          return { success: true };
        } catch (err) {
          const error = err.response?.data?.error || 'Signup failed';
          set({ isLoading: false, error });
          return { success: false, error };
        }
      },

      logout: async () => {
        // Full data wipe
        localStorage.clear();
        const { useSyncQueueStore } = await import('@/store/syncQueueStore');
        useSyncQueueStore.getState().clearQueue();
        
        set({ user: null, token: null });
        window.location.href = '/'; // Redirect and reload to clear in-memory stores
      },

      fetchMe: async () => {
        const token = localStorage.getItem('payloadx_token');
        if (!token) return;

        if (!navigator.onLine) {
          // App initialized without an internet connection,
          // simply rely on persisted zustand state rather than kicking them out.
          return;
        }

        try {
          const { data } = await api.get('/api/auth/me');
          set({ user: data.user, token });
        } catch (err) {
          // If the internet drops the instant the request fires
          if (err.message === 'Network Error' || err.code === 'ERR_NETWORK' || !navigator.onLine) {
            return;
          }
          
          localStorage.removeItem('payloadx_token');
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: 'syncnest-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
