import { PHYSICS, STUMBLE } from '../utils/constants.js';
import { lerpAngle } from '../utils/helpers.js';

export class StumbleController {
  constructor(physicsWorld, body, collider, character, cameraController) {
    this.physics = physicsWorld;
    this.body = body;
    this.collider = collider;
    this.character = character;
    this.cameraController = cameraController;

    this.keys = {};
    this.grounded = false;
    this.useCharacterYaw = false;

    // Jump state machine
    this.jumpState = 'ready';
    this.landedTimer = 0;

    // Dive mechanic (double-tap space)
    this.isDiving = false;
    this.diveTimer = 0;
    this.diveCooldown = 0;
    this.spaceWasDown = false;
    this.lastSpaceTapTime = 0;

    this._onKeyDown = (e) => { this.keys[e.code] = true; };
    this._onKeyUp = (e) => { this.keys[e.code] = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  update(dt) {
    const vel = this.body.linvel();

    // Jump state machine
    if (this.jumpState === 'rising') {
      if (vel.y < 0) this.jumpState = 'falling';
    } else if (this.jumpState === 'falling') {
      if (Math.abs(vel.y) < 2.0) {
        this.jumpState = 'landed';
        this.landedTimer = 0;
      }
    } else if (this.jumpState === 'landed') {
      this.landedTimer += dt;
      if (this.landedTimer > 0.05) this.jumpState = 'ready';
    }

    this.grounded = this.jumpState === 'ready' && Math.abs(vel.y) < 2.0;

    // Dive cooldown
    if (this.diveCooldown > 0) this.diveCooldown -= dt;

    // During dive: no movement control, tilt character
    if (this.isDiving) {
      this.diveTimer -= dt;
      this.character.body.rotation.x = -0.8;
      if (this.diveTimer <= 0) {
        this.isDiving = false;
        this.character.body.rotation.x = 0;
      }
      this.character.velocity.set(vel.x, vel.y, vel.z);
      return;
    }

    // --- Movement input ---
    let inputX = 0, inputZ = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) inputZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) inputZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) inputX += 1;

    const hasInput = inputX !== 0 || inputZ !== 0;

    if (inputX !== 0 && inputZ !== 0) {
      const inv = 1 / Math.SQRT2;
      inputX *= inv;
      inputZ *= inv;
    }

    // Movement direction: character-relative on touch, camera-relative on desktop
    const yaw = this.useCharacterYaw ? this.character.group.rotation.y : this.cameraController.yaw;
    const moveX = inputX * Math.cos(yaw) + inputZ * Math.sin(yaw);
    const moveZ = -inputX * Math.sin(yaw) + inputZ * Math.cos(yaw);

    // Apply movement
    const forceMult = this.grounded ? 1 : PHYSICS.PLAYER_AIR_CONTROL;
    const force = PHYSICS.PLAYER_MOVE_FORCE * forceMult * dt;
    this.body.applyImpulse({ x: moveX * force, y: 0, z: moveZ * force }, true);

    // Ground drag
    if (this.grounded && !hasInput) {
      this.body.setLinvel({ x: vel.x * 0.85, y: vel.y, z: vel.z * 0.85 }, true);
    }

    // Speed clamp
    const hSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (hSpeed > PHYSICS.PLAYER_MAX_SPEED) {
      const scale = PHYSICS.PLAYER_MAX_SPEED / hSpeed;
      this.body.setLinvel({ x: vel.x * scale, y: vel.y, z: vel.z * scale }, true);
    }

    // --- Jump & Dive (double-tap space to dive) ---
    const spaceJustPressed = this.keys['Space'] && !this.spaceWasDown;
    this.spaceWasDown = !!this.keys['Space'];

    if (spaceJustPressed) {
      const now = performance.now() / 1000;
      const timeSinceLastTap = now - this.lastSpaceTapTime;
      this.lastSpaceTapTime = now;

      if (timeSinceLastTap < 0.4 && !this.grounded && !this.isDiving && this.diveCooldown <= 0) {
        // Double-tap space while airborne → DIVE
        this.isDiving = true;
        this.diveTimer = 0.4;
        this.diveCooldown = STUMBLE.DIVE_COOLDOWN;

        const angle = this.character.group.rotation.y;
        const fx = Math.sin(angle);
        const fz = Math.cos(angle);

        this.body.setLinvel({ x: vel.x, y: Math.max(vel.y, 0), z: vel.z }, true);
        this.body.applyImpulse({
          x: fx * STUMBLE.DIVE_IMPULSE,
          y: 12,
          z: fz * STUMBLE.DIVE_IMPULSE,
        }, true);
      } else if (this.jumpState === 'ready' && this.grounded) {
        // Single tap space on ground → JUMP
        this.body.applyImpulse({ x: 0, y: PHYSICS.PLAYER_JUMP_IMPULSE, z: 0 }, true);
        this.jumpState = 'rising';
      }
    }

    // Character visuals
    this.character.velocity.set(vel.x, vel.y, vel.z);

    if (Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01) {
      const targetAngle = Math.atan2(moveX, moveZ);
      this.character.group.rotation.y = lerpAngle(
        this.character.group.rotation.y, targetAngle, 0.15
      );
    }
  }
}
