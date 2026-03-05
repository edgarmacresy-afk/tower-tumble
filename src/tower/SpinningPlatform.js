import * as THREE from 'three';
import { COLORS, TOWER } from '../utils/constants.js';

export class SpinningPlatform {
  constructor(physicsWorld, position, width, depth) {
    this.physics = physicsWorld;
    this.width = width || 2.5;
    this.depth = depth || TOWER.PLATFORM_DEPTH;
    this.height = TOWER.PLATFORM_HEIGHT;
    this.elapsed = 0;
    this.rotationSpeed = 1.5;
    this.basePosition = position.clone();

    // Mesh
    const geo = new THREE.BoxGeometry(this.width, this.height, this.depth);
    const mat = new THREE.MeshToonMaterial({ color: COLORS.PLATFORM_SPINNING });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);

    // Axis indicator
    const axisGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
    const axisMat = new THREE.MeshToonMaterial({ color: 0x333333 });
    const axis = new THREE.Mesh(axisGeo, axisMat);
    axis.position.y = -0.35;
    this.mesh.add(axis);

    // Physics (kinematic)
    this.body = physicsWorld.createKinematicBody(position);
    this.collider = physicsWorld.addBoxCollider(this.body, {
      x: this.width / 2,
      y: this.height / 2,
      z: this.depth / 2,
    });
  }

  update(dt) {
    this.elapsed += dt;
    const angle = this.elapsed * this.rotationSpeed;
    const quat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      angle
    );

    this.body.setNextKinematicRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    this.body.setNextKinematicTranslation({
      x: this.basePosition.x,
      y: this.basePosition.y,
      z: this.basePosition.z,
    });

    // Sync mesh
    this.mesh.position.copy(this.basePosition);
    this.mesh.quaternion.copy(quat);
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }
}
