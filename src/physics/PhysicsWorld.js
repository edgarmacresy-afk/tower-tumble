import RAPIER from '@dimforge/rapier3d-compat';
import { PHYSICS } from '../utils/constants.js';

export class PhysicsWorld {
  constructor() {
    this.world = null;
    this.bodyMap = new Map();
    this.colliderMap = new Map();
  }

  async init() {
    await RAPIER.init();
    this.world = new RAPIER.World(PHYSICS.GRAVITY);
    this.RAPIER = RAPIER;
  }

  step(dt) {
    this.world.timestep = Math.min(dt, 1 / 30);
    this.world.step();
  }

  syncMeshes() {
    for (const [body, mesh] of this.bodyMap) {
      if (body.bodyType() === this.RAPIER.RigidBodyType.KinematicPositionBased) continue;
      const pos = body.translation();
      mesh.position.set(pos.x, pos.y, pos.z);
      // Don't sync rotation — character rotation is handled by PlayerController
    }
  }

  createDynamicBody(position, mesh) {
    const bodyDesc = this.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(PHYSICS.PLAYER_LINEAR_DAMPING)
      .lockRotations();
    const body = this.world.createRigidBody(bodyDesc);
    if (mesh) this.bodyMap.set(body, mesh);
    return body;
  }

  createStaticBody(position) {
    const bodyDesc = this.RAPIER.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z);
    return this.world.createRigidBody(bodyDesc);
  }

  createKinematicBody(position) {
    const bodyDesc = this.RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(position.x, position.y, position.z);
    return this.world.createRigidBody(bodyDesc);
  }

  addCapsuleCollider(body, halfHeight, radius, mass) {
    const colliderDesc = this.RAPIER.ColliderDesc.capsule(halfHeight, radius)
      .setFriction(0.05)
      .setRestitution(0.0);
    if (mass) colliderDesc.setMass(mass);
    return this.world.createCollider(colliderDesc, body);
  }

  addBoxCollider(body, halfExtents) {
    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
      .setFriction(0.7)
      .setRestitution(0.0);
    return this.world.createCollider(colliderDesc, body);
  }

  castRay(origin, direction, maxDist, excludeCollider) {
    const ray = new this.RAPIER.Ray(origin, direction);
    if (excludeCollider) {
      const hit = this.world.castRay(
        ray, maxDist, true,
        undefined, undefined,
        excludeCollider, undefined
      );
      return hit;
    }
    const hit = this.world.castRay(ray, maxDist, true);
    return hit;
  }

  removeBody(body) {
    this.bodyMap.delete(body);
    this.world.removeRigidBody(body);
  }

  removeCollider(collider) {
    this.colliderMap.delete(collider);
    this.world.removeCollider(collider, true);
  }
}
