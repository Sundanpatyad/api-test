import { useEffect } from 'react';
import { useSyncQueueStore } from '@/store/syncQueueStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function OfflineSyncManager() {
  const { 
    queue, 
    isSyncing, 
    setIsSyncing, 
    dequeue, 
    incrementRetry, 
    registerIdMapping,
    resolveUrl,
    resolveData
  } = useSyncQueueStore();

  useEffect(() => {
    // Attempt sync immediately if online and queue is populated
    if (navigator.onLine && queue.length > 0 && !isSyncing) {
      processQueue();
    }

    const handleOnline = () => {
      if (queue.length > 0 && !isSyncing) {
        processQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queue.length, isSyncing]);

  const processQueue = async () => {
    setIsSyncing(true);
    
    // We snapshot the queue because elements might get pushed while this is running
    const tasks = useSyncQueueStore.getState().queue;
    
    if (tasks.length > 0) {
      toast.loading(`Syncing ${tasks.length} offline changes...`, { id: 'offline-sync' });
    }

    let successCount = 0;
    
    for (const item of tasks) {
      try {
        // Resolve URLs and arbitrary object data against the ID map
        // This ensures if a parent was created offline, a child request hitting the
        // parent's endpoint receives the REAL _id, not the temporary UUID.
        const url = resolveUrl(item.url);
        const data = resolveData(item.data);

        const response = await api.request({
          method: item.method,
          url,
          data,
          // Custom flag to tell interceptor NOT to queue this retry if it fails
          disableOfflineMock: true 
        });

        // Smart ID mapping
        if (item.tempId && item.resourceType && response.data[item.resourceType]) {
          const realId = response.data[item.resourceType]._id;
          if (realId) {
             registerIdMapping(item.tempId, realId);
          }
        }

        dequeue(item.id);
        successCount++;
        
        // Small delay to prevent overwhelming the server with simultaneous offline bursts
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (err) {
        // If it's a 4xx error (e.g., validation failed, not found), we can't retry it infinitely.
        // It's a permanent failure. We discard it.
        if (err.response && err.response.status >= 400 && err.response.status < 500) {
          console.error('[OfflineSync] Task failed with 4xx, discarding:', item, err);
          dequeue(item.id);
        } else {
           // Network or 5xx error, increment retries
           if (item.retries >= 3) {
             console.error('[OfflineSync] Max retries reached, discarding:', item);
             dequeue(item.id);
           } else {
             incrementRetry(item.id);
           }
        }
      }
    }

    setIsSyncing(false);

    if (successCount > 0) {
       toast.success(`Synced ${successCount} changes.`, { id: 'offline-sync' });
    } else if (tasks.length > 0) {
       toast.dismiss('offline-sync');
    }
  };

  return null; // Headless component
}
