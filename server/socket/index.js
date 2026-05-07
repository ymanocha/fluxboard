const jwt = require('jsonwebtoken');
const { transformOperation, applyOperation, addToHistory, clearHistory, getHistory } = require('./ot');
const { createAndEmitActivity } = require('./activityLogger');

// Track which sockets are in which board rooms: Map<boardId, Set<{ socketId, userId, name }>>
const boardPresence = new Map();

const getRoomUsers = (boardId) => {
  const set = boardPresence.get(boardId);
  if (!set) return [];
  return Array.from(set);
};

const addPresence = (boardId, socketId, userId, name) => {
  if (!boardPresence.has(boardId)) boardPresence.set(boardId, new Set());
  // Remove any stale entry for same socket
  const set = boardPresence.get(boardId);
  for (const entry of set) {
    if (entry.socketId === socketId) {
      set.delete(entry);
      break;
    }
  }
  set.add({ socketId, userId, name });
};

const removePresence = (boardId, socketId) => {
  const set = boardPresence.get(boardId);
  if (!set) return;
  for (const entry of set) {
    if (entry.socketId === socketId) {
      set.delete(entry);
      break;
    }
  }
  if (set.size === 0) {
    boardPresence.delete(boardId);
    // Clear OT history when board is empty
    clearHistory(boardId);
  }
};

const removeFromAllBoards = (socketId) => {
  for (const [boardId] of boardPresence) {
    removePresence(boardId, socketId);
  }
};

const initSocket = (io) => {
  // ── Socket Authentication Middleware ────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: no token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.user?.name})`);

    // Every authenticated user joins their personal room immediately
    socket.join(`user:${socket.user.id}`);

    // ── Join Board Room ────────────────────────────────────────────────────────
    socket.on('joinBoard', (boardId) => {
      socket.join(boardId);
      addPresence(boardId, socket.id, socket.user.id, socket.user.name);
      io.to(boardId).emit('presenceUpdate', getRoomUsers(boardId));
      console.log(`${socket.user.name} joined board ${boardId}`);
    });

    // ── Leave Board Room ───────────────────────────────────────────────────────
    socket.on('leaveBoard', (boardId) => {
      socket.leave(boardId);
      removePresence(boardId, socket.id);
      io.to(boardId).emit('presenceUpdate', getRoomUsers(boardId));
      console.log(`${socket.user.name} left board ${boardId}`);
    });

    // ── Card Edit Indicators ───────────────────────────────────────────────────
    socket.on('cardEditStart', ({ boardId, cardId }) => {
      socket.to(boardId).emit('cardEditing', { cardId, userId: socket.user.id, userName: socket.user.name });
    });

    socket.on('cardEditEnd', ({ boardId, cardId }) => {
      socket.to(boardId).emit('cardEditingEnd', { cardId, userId: socket.user.id });
    });

    // ── Card Operations (with OT) ──────────────────────────────────────────────
    socket.on('cardOperation', async (data, ack) => {
      try {
        const { boardId } = data;
        const op = {
          ...data,
          userId: socket.user.id,
          serverTimestamp: Date.now(),
        };

        const history = getHistory(boardId);
        const { transformed, rejected, reason } = transformOperation(op, history);

        if (rejected) {
          socket.emit('operationRejected', { reason });
          if (typeof ack === 'function') ack({ success: false, reason });
          return;
        }

        // Handle title caching for deletes
        if (op.type === 'CARD_DELETE') {
          const Card = require('../models/Card');
          const c = await Card.findById(op.payload.cardId);
          if (c) op.payload.cardTitle = c.title;
        }

        const serverState = await applyOperation(transformed);
        addToHistory(boardId, transformed, transformed.serverTimestamp);

        // Broadcast to room excluding sender
        socket.to(boardId).emit('cardUpdated', { op: transformed, serverState });

        // Log Activity
        createAndEmitActivity(io, boardId, socket.user.id, socket.user.name, transformed);

        if (typeof ack === 'function') {
          ack({ success: true, serverState, op: transformed });
        }
      } catch (err) {
        console.error('cardOperation error:', err);
        if (typeof ack === 'function') ack({ success: false, reason: err.message });
      }
    });

    // ── List Operations ────────────────────────────────────────────────────────
    socket.on('listOperation', async (data, ack) => {
      try {
        const { boardId, type, payload } = data;
        const List = require('../models/List');
        const Card = require('../models/Card');

        let result = null;

        if (type === 'LIST_CREATE') {
          const count = await List.countDocuments({ board: boardId });
          result = await List.create({ title: payload.title, board: boardId, position: count });
        } else if (type === 'LIST_UPDATE') {
          result = await List.findByIdAndUpdate(
            payload.listId,
            { title: payload.title },
            { new: true }
          );
        } else if (type === 'LIST_DELETE') {
          const list = await List.findById(payload.listId);
          if (list) {
            await Card.deleteMany({ list: list._id });
            await List.findByIdAndDelete(list._id);
            const remaining = await List.find({ board: boardId }).sort({ position: 1 });
            for (let i = 0; i < remaining.length; i++) {
              remaining[i].position = i;
              await remaining[i].save();
            }
            result = { listId: payload.listId };
          }
        }

        socket.to(boardId).emit('listUpdated', { type, payload, result });
        
        // Log Activity
        createAndEmitActivity(io, boardId, socket.user.id, socket.user.name, { type, payload });
        
        if (typeof ack === 'function') ack({ success: true, result });
      } catch (err) {
        console.error('listOperation error:', err);
        if (typeof ack === 'function') ack({ success: false, reason: err.message });
      }
    });

    // ── Disconnect ─────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Emitting cardEditingEnd globally for all boards this user was in is complex.
      // We will signal an overall refresh or let clients handle presence disconnects.
      // We'll iterate boards and broadcast cardEditingEnd if needed or just clear them.
      for (const [boardId, set] of boardPresence) {
        let wasPresent = false;
        for (const entry of set) {
          if (entry.socketId === socket.id) {
            wasPresent = true;
            removePresence(boardId, socket.id);
            io.to(boardId).emit('presenceUpdate', getRoomUsers(boardId));
            break;
          }
        }
        if (wasPresent) {
          // Spec: Also emit cardEditingEnd for all cards on socket disconnect
          // Since we don't know exactly which cards, we can emit a wildcard or the client can clear editing users on presence drop.
          io.to(boardId).emit('cardEditingEnd', { userId: socket.user.id, wildcard: true });
        }
      }
    });
  });
};

module.exports = initSocket;
