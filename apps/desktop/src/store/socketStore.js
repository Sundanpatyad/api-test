import { create } from 'zustand';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  roomMembers: [],
  currentRoom: null,

  connect: () => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      set({ isConnected: false, roomMembers: [] });
    });

    socket.on('room_members', ({ members }) => {
      set({ roomMembers: members });
    });

    socket.on('member_joined', ({ user, members }) => {
      set({ roomMembers: members });
    });

    socket.on('member_left', ({ members }) => {
      set({ roomMembers: members });
    });

    set({ socket });
  },

  joinTeam: (teamId, user) => {
    const socket = get().socket;
    if (!socket || !teamId) return;
    socket.emit('join_team', { teamId, user });
    set({ currentRoom: `team:${teamId}` });
  },

  emitRequestUpdate: (teamId, request, userId) => {
    const socket = get().socket;
    if (!socket || !teamId) return;
    socket.emit('update_request', { teamId, request, userId });
  },

  emitCollectionUpdate: (teamId, collection, userId) => {
    const socket = get().socket;
    if (!socket || !teamId) return;
    socket.emit('update_collection', { teamId, collection, userId });
  },

  emitCollectionImport: (teamId, collection, requestCount, userId) => {
    const socket = get().socket;
    if (!socket || !teamId) return;
    socket.emit('import_collection', { teamId, collection, requestCount, userId });
  },

  onRequestUpdated: (callback) => {
    const socket = get().socket;
    if (!socket) return () => {};
    socket.on('request_updated', callback);
    return () => socket.off('request_updated', callback);
  },

  onCollectionUpdated: (callback) => {
    const socket = get().socket;
    if (!socket) return () => {};
    socket.on('collection_updated', callback);
    return () => socket.off('collection_updated', callback);
  },

  onCollectionImported: (callback) => {
    const socket = get().socket;
    if (!socket) return () => {};
    socket.on('collection_imported', callback);
    return () => socket.off('collection_imported', callback);
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, roomMembers: [] });
    }
  },
}));
