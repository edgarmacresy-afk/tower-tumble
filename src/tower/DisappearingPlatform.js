import * as THREE from 'three';
import { COLORS, TOWER } from '../utils/constants.js';

export class DisappearingPlatform {
  constructor(physicsWorld, position, width, depth) {
    this.physics = physicsWorld;
    this.width = width || 2.5;
    this.depth = depth || TOWER.PLATFORM_DEPTH;
    this.height = TOWER.PLATFORM_HEIGHT;

    this.state = 'solid'; // solid -> warning -> gone -> cooldown -> solid
    this.timer = 0;
    this.warningDuration = 1.5;
    this.goneDuration = 3.0;
    this.steppedOn = false;

    // Mesh
    const geo = new THREE.BoxGeometry(this.width, this.height, this.depth);
    this.material = new THREE.MeshToonMaterial({
      color: COLORS.PLATFORM_DISAPPEARING,
      transparent: true,
      opacity: 1,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.copy(position);

    this.basePosition = position.clone();

    // Physics (static, but we'll remove/re-add collider)
    this.body = physicsWorld.createStaticBody(position);
    this.collider = physicsWorld.addBoxCollider(this.body, {
      x: this.width / 2,
      y: this.height / 2,
      z: this.depth / 2,
    });
    this.colliderRemoved = false;
  }

  triggerDisappear() {
    if (this.state === 'solid') {
      this.state = 'warning';
      this.timer = 0;
    }
  }

  update(dt) {
    if (this.state === 'warning') {
      this.timer += dt;
      // Flash red
      const flash = Math.sin(this.timer * 15) > 0 ? 1 : 0.3;
      this.material.opacity = flash;

      if (this.timer >= this.warningDuration) {
        this.state = 'gone';
        this.timer = 0;
        this.material.opacity = 0;
        // Remove collider
        if (!this.colliderRemoved) {
          this.physics.removeCollider(this.collider);
          this.colliderRemoved = true;
        }
      }
    } else if (this.state === 'gone') {
      this.timer += dt;
      this.material.opacity = 0;

      if (this.timer >= this.goneDuration) {
        this.state = 'solid';
        this.timer = 0;
        this.material.opacity = 1;
        // Re-add collider
        if (this.colliderRemoved) {
          this.collider = this.physics.addBoxCollider(this.body, {
            x: this.width / 2,
            y: this.height / 2,
            z: this.depth / 2,
          });
          this.colliderRemoved = false;
        }
      }
    }
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }
}
