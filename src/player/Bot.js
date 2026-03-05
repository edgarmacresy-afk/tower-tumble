import * as THREE from 'three';
import { COLORS, PHYSICS } from '../utils/constants.js';
import { BeanCharacter } from './BeanCharacter.js';

const BOT_NAMES = ['Wobble', 'Tumble', 'Bumble', 'Stumpy', 'Bonk', 'Dizzy'];

export class Bot {
  constructor(scene, physics, path, index) {
    this.scene   = scene;
    this.physics = physics;
    this.path    = path;
    this.pathIndex = 1;
    this.name    = BOT_NAMES[index % BOT_NAMES.length];

    const color = COLORS.PLAYER_PALETTE[(index + 1) % COLORS.PLAYER_PALETTE.length];
    this.character = new BeanCharacter(color);
    scene.add(this.character.group);

    const angle    = (index / 4) * Math.PI * 2;
    const spawnPos = new THREE.Vector3(Math.cos(angle) * 1.5, 2, Math.sin(angle) * 1.5);

    this.body = physics.createDynamicBody(spawnPos, this.character.group);
    this.collider = physics.addCapsuleCollider(
      this.body,
      PHYSICS.PLAYER_CAPSULE_HALF_HEIGHT,
      PHYSICS.PLAYER_CAPSULE_RADIUS,
      PHYSICS.PLAYER_MASS
    );

    // Personality: 0.80–0.98x player speed
    this.speedMult = 0.80 + index * 0.04 + Math.random() * 0.06;

    this.jumpState   = 'ready';
    this.landedTimer = 0;
    this.grounded    = false;

    this.hesitateTimer  = 0;
    this.hesitateNeeded = 0.15 + Math.random() * 0.25;
    this.stuckTimer     = 0;

    this.stumbleTimer  = 0;
    this.stumbleChance = 0.008 + Math.random() * 0.012;

    this.finished   = false;
    this.finishTime = 0;
  }

  getHeight() {
    return this.body.translation().y;
  }

  _isGrounded() {
    const pos = this.body.translation();
    return this.physics.castRay(
      pos, { x: 0, y: -1, z: 0 }, PHYSICS.GROUND_RAY_LENGTH, this.collider
    ) !== null;
  }

  update(dt, elapsed) {
    if (this.finished) return;

    const pos = this.body.translation();
    const vel = this.body.linvel();

    // Fell off map OR stuck for too long → respawn at previous waypoint
    const nextWaypoint = this.pathIndex < this.path.length ? this.path[this.pathIndex] : null;
    const tooFarBelow = nextWaypoint && (nextWaypoint.y - pos.y) > 6;
    const totallyStuck = this.stuckTimer > 5;
    if (pos.y < -5 || tooFarBelow || totallyStuck) {
      const idx       = Math.max(0, this.pathIndex - 1);
      const respawnPt = this.path[idx];
      this.body.setTranslation({ x: respawnPt.x, y: respawnPt.y + 1.5, z: respawnPt.z }, true);
      this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      this.jumpState  = 'ready';
      this.stuckTimer = 0;
      this.pathIndex  = idx;
      return;
    }

    // Jump state machine
    if (this.jumpState === 'rising') {
      if (vel.y < 0) this.jumpState = 'falling';
    } else if (this.jumpState === 'falling') {
      if (Math.abs(vel.y) < 2.0) { this.jumpState = 'landed'; this.landedTimer = 0; }
    } else if (this.jumpState === 'landed') {
      this.landedTimer += dt;
      if (this.landedTimer > 0.05) this.jumpState = 'ready';
    }

    this.grounded = this.jumpState === 'ready' && this._isGrounded();

    // Stumble
    if (this.stumbleTimer > 0) {
      this.stumbleTimer -= dt;
      if (this.grounded) this.body.setLinvel({ x: vel.x * 0.8, y: vel.y, z: vel.z * 0.8 }, true);
      this.character.velocity.set(vel.x, vel.y, vel.z);
      this.character.update(dt, this.grounded);
      return;
    }
    if (this.grounded && Math.random() < this.stumbleChance * dt * 60) {
      this.stumbleTimer = 0.3 + Math.random() * 0.8;
      return;
    }

    if (this.pathIndex >= this.path.length) {
      this.finished   = true;
      this.finishTime = elapsed;
      return;
    }

    const target = this.path[this.pathIndex];
    const dx    = target.x - pos.x;
    const dy    = target.y - pos.y;
    const dz    = target.z - pos.z;
    const hDist = Math.sqrt(dx * dx + dz * dz);

    // Advance waypoint when close
    if (hDist < 1.5 && dy < 2.5 && dy > -3) {
      this.pathIndex++;
      this.hesitateTimer  = 0;
      this.stuckTimer     = 0;
      this.hesitateNeeded = 0.15 + Math.random() * 0.25;
      return;
    }

    // --- Always run toward the target ---
    const moveForce = PHYSICS.PLAYER_MOVE_FORCE * this.speedMult * dt;
    if (hDist > 0.3) {
      const nx = dx / hDist;
      const nz = dz / hDist;
      this.body.applyImpulse({ x: nx * moveForce, y: 0, z: nz * moveForce }, true);
    }

    // Speed cap
    const hSpeed   = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    const maxSpeed = PHYSICS.PLAYER_MAX_SPEED * this.speedMult;
    if (hSpeed > maxSpeed) {
      const s = maxSpeed / hSpeed;
      this.body.setLinvel({ x: vel.x * s, y: vel.y, z: vel.z * s }, true);
    }

    // Drag when arrived horizontally and no jump needed
    if (this.grounded && hDist < 0.5 && dy < 0.8) {
      this.body.setLinvel({ x: vel.x * 0.85, y: vel.y, z: vel.z * 0.85 }, true);
    }

    // --- Jump when target is above ---
    if (dy > 0.8 && this.grounded && this.jumpState === 'ready') {
      this.hesitateTimer += dt;
      this.stuckTimer    += dt;

      if (this.hesitateTimer >= this.hesitateNeeded || this.stuckTimer > 2.0) {
        // Jump straight up + horizontal boost toward target
        const jumpForce = PHYSICS.PLAYER_JUMP_IMPULSE * (0.92 + Math.random() * 0.16);
        const horizBoost = 12;
        const nx = hDist > 0.1 ? dx / hDist : 0;
        const nz = hDist > 0.1 ? dz / hDist : 0;
        this.body.applyImpulse(
          { x: nx * horizBoost, y: jumpForce, z: nz * horizBoost }, true
        );
        this.jumpState      = 'rising';
        this.hesitateTimer  = 0;
        this.stuckTimer     = 0;
        this.hesitateNeeded = 0.15 + Math.random() * 0.25;
      }
    } else if (dy <= 0.8) {
      this.hesitateTimer = 0;
      if (hDist < 3) this.stuckTimer = 0;
    }

    // Visuals
    this.character.velocity.set(vel.x, vel.y, vel.z);
    this.character.update(dt, this.grounded);
    if (hDist > 0.3) this.character.group.rotation.y = Math.atan2(dx, dz);
  }

  destroy() {
    this.scene.remove(this.character.group);
  }
}
