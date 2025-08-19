const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.static(path.join(__dirname)));

// In-memory user storage (for demo purposes)
const users = [];

io.on('connection', (socket) => {
  console.log('New client connected');

  // ✅ Register User
  socket.on('register', ({ username, password }) => {
    if (!username || !password) {
      return socket.emit('register-fail', 'All fields are required');
    }
    if (users.find(u => u.username === username)) {
      return socket.emit('register-fail', 'Username already exists');
    }
    users.push({ username, password });
    console.log('Registered Users:', users);
    socket.emit('register-success', 'Registration successful! Please login.');
  });

  // ✅ Login User
  socket.on('login', ({ username, password }) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      return socket.emit('auth-fail', 'Invalid username or password');
    }
    socket.authenticated = true;
    console.log(`User logged in: ${username}`);
    socket.emit('auth-success');
  });

  // ✅ WebRTC Signaling (for Video Calls)
  socket.on('offer', (offer) => {
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    socket.broadcast.emit('answer', answer);
  });

  socket.on('candidate', (candidate) => {
    socket.broadcast.emit('candidate', candidate);
  });

  // ✅ File Sharing
  socket.on('file-share', (file) => {
    console.log(`File shared: ${file.name}`);
    socket.broadcast.emit('file-share', file);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
