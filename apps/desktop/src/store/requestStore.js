import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { localStorageService } from '@/services/localStorageService';
import { syncService } from '@/services/syncService';
import { v4 as uuidv4 } from 'uuid';

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
      noActiveRequest: false,

      setCurrentRequest: (req) => {
        // Ensure every param and header row has a unique `id`.
        // Rows from the backend only carry MongoDB `_id` — normalise here so
        // ParamsTab / HeadersTab can use `p.id` as a stable React key.
        const ensureIds = (arr = []) =>
          arr.map((item) => ({
            ...item,
            id: item.id || (item._id ? String(item._id) : uuidv4()),
          }));

        const newReq = {
          ...defaultRequest(),
          ...req,
          params: ensureIds(req.params),
          headers: ensureIds(req.headers),
          url: syncUrlFromParams(req.url || '', req.params || [])
        };
        set({ currentRequest: newReq, noActiveRequest: false });
        localStorageService.saveCurrentRequest(newReq);
      },

      setNoActiveRequest: (value) => set({ noActiveRequest: value }),

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

      newRequest: () => {
        const newReq = defaultRequest();
        set({ currentRequest: newReq, response: null, noActiveRequest: false });
        localStorageService.saveCurrentRequest(newReq);
      },

      saveRequest: async () => {
        const req = get().currentRequest;
        try {
          if (req._id) {
            const { data } = await api.put(`/api/request/${req._id}`, req, {
              offlineMock: { request: req }
            });
            set({ currentRequest: data.request });
            localStorageService.saveCurrentRequest(data.request);
            const { useSocketStore } = await import('@/store/socketStore');
            const { useAuthStore } = await import('@/store/authStore');
            const { useTeamStore } = await import('@/store/teamStore');
            useSocketStore.getState().emitRequestUpdate(
              useTeamStore.getState().currentTeam?._id, 
              data.request, 
              useAuthStore.getState().user?._id
            );
            return { success: true };
          } else if (req.collectionId) {
            const tempId = uuidv4();
            const { data } = await api.post('/api/request', req, {
              offlineMock: { request: { ...req, _id: tempId }, tempId, resourceType: 'request' }
            });
            set({ currentRequest: data.request });
            localStorageService.saveCurrentRequest(data.request);
            const { useSocketStore } = await import('@/store/socketStore');
            const { useAuthStore } = await import('@/store/authStore');
            const { useTeamStore } = await import('@/store/teamStore');
            useSocketStore.getState().emitRequestCreated(
              useTeamStore.getState().currentTeam?._id, 
              data.request, 
              useAuthStore.getState().user?._id
            );
            return { success: true, request: data.request };
          }
        } catch (err) {
          return { success: false, error: err.response?.data?.error || 'Save failed' };
        }
      },

      createRequest: async (requestData) => {
        const tempId = uuidv4();
        const { collectionId } = requestData;
        
        const tempRequest = { ...requestData, _id: tempId, isOffline: true };
        
        // Optimistically add to collection store
        const { useCollectionStore } = await import('@/store/collectionStore');
        const collectionStore = useCollectionStore.getState();
        collectionStore.addRequest(tempRequest);
        
        try {
          const { data } = await api.post('/api/request', requestData, {
            offlineMock: { request: tempRequest, tempId, resourceType: 'request' }
          });
          
          if (data.request?._id) {
            syncService.registerIdMapping(tempId, data.request._id);
            
            // Replace temp request with real one in collection store
            collectionStore.removeRequest(tempId, collectionId);
            collectionStore.addRequest(data.request);

            const { useSocketStore } = await import('@/store/socketStore');
            const { useAuthStore } = await import('@/store/authStore');
            const { useTeamStore } = await import('@/store/teamStore');
            useSocketStore.getState().emitRequestCreated(
              useTeamStore.getState().currentTeam?._id, 
              data.request, 
              useAuthStore.getState().user?._id
            );
          }
          
          return { success: true, request: data.request };
        } catch (err) {
          if (!navigator.onLine) {
            syncService.queueChange('create_request', { ...requestData, tempId }, tempId);
            return { success: true, request: tempRequest, offline: true };
          }
          
          // Revert optimistic update on error
          collectionStore.removeRequest(tempId, collectionId);
          return { success: false, error: err.response?.data?.error || 'Failed to create request' };
        }
      },

      updateRequestName: async (id, name) => {
        const currentReq = get().currentRequest;
        const isTempId = id?.includes('-');
        
        // Optimistic update
        if (currentReq?._id === id) {
          set({ currentRequest: { ...currentReq, name } });
        }
        
        try {
          // If temp ID, queue for later sync
          if (isTempId) {
            syncService.queueChange('update_request', { id, name }, id);
            return { success: true, request: { ...currentReq, name }, offline: true };
          }
          
          const { data } = await api.put(`/api/request/${id}`, { name }, {
            offlineMock: { request: { ...currentReq, _id: id, name } }
          });
          if (currentReq?._id === id) {
            const updated = { ...currentReq, name };
            set({ currentRequest: updated });
            localStorageService.saveCurrentRequest(updated);
          }
          return { success: true, request: data.request };
        } catch (err) {
          return { success: false, error: err.response?.data?.error || 'Failed to update request' };
        }
      },

      refreshRequest: async (id) => {
        if (!id) return { success: false, error: 'No request ID' };
        try {
          const { data } = await api.get(`/api/request/${id}`);
          const currentReq = get().currentRequest;
          if (currentReq?._id === id) {
            set({ currentRequest: data.request });
            localStorageService.saveCurrentRequest(data.request);
          }
          // Also save to collection requests cache
          if (data.request?.collectionId) {
            const existingRequests = localStorageService.getRequests(data.request.collectionId);
            const updatedRequests = existingRequests.map(r => r._id === id ? data.request : r);
            localStorageService.saveRequests(data.request.collectionId, updatedRequests);
          }
          localStorageService.updateLastSync();
          return { success: true, request: data.request, fromCache: false };
        } catch (err) {
          // Try to get from localStorage
          const cachedRequest = localStorageService.get(localStorageService.KEYS.CURRENT_REQUEST);
          if (cachedRequest?._id === id) {
            const currentReq = get().currentRequest;
            if (currentReq?._id === id) {
              set({ currentRequest: cachedRequest });
            }
            return { 
              success: true, 
              request: cachedRequest, 
              fromCache: true,
              error: 'Failed to refresh. Using cached data.' 
            };
          }
          return { 
            success: false, 
            fromCache: false,
            error: err.response?.data?.error || 'Failed to refresh request' 
          };
        }
      },

      getCachedRequest: (id, collectionId) => {
        // Try current request first
        const currentReq = get().currentRequest;
        if (currentReq?._id === id) return currentReq;
        
        // Try collection requests
        if (collectionId) {
          const collectionRequests = localStorageService.getRequests(collectionId);
          const found = collectionRequests.find(r => r._id === id);
          if (found) return found;
        }
        
        // Try all stored requests
        const allRequests = localStorageService.get(localStorageService.KEYS.REQUESTS) || {};
        for (const collId in allRequests) {
          const found = allRequests[collId].find(r => r._id === id);
          if (found) return found;
        }
        
        return null;
      },

      deleteRequest: async (id, collectionId) => {
        const isTempId = id?.includes('-');
        
        // Optimistically remove from localStorage
        if (collectionId) {
          const stored = localStorageService.getRequests(collectionId);
          localStorageService.saveRequests(collectionId, stored.filter((r) => r._id !== id));
        }
        
        try {
          if (isTempId) {
            // Just remove from queue if pending
            return { success: true };
          }
          
          await api.delete(`/api/request/${id}`, { offlineMock: { success: true } });
          
          const { useSocketStore } = await import('@/store/socketStore');
          const { useAuthStore } = await import('@/store/authStore');
          const { useTeamStore } = await import('@/store/teamStore');
          useSocketStore.getState().emitRequestDeleted(
            useTeamStore.getState().currentTeam?._id, 
            collectionId,
            id,
            useAuthStore.getState().user?._id
          );
          
          return { success: true };
        } catch (err) {
          if (!navigator.onLine) {
            syncService.queueChange('delete_request', { id, collectionId }, id);
            return { success: true, offline: true };
          }
          
          // Revert on error - restore to localStorage
          if (collectionId) {
            const stored = localStorageService.getRequests(collectionId);
            const existing = stored.find(r => r._id === id);
            if (existing) {
              localStorageService.saveRequests(collectionId, [...stored, existing]);
            }
          }
          return { success: false, error: err.response?.data?.error || 'Failed to delete request' };
        }
      },
      
      // Helper to reconcile IDs after sync
      reconcileIds: (requests, idMap) => {
        return requests.map(request => {
          const realId = idMap[request._id];
          if (realId) {
            return { ...request, _id: realId };
          }
          return request;
        });
      },
      
      // Check if server data has items we don't have locally (or deleted items)
      syncWithServerData: (serverRequests, collectionId) => {
        const currentRequests = localStorageService.getRequests(collectionId);
        const serverRequestIds = new Set(serverRequests.map(r => r._id));
        const idMap = syncService.idMap;
        
        // Find requests that exist locally but not on server
        const requestsToRemove = currentRequests.filter(request => {
          const isTempId = request._id?.includes('-');
          if (isTempId) return false;
          return !serverRequestIds.has(request._id) && !idMap[request._id];
        });
        
        const reconciledServerRequests = get().reconcileIds(serverRequests, idMap);
        const tempIdRequests = currentRequests.filter(r => r._id?.includes('-') && !idMap[r._id]);
        
        const merged = [...reconciledServerRequests];
        tempIdRequests.forEach(tempRequest => {
          if (!merged.find(r => r._id === tempRequest._id)) {
            merged.push(tempRequest);
          }
        });
        
        // Save merged to localStorage
        localStorageService.saveRequests(collectionId, merged);
        
        return merged;
      },
    }),
    {
      name: 'syncnest-request',
      partialize: (state) => ({ currentRequest: state.currentRequest, history: state.history }),
      merge: (persistedState, currentState) => {
        if (persistedState?.currentRequest) {
          const ensureIds = (arr = []) =>
            arr.map((item) => ({
              ...item,
              id: item.id || (item._id ? String(item._id) : uuidv4()),
            }));
          persistedState.currentRequest.params = ensureIds(persistedState.currentRequest.params);
          persistedState.currentRequest.headers = ensureIds(persistedState.currentRequest.headers);
        }
        return { ...currentState, ...persistedState };
      },
    }
  )
);
