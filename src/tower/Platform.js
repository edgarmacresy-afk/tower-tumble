import * as THREE from 'three';
import { COLORS, TOWER } from '../utils/constants.js';

export class Platform {
  constructor(physicsWorld, position, width, depth, color) {
    this.physics = physicsWorld;
    this.width = width || 2.5;
    this.depth = depth || TOWER.PLATFORM_DEPTH;
    this.height = TOWER.PLATFORM_HEIGHT;

    // Mesh
    const geo = new THREE.BoxGeometry(this.width, this.height, this.depth);
    const defaultColor = Array.isArray(COLORS.PLATFORM_STATIC)
      ? COLORS.PLATFORM_STATIC[Math.floor(Math.random() * COLORS.PLATFORM_STATIC.length)]
      : COLORS.PLATFORM_STATIC;
    const mat = new THREE.MeshToonMaterial({ color: color || defaultColor });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);

    // Physics
    this.body = physicsWorld.createStaticBody(position);
    this.collider = physicsWorld.addBoxCollider(this.body, {
      x: this.width / 2,
      y: this.height / 2,
      z: this.depth / 2,
    });
  }

  update() {
    // Static — nothing to update
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }
}
