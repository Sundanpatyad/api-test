import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export const useSyncQueueStore = create(
  persist(
    (set, get) => ({
      queue: [],
      isSyncing: false,
      idMap: {}, // Maps temporary offline UUIDs to real MongoDB ObjectIDs

      enqueue: (config) => {
        const mock = config.offlineMock || {};
        set((state) => ({
          queue: [
            ...state.queue,
            {
              id: uuidv4(),
              method: config.method,
              url: config.url,
              data: config.data ? JSON.parse(typeof config.data === 'string' ? config.data : JSON.stringify(config.data)) : undefined,
              tempId: mock.tempId || null,
              resourceType: mock.resourceType || null,
              timestamp: Date.now(),
              retries: 0,
            },
          ],
        }));
      },

      dequeue: (id) => {
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id),
        }));
      },

      incrementRetry: (id) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id ? { ...item, retries: item.retries + 1 } : item
          ),
        }));
      },

      setIsSyncing: (isSyncing) => set({ isSyncing }),

      registerIdMapping: (tempId, realId) => {
        if (!tempId || !realId) return;
        set((state) => ({
          idMap: { ...state.idMap, [tempId]: realId },
        }));
      },

      clearIdMapping: () => set({ idMap: {} }),

      // Helpers to translate IDs in nested objects or URLs before making the actual request
      resolveUrl: (url) => {
        let resolved = url;
        const { idMap } = get();
        Object.entries(idMap).forEach(([tempId, realId]) => {
          resolved = resolved.split(tempId).join(realId);
        });
        return resolved;
      },

      resolveData: (data) => {
        if (!data) return data;
        let strData = JSON.stringify(data);
        const { idMap } = get();
        Object.entries(idMap).forEach(([tempId, realId]) => {
          strData = strData.split(tempId).join(realId);
        });
        return JSON.parse(strData);
      },
      
      clearQueue: () => set({ queue: [], idMap: {} })
    }),
    {
      name: 'syncnest-offline-queue',
    }
  )
);
