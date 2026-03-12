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
const otpStore = new Map<string, { code: string; expiresAt: number }>();
const verifiedPhones = new Map<string, number>();
const isLocalOtpDebug = process.env.NODE_ENV !== 'production';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const userSockets = new Map<string, Set<string>>();
const socketUsers = new Map<string, string>();

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

  CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY,
    user_a TEXT NOT NULL,
    user_b TEXT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS login_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    happened_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  CREATE TABLE IF NOT EXISTS direct_messages (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_direct_messages_pair_time
    ON direct_messages (from_user_id, to_user_id, timestamp);

  CREATE INDEX IF NOT EXISTS idx_direct_messages_unread
    ON direct_messages (to_user_id, read_at, timestamp);

  CREATE INDEX IF NOT EXISTS idx_game_sessions_started_at
    ON game_sessions (started_at);

  CREATE INDEX IF NOT EXISTS idx_game_sessions_pair
    ON game_sessions (user_a, user_b, started_at);

  CREATE INDEX IF NOT EXISTS idx_login_events_happened_at
    ON login_events (happened_at);
`);

app.use(express.json());

function broadcastOnlineUsers() {
  const users = db
    .prepare('SELECT id, name, online FROM users ORDER BY online DESC, name COLLATE NOCASE ASC')
    .all();
  io.emit('online_users', { users });
}

function getAvailableRooms() {
  return db
    .prepare(`
      SELECT
        r.id,
        r.player1,
        u.name AS player1_name
      FROM rooms r
      LEFT JOIN users u ON u.id = r.player1
      WHERE r.status = 'waiting' AND r.player2 IS NULL
      ORDER BY r.rowid DESC
      LIMIT 30
    `)
    .all();
}

function broadcastAvailableRooms() {
  io.emit('available_rooms', { rooms: getAvailableRooms() });
}

function emitToUser(userId: string, event: string, payload: any) {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return false;
  sockets.forEach((socketId) => {
    io.to(socketId).emit(event, payload);
  });
  return true;
}

function getDirectThreads(userId: string) {
  return db
    .prepare(
      `
      SELECT
        CASE WHEN dm.from_user_id = @userId THEN dm.to_user_id ELSE dm.from_user_id END AS peer_id,
        u.name AS peer_name,
        dm.message AS last_message,
        dm.timestamp AS last_message_at,
        (
          SELECT COUNT(*)
          FROM direct_messages unread
          WHERE unread.from_user_id = CASE WHEN dm.from_user_id = @userId THEN dm.to_user_id ELSE dm.from_user_id END
            AND unread.to_user_id = @userId
            AND unread.read_at IS NULL
        ) AS unread_count
      FROM direct_messages dm
      LEFT JOIN users u ON u.id = CASE WHEN dm.from_user_id = @userId THEN dm.to_user_id ELSE dm.from_user_id END
      INNER JOIN (
        SELECT
          CASE WHEN from_user_id = @userId THEN to_user_id ELSE from_user_id END AS peer_id,
          MAX(timestamp) AS max_ts
        FROM direct_messages
        WHERE from_user_id = @userId OR to_user_id = @userId
        GROUP BY peer_id
      ) latest
        ON latest.peer_id = CASE WHEN dm.from_user_id = @userId THEN dm.to_user_id ELSE dm.from_user_id END
       AND latest.max_ts = dm.timestamp
      WHERE dm.from_user_id = @userId OR dm.to_user_id = @userId
      ORDER BY dm.timestamp DESC
    `
    )
    .all({ userId });
}

function emitDirectThreads(userId: string) {
  emitToUser(userId, 'direct_threads', { threads: getDirectThreads(userId) });
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
    if (user?.id) {
      db.prepare('INSERT INTO login_events (id, user_id) VALUES (?, ?)').run(Math.random().toString(36).substring(2, 15), user.id);
    }
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

app.get('/api/ranking', (_req, res) => {
  try {
    const rows = db
      .prepare(
        `
        SELECT
          gs.user_a,
          gs.user_b,
          u1.name AS name_a,
          u2.name AS name_b,
          COUNT(*) AS games,
          MAX(gs.started_at) AS last_played_at
        FROM game_sessions gs
        LEFT JOIN users u1 ON u1.id = gs.user_a
        LEFT JOIN users u2 ON u2.id = gs.user_b
        WHERE gs.started_at >= datetime('now', '-7 days')
        GROUP BY gs.user_a, gs.user_b
        ORDER BY games DESC, last_played_at DESC
        LIMIT 20
      `
      )
      .all() as Array<{ user_a: string; user_b: string; name_a?: string; name_b?: string; games: number }>;

    const ranking = rows.map((row, index) => ({
      rank: index + 1,
      names: `${row.name_a || 'Jogador'} & ${row.name_b || 'Jogador'}`,
      games: Number(row.games || 0),
    }));

    res.json(ranking);
  } catch (_err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/stats', (_req, res) => {
  try {
    const usersRow = db.prepare('SELECT COUNT(*) AS total FROM users').get() as { total: number };
    const loginsRow = db.prepare('SELECT COUNT(*) AS total FROM login_events').get() as { total: number };
    res.json({ totalUsers: Number(usersRow?.total || 0), totalLogins: Number(loginsRow?.total || 0) });
  } catch (_err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Socket.io logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register_user', ({ userId }) => {
    if (!userId) return;

    socketUsers.set(socket.id, userId);
    const sockets = userSockets.get(userId) || new Set<string>();
    sockets.add(socket.id);
    userSockets.set(userId, sockets);

    db.prepare('UPDATE users SET online = 1 WHERE id = ?').run(userId);
    broadcastOnlineUsers();
    socket.emit('available_rooms', { rooms: getAvailableRooms() });
    socket.emit('direct_threads', { threads: getDirectThreads(userId) });
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

  socket.on('update_user_name', ({ userId, name }, callback) => {
    const cleanName = String(name || '').trim();
    if (!userId || cleanName.length < 2) {
      if (typeof callback === 'function') callback({ ok: false, error: 'Nome invalido' });
      return;
    }

    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(cleanName, userId);
    broadcastOnlineUsers();
    userSockets.forEach((_socketIds, connectedUserId) => {
      emitDirectThreads(connectedUserId);
    });
    io.emit('user_name_updated', { userId, name: cleanName });
    if (typeof callback === 'function') callback({ ok: true, name: cleanName });
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

  socket.on('request_direct_threads', ({ userId }) => {
    if (!userId) return;
    socket.emit('direct_threads', { threads: getDirectThreads(userId) });
  });

  socket.on('request_direct_messages', ({ userId, withUserId }, callback) => {
    if (!userId || !withUserId) {
      if (typeof callback === 'function') callback({ ok: false, error: 'Invalid request' });
      return;
    }

    const messages = db
      .prepare(
        `
        SELECT id, from_user_id, to_user_id, message, timestamp
        FROM direct_messages
        WHERE (from_user_id = ? AND to_user_id = ?)
           OR (from_user_id = ? AND to_user_id = ?)
        ORDER BY timestamp ASC
        LIMIT 300
      `
      )
      .all(userId, withUserId, withUserId, userId);

    if (typeof callback === 'function') callback({ ok: true, messages });
  });

  socket.on('mark_direct_read', ({ userId, withUserId }) => {
    if (!userId || !withUserId) return;
    db.prepare(
      `
      UPDATE direct_messages
      SET read_at = @readAt
      WHERE to_user_id = @userId
        AND from_user_id = @withUserId
        AND read_at IS NULL
    `
    ).run({ readAt: new Date().toISOString(), userId, withUserId });
    emitDirectThreads(userId);
  });

  socket.on('clear_direct_messages', ({ userId, withUserId }, callback) => {
    if (!userId || !withUserId) {
      if (typeof callback === 'function') callback({ ok: false, error: 'Invalid clear request' });
      return;
    }

    db.prepare(
      `
      DELETE FROM direct_messages
      WHERE (from_user_id = ? AND to_user_id = ?)
         OR (from_user_id = ? AND to_user_id = ?)
    `
    ).run(userId, withUserId, withUserId, userId);

    emitDirectThreads(userId);
    emitDirectThreads(withUserId);
    if (typeof callback === 'function') callback({ ok: true });
  });

  socket.on('send_direct_message', ({ fromUserId, toUserId, message }, callback) => {
    const cleanMessage = String(message || '').trim();
    if (!fromUserId || !toUserId || !cleanMessage) {
      if (typeof callback === 'function') callback({ ok: false, error: 'Invalid message payload' });
      return;
    }

    const msgId = Math.random().toString(36).substring(2, 15);
    const timestamp = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO direct_messages (id, from_user_id, to_user_id, message, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(msgId, fromUserId, toUserId, cleanMessage, timestamp);

    const payload = {
      id: msgId,
      fromUserId,
      toUserId,
      message: cleanMessage,
      timestamp,
    };

    emitToUser(fromUserId, 'direct_message', payload);
    emitToUser(toUserId, 'direct_message', payload);
    emitDirectThreads(fromUserId);
    emitDirectThreads(toUserId);

    const fromUser = db.prepare('SELECT name FROM users WHERE id = ?').get(fromUserId) as { name?: string } | undefined;
    emitToUser(toUserId, 'direct_message_notification', {
      fromUserId,
      fromName: fromUser?.name || 'Jogador',
      message: cleanMessage,
      timestamp,
    });

    if (typeof callback === 'function') callback({ ok: true, message: payload });
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
      const pair = [room.player1, userId].sort();
      db.prepare('INSERT INTO game_sessions (id, user_a, user_b) VALUES (?, ?, ?)')
        .run(Math.random().toString(36).substring(2, 15), pair[0], pair[1]);
      room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
      io.to(roomId).emit('game_start', { room });
      broadcastAvailableRooms();
    }
    
    io.to(roomId).emit('room_update', { room });
  });

  socket.on('leave_room', ({ roomId, userId }) => {
    if (!roomId || !userId) return;
    socket.leave(roomId);

    let room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
    if (!room) return;

    if (room.player2 === userId) {
      db.prepare('UPDATE rooms SET player2 = NULL, status = ?, asker = NULL, responder = NULL WHERE id = ?')
        .run('waiting', roomId);
      room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
      io.to(roomId).emit('room_update', { room });
      broadcastAvailableRooms();
      return;
    }

    if (room.player1 === userId) {
      if (room.player2) {
        db.prepare('UPDATE rooms SET player1 = ?, player2 = NULL, status = ?, asker = NULL, responder = NULL WHERE id = ?')
          .run(room.player2, 'waiting', roomId);
        room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
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

