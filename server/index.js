require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const boardRoutes = require('./routes/boards');
const listRoutes = require('./routes/lists');
const cardRoutes = require('./routes/cards');
const memberRoutes = require('./routes/members');
const activityRoutes = require('./routes/activity');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const workspaceRoutes = require('./routes/workspaces');
const initSocket = require('./socket/index');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(
  cors({
    origin: [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Fluxboard Backend is running!', health: '/api/health' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Centralised error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// HTTP server + Socket.io
const httpServer = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean),
    methods: ['GET', 'POST'],
  },
});

// Store io explicitly so it can be accessed in controllers
app.set('io', io);

// Attach socket handlers
initSocket(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
