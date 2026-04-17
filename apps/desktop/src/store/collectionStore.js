import { create } from 'zustand';
import api from '@/lib/api';
import { localStorageService } from '@/services/localStorageService';
import { syncService } from '@/services/syncService';
import { useConnectivityStore } from '@/store/connectivityStore';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export const useCollectionStore = create((set, get) => ({
  collections: localStorageService.get(localStorageService.KEYS.COLLECTIONS) || [],
  currentCollection: localStorageService.get(localStorageService.KEYS.CURRENT_COLLECTION) || null,
  requests: [],
  isLoading: false,
  isRefreshing: false,

  initFromStorage: () => {
    const stored = localStorageService.get(localStorageService.KEYS.COLLECTIONS);
    const current = localStorageService.get(localStorageService.KEYS.CURRENT_COLLECTION);
    if (stored) set({ collections: stored });
    if (current) set({ currentCollection: current });
  },

  fetchCollections: async (projectId, forceRefresh = false) => {
    if (!projectId) return;

    // If not forcing refresh and we already have collections, just return
    if (!forceRefresh && get().collections.length > 0) {
      return { success: true, collections: get().collections, fromCache: true };
    }

    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/collection', { params: { projectId } });
      if (data?.collections) {
        set({ collections: data.collections, isLoading: false });
        localStorageService.saveCollections(data.collections);
        localStorageService.updateLastSync();
        return { success: true, collections: data.collections, fromCache: false };
      }
      throw new Error('No collections returned from API');
    } catch (err) {
      // Fallback to localStorage on API failure
      const cachedCollections = localStorageService.get(localStorageService.KEYS.COLLECTIONS) || [];
      set({ collections: cachedCollections, isLoading: false });
      return { 
        success: cachedCollections.length > 0, 
        collections: cachedCollections, 
        fromCache: true,
        error: err.response?.data?.error || err.message || 'Failed to fetch collections. Using cached data.' 
      };
    }
  },

  refreshCollections: async (projectId) => {
    if (!projectId) return;
    set({ isRefreshing: true });
    try {
      const { data } = await api.get('/api/collection', { params: { projectId } });
      const serverCollections = data.collections || [];
      
      const syncedCollections = get().syncWithServerData(serverCollections);
      
      set({ collections: syncedCollections, isRefreshing: false });
      localStorageService.saveCollections(syncedCollections);
      localStorageService.updateLastSync();
      
      // Update current collection if it was deleted
      const currentCollection = get().currentCollection;
      if (currentCollection && !syncedCollections.find(c => c._id === currentCollection._id)) {
        set({ currentCollection: syncedCollections[0] || null });
        localStorageService.saveCurrentCollection(syncedCollections[0] || null);
      }
      
      return { success: true, collections: syncedCollections, fromCache: false };
    } catch (err) {
      set({ isRefreshing: false });
      const cachedCollections = get().collections.length > 0 
        ? get().collections 
        : (localStorageService.get(localStorageService.KEYS.COLLECTIONS) || []);
      
      console.log('refreshCollections - Using cached collections:', cachedCollections.length);
      
      if (get().collections.length === 0 && cachedCollections.length > 0) {
        set({ collections: cachedCollections });
      }
      return { 
        success: cachedCollections.length > 0, 
        collections: cachedCollections, 
        fromCache: true,
        error: err.response?.data?.error || 'Failed to refresh. Using existing data.' 
      };
    }
  },

  // Helper to reconcile IDs after sync
  reconcileIds: (collections, idMap) => {
    return collections.map(collection => {
      const realId = idMap[collection._id];
      if (realId) {
        return { ...collection, _id: realId };
      }
      return collection;
    });
  },

  // Check if server data has items we don't have locally (or deleted items)
  syncWithServerData: (serverCollections) => {
    const currentCollections = get().collections;
    const serverCollectionIds = new Set(serverCollections.map(c => c._id));
    const idMap = syncService.idMap;
    
    const collectionsToRemove = currentCollections.filter(collection => {
      const isTempId = collection._id?.includes('-');
      if (isTempId) return false;
      return !serverCollectionIds.has(collection._id) && !idMap[collection._id];
    });
    
    const reconciledServerCollections = get().reconcileIds(serverCollections, idMap);
    const tempIdCollections = currentCollections.filter(c => c._id?.includes('-') && !idMap[c._id]);
    
    const merged = [...reconciledServerCollections];
    tempIdCollections.forEach(tempCollection => {
      if (!merged.find(c => c._id === tempCollection._id)) {
        merged.push(tempCollection);
      }
    });
    
    return merged;
  },

  // Register store for global refresh
  refresh: () => {
    const projectId = get().currentCollection?.projectId;
    if (projectId) {
      get().refreshCollections(projectId);
    }
  },

  fetchCollectionRequests: async (collectionId, forceRefresh = false) => {
    const { useRequestStore } = await import('@/store/requestStore');
    
    // If not forcing refresh, try to load from storage first
    if (!forceRefresh) {
      const cached = get().loadCollectionRequestsFromStorage(collectionId);
      if (cached.success) {
        return { ...cached, fromCache: true };
      }
    }

    try {
      const { data } = await api.get(`/api/collection/${collectionId}`);
      const serverRequests = data.requests || [];
      
      // Sync with server data to remove deleted items and reconcile IDs
      const requestStore = useRequestStore.getState();
      const syncedRequests = requestStore.syncWithServerData(serverRequests, collectionId);
      
      set((state) => {
        // Merge new requests with existing ones for other collections
        const existingRequests = state.requests.filter(r => r.collectionId !== collectionId);
        const newRequests = [...existingRequests, ...syncedRequests];
        return { currentCollection: data.collection, requests: newRequests };
      });
      localStorageService.saveCurrentCollection(data.collection);
      return { ...data, requests: syncedRequests, fromCache: false };
    } catch (err) {
      // Fallback to localStorage on API failure
      const cachedCollection = localStorageService.get(localStorageService.KEYS.CURRENT_COLLECTION);
      const cachedRequests = localStorageService.getRequests(collectionId);
      
      if (cachedCollection?._id === collectionId || !get().currentCollection) {
        set({ currentCollection: cachedCollection });
      }
      // Add cached requests to the store
      set((state) => {
        const existingRequests = state.requests.filter(r => r.collectionId !== collectionId);
        return { requests: [...existingRequests, ...cachedRequests] };
      });
      return { 
        collection: cachedCollection, 
        requests: cachedRequests, 
        fromCache: true,
        error: 'Failed to fetch. Using cached data.' 
      };
    }
  },

  refreshCollectionRequests: async (collectionId) => {
    try {
      const { data } = await api.get(`/api/collection/${collectionId}`);
      // Merge: keep existing requests from other collections, update this collection's requests
      set((state) => {
        const existingRequests = state.requests.filter(r => r.collectionId !== collectionId);
        const mergedRequests = [...existingRequests, ...data.requests];
        return { currentCollection: data.collection, requests: mergedRequests };
      });
      localStorageService.saveCurrentCollection(data.collection);
      localStorageService.saveRequests(collectionId, data.requests);
      localStorageService.updateLastSync();
      return { success: true, collection: data.collection, requests: data.requests, fromCache: false };
    } catch (err) {
      // Keep existing cached data on refresh failure - don't wipe
      const cachedCollection = localStorageService.get(localStorageService.KEYS.CURRENT_COLLECTION);
      const cachedRequests = localStorageService.getRequests(collectionId);
      return { 
        success: true, 
        collection: cachedCollection, 
        requests: cachedRequests, 
        fromCache: true,
        error: err.response?.data?.error || 'Failed to refresh. Using existing data.' 
      };
    }
  },

  // Load from localStorage only - no API call
  loadCollectionRequestsFromStorage: (collectionId) => {
    const cachedCollection = localStorageService.get(localStorageService.KEYS.CURRENT_COLLECTION);
    const cachedRequests = localStorageService.getRequests(collectionId);
    
    // Only update if we have cached data for this collection
    if (cachedRequests.length > 0 || cachedCollection?._id === collectionId) {
      set((state) => {
        // Merge with existing requests from other collections
        const existingRequests = state.requests.filter(r => r.collectionId !== collectionId);
        return { 
          currentCollection: cachedCollection?._id === collectionId ? cachedCollection : state.currentCollection, 
          requests: [...existingRequests, ...cachedRequests] 
        };
      });
      return { success: true, collection: cachedCollection, requests: cachedRequests, fromCache: true };
    }
    return { success: false, requests: [], fromCache: true };
  },

  createCollection: async (name, projectId, teamId, description) => {
    if (!navigator.onLine) {
      toast.error('You are offline. Cannot create collection.');
      return { success: false, error: 'Offline' };
    }

    const tempId = uuidv4();
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/collection', { name, projectId, teamId, description });
      
      set((state) => {
        const updated = [data.collection, ...state.collections];
        localStorageService.saveCollections(updated);
        return { collections: updated, isLoading: false };
      });
      
      if (data.collection?._id) {
        const { useSocketStore } = await import('@/store/socketStore');
        const { useAuthStore } = await import('@/store/authStore');
        const { useTeamStore } = await import('@/store/teamStore');
        useSocketStore.getState().emitCollectionCreated(
          useTeamStore.getState().currentTeam?._id, 
          data.collection, 
          useAuthStore.getState().user?._id
        );
      }
      
      return { success: true, collection: data.collection };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.response?.data?.error || 'Failed to create collection' };
    }
  },

  updateCollection: (collection) => {
    set((state) => {
      const updated = state.collections.map((c) => (c._id === collection._id ? collection : c));
      const updatedCurrent = state.currentCollection?._id === collection._id ? collection : state.currentCollection;
      localStorageService.saveCollections(updated);
      localStorageService.saveCurrentCollection(updatedCurrent);
      return {
        collections: updated,
        currentCollection: updatedCurrent,
      };
    });
  },

  updateCollectionName: async (id, name) => {
    if (!navigator.onLine) {
      toast.error('You are offline. Cannot update collection.');
      return { success: false, error: 'Offline' };
    }

    try {
      const { data } = await api.put(`/api/collection/${id}`, { name });
      
      set((state) => {
        const updated = state.collections.map((c) => (c._id === id ? data.collection : c));
        const updatedCurrent = state.currentCollection?._id === id ? data.collection : state.currentCollection;
        localStorageService.saveCollections(updated);
        localStorageService.saveCurrentCollection(updatedCurrent);
        return {
          collections: updated,
          currentCollection: updatedCurrent,
        };
      });
      
      const { useSocketStore } = await import('@/store/socketStore');
      const { useAuthStore } = await import('@/store/authStore');
      const { useTeamStore } = await import('@/store/teamStore');
      useSocketStore.getState().emitCollectionUpdate(
        useTeamStore.getState().currentTeam?._id, 
        data.collection, 
        useAuthStore.getState().user?._id
      );
      
      return { success: true, collection: data.collection };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to update collection' };
    }
  },

  addRequest: (request) => {
    set((state) => {
      const updated = [...state.requests, request];
      localStorageService.saveRequests(state.currentCollection?._id, updated);
      return { requests: updated };
    });
  },

  updateRequest: (request) => {
    set((state) => {
      const updated = state.requests.map((r) => (r._id === request._id ? request : r));
      localStorageService.saveRequests(state.currentCollection?._id, updated);
      return { requests: updated };
    });
  },

  removeRequest: (requestId, collectionId) => {
    set((state) => {
      const updated = state.requests.filter((r) => r._id !== requestId);
      // Update localStorage for this specific collection
      const collId = collectionId || state.currentCollection?._id;
      if (collId) {
        const stored = localStorageService.getRequests(collId);
        const updatedStored = stored.filter((r) => r._id !== requestId);
        localStorageService.saveRequests(collId, updatedStored);
      }
      return { requests: updated };
    });
  },

  setCurrentCollection: (collection) => {
    set({ currentCollection: collection });
    localStorageService.saveCurrentCollection(collection);
    if (collection) {
      const storedRequests = localStorageService.getRequests(collection._id);
      if (storedRequests.length > 0) {
        set({ requests: storedRequests });
      }
    }
  },

  // Get collections filtered by project ID
  getFilteredCollections: (projectId) => {
    if (!projectId) return [];
    return get().collections.filter(c => String(c.projectId) === String(projectId));
  },

  deleteCollection: async (id) => {
    if (!navigator.onLine) {
      toast.error('You are offline. Cannot delete collection.');
      return { success: false, error: 'Offline' };
    }

    try {
      await api.delete(`/api/collection/${id}`);
      
      const { useSocketStore } = await import('@/store/socketStore');
      const { useAuthStore } = await import('@/store/authStore');
      const { useTeamStore } = await import('@/store/teamStore');
      useSocketStore.getState().emitCollectionDeleted(
        useTeamStore.getState().currentTeam?._id, 
        id, 
        useAuthStore.getState().user?._id
      );

      set((state) => {
        const updated = state.collections.filter((c) => c._id !== id);
        const updatedCurrent = state.currentCollection?._id === id ? null : state.currentCollection;
        localStorageService.saveCollections(updated);
        localStorageService.saveCurrentCollection(updatedCurrent);
        return {
          collections: updated,
          currentCollection: updatedCurrent,
        };
      });
      
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to delete collection' };
    }
  },
}));
