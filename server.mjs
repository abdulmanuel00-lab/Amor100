import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const PORT = 3000;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_VERIFIED_TTL_MS = 10 * 60 * 1000;
const otpStore = new Map();
const verifiedPhones = new Map();
const isLocalOtpDebug = process.env.NODE_ENV !== 'production';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const userSockets = new Map();
const socketUsers = new Map();

// Database setup
const db = new Database('amor100.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE,
    name TEXT,
    photo TEXT,
    online BOOLEAN DEFAULT 0,
    history TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    player1 TEXT,
    player2 TEXT,
    status TEXT DEFAULT 'waiting',
    percentage INTEGER DEFAULT 0,
    current_question INTEGER DEFAULT 0,
    asker TEXT,
    responder TEXT
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    room_id TEXT,
    question TEXT,
    option1 TEXT,
    option2 TEXT,
    option3 TEXT,
    option4 TEXT,
    correct_answer TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    room_id TEXT,
    user_id TEXT,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(express.json());

function broadcastOnlineUsers() {
  const users = db.prepare('SELECT id, name FROM users WHERE online = 1 ORDER BY name COLLATE NOCASE ASC').all();
  io.emit('online_users', { users });
}

function getAvailableRooms() {
  return db.prepare(`
    SELECT
      r.id,
      r.player1,
      u.name AS player1_name
    FROM rooms r
    LEFT JOIN users u ON u.id = r.player1
    WHERE r.status = 'waiting' AND r.player2 IS NULL
    ORDER BY r.rowid DESC
    LIMIT 30
  `).all();
}

function broadcastAvailableRooms() {
  io.emit('available_rooms', { rooms: getAvailableRooms() });
}

function emitToUser(userId, event, payload) {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return false;
  sockets.forEach((socketId) => {
    io.to(socketId).emit(event, payload);
  });
  return true;
}

// API Routes
app.post('/api/auth/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const code = String(Math.floor(1000 + Math.random() * 9000));
  otpStore.set(normalizedEmail, { code, expiresAt: Date.now() + OTP_TTL_MS });

  if (isLocalOtpDebug) {
    console.log(`[OTP][DEV][EMAIL] ${normalizedEmail}: ${code}`);
  }

  res.json({ ok: true, ...(isLocalOtpDebug ? { devCode: code } : {}) });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const entry = otpStore.get(normalizedEmail);
  if (!entry || entry.expiresAt < Date.now()) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({ error: 'OTP expired or not requested' });
  }

  if (entry.code !== String(otp)) {
    return res.status(401).json({ error: 'Invalid OTP' });
  }

  otpStore.delete(normalizedEmail);
  verifiedPhones.set(normalizedEmail, Date.now() + OTP_VERIFIED_TTL_MS);
  res.json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const verifiedUntil = verifiedPhones.get(normalizedEmail);
  if (!verifiedUntil || verifiedUntil < Date.now()) {
    verifiedPhones.delete(normalizedEmail);
    return res.status(401).json({ error: 'Email not verified' });
  }
  verifiedPhones.delete(normalizedEmail);

  const id = Math.random().toString(36).substring(2, 15);
  
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO users (id, phone, name) VALUES (?, ?, ?)');
    stmt.run(id, normalizedEmail, name || 'User');
    
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(normalizedEmail);
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/rooms/available', (_req, res) => {
  try {
    res.json({ rooms: getAvailableRooms() });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/ranking', (req, res) => {
  // Mock ranking
  res.json([
    { rank: 1, names: 'Ana ❤️ Paulo', percentage: 98 },
    { rank: 2, names: 'Carla ❤️ João', percentage: 95 },
    { rank: 3, names: 'Sofia ❤️ Marco', percentage: 93 },
  ]);
});

// Socket.io logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register_user', ({ userId }) => {
    if (!userId) return;

    socketUsers.set(socket.id, userId);
    const sockets = userSockets.get(userId) || new Set();
    sockets.add(socket.id);
    userSockets.set(userId, sockets);

    db.prepare('UPDATE users SET online = 1 WHERE id = ?').run(userId);
    broadcastOnlineUsers();
    socket.emit('available_rooms', { rooms: getAvailableRooms() });
  });

  socket.on('request_available_rooms', () => {
    socket.emit('available_rooms', { rooms: getAvailableRooms() });
  });

  socket.on('logout_user', ({ userId }) => {
    if (!userId) return;
    db.prepare('UPDATE users SET online = 0 WHERE id = ?').run(userId);
    userSockets.delete(userId);
    broadcastOnlineUsers();
  });

  socket.on('invite_to_room', ({ fromUserId, toUserId, roomId, fromName }, callback) => {
    if (!fromUserId || !toUserId || !roomId) {
      if (typeof callback === 'function') callback({ ok: false, error: 'Invalid invite payload' });
      return;
    }

    if (fromUserId === toUserId) {
      if (typeof callback === 'function') callback({ ok: false, error: 'Cannot invite yourself' });
      return;
    }

    const targetOnline = emitToUser(toUserId, 'room_invite', {
      fromUserId,
      fromName: fromName || 'Jogador',
      roomId
    });

    if (!targetOnline) {
      if (typeof callback === 'function') callback({ ok: false, error: 'Player is offline' });
      return;
    }

    if (typeof callback === 'function') callback({ ok: true });
  });

  socket.on('respond_room_invite', ({ fromUserId, toUserId, roomId, accepted }) => {
    if (!fromUserId || !toUserId || !roomId) return;
    emitToUser(fromUserId, 'invite_response', {
      fromUserId,
      toUserId,
      roomId,
      accepted: !!accepted
    });
  });

  socket.on('join_room', ({ roomId, userId }) => {
    socket.join(roomId);
    console.log(`User ${userId} joined room ${roomId}`);
    
    // Check room status
    let room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    
    if (!room) {
      // Create room
      db.prepare('INSERT INTO rooms (id, player1, status) VALUES (?, ?, ?)').run(roomId, userId, 'waiting');
      room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
      broadcastAvailableRooms();
    } else if (!room.player2 && room.player1 !== userId) {
      // Join as player 2
      db.prepare('UPDATE rooms SET player2 = ?, status = ?, asker = ?, responder = ? WHERE id = ?')
        .run(userId, 'playing', room.player1, userId, roomId);
      room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
      io.to(roomId).emit('game_start', { room });
      broadcastAvailableRooms();
    }
    
    io.to(roomId).emit('room_update', { room });
  });

  socket.on('leave_room', ({ roomId, userId }) => {
    if (!roomId || !userId) return;
    socket.leave(roomId);

    let room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    if (!room) return;

    if (room.player2 === userId) {
      db.prepare('UPDATE rooms SET player2 = NULL, status = ?, asker = NULL, responder = NULL WHERE id = ?')
        .run('waiting', roomId);
      room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
      io.to(roomId).emit('room_update', { room });
      broadcastAvailableRooms();
      return;
    }

    if (room.player1 === userId) {
      if (room.player2) {
        db.prepare('UPDATE rooms SET player1 = ?, player2 = NULL, status = ?, asker = NULL, responder = NULL WHERE id = ?')
          .run(room.player2, 'waiting', roomId);
        room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
        io.to(roomId).emit('room_update', { room });
        broadcastAvailableRooms();
      } else {
        db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);
        io.to(roomId).emit('room_closed', { roomId });
        broadcastAvailableRooms();
      }
    }
  });

  socket.on('submit_question', (data) => {
    const { roomId, question, options, correctAnswer } = data;
    const qId = Math.random().toString(36).substring(2, 15);
    
    db.prepare(`
      INSERT INTO questions (id, room_id, question, option1, option2, option3, option4, correct_answer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(qId, roomId, question, options[0], options[1], options[2], options[3], correctAnswer);
    
    io.to(roomId).emit('new_question', {
      id: qId,
      question,
      options
    });
  });

  socket.on('submit_answer', (data) => {
    const { roomId, questionId, answer, userId } = data;
    
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
    if (!q) return;
    
    const isCorrect = q.correct_answer === answer;
    
    if (isCorrect) {
      db.prepare('UPDATE rooms SET percentage = percentage + 10 WHERE id = ?').run(roomId);
    }
    
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    
    io.to(roomId).emit('answer_result', {
      isCorrect,
      selectedAnswer: answer,
      answeredBy: userId,
      correctAnswer: q.correct_answer,
      percentage: room.percentage
    });
  });

  socket.on('send_message', (data) => {
    const { roomId, userId, message } = data;
    const mId = Math.random().toString(36).substring(2, 15);
    
    db.prepare('INSERT INTO messages (id, room_id, user_id, message) VALUES (?, ?, ?, ?)')
      .run(mId, roomId, userId, message);
      
    io.to(roomId).emit('new_message', {
      id: mId,
      userId,
      message,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    const userId = socketUsers.get(socket.id);
    if (userId) {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          db.prepare('UPDATE users SET online = 0 WHERE id = ?').run(userId);
        } else {
          userSockets.set(userId, sockets);
        }
      }
      socketUsers.delete(socket.id);
      broadcastOnlineUsers();
    }
    console.log('User disconnected:', socket.id);
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Vite can throw "URI malformed" when requests contain raw "%" characters.
    app.use((req, _res, next) => {
      req.url = req.url.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
      next();
    });

    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
