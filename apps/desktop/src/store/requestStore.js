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

const syncParamsFromUrl = (url, currentParams = []) => {
  const parts = (url || '').split('?');
  if (parts.length < 2) {
    const disabled = currentParams.filter((p) => p.enabled === false);
    return disabled.length ? disabled : [{ id: uuidv4(), key: '', value: '', enabled: true }];
  }

  const qStr = parts.slice(1).join('?');
  const pairs = qStr ? qStr.split('&') : [];
  
  let newParams = pairs.map(pair => {
    const [key, ...valParts] = pair.split('=');
    return {
      id: uuidv4(),
      key: key || '',
      value: valParts.join('=') || '',
      enabled: true
    };
  });

  const disabledParams = currentParams.filter(p => p.enabled === false);
  newParams = [...newParams, ...disabledParams];

  // Append empty row if last row is filled
  if (newParams.length === 0 || newParams[newParams.length - 1].key || newParams[newParams.length - 1].value) {
    newParams.push({ id: uuidv4(), key: '', value: '', enabled: true });
  }
  
  return newParams;
};

const syncUrlFromParams = (url, currentParams = []) => {
  const baseUrl = (url || '').split('?')[0];
  const activeParams = currentParams.filter(p => p.enabled !== false && (p.key || p.value));
  
  if (activeParams.length === 0) return baseUrl;
  
  const qs = activeParams.map(p => {
    if (!p.key && p.value) return `=${p.value}`;
    if (p.key && !p.value) return `${p.key}=`;
    return `${p.key}=${p.value}`;
  }).join('&');
  
  return `${baseUrl}?${qs}`;
};

export const useRequestStore = create(
  persist(
    (set, get) => ({
      currentRequest: defaultRequest(),
      response: null,
      isExecuting: false,
      cancelCurrentRequest: null,
      history: [],
      activeTab: 'params',

      setCurrentRequest: (req) => 
        set({ 
          currentRequest: { 
            ...defaultRequest(), 
            ...req,
            url: syncUrlFromParams(req.url || '', req.params || []) 
          } 
        }),

      updateField: (field, value) =>
        set((state) => {
          const req = { ...state.currentRequest, [field]: value };
          if (field === 'url') {
            req.params = syncParamsFromUrl(value, req.params);
          } else if (field === 'params') {
            req.url = syncUrlFromParams(req.url, value);
          }
          return { currentRequest: req };
        }),

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
        set((state) => {
          // Emergency cache clearer: Strip out huge bodies from old history entries
          const cleanedHistory = state.history.map(item => ({
            ...item,
            response: item.response ? { ...item.response, body: '[Body hidden in history]' } : undefined
          }));
          return {
            history: [entry, ...cleanedHistory].slice(0, 50),
          };
        }),

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
