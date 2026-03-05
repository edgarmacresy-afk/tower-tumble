import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export class NetworkManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomCode = null;
    this.playerId = null;
    this.isHost = false;
    this.mapId = 'original';

    // Callbacks (set by UI / game)
    this.onConnected = null;
    this.onDisconnected = null;
    this.onError = null;
    this.onRoomJoined = null;
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onPlayerReadyChanged = null;
    this.onMapChanged = null;
    this.onCountdownStart = null;
    this.onGameStart = null;
    this.onStateUpdate = null;
    this.onPlayerFinished = null;
    this.onGameOver = null;
    this.onBackToLobby = null;
    this.onMatchmaking = null;

    // Send buffer
    this._sendInterval = null;
    this._latestState = null;
  }

  connect() {
    if (this.socket) return;

    this.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.playerId = this.socket.id;
      if (this.onConnected) this.onConnected();
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this._stopSending();
      if (this.onDisconnected) this.onDisconnected();
    });

    this.socket.on('error', (data) => {
      if (this.onError) this.onError(data.message);
    });

    this.socket.on('room-created', (data) => {
      this.roomCode = data.code;
      this.playerId = data.playerId;
    });

    this.socket.on('room-joined', (data) => {
      this.roomCode = data.code;
      this.playerId = data.playerId;
      this.isHost = data.hostId === data.playerId;
      this.mapId = data.mapId;
      if (this.onRoomJoined) this.onRoomJoined(data);
    });

    this.socket.on('player-joined', (data) => {
      if (this.onPlayerJoined) this.onPlayerJoined(data);
    });

    this.socket.on('player-left', (data) => {
      this.isHost = data.hostId === this.playerId;
      if (this.onPlayerLeft) this.onPlayerLeft(data);
    });

    this.socket.on('player-ready-changed', (data) => {
      if (this.onPlayerReadyChanged) this.onPlayerReadyChanged(data);
    });

    this.socket.on('map-changed', (data) => {
      this.mapId = data.mapId;
      if (this.onMapChanged) this.onMapChanged(data);
    });

    this.socket.on('countdown-start', (data) => {
      if (this.onCountdownStart) this.onCountdownStart(data);
    });

    this.socket.on('game-start', (data) => {
      this._startSending();
      if (this.onGameStart) this.onGameStart(data);
    });

    this.socket.on('state-update', (data) => {
      if (this.onStateUpdate) this.onStateUpdate(data);
    });

    this.socket.on('player-finished', (data) => {
      if (this.onPlayerFinished) this.onPlayerFinished(data);
    });

    this.socket.on('game-over', (data) => {
      this._stopSending();
      if (this.onGameOver) this.onGameOver(data);
    });

    this.socket.on('back-to-lobby', (data) => {
      this._stopSending();
      this.isHost = data.hostId === this.playerId;
      if (this.onBackToLobby) this.onBackToLobby(data);
    });

    this.socket.on('matchmaking', (data) => {
      if (this.onMatchmaking) this.onMatchmaking(data);
    });
  }

  createRoom(name, mapId) {
    if (!this.socket) return;
    this.socket.emit('create-room', { name, mapId });
  }

  joinRoom(name, code) {
    if (!this.socket) return;
    this.socket.emit('join-room', { name, code });
  }

  autoMatch(name, mapId) {
    if (!this.socket) return;
    this.socket.emit('auto-match', { name, mapId });
  }

  setReady(ready) {
    if (!this.socket) return;
    this.socket.emit('player-ready', { ready });
  }

  changeMap(mapId) {
    if (!this.socket) return;
    this.socket.emit('change-map', { mapId });
  }

  startGame() {
    if (!this.socket) return;
    this.socket.emit('start-game');
  }

  sendState(position, velocity, rotationY, grounded, isDiving) {
    this._latestState = { position, velocity, rotationY, grounded, isDiving };
  }

  sendFinished(time) {
    if (!this.socket) return;
    this.socket.emit('player-finished', { time });
  }

  restartGame() {
    if (!this.socket) return;
    this.socket.emit('restart-game');
  }

  leaveRoom() {
    if (!this.socket) return;
    this._stopSending();
    this.socket.emit('leave-room');
    this.roomCode = null;
    this.isHost = false;
  }

  disconnect() {
    this._stopSending();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.roomCode = null;
  }

  _startSending() {
    this._stopSending();
    this._sendInterval = setInterval(() => {
      if (this._latestState && this.socket) {
        this.socket.volatile.emit('player-state', this._latestState);
      }
    }, 50); // 20Hz
  }

  _stopSending() {
    if (this._sendInterval) {
      clearInterval(this._sendInterval);
      this._sendInterval = null;
    }
    this._latestState = null;
  }
}
