require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Track room members
const roomMembers = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // ── JOIN TEAM ROOM ──────────────────────────────────────────────
  socket.on('join_team', ({ teamId, user }) => {
    if (!teamId) return;

    const room = `team:${teamId}`;
    socket.join(room);

    // Track members
    if (!roomMembers.has(room)) roomMembers.set(room, new Map());
    roomMembers.get(room).set(socket.id, { ...user, socketId: socket.id });

    const members = Array.from(roomMembers.get(room).values());

    // Notify others
    socket.to(room).emit('member_joined', { user, members });

    // Send current members to joiner
    socket.emit('room_members', { members });

    console.log(`[Socket] ${user?.name || socket.id} joined ${room}`);
  });

  // ── LEAVE ROOM ─────────────────────────────────────────────────
  socket.on('leave_team', ({ teamId }) => {
    const room = `team:${teamId}`;
    socket.leave(room);

    if (roomMembers.has(room)) {
      roomMembers.get(room).delete(socket.id);
      const members = Array.from(roomMembers.get(room).values());
      socket.to(room).emit('member_left', { socketId: socket.id, members });
    }
  });

  // ── REQUEST UPDATED ─────────────────────────────────────────────
  socket.on('update_request', ({ teamId, request, userId }) => {
    if (!teamId || !request) return;
    const room = `team:${teamId}`;
    socket.to(room).emit('request_updated', { request, userId, timestamp: Date.now() });
    console.log(`[Socket] request_updated in ${room} by ${userId}`);
  });

  // ── COLLECTION UPDATED ──────────────────────────────────────────
  socket.on('update_collection', ({ teamId, collection, userId }) => {
    if (!teamId || !collection) return;
    const room = `team:${teamId}`;
    socket.to(room).emit('collection_updated', { collection, userId, timestamp: Date.now() });
    console.log(`[Socket] collection_updated in ${room} by ${userId}`);
  });

  // ── COLLECTION IMPORTED ─────────────────────────────────────────
  socket.on('import_collection', ({ teamId, collection, requestCount, userId }) => {
    if (!teamId || !collection) return;
    const room = `team:${teamId}`;
    socket.to(room).emit('collection_imported', {
      collection,
      requestCount,
      userId,
      timestamp: Date.now(),
    });
    console.log(`[Socket] collection_imported in ${room}: ${collection.name}`);
  });

  // ── CURSOR / PRESENCE (bonus) ───────────────────────────────────
  socket.on('cursor_update', ({ teamId, requestId, userId, cursor }) => {
    const room = `team:${teamId}`;
    socket.to(room).emit('cursor_updated', { requestId, userId, cursor });
  });

  // ── TYPING INDICATOR ────────────────────────────────────────────
  socket.on('typing_start', ({ teamId, requestId, userId }) => {
    socket.to(`team:${teamId}`).emit('user_typing', { requestId, userId });
  });

  socket.on('typing_stop', ({ teamId, requestId, userId }) => {
    socket.to(`team:${teamId}`).emit('user_stopped_typing', { requestId, userId });
  });

  // ── DISCONNECT ──────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    // Clean from all rooms
    for (const [room, members] of roomMembers.entries()) {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        const remaining = Array.from(members.values());
        io.to(room).emit('member_left', { socketId: socket.id, members: remaining });
      }
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    connections: io.engine.clientsCount,
    timestamp: new Date().toISOString(),
  });
});

// Room info endpoint
app.get('/rooms', (req, res) => {
  const rooms = {};
  for (const [room, members] of roomMembers.entries()) {
    rooms[room] = Array.from(members.values()).length;
  }
  res.json(rooms);
});

server.listen(PORT, () => {
  console.log(`🔌 SyncNest Socket.IO server running on port ${PORT}`);
  console.log(`   CORS origin: ${CORS_ORIGIN}`);
});

module.exports = { app, io };
