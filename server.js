// server.js
// Run: npm install express socket.io cors body-parser peer
// Then: node server.js

const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PeerServer } = require('peer');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // serve index.html and other assets

// In-memory user store (demo). Replace with DB in production.
const users = []; // { username, password }

// Simple helper
function userExists(username) {
  return users.some(u => u.username === username);
}
function verifyUser(username, password) {
  return users.find(u => u.username === username && u.password === password);
}

// Socket.IO handling
io.on('connection', socket => {
  console.log('Socket connected:', socket.id);

  // Register via socket
  socket.on('register', ({ username, password }) => {
    if (!username || !password) {
      socket.emit('register-fail', 'Username and password required');
      return;
    }
    if (userExists(username)) {
      socket.emit('register-fail', 'Username already taken');
      return;
    }
    users.push({ username, password });
    console.log('Registered user:', username);
    socket.emit('register-success', 'Registered successfully — now login');
  });

  // Login via socket
  socket.on('login', ({ username, password }) => {
    if (!username || !password) {
      socket.emit('auth-fail', 'Username and password required');
      return;
    }
    const user = verifyUser(username, password);
    if (!user) {
      socket.emit('auth-fail', 'Invalid credentials');
      return;
    }
    // mark socket as authenticated
    socket.authenticated = true;
    socket.username = username;
    console.log(`Socket ${socket.id} authenticated as ${username}`);
    socket.emit('auth-success');
  });

  // Join room (PeerJS id) — only allowed if authenticated
  socket.on('join-room', (peerId) => {
    if (!socket.authenticated) {
      socket.emit('auth-fail', 'Authentication required to join room');
      return;
    }
    const ROOM = 'room1';
    socket.join(ROOM);
    console.log(`${socket.username} (peer ${peerId}) joined ${ROOM}`);
    // notify others in room about new peer id
    socket.to(ROOM).emit('user-connected', peerId);

    // whiteboard message relay scoped to room
    socket.on('draw', (segment) => {
      // segment: {x0,y0,x1,y1,color,size}
      socket.to(ROOM).emit('draw', segment);
    });

    socket.on('clear-board', () => {
      socket.to(ROOM).emit('clear-board');
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} (${socket.username || 'unknown'})`);
      socket.to(ROOM).emit('user-disconnected', peerId);
    });
  });

  // Safety: if a socket disconnects without joining, still log
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Start HTTP server on port 3000
const HTTP_PORT = 3000;
server.listen(HTTP_PORT, () => {
  console.log(`HTTP + Socket.IO server running on port ${HTTP_PORT}`);
  console.log(`Open http://localhost:${HTTP_PORT}/index.html`);
});

// Start PeerJS server on port 3001 (path /peerjs)
const PEER_PORT = 3001;
PeerServer({ port: PEER_PORT, path: '/peerjs' });
console.log(`PeerServer running on port ${PEER_PORT} (path /peerjs)`);
