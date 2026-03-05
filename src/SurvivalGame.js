import * as THREE from 'three';
import { COLORS, PHYSICS, STUMBLE, LAVA as LAVA_CONST, SURVIVAL } from './utils/constants.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { BeanCharacter } from './player/BeanCharacter.js';
import { StumbleController } from './stumble/StumbleController.js';
import { AutoFollowCamera } from './camera/AutoFollowCamera.js';
import { SurvivalArenaCourse } from './survival/SurvivalArenaCourse.js';
import { RisingLava } from './hazards/RisingLava.js';

const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
};

export class SurvivalGame {
  constructor() {
    this.state = GameState.MENU;
    this.clock = new THREE.Clock();
    this.physics = new PhysicsWorld();
    this.lava = null;
    this.bestTime = 0;
  }

  async init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(this.renderer.domElement);

    // Scene — dark volcanic theme
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2D1B2E);
    this.scene.fog = new THREE.Fog(0x2D1B2E, 40, 200);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      65, window.innerWidth / window.innerHeight, 0.1, 500
    );

    // Lights — warm lava atmosphere
    this.scene.add(new THREE.AmbientLight(0x665566, 0.5));
    const sun = new THREE.DirectionalLight(0xFFAA66, 0.8);
    sun.position.set(10, 50, 30);
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0x443355, 0xFF6633, 0.5));

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

    // Show start
    this._showStart();

    // Render loop
    this._loop();
  }

  _setupUI() {
    this.hudEl = document.getElementById('survival-hud');
    this.timerEl = document.getElementById('survival-timer');
    this.lavaHeightEl = document.getElementById('survival-lava-height');
    this.lavaBarFill = document.getElementById('survival-lava-bar-fill');
    this.phaseEl = document.getElementById('survival-phase');

    this.startScreen = document.getElementById('survival-start');
    this.gameOverScreen = document.getElementById('survival-gameover');

    document.getElementById('survival-start-btn').addEventListener('click', () => {
      this._hideScreens();
      this.startGame();
    });

    document.getElementById('survival-retry-btn').addEventListener('click', () => {
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
    this.gameOverScreen.style.display = 'none';
  }

  async startGame() {
    await this._clearGameObjects();

    this.startTime = performance.now() / 1000;

    // Scene colors (re-apply after clear)
    this.scene.background = new THREE.Color(0x2D1B2E);
    this.scene.fog = new THREE.Fog(0x2D1B2E, 40, 200);

    // Course
    this.course = new SurvivalArenaCourse(this.physics, this.scene);
    this.course.generate();

    // Lava
    this.lava = new RisingLava(this.scene);
    this.lava.start();

    // Player
    this.character = new BeanCharacter();
    this.scene.add(this.character.group);

    const spawnPos = new THREE.Vector3(0, SURVIVAL.SPAWN_Y, 0);
    this.playerBody = this.physics.createDynamicBody(spawnPos, this.character.group);
    this.playerCollider = this.physics.addCapsuleCollider(
      this.playerBody,
      PHYSICS.PLAYER_CAPSULE_HALF_HEIGHT,
      PHYSICS.PLAYER_CAPSULE_RADIUS,
      PHYSICS.PLAYER_MASS
    );

    // Camera
    this.cameraController = new AutoFollowCamera(this.camera, this.character.group);

    // Controller (reuse stumble controller — gives dive mechanic)
    if (this.playerController) this.playerController.destroy();
    this.playerController = new StumbleController(
      this.physics, this.playerBody, this.playerCollider,
      this.character, this.cameraController
    );

    // HUD
    this.hudEl.style.display = 'block';
    this.state = GameState.PLAYING;
    this.clock.getDelta();
  }

  _getElapsed() {
    return performance.now() / 1000 - this.startTime;
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

  _gameOver() {
    this.state = GameState.GAME_OVER;
    this.hudEl.style.display = 'none';

    const elapsed = this._getElapsed();
    if (elapsed > this.bestTime) this.bestTime = elapsed;

    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    document.getElementById('survival-final-time').textContent =
      `${mins}:${secs.toString().padStart(2, '0')}`;

    const bestMins = Math.floor(this.bestTime / 60);
    const bestSecs = Math.floor(this.bestTime % 60);
    document.getElementById('survival-best-time').textContent =
      `${bestMins}:${bestSecs.toString().padStart(2, '0')}`;

    this.gameOverScreen.style.display = 'flex';
    if (document.pointerLockElement) document.exitPointerLock();
  }

  _updateHUD() {
    const elapsed = this._getElapsed();
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    this.timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

    // Lava distance indicator
    const lavaH = this.lava.height;
    const playerH = this.playerBody.translation().y;
    const safeDistance = Math.max(0, playerH - lavaH);
    this.lavaHeightEl.textContent = `${safeDistance.toFixed(1)}m`;

    // Lava bar fill (how far lava has risen toward peak y=18)
    const lavaProgress = Math.min(100, Math.max(0,
      ((lavaH - LAVA_CONST.START_HEIGHT) / (18 - LAVA_CONST.START_HEIGHT)) * 100
    ));
    this.lavaBarFill.style.height = `${lavaProgress}%`;

    // Phase indicator
    if (elapsed < SURVIVAL.PHASE_2_TIME) {
      this.phaseEl.textContent = 'Phase 1';
    } else if (elapsed < SURVIVAL.PHASE_3_TIME) {
      this.phaseEl.textContent = 'Phase 2';
    } else if (elapsed < SURVIVAL.PHASE_4_TIME) {
      this.phaseEl.textContent = 'Phase 3';
    } else if (elapsed < SURVIVAL.PHASE_5_TIME) {
      this.phaseEl.textContent = 'Phase 4';
    } else {
      this.phaseEl.textContent = 'FINAL PHASE';
      this.phaseEl.style.color = '#FF4500';
    }
  }

  async _clearGameObjects() {
    const keep = [];
    this.scene.traverse((obj) => { if (obj.isLight) keep.push(obj); });
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    for (const light of keep) this.scene.add(light);
    await this.physics.init();
  }

  _loop() {
    requestAnimationFrame(() => this._loop());

    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.state !== GameState.PLAYING) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Input
    this.playerController.update(dt);

    // Course obstacles (spinners, moving platforms, escalation)
    this.course.update(dt);

    // Trampolines & boost pads
    this._checkTrampolines();
    this._checkBoostPads();

    // Rising lava
    this.lava.update(dt);

    // Physics
    this.physics.step(dt);
    this.physics.syncMeshes();

    // Character animations
    this.character.update(dt, this.playerController.grounded);

    // Camera
    this.cameraController.update(dt);

    // --- SURVIVAL GAME STATE ---
    const pos = this.playerBody.translation();

    // Lava consumption = game over
    if (this.lava.isPlayerConsumed(pos.y)) {
      this._gameOver();
      return;
    }

    // Fell off sides = game over (no respawn)
    if (Math.abs(pos.x) > this.course.courseWidth + 5 ||
        Math.abs(pos.z) > this.course.courseWidth + 5) {
      this._gameOver();
      return;
    }

    // Fell far below = game over
    if (pos.y < this.lava.height - 5) {
      this._gameOver();
      return;
    }

    // HUD
    this._updateHUD();

    // Render
    this.renderer.render(this.scene, this.camera);
  }
}
