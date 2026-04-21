import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { localStorageService } from '@/services/localStorageService';
import { syncService } from '@/services/syncService';
import { v4 as uuidv4 } from 'uuid';
import { useConnectivityStore } from '@/store/connectivityStore';
import toast from 'react-hot-toast';

const defaultRequest = () => ({
  _id: null,
  name: 'Untitled Request',
  method: 'GET',
  protocol: 'http', // 'http' | 'ws' | 'socketio'
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
      openTabs: [],
      activeTabId: null,

      setCurrentRequest: (req) => {
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
        
        set((state) => {
          const existingTab = state.openTabs.find(t => t.id === newReq._id);
          localStorageService.saveCurrentRequest(newReq);
          
          if (existingTab) {
            return { currentRequest: newReq, noActiveRequest: false, activeTabId: existingTab.id };
          }
          
          const newTabId = newReq._id || uuidv4();
          const newTab = { id: newTabId, request: newReq, originalRequest: JSON.parse(JSON.stringify(newReq)), isDirty: false };
          return {
            currentRequest: newReq,
            noActiveRequest: false,
            openTabs: [...state.openTabs, newTab],
            activeTabId: newTabId
          };
        });
      },

      setNoActiveRequest: (value) => set({ noActiveRequest: value }),

      setActiveTabId: (id) => {
        set((state) => {
           const tab = state.openTabs.find(t => t.id === id);
           if (!tab) return state;
           localStorageService.saveCurrentRequest(tab.request);
           return { activeTabId: id, currentRequest: tab.request, noActiveRequest: false };
        });
      },

      closeTab: (id) => {
        set((state) => {
           const newTabs = state.openTabs.filter(t => t.id !== id);
           const isClosingActive = state.activeTabId === id;
           
           if (newTabs.length === 0) {
              return { openTabs: [], activeTabId: null, currentRequest: defaultRequest(), noActiveRequest: true };
           }
           
           if (isClosingActive) {
              const closingIndex = state.openTabs.findIndex(t => t.id === id);
              const nextTab = newTabs[closingIndex - 1] || newTabs[0];
              localStorageService.saveCurrentRequest(nextTab.request);
              return { openTabs: newTabs, activeTabId: nextTab.id, currentRequest: nextTab.request, noActiveRequest: false };
           }
           
           return { openTabs: newTabs };
        });
      },

      closeAllTabs: () => {
        set({ openTabs: [], activeTabId: null, currentRequest: defaultRequest(), noActiveRequest: true });
      },

      closeOtherTabs: (id) => {
        set((state) => {
          const tabToKeep = state.openTabs.find(t => t.id === id);
          if (!tabToKeep) return state;
          
          localStorageService.saveCurrentRequest(tabToKeep.request);
          return { openTabs: [tabToKeep], activeTabId: tabToKeep.id, currentRequest: tabToKeep.request, noActiveRequest: false };
        });
      },

      closeTabsToRight: (id) => {
        set((state) => {
          const index = state.openTabs.findIndex(t => t.id === id);
          if (index === -1) return state;
          
          const newTabs = state.openTabs.slice(0, index + 1);
          
          // If active tab was closed, switch to the target tab
          const activeIndex = state.openTabs.findIndex(t => t.id === state.activeTabId);
          if (activeIndex > index) {
            const nextTab = newTabs[newTabs.length - 1];
            localStorageService.saveCurrentRequest(nextTab.request);
            return { openTabs: newTabs, activeTabId: nextTab.id, currentRequest: nextTab.request };
          }
          
          return { openTabs: newTabs };
        });
      },

      closeTabsToLeft: (id) => {
        set((state) => {
          const index = state.openTabs.findIndex(t => t.id === id);
          if (index <= 0) return state;
          
          const newTabs = state.openTabs.slice(index);
          
          // If active tab was closed, switch to the target tab
          const activeIndex = state.openTabs.findIndex(t => t.id === state.activeTabId);
          if (activeIndex < index) {
            const nextTab = newTabs[0];
            localStorageService.saveCurrentRequest(nextTab.request);
            return { openTabs: newTabs, activeTabId: nextTab.id, currentRequest: nextTab.request };
          }
          
          return { openTabs: newTabs };
        });
      },

      updateField: (field, value) => {
        set((state) => {
          const req = { ...state.currentRequest, [field]: value };
          if (field === 'url') {
            req.params = syncParamsFromUrl(value, req.params);
          } else if (field === 'params') {
            req.url = syncUrlFromParams(req.url, value);
          }
          
          if (field === 'name' && (req._id || req.collectionId)) {
            import('@/store/collectionStore').then(({ useCollectionStore }) => {
              useCollectionStore.getState().updateRequest(req);
            });
          }
          
          const openTabs = [...state.openTabs];
          const tIdx = openTabs.findIndex(t => t.id === state.activeTabId);
          if (tIdx >= 0) openTabs[tIdx] = { ...openTabs[tIdx], request: req, isDirty: true };
          
          return { currentRequest: req, openTabs };
        });
      },

      updateBody: (bodyUpdate) =>
        set((state) => {
          const req = {
            ...state.currentRequest,
            body: { ...state.currentRequest.body, ...bodyUpdate },
          };
          const openTabs = [...state.openTabs];
          const tIdx = openTabs.findIndex(t => t.id === state.activeTabId);
          if (tIdx >= 0) openTabs[tIdx] = { ...openTabs[tIdx], request: req, isDirty: true };
          return { currentRequest: req, openTabs };
        }),

      updateAuth: (authUpdate) =>
        set((state) => {
          const req = {
            ...state.currentRequest,
            auth: { ...state.currentRequest.auth, ...authUpdate },
          };
          const openTabs = [...state.openTabs];
          const tIdx = openTabs.findIndex(t => t.id === state.activeTabId);
          if (tIdx >= 0) openTabs[tIdx] = { ...openTabs[tIdx], request: req, isDirty: true };
          return { currentRequest: req, openTabs };
        }),

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
        if (!navigator.onLine) {
          toast.error('You are offline. Cannot save request.');
          return { success: false, error: 'Offline' };
        }

        const req = get().currentRequest;

        try {
          if (req._id) {
            const { data } = await api.put(`/api/request/${req._id}`, req);
            
            set(state => {
              const newTabs = [...state.openTabs];
              const idx = newTabs.findIndex(t => t.id === state.activeTabId);
              if (idx >= 0) newTabs[idx] = { ...newTabs[idx], request: data.request, originalRequest: JSON.parse(JSON.stringify(data.request)), isDirty: false };
              return { currentRequest: data.request, openTabs: newTabs };
            });
            
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
            const { data } = await api.post('/api/request', req);
            
            set(state => {
              const newTabs = [...state.openTabs];
              const idx = newTabs.findIndex(t => t.id === state.activeTabId);
              if (idx >= 0) newTabs[idx] = { id: data.request._id, request: data.request, originalRequest: JSON.parse(JSON.stringify(data.request)), isDirty: false };
              return { currentRequest: data.request, openTabs: newTabs, activeTabId: data.request._id };
            });
            
            localStorageService.saveCurrentRequest(data.request);
            const { useSocketStore } = await import('@/store/socketStore');
            const { useAuthStore } = await import('@/store/authStore');
            const { useTeamStore } = await import('@/store/teamStore');
            const { useCollectionStore } = await import('@/store/collectionStore');
            
            useCollectionStore.getState().addRequest(data.request);

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
      },      createRequest: async (requestData) => {
        if (!navigator.onLine) {
          toast.error('You are offline. Cannot create request.');
          return { success: false, error: 'Offline' };
        }

        const { collectionId } = requestData;
        const { useCollectionStore } = await import('@/store/collectionStore');
        const collectionStore = useCollectionStore.getState();

        try {
          const { data } = await api.post('/api/request', requestData);
          
          if (data.request?._id) {
            // Add request to collection store
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
          return { success: false, error: err.response?.data?.error || 'Failed to create request' };
        }
      },

      updateRequestName: async (id, name) => {
        if (!navigator.onLine) {
          toast.error('You are offline. Cannot update request.');
          return { success: false, error: 'Offline' };
        }

        const currentReq = get().currentRequest;
        try {
          const { data } = await api.put(`/api/request/${id}`, { name });
          if (currentReq?._id === id) {
            const updated = { ...currentReq, name: data.request.name };
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
        if (!navigator.onLine) {
          toast.error('You are offline. Cannot delete request.');
          return { success: false, error: 'Offline' };
        }

        const isNotFound = (err) => err.response?.status === 404 || err.response?.data?.error?.includes('not found');

        try {
          await api.delete(`/api/request/${id}`);
          
          const { useSocketStore } = await import('@/store/socketStore');
          const { useAuthStore } = await import('@/store/authStore');
          const { useTeamStore } = await import('@/store/teamStore');
          useSocketStore.getState().emitRequestDeleted(
            useTeamStore.getState().currentTeam?._id, 
            collectionId,
            id,
            useAuthStore.getState().user?._id
          );
        } catch (err) {
          // If not found on server, still clean up locally
          if (!isNotFound(err)) {
            return { success: false, error: err.response?.data?.error || 'Failed to delete request' };
          }
          // Continue to local cleanup for 404 errors
        }

        // Clean up local state regardless of server response (for 404 or success)
        if (collectionId) {
          const { useCollectionStore } = await import('@/store/collectionStore');
          useCollectionStore.getState().removeRequest(id, collectionId);
        }
        
        // Also clean from request store's local state
        set((state) => {
          const isCurrent = state.currentRequest?._id === id;
          return {
            requests: state.requests ? state.requests.filter(r => r._id !== id) : [],
            currentRequest: isCurrent ? null : state.currentRequest,
            noActiveRequest: isCurrent ? true : state.noActiveRequest,
          };
        });
        
        return { success: true };
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
      
      // Syncs all requests for a project or team at once
      bulkSyncWithServerData: (serverRequests) => {
        // Group server requests by collectionId for easier reconciliation
        const serverRequestsByCollection = serverRequests.reduce((acc, req) => {
          if (!acc[req.collectionId]) acc[req.collectionId] = [];
          acc[req.collectionId].push(req);
          return acc;
        }, {});

        const idMap = syncService.idMap;
        const allLocalRequestsMap = localStorageService.get(localStorageService.KEYS.REQUESTS) || {};
        const updatedLocalRequestsMap = { ...allLocalRequestsMap };

        // Process each collection affected by the server data
        Object.keys(serverRequestsByCollection).forEach(collectionId => {
          const collectionServerReqs = serverRequestsByCollection[collectionId];
          const serverIdsForColl = new Set(collectionServerReqs.map(r => r._id));
          const currentLocalReqs = allLocalRequestsMap[collectionId] || [];

          // 1. Reconcile matching and new items
          const reconciledServerReqs = get().reconcileIds(collectionServerReqs, idMap);
          
          // 2. Keep local temp-ID requests that haven't synced yet
          const tempIdRequests = currentLocalReqs.filter(r => r._id?.includes('-') && !idMap[r._id]);
          
          const merged = [...reconciledServerReqs];
          tempIdRequests.forEach(tempReq => {
            if (!merged.find(r => r._id === tempReq._id)) {
              merged.push(tempReq);
            }
          });

          updatedLocalRequestsMap[collectionId] = merged;
        });

        // Optional: Remove local requests for collections that exist in serverData but are empty?
        // Actually, the user wants: "if those request who are present in laocl db but not come in in remove feom local db"
        // This is tricky if serverRequests is only a partial list. 
        // But if syncAll fetches ALL requests for a team, then any local request NOT in the list should be removed.
        
        // Final save
        set({ requests: serverRequests }); // Update memory state
        localStorageService.set(localStorageService.KEYS.REQUESTS, updatedLocalRequestsMap);
        
        return updatedLocalRequestsMap;
      },

      reset: () => {
        set({
          currentRequest: defaultRequest(),
          response: null,
          isExecuting: false,
          cancelCurrentRequest: null,
          history: [],
          activeTab: 'params',
          noActiveRequest: false
        });
      }
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

export const resetRequestStore = () => useRequestStore.getState().reset();

// Final addition inside the store (re-defining slightly to include reset in the persist block)
// I will just add it to the end of the (set, get) block.
