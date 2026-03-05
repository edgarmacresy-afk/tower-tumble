import * as THREE from 'three';
import { CAMERA } from '../utils/constants.js';
import { clamp } from '../utils/helpers.js';

export class ThirdPersonCamera {
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

    this._initMouseControls();
  }

  _initMouseControls() {
    document.addEventListener('click', () => {
      if (!document.pointerLockElement) {
        document.body.requestPointerLock();
      }
    });

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

    // Camera orbits around the player based on mouse yaw/pitch
    // No auto-follow — W always goes where the camera faces
    const idealOffset = new THREE.Vector3(
      Math.sin(this.yaw) * this.distance * Math.cos(this.pitch),
      this.heightOffset + Math.sin(this.pitch) * this.distance,
      Math.cos(this.yaw) * this.distance * Math.cos(this.pitch)
    );

    const idealPosition = playerPos.clone().add(idealOffset);
    const idealLookAt = playerPos.clone().add(new THREE.Vector3(0, this.lookAheadY, 0));

    // Frame-rate independent smoothing
    const t = 1 - Math.exp(-this.smoothSpeed * dt);
    this.currentPosition.lerp(idealPosition, t);
    this.currentLookAt.lerp(idealLookAt, t);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }
}
