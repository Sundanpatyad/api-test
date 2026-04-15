import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import api from '@/lib/api';

const defaultRequest = () => ({
  _id: null,
  name: 'Untitled Request',
  method: 'GET',
  url: '',
  headers: [{ id: uuidv4(), key: '', value: '', enabled: true }],
  params:  [{ id: uuidv4(), key: '', value: '', enabled: true }],
  body: { mode: 'none', raw: '', rawLanguage: 'json', formData: [], urlencoded: [] },
  auth: { type: 'none', bearer: { token: '' }, basic: { username: '', password: '' }, apikey: { key: '', value: '', in: 'header' } },
  collectionId: null,
  projectId: null,
  teamId: null,
});

export const useRequestStore = create(
  persist(
    (set, get) => ({
      currentRequest: defaultRequest(),
      response: null,
      isExecuting: false,
      history: [],
      activeTab: 'params',

      setCurrentRequest: (req) => set({ currentRequest: { ...defaultRequest(), ...req } }),

      updateField: (field, value) =>
        set((state) => ({
          currentRequest: { ...state.currentRequest, [field]: value },
        })),

      updateBody: (bodyUpdate) =>
        set((state) => ({
          currentRequest: {
            ...state.currentRequest,
            body: { ...state.currentRequest.body, ...bodyUpdate },
          },
        })),

      updateAuth: (authUpdate) =>
        set((state) => ({
          currentRequest: {
            ...state.currentRequest,
            auth: { ...state.currentRequest.auth, ...authUpdate },
          },
        })),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setResponse: (response) => set({ response }),

      setIsExecuting: (isExecuting) => set({ isExecuting }),

      addToHistory: (entry) =>
        set((state) => ({
          history: [entry, ...state.history].slice(0, 50),
        })),

      newRequest: () => set({ currentRequest: defaultRequest(), response: null }),

      saveRequest: async () => {
        const req = get().currentRequest;
        try {
          if (req._id) {
            const { data } = await api.put(`/api/request/${req._id}`, req);
            set({ currentRequest: data.request });
            return { success: true };
          } else if (req.collectionId) {
            const { data } = await api.post('/api/request', req);
            set({ currentRequest: data.request });
            return { success: true, request: data.request };
          }
        } catch (err) {
          return { success: false, error: err.response?.data?.error || 'Save failed' };
        }
      },
    }),
    {
      name: 'syncnest-request',
      partialize: (state) => ({ currentRequest: state.currentRequest, history: state.history }),
    }
  )
);
