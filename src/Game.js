import * as THREE from 'three';
import { COLORS, TOWER, PHYSICS, BOTS } from './utils/constants.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { BeanCharacter } from './player/BeanCharacter.js';
import { PlayerController } from './player/PlayerController.js';
import { AutoFollowCamera } from './camera/AutoFollowCamera.js';
import { TowerGenerator } from './tower/TowerGenerator.js';
import { Bot } from './player/Bot.js';
import { HUD } from './ui/HUD.js';
import { MenuScreen } from './ui/MenuScreen.js';
import { TouchControls } from './ui/TouchControls.js';

const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
};

export class Game {
  constructor() {
    this.state = GameState.MENU;
    this.clock = new THREE.Clock();
    this.physics = new PhysicsWorld();
    this.maxHeightReached = 0;
    this.bots = [];
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
    this.scene.background = new THREE.Color(COLORS.SKY);
    this.scene.fog = new THREE.Fog(COLORS.SKY, 30, 100);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      65, window.innerWidth / window.innerHeight, 0.1, 500
    );

    // Lights
    const ambient = new THREE.AmbientLight(0x8899bb, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
    sun.position.set(10, 50, 10);
    this.scene.add(sun);

    const hemi = new THREE.HemisphereLight(0x88bbff, 0xff8844, 0.4);
    this.scene.add(hemi);

    // Physics
    await this.physics.init();

    // UI
    this.hud = new HUD();
    this.menu = new MenuScreen(() => this.startGame());
    this.menu.showStart();

    // Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Start render loop
    this._loop();
  }

  async startGame() {
    // Clear old scene objects (keep lights)
    await this._clearGameObjects();

    this.maxHeightReached = 0;
    this.playerFinished = false;
    this.playerFinishTime = 0;
    this.finishOrder = []; // Track who finishes in what order

    // Generate tower
    this.tower = new TowerGenerator(this.physics, this.scene);
    this.tower.generate(Date.now());

    // Spawn bots
    this.bots = [];
    for (let i = 0; i < BOTS.COUNT; i++) {
      const bot = new Bot(this.scene, this.physics, this.tower.path, i);
      this.bots.push(bot);
    }

    // Player character
    this.character = new BeanCharacter();
    this.scene.add(this.character.group);

    // Player physics body
    const spawnPos = new THREE.Vector3(0, 2, 0);
    this.playerBody = this.physics.createDynamicBody(spawnPos, this.character.group);
    this.playerCollider = this.physics.addCapsuleCollider(
      this.playerBody,
      PHYSICS.PLAYER_CAPSULE_HALF_HEIGHT,
      PHYSICS.PLAYER_CAPSULE_RADIUS,
      PHYSICS.PLAYER_MASS
    );

    // Camera controller
    this.cameraController = new AutoFollowCamera(this.camera, this.character.group);

    // Player controller
    if (this.playerController) this.playerController.destroy();
    this.playerController = new PlayerController(
      this.physics, this.playerBody, this.playerCollider, this.character, this.cameraController
    );

    // Touch controls
    if (this.touchControls) this.touchControls.destroy();
    this.touchControls = new TouchControls(this.playerController, this.cameraController);
    this.touchControls.init();

    // Start
    this.hud.start();
    this.state = GameState.PLAYING;
    this.clock.getDelta(); // Reset delta
  }

  _respawnAtCheckpoint() {
    const cp = this.tower.getLastCheckpoint(this.maxHeightReached);
    this.playerBody.setTranslation(
      { x: cp.position.x, y: cp.position.y, z: cp.position.z },
      true
    );
    this.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    // Reset jump state
    this.playerController.jumpState = 'ready';
  }

  async _clearGameObjects() {
    // Destroy bots
    for (const bot of this.bots) {
      bot.destroy();
    }
    this.bots = [];

    // Remove everything except lights from scene
    const keep = [];
    this.scene.traverse((obj) => {
      if (obj.isLight) keep.push(obj);
    });
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    for (const light of keep) {
      this.scene.add(light);
    }

    // Rebuild physics world
    await this.physics.init();
  }

  _getRacePosition() {
    const playerHeight = this.playerBody.translation().y;
    let position = 1;
    for (const bot of this.bots) {
      if (bot.getHeight() > playerHeight) {
        position++;
      }
    }
    return position;
  }

  _checkGameState() {
    const pos = this.playerBody.translation();
    const elapsed = this.hud.getElapsedTime();

    // Track highest point reached (for checkpoint system)
    if (pos.y > this.maxHeightReached) {
      this.maxHeightReached = pos.y;
    }

    // Unlock double jump at first checkpoint (first purple base)
    if (!this.playerController.canDoubleJump && this.tower.checkpoints.length > 1) {
      const cp1 = this.tower.checkpoints[1];
      if (this.maxHeightReached >= cp1.height) {
        this.playerController.canDoubleJump = true;
        this.hud.showMessage('Double Jump Unlocked!');
      }
    }

    // Check if any bot finished
    for (const bot of this.bots) {
      if (bot.finished && !this.finishOrder.includes(bot.name)) {
        this.finishOrder.push(bot.name);
      }
    }

    // Player reached the top?
    if (!this.playerFinished && pos.y >= this.tower.victoryHeight - 1) {
      this.playerFinished = true;
      this.playerFinishTime = elapsed;
      const position = this.finishOrder.length + 1; // Player's finish position

      if (position === 1) {
        // Player won!
        this.state = GameState.VICTORY;
        this.hud.hide();
        this.menu.showVictory(elapsed);
      } else {
        // Player lost (a bot beat them)
        this.state = GameState.GAME_OVER;
        this.hud.hide();
        this.menu.showGameOver(position);
      }
      if (document.pointerLockElement) document.exitPointerLock();
      return;
    }

    // A bot finished and player hasn't yet — race over
    if (!this.playerFinished && this.finishOrder.length > 0) {
      // Give player a moment to see the bot won, then end it
      // Actually, let's let them keep racing to see what position they get
      // Only end if ALL bots finished
      const allBotsFinished = this.bots.every(b => b.finished);
      if (allBotsFinished) {
        const position = this.finishOrder.length + 1; // Last place
        this.state = GameState.GAME_OVER;
        this.hud.hide();
        this.menu.showGameOver(position);
        if (document.pointerLockElement) document.exitPointerLock();
        return;
      }
    }

    // Fell below ground level? Respawn at checkpoint
    if (pos.y < -5) {
      this._respawnAtCheckpoint();
      return;
    }

    // Fell way off to the side? Respawn at checkpoint
    const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    if (dist > TOWER.MAX_RADIUS + 15) {
      this._respawnAtCheckpoint();
    }
  }

  _updateOneWayCollisions() {
    const platforms = this.tower.oneWayPlatforms;
    if (!platforms.length) return;

    // Rapier encoding: (membership << 16) | filter
    const DEFAULT    = 0xFFFFFFFF; // membership=0xFFFF, filter=0xFFFF — hits everything
    const PASSTHRU   = 0xFFFFFFFD; // membership=0xFFFF, filter=0xFFFD — skips group 2 (checkpoints)

    const bodies = [
      { body: this.playerBody, collider: this.playerCollider },
      ...this.bots.map(b => ({ body: b.body, collider: b.collider })),
    ];

    for (const { body, collider } of bodies) {
      const y = body.translation().y;
      // Pass through when body center is below the platform surface.
      // Once center clears the top, collision turns on and Rapier pushes
      // the capsule up onto the surface — so you land on it.
      let passthrough = false;
      for (const p of platforms) {
        if (y < p.topY && y > p.topY - 5) {
          passthrough = true;
          break;
        }
      }
      collider.setCollisionGroups(passthrough ? PASSTHRU : DEFAULT);
    }
  }

  _loop() {
    requestAnimationFrame(() => this._loop());

    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.state !== GameState.PLAYING) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const elapsed = this.hud.getElapsedTime();

    // Input
    this.playerController.update(dt);

    // Platforms
    this.tower.update(dt);
    this.tower.checkDisappearing(this.playerBody);
    this._updateOneWayCollisions();

    // Bots
    for (const bot of this.bots) {
      bot.update(dt, elapsed);
    }

    // Physics
    this.physics.step(dt);
    this.physics.syncMeshes();

    // Character animations
    this.character.update(dt, this.playerController.grounded);

    // Camera
    this.cameraController.update(dt);

    // Game state checks
    this._checkGameState();

    // HUD
    const pos = this.playerBody.translation();
    const racePosition = this._getRacePosition();
    const totalRacers = this.bots.length + 1;
    this.hud.update(pos.y, racePosition, totalRacers);

    // Render
    this.renderer.render(this.scene, this.camera);
  }
}
