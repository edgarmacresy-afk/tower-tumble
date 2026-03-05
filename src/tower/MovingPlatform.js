import * as THREE from 'three';
import { COLORS, TOWER } from '../utils/constants.js';

export class MovingPlatform {
  constructor(physicsWorld, position, width, depth, angle) {
    this.physics = physicsWorld;
    this.width = width || 2.5;
    this.depth = depth || TOWER.PLATFORM_DEPTH;
    this.height = TOWER.PLATFORM_HEIGHT;
    this.elapsed = 0;
    this.moveSpeed = 1.2;
    this.moveRange = 2.0;
    this.basePosition = position.clone();

    // Move perpendicular to the radius direction
    this.moveDir = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize();

    // Mesh
    const geo = new THREE.BoxGeometry(this.width, this.height, this.depth);
    const mat = new THREE.MeshToonMaterial({ color: COLORS.PLATFORM_MOVING });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);

    // Arrow indicators on top
    const arrowGeo = new THREE.ConeGeometry(0.12, 0.25, 4);
    const arrowMat = new THREE.MeshToonMaterial({ color: 0x1565C0 });
    const arrow1 = new THREE.Mesh(arrowGeo, arrowMat);
    arrow1.rotation.z = Math.PI / 2;
    arrow1.position.set(0.6, 0.2, 0);
    this.mesh.add(arrow1);
    const arrow2 = new THREE.Mesh(arrowGeo, arrowMat);
    arrow2.rotation.z = -Math.PI / 2;
    arrow2.position.set(-0.6, 0.2, 0);
    this.mesh.add(arrow2);

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
    const offset = Math.sin(this.elapsed * this.moveSpeed) * this.moveRange;
    const pos = this.basePosition.clone().addScaledVector(this.moveDir, offset);

    this.body.setNextKinematicTranslation({ x: pos.x, y: pos.y, z: pos.z });
    this.mesh.position.copy(pos);
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }
}
