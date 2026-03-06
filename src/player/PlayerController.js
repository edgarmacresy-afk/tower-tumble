import { PHYSICS } from '../utils/constants.js';
import { lerpAngle } from '../utils/helpers.js';

export class PlayerController {
  constructor(physicsWorld, body, collider, character, cameraController) {
    this.physics = physicsWorld;
    this.body = body;
    this.collider = collider;
    this.character = character;
    this.cameraController = cameraController;

    this.keys = {};
    this.grounded = false;
    this.useCharacterYaw = false;

    // Jump state machine: 'ready' -> 'rising' -> 'falling' -> 'landed' -> 'ready'
    this.jumpState = 'ready';
    this.landedTimer = 0;

    // Double jump — unlocked at checkpoint 2
    this.canDoubleJump = false;
    this.hasDoubleJumped = false;
    this.spaceWasDown = false;

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

    // --- Ground detection with jump state machine ---
    // Prevents infinite jump: must go up, then fall, then land before jumping again
    if (this.jumpState === 'rising') {
      // Wait until we start falling
      if (vel.y < 0) this.jumpState = 'falling';
    } else if (this.jumpState === 'falling') {
      // Wait until vertical velocity stabilizes (landed on something)
      if (Math.abs(vel.y) < 2.0) {
        this.jumpState = 'landed';
        this.landedTimer = 0;
      }
    } else if (this.jumpState === 'landed') {
      // Small delay before allowing next jump
      this.landedTimer += dt;
      if (this.landedTimer > 0.05) this.jumpState = 'ready';
    }

    // Grounded = not in a jump sequence and vertical velocity is stable
    this.grounded = this.jumpState === 'ready' && Math.abs(vel.y) < 2.0;

    // --- Input ---
    let inputX = 0, inputZ = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) inputZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) inputZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) inputX += 1;

    const hasInput = inputX !== 0 || inputZ !== 0;

    // Normalize diagonal
    if (inputX !== 0 && inputZ !== 0) {
      const inv = 1 / Math.SQRT2;
      inputX *= inv;
      inputZ *= inv;
    }

    // Camera-relative movement
    const yaw = this.useCharacterYaw ? this.character.group.rotation.y : this.cameraController.yaw;
    const moveX = inputX * Math.cos(yaw) + inputZ * Math.sin(yaw);
    const moveZ = -inputX * Math.sin(yaw) + inputZ * Math.cos(yaw);

    // --- Apply movement force ---
    const forceMult = this.grounded ? 1 : PHYSICS.PLAYER_AIR_CONTROL;
    const force = PHYSICS.PLAYER_MOVE_FORCE * forceMult * dt;
    this.body.applyImpulse({ x: moveX * force, y: 0, z: moveZ * force }, true);

    // --- Ground drag: stop sliding when no input ---
    if (this.grounded && !hasInput) {
      const drag = 0.85; // Multiply horizontal velocity by this each frame
      this.body.setLinvel({ x: vel.x * drag, y: vel.y, z: vel.z * drag }, true);
    }

    // Clamp horizontal speed
    const hSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (hSpeed > PHYSICS.PLAYER_MAX_SPEED) {
      const scale = PHYSICS.PLAYER_MAX_SPEED / hSpeed;
      this.body.setLinvel({ x: vel.x * scale, y: vel.y, z: vel.z * scale }, true);
    }

    // --- Jump ---
    const spaceJustPressed = this.keys['Space'] && !this.spaceWasDown;
    this.spaceWasDown = !!this.keys['Space'];

    if (spaceJustPressed && this.jumpState === 'ready' && this.grounded) {
      this.body.applyImpulse({ x: 0, y: PHYSICS.PLAYER_JUMP_IMPULSE, z: 0 }, true);
      this.jumpState = 'rising';
      this.hasDoubleJumped = false;
    } else if (
      spaceJustPressed && this.canDoubleJump && !this.hasDoubleJumped &&
      (this.jumpState === 'rising' || this.jumpState === 'falling')
    ) {
      // Double jump: reset vertical velocity then boost
      const v = this.body.linvel();
      this.body.setLinvel({ x: v.x, y: 0, z: v.z }, true);
      this.body.applyImpulse({ x: 0, y: PHYSICS.PLAYER_JUMP_IMPULSE * 0.8, z: 0 }, true);
      this.jumpState = 'rising';
      this.hasDoubleJumped = true;
    }

    // Update character velocity for animations
    this.character.velocity.set(vel.x, vel.y, vel.z);

    // Rotate character to face movement direction
    if (Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01) {
      const targetAngle = Math.atan2(moveX, moveZ);
      this.character.group.rotation.y = lerpAngle(this.character.group.rotation.y, targetAngle, 0.15);
    }
  }
}
