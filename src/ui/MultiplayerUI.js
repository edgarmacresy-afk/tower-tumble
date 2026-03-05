export class MultiplayerUI {
  constructor(networkManager) {
    this.network = networkManager;
    this.players = new Map(); // id → { name, color, ready }
    this.countdownValue = 0;
    this.countdownInterval = null;

    // Callbacks (set by main.js)
    this.onGameStart = null;
    this.onLeave = null;

    this._cacheElements();
    this._bindEvents();
    this._bindNetworkCallbacks();
  }

  _cacheElements() {
    this.lobbyScreen = document.getElementById('mp-lobby');
    this.waitingScreen = document.getElementById('mp-waiting');
    this.countdownScreen = document.getElementById('mp-countdown');
    this.resultsScreen = document.getElementById('mp-results');
    this.toastContainer = document.getElementById('mp-toasts');

    // Lobby
    this.nameInput = document.getElementById('mp-name-input');
    this.createBtn = document.getElementById('mp-create-btn');
    this.codeInput = document.getElementById('mp-code-input');
    this.joinBtn = document.getElementById('mp-join-btn');
    this.autoMatchBtn = document.getElementById('mp-automatch-btn');
    this.lobbyBackBtn = document.getElementById('mp-lobby-back');
    this.lobbyError = document.getElementById('mp-lobby-error');

    // Map select in lobby
    this.mapSelectOriginal = document.getElementById('mp-map-original');
    this.mapSelectCloud = document.getElementById('mp-map-cloud');

    // Waiting room
    this.roomCodeDisplay = document.getElementById('mp-room-code');
    this.playerList = document.getElementById('mp-player-list');
    this.readyBtn = document.getElementById('mp-ready-btn');
    this.startBtn = document.getElementById('mp-start-btn');
    this.waitingBackBtn = document.getElementById('mp-waiting-back');
    this.waitingStatus = document.getElementById('mp-waiting-status');
    this.waitingMapLabel = document.getElementById('mp-waiting-map');

    // Countdown
    this.countdownText = document.getElementById('mp-countdown-text');

    // Results
    this.resultsList = document.getElementById('mp-results-list');
    this.playAgainBtn = document.getElementById('mp-play-again-btn');
    this.leaveBtn = document.getElementById('mp-leave-btn');
  }

  _bindEvents() {
    // Lobby buttons
    this.createBtn.addEventListener('click', () => this._handleCreate());
    this.joinBtn.addEventListener('click', () => this._handleJoin());
    this.autoMatchBtn.addEventListener('click', () => this._handleAutoMatch());
    this.lobbyBackBtn.addEventListener('click', () => this._handleLobbyBack());

    // Map selection
    this.mapSelectOriginal.addEventListener('click', () => this._selectMap('original'));
    this.mapSelectCloud.addEventListener('click', () => this._selectMap('cloud-kingdom'));

    // Waiting room
    this.readyBtn.addEventListener('click', () => this._handleReady());
    this.startBtn.addEventListener('click', () => this.network.startGame());
    this.waitingBackBtn.addEventListener('click', () => this._handleLeaveRoom());

    // Results
    this.playAgainBtn.addEventListener('click', () => this.network.restartGame());
    this.leaveBtn.addEventListener('click', () => this._handleLeaveRoom());

    // Code input: auto uppercase
    this.codeInput.addEventListener('input', () => {
      this.codeInput.value = this.codeInput.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    });
  }

  _bindNetworkCallbacks() {
    this.network.onConnected = () => {
      this.lobbyError.textContent = '';
    };

    this.network.onDisconnected = () => {
      this.lobbyError.textContent = 'Disconnected from server';
      this.hideAll();
      this.lobbyScreen.style.display = 'flex';
    };

    this.network.onError = (msg) => {
      this.lobbyError.textContent = msg;
      setTimeout(() => { this.lobbyError.textContent = ''; }, 3000);
    };

    this.network.onRoomJoined = (data) => {
      this.players.clear();
      for (const p of data.players) {
        this.players.set(p.id, { name: p.name, color: p.color, ready: p.ready });
      }
      this.roomCodeDisplay.textContent = data.code;
      this._updateWaitingMapLabel(data.mapId);
      this._updatePlayerList();
      this._updateStartButton();
      this.hideAll();
      this.waitingScreen.style.display = 'flex';
    };

    this.network.onPlayerJoined = (data) => {
      this.players.set(data.id, { name: data.name, color: data.color, ready: false });
      this._updatePlayerList();
      this._updateStartButton();
    };

    this.network.onPlayerLeft = (data) => {
      this.players.delete(data.id);
      this._updatePlayerList();
      this._updateStartButton();
    };

    this.network.onPlayerReadyChanged = (data) => {
      const p = this.players.get(data.id);
      if (p) p.ready = data.ready;
      this._updatePlayerList();
      this._updateStartButton();
    };

    this.network.onMapChanged = (data) => {
      this._updateWaitingMapLabel(data.mapId);
    };

    this.network.onCountdownStart = (data) => {
      this.hideAll();
      this.countdownScreen.style.display = 'flex';
      this.countdownValue = data.duration;
      this.countdownText.textContent = this.countdownValue;
      this.countdownText.className = 'countdown-number';

      if (this.countdownInterval) clearInterval(this.countdownInterval);
      this.countdownInterval = setInterval(() => {
        this.countdownValue--;
        if (this.countdownValue > 0) {
          this.countdownText.textContent = this.countdownValue;
          // Pulse animation
          this.countdownText.className = '';
          void this.countdownText.offsetWidth;
          this.countdownText.className = 'countdown-number';
        } else {
          this.countdownText.textContent = 'GO!';
          this.countdownText.className = 'countdown-go';
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
      }, 1000);
    };

    this.network.onGameStart = (data) => {
      // Hide countdown after a short delay
      setTimeout(() => {
        this.countdownScreen.style.display = 'none';
      }, 800);
      if (this.onGameStart) this.onGameStart(data);
    };

    this.network.onPlayerFinished = (data) => {
      if (data.id !== this.network.playerId) {
        this._showToast(`${data.name} finished ${this._placeText(data.place)}!`);
      }
    };

    this.network.onGameOver = (data) => {
      this._showResults(data.finishOrder);
    };

    this.network.onBackToLobby = (data) => {
      this.players.clear();
      for (const p of data.players) {
        this.players.set(p.id, { name: p.name, color: p.color, ready: p.ready });
      }
      this._updatePlayerList();
      this._updateStartButton();
      this.hideAll();
      this.waitingScreen.style.display = 'flex';
    };

    this.network.onMatchmaking = () => {
      this.lobbyError.textContent = 'Looking for players...';
    };
  }

  // ── UI Actions ──

  show() {
    this.network.connect();
    this.hideAll();
    this.lobbyScreen.style.display = 'flex';
    this.lobbyError.textContent = '';
    // Default map selection
    this._selectMap('original');
  }

  hideAll() {
    this.lobbyScreen.style.display = 'none';
    this.waitingScreen.style.display = 'none';
    this.countdownScreen.style.display = 'none';
    this.resultsScreen.style.display = 'none';
  }

  _selectedMap = 'original';

  _selectMap(mapId) {
    this._selectedMap = mapId;
    this.mapSelectOriginal.classList.toggle('mp-map-selected', mapId === 'original');
    this.mapSelectCloud.classList.toggle('mp-map-selected', mapId === 'cloud-kingdom');
  }

  _handleCreate() {
    const name = this.nameInput.value.trim();
    if (!name) { this.lobbyError.textContent = 'Enter a name'; return; }
    this.network.createRoom(name, this._selectedMap);
  }

  _handleJoin() {
    const name = this.nameInput.value.trim();
    if (!name) { this.lobbyError.textContent = 'Enter a name'; return; }
    const code = this.codeInput.value.trim();
    if (code.length !== 4) { this.lobbyError.textContent = 'Enter a 4-letter code'; return; }
    this.network.joinRoom(name, code);
  }

  _handleAutoMatch() {
    const name = this.nameInput.value.trim();
    if (!name) { this.lobbyError.textContent = 'Enter a name'; return; }
    this.network.autoMatch(name, this._selectedMap);
  }

  _handleLobbyBack() {
    this.network.disconnect();
    this.hideAll();
    if (this.onLeave) this.onLeave();
  }

  _handleReady() {
    const p = this.players.get(this.network.playerId);
    const newReady = p ? !p.ready : true;
    this.network.setReady(newReady);
    this.readyBtn.textContent = newReady ? 'NOT READY' : 'READY';
    this.readyBtn.classList.toggle('mp-ready-active', newReady);
  }

  _handleLeaveRoom() {
    this.network.leaveRoom();
    this.hideAll();
    if (this.onLeave) this.onLeave();
  }

  _updatePlayerList() {
    this.playerList.innerHTML = '';
    for (const [id, p] of this.players) {
      const card = document.createElement('div');
      card.className = 'mp-player-card';

      const dot = document.createElement('div');
      dot.className = 'mp-player-dot';
      dot.style.backgroundColor = '#' + p.color.toString(16).padStart(6, '0');

      const nameEl = document.createElement('span');
      nameEl.className = 'mp-player-name';
      nameEl.textContent = p.name;
      if (id === this.network.playerId) nameEl.textContent += ' (You)';

      const readyEl = document.createElement('span');
      readyEl.className = 'mp-player-ready';
      readyEl.textContent = p.ready ? 'READY' : '';
      readyEl.style.color = p.ready ? '#4ECDC4' : '#FF6B6B';

      card.appendChild(dot);
      card.appendChild(nameEl);
      card.appendChild(readyEl);
      this.playerList.appendChild(card);
    }
  }

  _updateStartButton() {
    const isHost = this.network.isHost;
    const allReady = this.players.size > 0 && [...this.players.values()].every(p => p.ready);
    this.startBtn.style.display = isHost ? 'block' : 'none';
    this.startBtn.disabled = !allReady;
    this.startBtn.style.opacity = allReady ? '1' : '0.5';

    if (!isHost) {
      this.waitingStatus.textContent = 'Waiting for host to start...';
    } else if (!allReady) {
      this.waitingStatus.textContent = 'Waiting for all players to ready up...';
    } else {
      this.waitingStatus.textContent = 'All ready! Start when you want.';
    }
  }

  _updateWaitingMapLabel(mapId) {
    const names = { 'original': 'Obstacle Course', 'cloud-kingdom': 'Cloud Kingdom' };
    this.waitingMapLabel.textContent = `Map: ${names[mapId] || mapId}`;
  }

  _showResults(finishOrder) {
    this.hideAll();
    this.resultsScreen.style.display = 'flex';

    this.resultsList.innerHTML = '';
    const placeColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

    for (const entry of finishOrder) {
      const row = document.createElement('div');
      row.className = 'mp-result-row';

      const place = document.createElement('span');
      place.className = 'mp-result-place';
      place.textContent = this._placeText(entry.place);
      place.style.color = placeColors[entry.place - 1] || '#fff';

      const name = document.createElement('span');
      name.className = 'mp-result-name';
      name.textContent = entry.name;
      if (entry.id === this.network.playerId) name.textContent += ' (You)';

      const time = document.createElement('span');
      time.className = 'mp-result-time';
      const mins = Math.floor(entry.time / 60);
      const secs = Math.floor(entry.time % 60);
      time.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

      row.appendChild(place);
      row.appendChild(name);
      row.appendChild(time);
      this.resultsList.appendChild(row);
    }

    this.playAgainBtn.style.display = this.network.isHost ? 'inline-block' : 'none';
  }

  _placeText(n) {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return n + 'th';
  }

  _showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'mp-toast';
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('mp-toast-fade');
      setTimeout(() => toast.remove(), 500);
    }, 2500);
  }
}
