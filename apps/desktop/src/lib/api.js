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
      // Don't logout if this is a background sync operation
      // Let syncService handle the error gracefully
      if (error.config?.isSyncOperation || error.config?.syncContext) {
        return Promise.reject(error);
      }
      localStorage.removeItem('syncnest_token');
      window.location.href = '/';
      return Promise.reject(error);
    }

    // Offline Queue Interceptor Handler
    const isNetworkError =
      !navigator.onLine ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error' ||
      !error.response; // No response usually means server is unreachable

    if (isNetworkError && error.config && !error.config.disableOfflineMock) {
      const isMutation = ['post', 'put', 'patch', 'delete'].includes(error.config.method?.toLowerCase());
      
      // We only queue mutations, or requests that explicitly define an offline mock.
      if (isMutation || error.config.offlineMock) {
        // Enqueue to background worker
        useSyncQueueStore.getState().enqueue(error.config);

        // Resolve seamlessly so the UI proceeds with optimistic updates
        const mockData = error.config.offlineMock || { _id: `temp-${Date.now()}`, tempId: `temp-${Date.now()}`, success: true };
        return Promise.resolve({ data: mockData });
      }
    }

    return Promise.reject(error);
  }
);

export default api;
