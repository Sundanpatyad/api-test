import { create } from 'zustand';
import api from '@/lib/api';

export const useCollectionStore = create((set, get) => ({
  collections: [],
  currentCollection: null,
  requests: [],
  isLoading: false,

  fetchCollections: async (projectId) => {
    if (!projectId) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/collection', { params: { projectId } });
      set({ collections: data.collections, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchCollectionRequests: async (collectionId) => {
    try {
      const { data } = await api.get(`/api/collection/${collectionId}`);
      set({ currentCollection: data.collection, requests: data.requests });
      return data;
    } catch (err) {
      return null;
    }
  },

  createCollection: async (name, projectId, teamId, description) => {
    try {
      const { data } = await api.post('/api/collection', { name, projectId, teamId, description });
      set((state) => ({ collections: [data.collection, ...state.collections] }));
      return { success: true, collection: data.collection };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed' };
    }
  },

  updateCollection: (collection) => {
    set((state) => ({
      collections: state.collections.map((c) => (c._id === collection._id ? collection : c)),
      currentCollection: state.currentCollection?._id === collection._id ? collection : state.currentCollection,
    }));
  },

  updateCollectionName: async (id, name) => {
    try {
      const { data } = await api.put(`/api/collection/${id}`, { name });
      set((state) => ({
        collections: state.collections.map((c) => (c._id === id ? data.collection : c)),
        currentCollection: state.currentCollection?._id === id ? data.collection : state.currentCollection,
      }));
      return { success: true, collection: data.collection };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to update collection' };
    }
  },

  addRequest: (request) => {
    set((state) => ({ requests: [...state.requests, request] }));
  },

  updateRequest: (request) => {
    set((state) => ({
      requests: state.requests.map((r) => (r._id === request._id ? request : r)),
    }));
  },

  setCurrentCollection: (collection) => set({ currentCollection: collection }),

  deleteCollection: async (id) => {
    try {
      await api.delete(`/api/collection/${id}`);
      set((state) => ({
        collections: state.collections.filter((c) => c._id !== id),
        currentCollection: state.currentCollection?._id === id ? null : state.currentCollection,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed' };
    }
  },
}));
