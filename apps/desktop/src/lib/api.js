import axios from 'axios';
import { useSyncQueueStore } from '@/store/syncQueueStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('syncnest_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('syncnest_token');
      window.location.href = '/';
      return Promise.reject(error);
    }

    // Offline Queue Interceptor Handler
    const isNetworkError = !navigator.onLine || error.code === 'ERR_NETWORK' || error.message === 'Network Error';
    if (isNetworkError && error.config && error.config.offlineMock && !error.config.disableOfflineMock) {
      console.log('[API] Offline mutation intercepted, queuing to sync Queue:', error.config.url);
      
      // Enqueue to background worker
      useSyncQueueStore.getState().enqueue(error.config);
      
      // Resolve seamlessly so the UI proceeds with optimistic updates
      return Promise.resolve({ data: error.config.offlineMock });
    }

    return Promise.reject(error);
  }
);

export default api;
