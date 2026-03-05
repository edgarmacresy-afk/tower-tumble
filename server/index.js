import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3000;

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('ok');
  } else {
    res.writeHead(404);
    res.end();
  }
});

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

// ──── Data structures ────

const rooms = new Map();        // code → Room
const matchQueue = new Map();   // mapId → [{ socket, name }]

const PLAYER_COLORS = [
  0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0xA78BFA, 0xFF9FF3,
  0x45B7D1, 0x96CEB4, 0xFECAD4, 0xF38181, 0x00B894,
];

const TIME_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

function assignColor(room) {
  const usedColors = new Set();
  for (const p of room.players.values()) usedColors.add(p.color);
  for (const c of PLAYER_COLORS) {
    if (!usedColors.has(c)) return c;
  }
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

function createRoom(hostId, name, mapId) {
  const code = generateCode();
  const color = PLAYER_COLORS[0];
  const room = {
    code,
    hostId,
    mapId: mapId || 'original',
    state: 'waiting',
    players: new Map(),
    finishOrder: [],
    startTime: 0,
    countdownTimer: null,
    broadcastInterval: null,
    inactivityTimeout: null,
    timeLimitTimeout: null,
  };
  room.players.set(hostId, {
    id: hostId,
    name: name.slice(0, 12),
    color,
    ready: false,
    position: { x: 0, y: 2, z: 5 },
    velocity: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    grounded: true,
    isDiving: false,
    finished: false,
    finishTime: 0,
  });
  rooms.set(code, room);
  resetInactivity(room);
  return room;
}

function resetInactivity(room) {
  if (room.inactivityTimeout) clearTimeout(room.inactivityTimeout);
  if (room.timeLimitTimeout) clearTimeout(room.timeLimitTimeout);
  room.inactivityTimeout = setTimeout(() => destroyRoom(room.code), 30 * 60 * 1000);
}

function destroyRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  if (room.broadcastInterval) clearInterval(room.broadcastInterval);
  if (room.countdownTimer) clearTimeout(room.countdownTimer);
  if (room.inactivityTimeout) clearTimeout(room.inactivityTimeout);
  rooms.delete(code);
}

function getRoomForSocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.has(socketId)) return room;
  }
  return null;
}

function getPlayersArray(room) {
  return Array.from(room.players.values()).map(p => ({
    id: p.id, name: p.name, color: p.color, ready: p.ready,
    finished: p.finished, finishTime: p.finishTime,
  }));
}

function endGameByTimeLimit(room) {
  if (room.state \!== 'playing') return;
  room.state = 'finished';
  stopBroadcast(room);
  if (room.timeLimitTimeout) { clearTimeout(room.timeLimitTimeout); room.timeLimitTimeout = null; }

  const unfinished = [];
  for (const p of room.players.values()) {
    if (\!p.finished) unfinished.push(p);
  }
  unfinished.sort((a, b) => (b.position.z || 0) - (a.position.z || 0));

  const elapsed = (Date.now() - room.startTime) / 1000;
  for (const p of unfinished) {
    p.finished = true;
    p.finishTime = elapsed;
    const place = room.finishOrder.length + 1;
    room.finishOrder.push({ id: p.id, name: p.name, time: elapsed, place, dnf: true });
  }

  io.to(room.code).emit('game-over', { finishOrder: room.finishOrder, timeLimit: true });
}

function startBroadcast(room) {
  if (room.broadcastInterval) clearInterval(room.broadcastInterval);
  room.broadcastInterval = setInterval(() => {
    const states = [];
    for (const p of room.players.values()) {
      states.push({
        id: p.id,
        position: p.position,
        velocity: p.velocity,
        rotationY: p.rotationY,
        grounded: p.grounded,
        isDiving: p.isDiving,
        finished: p.finished,
      });
    }
    for (const p of room.players.values()) {
      const sock = io.sockets.sockets.get(p.id);
      if (sock) sock.volatile.emit('state-update', { players: states });
    }
  }, 50); // 20Hz
}

function stopBroadcast(room) {
  if (room.broadcastInterval) {
    clearInterval(room.broadcastInterval);
    room.broadcastInterval = null;
  }
}

// ──── Matchmaking ────

function tryMatchmake(mapId) {
  const queue = matchQueue.get(mapId);
  if (!queue || queue.length < 2) return;

  // Create room for everyone in queue
  const entries = queue.splice(0, Math.min(queue.length, 8));
  const first = entries[0];
  const room = createRoom(first.socket.id, first.name, mapId);
  first.socket.join(room.code);
  first.socket.emit('room-joined', {
    code: room.code,
    players: getPlayersArray(room),
    mapId: room.mapId,
    hostId: room.hostId,
    playerId: first.socket.id,
  });

  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i];
    const color = assignColor(room);
    room.players.set(entry.socket.id, {
      id: entry.socket.id,
      name: entry.name.slice(0, 12),
      color,
      ready: false,
      position: { x: 0, y: 2, z: 5 },
      velocity: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      grounded: true,
      isDiving: false,
      finished: false,
      finishTime: 0,
    });
    entry.socket.join(room.code);
    io.to(room.code).emit('player-joined', {
      id: entry.socket.id, name: entry.name.slice(0, 12), color,
    });
    entry.socket.emit('room-joined', {
      code: room.code,
      players: getPlayersArray(room),
      mapId: room.mapId,
      hostId: room.hostId,
      playerId: entry.socket.id,
    });
  }
}

// Auto-start matchmaking after 15s with solo player
function scheduleAutoMatch(mapId) {
  const queue = matchQueue.get(mapId);
  if (!queue || queue.length === 0) return;
  setTimeout(() => {
    const q = matchQueue.get(mapId);
    if (q && q.length >= 1) tryMatchmake(mapId);
  }, 15000);
}

// ──── Socket handlers ────

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`);

  socket.on('create-room', ({ name, mapId }) => {
    if (getRoomForSocket(socket.id)) {
      socket.emit('error', { message: 'Already in a room' });
      return;
    }
    const room = createRoom(socket.id, name, mapId);
    socket.join(room.code);
    socket.emit('room-created', { code: room.code, playerId: socket.id });
    socket.emit('room-joined', {
      code: room.code,
      players: getPlayersArray(room),
      mapId: room.mapId,
      hostId: room.hostId,
      playerId: socket.id,
    });
    console.log(`Room ${room.code} created by ${name}`);
  });

  socket.on('join-room', ({ name, code }) => {
    if (getRoomForSocket(socket.id)) {
      socket.emit('error', { message: 'Already in a room' });
      return;
    }
    const upperCode = (code || '').toUpperCase().trim();
    const room = rooms.get(upperCode);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    if (room.state !== 'waiting') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }
    if (room.players.size >= 10) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    const color = assignColor(room);
    room.players.set(socket.id, {
      id: socket.id,
      name: name.slice(0, 12),
      color,
      ready: false,
      position: { x: 0, y: 2, z: 5 },
      velocity: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      grounded: true,
      isDiving: false,
      finished: false,
      finishTime: 0,
    });

    socket.join(room.code);
    io.to(room.code).emit('player-joined', {
      id: socket.id, name: name.slice(0, 12), color,
    });
    socket.emit('room-joined', {
      code: room.code,
      players: getPlayersArray(room),
      mapId: room.mapId,
      hostId: room.hostId,
      playerId: socket.id,
    });
    resetInactivity(room);
    console.log(`${name} joined room ${room.code}`);
  });

  socket.on('auto-match', ({ name, mapId }) => {
    if (getRoomForSocket(socket.id)) {
      socket.emit('error', { message: 'Already in a room' });
      return;
    }
    const map = mapId || 'original';
    if (!matchQueue.has(map)) matchQueue.set(map, []);
    matchQueue.get(map).push({ socket, name: name.slice(0, 12) });

    if (matchQueue.get(map).length >= 2) {
      tryMatchmake(map);
    } else {
      socket.emit('matchmaking', { message: 'Looking for players...' });
      scheduleAutoMatch(map);
    }
  });

  socket.on('player-ready', ({ ready }) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.state !== 'waiting') return;
    const player = room.players.get(socket.id);
    if (player) {
      player.ready = !!ready;
      io.to(room.code).emit('player-ready-changed', { id: socket.id, ready: player.ready });
    }
  });

  socket.on('change-map', ({ mapId }) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.state !== 'waiting') return;
    if (socket.id !== room.hostId) return;
    room.mapId = mapId;
    io.to(room.code).emit('map-changed', { mapId });
  });

  socket.on('start-game', () => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.state !== 'waiting') return;
    if (socket.id !== room.hostId) return;

    // Check all players ready and at least 2
    // (Allow solo start for testing)
    const allReady = [...room.players.values()].every(p => p.ready);
    if (!allReady) {
      socket.emit('error', { message: 'Not all players are ready' });
      return;
    }

    room.state = 'countdown';
    room.finishOrder = [];
    io.to(room.code).emit('countdown-start', { duration: 3 });

    let count = 3;
    room.countdownTimer = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(room.countdownTimer);
        room.countdownTimer = null;
        room.state = 'playing';
        room.startTime = Date.now();

        // Reset all player positions
        let i = 0;
        for (const p of room.players.values()) {
          p.finished = false;
          p.finishTime = 0;
          p.position = { x: (i - (room.players.size - 1) / 2) * 1.5, y: 2, z: 5 };
          i++;
        }

        io.to(room.code).emit('game-start', { startTime: room.startTime });
        startBroadcast(room);
        room.timeLimitTimeout = setTimeout(() => endGameByTimeLimit(room), TIME_LIMIT_MS);
      }
    }, 1000);
  });

  socket.on('player-state', (data) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.state !== 'playing') return;
    const player = room.players.get(socket.id);
    if (!player || player.finished) return;
    player.position = data.position;
    player.velocity = data.velocity;
    player.rotationY = data.rotationY;
    player.grounded = data.grounded;
    player.isDiving = data.isDiving;
  });

  socket.on('player-finished', ({ time }) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.state !== 'playing') return;
    const player = room.players.get(socket.id);
    if (!player || player.finished) return;

    player.finished = true;
    player.finishTime = time;
    const place = room.finishOrder.length + 1;
    room.finishOrder.push({ id: socket.id, name: player.name, time, place });

    io.to(room.code).emit('player-finished', {
      id: socket.id, name: player.name, time, place,
    });

    // Check if all finished
    const allFinished = [...room.players.values()].every(p => p.finished);
    if (allFinished) {
      room.state = 'finished';
      stopBroadcast(room);
      if (room.timeLimitTimeout) { clearTimeout(room.timeLimitTimeout); room.timeLimitTimeout = null; }
      io.to(room.code).emit('game-over', { finishOrder: room.finishOrder });
    }
  });

  socket.on('restart-game', () => {
    const room = getRoomForSocket(socket.id);
    if (!room) return;
    if (socket.id !== room.hostId) return;

    stopBroadcast(room);
    if (room.timeLimitTimeout) { clearTimeout(room.timeLimitTimeout); room.timeLimitTimeout = null; }
    room.state = 'waiting';
    room.finishOrder = [];
    for (const p of room.players.values()) {
      p.ready = false;
      p.finished = false;
      p.finishTime = 0;
    }
    io.to(room.code).emit('back-to-lobby', {
      players: getPlayersArray(room),
      hostId: room.hostId,
    });
  });

  socket.on('leave-room', () => {
    handleLeave(socket);
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id} disconnected`);
    handleLeave(socket);

    // Remove from match queues
    for (const [mapId, queue] of matchQueue) {
      const idx = queue.findIndex(e => e.socket.id === socket.id);
      if (idx !== -1) queue.splice(idx, 1);
    }
  });
});

function handleLeave(socket) {
  const room = getRoomForSocket(socket.id);
  if (!room) return;

  const player = room.players.get(socket.id);
  const name = player ? player.name : 'Unknown';
  room.players.delete(socket.id);
  socket.leave(room.code);

  if (room.players.size === 0) {
    destroyRoom(room.code);
    console.log(`Room ${room.code} destroyed (empty)`);
    return;
  }

  // Promote new host if needed
  if (socket.id === room.hostId) {
    room.hostId = room.players.keys().next().value;
  }

  io.to(room.code).emit('player-left', { id: socket.id, name, hostId: room.hostId });

  // If playing and all remaining finished, end game
  if (room.state === 'playing') {
    const allFinished = [...room.players.values()].every(p => p.finished);
    if (allFinished) {
      room.state = 'finished';
      stopBroadcast(room);
      io.to(room.code).emit('game-over', { finishOrder: room.finishOrder });
    }
  }
}

httpServer.listen(PORT, () => {
  console.log(`Tower Tumble server running on port ${PORT}`);
});
