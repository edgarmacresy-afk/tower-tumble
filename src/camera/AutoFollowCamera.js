import * as THREE from 'three';
import { CAMERA } from '../utils/constants.js';
import { clamp } from '../utils/helpers.js';

export class AutoFollowCamera {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;

    this.distance = CAMERA.DISTANCE;
    this.heightOffset = CAMERA.HEIGHT_OFFSET;
    this.lookAheadY = CAMERA.LOOK_AHEAD_Y;
    this.smoothSpeed = CAMERA.SMOOTH_SPEED;

    this.yaw = 0;
    this.pitch = 0.3;

    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
    this._lastPos = null;
    this._disableAutoFollow = false; // set true by TouchControls when active
    this._manualDragTimer = 0; // suppress auto-follow briefly after touch drag

    this._initMouseControls();
  }

  notifyManualDrag() {
    this._manualDragTimer = 1.0; // suppress auto-follow for 1 second after last drag
  }

  _initMouseControls() {
    document.addEventListener('click', () => {
      if (!this._disableAutoFollow && !document.pointerLockElement) {
        document.body.requestPointerLock();
      }
    });

    // Mouse still controls pitch; horizontal mouse nudges yaw temporarily
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) {
        this.yaw -= e.movementX * CAMERA.MOUSE_SENSITIVITY;
        this.pitch -= e.movementY * CAMERA.MOUSE_SENSITIVITY;
        this.pitch = clamp(this.pitch, CAMERA.MIN_PITCH, CAMERA.MAX_PITCH);
      }
    });
  }

  update(dt) {
    const playerPos = this.target.position.clone();

    if (this._manualDragTimer > 0) this._manualDragTimer -= dt;

    // Auto-follow: smoothly rotate yaw to sit behind the player's movement direction
    // Suppressed briefly after manual camera drag, and gentler on touch devices
    if (this._lastPos && this._manualDragTimer <= 0 && !this._disableAutoFollow) {
      const dx = playerPos.x - this._lastPos.x;
      const dz = playerPos.z - this._lastPos.z;
      const hSpeed = Math.sqrt(dx * dx + dz * dz);

      if (hSpeed > 0.003) {
        const moveDir = Math.atan2(dx, dz);
        const targetYaw = moveDir + Math.PI; // camera sits behind player

        // Shortest-path interpolation to avoid spinning
        let diff = targetYaw - this.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        // Only follow if player is moving forward/sideways relative to camera.
        if (Math.abs(diff) < Math.PI * 0.6) {
          const followSpeed = this._isTouch ? 0.8 : 2.5;
          this.yaw += diff * Math.min(followSpeed * dt, 1);
        }
      }
    }
    this._lastPos = playerPos.clone();

    const idealOffset = new THREE.Vector3(
      Math.sin(this.yaw) * this.distance * Math.cos(this.pitch),
      this.heightOffset + Math.sin(this.pitch) * this.distance,
      Math.cos(this.yaw) * this.distance * Math.cos(this.pitch)
    );

    const idealPosition = playerPos.clone().add(idealOffset);
    const idealLookAt = playerPos.clone().add(new THREE.Vector3(0, this.lookAheadY, 0));

    const t = 1 - Math.exp(-this.smoothSpeed * dt);
    this.currentPosition.lerp(idealPosition, t);
    this.currentLookAt.lerp(idealLookAt, t);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }
}
