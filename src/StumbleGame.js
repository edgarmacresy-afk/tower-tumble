import * as THREE from 'three';
import { COLORS, PHYSICS, STUMBLE } from './utils/constants.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { BeanCharacter } from './player/BeanCharacter.js';
import { StumbleController } from './stumble/StumbleController.js';
import { AutoFollowCamera } from './camera/AutoFollowCamera.js';
import { ObstacleCourse } from './stumble/ObstacleCourse.js';
import { CloudKingdomCourse } from './stumble/CloudKingdomCourse.js';
import { RemotePlayerManager } from './network/RemotePlayerManager.js';
import { TouchControls } from './ui/TouchControls.js';

const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  VICTORY: 'victory',
};

export class StumbleGame {
  constructor(mapId = 'original', networkManager = null, lobbyPlayers = null) {
    this.state = GameState.MENU;
    this.clock = new THREE.Clock();
    this.physics = new PhysicsWorld();
    this.maxProgressZ = 0;
    this.maxProgressY = 0;
    this.mapId = mapId;
    this.network = networkManager;
    this.isMultiplayer = !!networkManager;
    this.lobbyPlayers = lobbyPlayers;
    this.remotePlayerManager = null;
    this.localFinished = false;
    this.spectating = false;
    this.spectateIndex = 0;
    this._onSpectateClick = null;
  }

  async init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 60, 280);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      65, window.innerWidth / window.innerHeight, 0.1, 500
    );

    // Lights
    this.scene.add(new THREE.AmbientLight(0x8899bb, 0.6));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
    sun.position.set(10, 50, 30);
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0x88bbff, 0xff8844, 0.4));

    // Physics
    await this.physics.init();

    // UI
    this._setupUI();

    // Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    if (this.isMultiplayer) {
      // Multiplayer: start immediately (countdown already handled by UI)
      this.startGame();
    } else {
      // Solo: show start screen
      this._showStart();
    }

    // Render loop
    this._loop();
  }

  _setupUI() {
    this.hudEl = document.getElementById('stumble-hud');
    this.timerEl = document.getElementById('stumble-timer');
    this.progressEl = document.getElementById('stumble-progress');
    this.progressFill = document.getElementById('stumble-progress-fill');

    this.startScreen = document.getElementById('stumble-start');
    this.victoryScreen = document.getElementById('stumble-victory');

    document.getElementById('stumble-start-btn').addEventListener('click', () => {
      this._hideScreens();
      this.startGame();
    });

    document.getElementById('stumble-again-btn').addEventListener('click', () => {
      this._hideScreens();
      this.startGame();
    });
  }

  _showStart() {
    this._hideScreens();
    this.startScreen.style.display = 'flex';
  }

  _hideScreens() {
    this.startScreen.style.display = 'none';
    this.victoryScreen.style.display = 'none';
  }

  async startGame() {
    await this._clearGameObjects();

    this.maxProgressZ = 0;
    this.maxProgressY = 0;
    this.localFinished = false;
    this.startTime = performance.now() / 1000;

    // Course (pick based on map selection)
    if (this.mapId === 'cloud-kingdom') {
      this.course = new CloudKingdomCourse(this.physics, this.scene);
      this.scene.background = new THREE.Color(0xFFE0B2);
      this.scene.fog = new THREE.Fog(0xFFE0B2, 50, 250);
    } else {
      this.course = new ObstacleCourse(this.physics, this.scene);
      this.scene.background = new THREE.Color(0x87CEEB);
      this.scene.fog = new THREE.Fog(0x87CEEB, 60, 280);
    }
    this.course.generate();

    // Player
    this.character = new BeanCharacter();
    this.scene.add(this.character.group);

    const spawnPos = new THREE.Vector3(0, 2, 5);
    this.playerBody = this.physics.createDynamicBody(spawnPos, this.character.group);
    this.playerCollider = this.physics.addCapsuleCollider(
      this.playerBody,
      PHYSICS.PLAYER_CAPSULE_HALF_HEIGHT,
      PHYSICS.PLAYER_CAPSULE_RADIUS,
      PHYSICS.PLAYER_MASS
    );

    // Camera
    this.cameraController = new AutoFollowCamera(this.camera, this.character.group);

    // Controller (dive, no double jump)
    if (this.playerController) this.playerController.destroy();
    this.playerController = new StumbleController(
      this.physics, this.playerBody, this.playerCollider,
      this.character, this.cameraController
    );

    // Touch controls
    if (this.touchControls) this.touchControls.destroy();
    this.touchControls = new TouchControls(this.playerController, this.cameraController);
    this.touchControls.init();

    // Multiplayer: set up remote players and network callbacks
    if (this.isMultiplayer) {
      this.remotePlayerManager = new RemotePlayerManager(
        this.scene, this.network.playerId
      );

      // Seed existing lobby players
      if (this.lobbyPlayers) {
        for (const p of this.lobbyPlayers) {
          this.remotePlayerManager.addPlayer(p.id, p.name, p.color);
        }
      }

      this.network.onStateUpdate = (data) => {
        if (this.remotePlayerManager) {
          this.remotePlayerManager.applyStateUpdate(data.players);
        }
      };

      this.network.onPlayerJoined = (data) => {
        if (this.remotePlayerManager) {
          this.remotePlayerManager.addPlayer(data.id, data.name, data.color);
        }
      };

      this.network.onPlayerLeft = (data) => {
        if (this.remotePlayerManager) {
          this.remotePlayerManager.removePlayer(data.id);
        }
      };

      this.network.onGameOver = (data) => {
        this._stopSpectating();
        this.state = GameState.VICTORY;
        this.hudEl.style.display = 'none';
        if (document.pointerLockElement) document.exitPointerLock();
        // Results screen is handled by MultiplayerUI
      };
    }

    // HUD
    this.hudEl.style.display = 'block';
    this.state = GameState.PLAYING;
    this.clock.getDelta();
  }

  _getElapsed() {
    return performance.now() / 1000 - this.startTime;
  }

  _respawn() {
    let cp = this.course.checkpoints[0];
    for (const c of this.course.checkpoints) {
      const passedZ = c.z <= this.maxProgressZ + 5;
      if (c.y > 0) {
        // Elevated checkpoint — need BOTH Z and Y progress
        if (passedZ && c.y <= this.maxProgressY + 2) cp = c;
      } else {
        // Ground-level checkpoint — Z progress alone is enough
        if (passedZ) cp = c;
      }
    }
    this.playerBody.setTranslation({ x: cp.x, y: cp.y + 2, z: cp.z }, true);
    this.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.playerController.jumpState = 'ready';
    this.playerController.isDiving = false;
    this.playerController.diveTimer = 0;
  }

  _checkTrampolines() {
    const pos = this.playerBody.translation();
    const vel = this.playerBody.linvel();

    for (const tramp of this.course.trampolines) {
      if (tramp.cooldown > 0) continue;
      const dx = pos.x - tramp.x;
      const dz = pos.z - tramp.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < tramp.radius && Math.abs(pos.y - tramp.y) < 1.2 && vel.y < 3) {
        this.playerBody.setLinvel({ x: vel.x, y: 0, z: vel.z }, true);
        this.playerBody.applyImpulse(
          { x: 0, y: STUMBLE.TRAMPOLINE_IMPULSE, z: 0 }, true
        );
        tramp.cooldown = 0.5;
        tramp.bounceTimer = 0.3;
      }
    }
  }

  _checkBoostPads() {
    const pos = this.playerBody.translation();

    for (const pad of this.course.boostPads) {
      if (pad.cooldown > 0) continue;
      const dx = Math.abs(pos.x - pad.x);
      const dz = Math.abs(pos.z - pad.z);

      if (dx < pad.halfW && dz < pad.halfD && Math.abs(pos.y - pad.y) < 1.5) {
        this.playerBody.applyImpulse({
          x: pad.dirX * STUMBLE.BOOST_IMPULSE,
          y: 5,
          z: pad.dirZ * STUMBLE.BOOST_IMPULSE,
        }, true);
        pad.cooldown = 0.5;
      }
    }
  }

  async _clearGameObjects() {
    const keep = [];
    this.scene.traverse((obj) => { if (obj.isLight) keep.push(obj); });
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    for (const light of keep) this.scene.add(light);
    if (this.remotePlayerManager) {
      this.remotePlayerManager.clear();
      this.remotePlayerManager = null;
    }
    await this.physics.init();
  }

  _startSpectating() {
    if (!this.remotePlayerManager) return;
    const unfinished = this._getUnfinishedPlayers();
    if (unfinished.length === 0) return;

    this.spectating = true;
    this.spectateIndex = 0;
    this._setSpectateTarget(unfinished[0]);

    // Show spectate banner
    if (!document.getElementById('spectate-banner')) {
      const banner = document.createElement('div');
      banner.id = 'spectate-banner';
      banner.innerHTML = '<span id="spectate-name"></span><br><small>Tap / Click to switch player</small>';
      banner.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:10px 24px;border-radius:12px;font-family:sans-serif;font-size:16px;text-align:center;z-index:60;pointer-events:none;';
      document.body.appendChild(banner);
    }
    this._updateSpectateBanner(unfinished[0]);

    // Click/tap to cycle
    this._onSpectateClick = () => {
      const players = this._getUnfinishedPlayers();
      if (players.length === 0) return;
      this.spectateIndex = (this.spectateIndex + 1) % players.length;
      this._setSpectateTarget(players[this.spectateIndex]);
      this._updateSpectateBanner(players[this.spectateIndex]);
    };
    document.addEventListener('click', this._onSpectateClick);
    document.addEventListener('touchstart', this._onSpectateClick);
  }

  _stopSpectating() {
    this.spectating = false;
    if (this._onSpectateClick) {
      document.removeEventListener('click', this._onSpectateClick);
      document.removeEventListener('touchstart', this._onSpectateClick);
      this._onSpectateClick = null;
    }
    const banner = document.getElementById('spectate-banner');
    if (banner) banner.remove();
  }

  _getUnfinishedPlayers() {
    if (!this.remotePlayerManager) return [];
    return Array.from(this.remotePlayerManager.players.values()).filter(rp => !rp.finished);
  }

  _setSpectateTarget(remotePlayer) {
    if (remotePlayer && remotePlayer.character) {
      this.cameraController.target = remotePlayer.character.group;
    }
  }

  _updateSpectateBanner(remotePlayer) {
    const nameEl = document.getElementById('spectate-name');
    if (nameEl && remotePlayer) {
      nameEl.textContent = `Spectating: ${remotePlayer.name}`;
    }
  }

  _loop() {
    requestAnimationFrame(() => this._loop());

    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.state !== GameState.PLAYING) {
      if (this.renderer) this.renderer.render(this.scene, this.camera);
      return;
    }

    // Input (skip if already finished in multiplayer — keep watching)
    if (!this.localFinished) {
      this.playerController.update(dt);
    }

    // Course obstacles (spinners, pushers)
    this.course.update(dt);

    // Trampolines & boost pads
    if (!this.localFinished) {
      this._checkTrampolines();
      this._checkBoostPads();
    }

    // Physics
    this.physics.step(dt);
    this.physics.syncMeshes();

    // Character animations
    this.character.update(dt, this.playerController.grounded);

    // Camera
    this.cameraController.update(dt);

    // Remote players (multiplayer)
    if (this.remotePlayerManager) {
      this.remotePlayerManager.update(dt);
    }

    // Spectate: auto-switch if current target finished
    if (this.spectating) {
      const unfinished = this._getUnfinishedPlayers();
      if (unfinished.length === 0) {
        this._stopSpectating();
      } else {
        const current = unfinished[this.spectateIndex % unfinished.length];
        if (this.cameraController.target !== current.character.group) {
          this.spectateIndex = this.spectateIndex % unfinished.length;
          this._setSpectateTarget(current);
          this._updateSpectateBanner(current);
        }
      }
    }

    // --- Game state ---
    const pos = this.playerBody.translation();
    const vel = this.playerBody.linvel();

    if (pos.z > this.maxProgressZ) this.maxProgressZ = pos.z;
    if (pos.y > this.maxProgressY) this.maxProgressY = pos.y;

    // Send state to server (multiplayer)
    if (this.isMultiplayer && !this.localFinished) {
      this.network.sendState(
        { x: pos.x, y: pos.y, z: pos.z },
        { x: vel.x, y: vel.y, z: vel.z },
        this.character.group.rotation.y,
        this.playerController.grounded,
        this.playerController.isDiving
      );
    }

    // Fell below map
    if (pos.y < -10 && !this.localFinished) {
      this._respawn();
    }

    // Fell off sides (dynamic per-map boundary)
    if ((Math.abs(pos.x) > this.course.courseWidth || Math.abs(pos.z) > this.course.finishZ + 100) && !this.localFinished) {
      this._respawn();
    }

    // Reached finish (position-based for spiral tower top)
    if (!this.localFinished) {
      const fp = this.course.finishPosition;
      if (fp) {
        const dx = pos.x - fp.x;
        const dy = pos.y - fp.y;
        const dz = pos.z - fp.z;
        const distToFinish = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (pos.y >= fp.y - 3 && distToFinish < this.course.finishRadius) {
          const elapsed = this._getElapsed();

          if (this.isMultiplayer) {
            // Multiplayer: tell server, switch to spectate
            this.localFinished = true;
            this.network.sendFinished(elapsed);
            this._startSpectating();
          } else {
            // Solo: show victory
            this.state = GameState.VICTORY;
            this.hudEl.style.display = 'none';
            const mins = Math.floor(elapsed / 60);
            const secs = Math.floor(elapsed % 60);
            document.getElementById('stumble-final-time').textContent =
              `${mins}:${secs.toString().padStart(2, '0')}`;
            this.victoryScreen.style.display = 'flex';
            if (document.pointerLockElement) document.exitPointerLock();
            return;
          }
        }
      }
    }

    // HUD
    const elapsed = this._getElapsed();
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    this.timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

    const progress = this.course.getProgress
      ? this.course.getProgress(pos)
      : Math.min(100, (pos.z / this.course.finishZ) * 100);
    this.progressFill.style.width = `${progress}%`;
    this.progressEl.textContent = `${Math.floor(progress)}%`;

    // Render
    this.renderer.render(this.scene, this.camera);
  }
}
