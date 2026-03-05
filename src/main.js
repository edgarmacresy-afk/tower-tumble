import { Game } from './Game.js';
import { StumbleGame } from './StumbleGame.js';
import { SurvivalGame } from './SurvivalGame.js';
import { NetworkManager } from './network/NetworkManager.js';
import { MultiplayerUI } from './ui/MultiplayerUI.js';

const modeSelect = document.getElementById('mode-select');
const mapSelect = document.getElementById('stumble-map-select');

// ── Tower Race ──
document.getElementById('tower-mode-btn').addEventListener('click', () => {
  modeSelect.style.display = 'none';
  const game = new Game();
  game.init().catch((err) => console.error('Tower init failed:', err));
});

// ── Stumble Run (solo) ──
document.getElementById('stumble-mode-btn').addEventListener('click', () => {
  modeSelect.style.display = 'none';
  mapSelect.style.display = 'flex';
});

document.getElementById('map-original-btn').addEventListener('click', () => {
  mapSelect.style.display = 'none';
  const game = new StumbleGame('original');
  game.init().catch((err) => console.error('Stumble init failed:', err));
});

document.getElementById('map-cloud-btn').addEventListener('click', () => {
  mapSelect.style.display = 'none';
  const game = new StumbleGame('cloud-kingdom');
  game.init().catch((err) => console.error('Stumble init failed:', err));
});

// ── Survival Arena ──
document.getElementById('survival-mode-btn').addEventListener('click', () => {
  modeSelect.style.display = 'none';
  const game = new SurvivalGame();
  game.init().catch((err) => console.error('Survival init failed:', err));
});

// ── Multiplayer ──
const network = new NetworkManager();
const mpUI = new MultiplayerUI(network);

document.getElementById('multiplayer-mode-btn').addEventListener('click', () => {
  modeSelect.style.display = 'none';
  mpUI.show();
});

mpUI.onLeave = () => {
  modeSelect.style.display = 'flex';
};

mpUI.onGameStart = (data) => {
  const mapId = network.mapId || 'original';
  const game = new StumbleGame(mapId, network, data.lobbyPlayers);
  game.init().catch((err) => console.error('Multiplayer init failed:', err));
};
