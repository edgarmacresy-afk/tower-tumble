import * as THREE from 'three';
import { LAVA, COLORS } from '../utils/constants.js';

export class RisingLava {
  constructor(scene) {
    this.height = LAVA.START_HEIGHT;
    this.elapsed = 0;
    this.active = false;

    // Lava plane
    const geo = new THREE.PlaneGeometry(60, 60);
    this.material = new THREE.MeshStandardMaterial({
      color: COLORS.LAVA,
      emissive: COLORS.LAVA_EMISSIVE,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = this.height;
    scene.add(this.mesh);

    // Glow light
    this.light = new THREE.PointLight(COLORS.LAVA, 2, 25);
    this.light.position.y = 1;
    this.mesh.add(this.light);
  }

  start() {
    this.active = true;
    this.elapsed = 0;
    this.height = LAVA.START_HEIGHT;
  }

  reset() {
    this.active = false;
    this.elapsed = 0;
    this.height = LAVA.START_HEIGHT;
    this.mesh.position.y = this.height;
  }

  update(dt) {
    if (!this.active) return;

    this.elapsed += dt;
    const speed = LAVA.BASE_SPEED + this.elapsed * LAVA.ACCELERATION;
    this.height += speed * dt;

    // Position with bobbing
    this.mesh.position.y = this.height + Math.sin(this.elapsed * 2) * 0.15;

    // Pulsing glow
    this.material.emissiveIntensity = 0.6 + Math.sin(this.elapsed * 3) * 0.3;
  }

  isPlayerConsumed(playerY) {
    return playerY < this.height + 0.5;
  }
}
