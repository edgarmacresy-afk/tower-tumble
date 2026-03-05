import * as THREE from 'three';
import { SURVIVAL } from '../utils/constants.js';
import { CourseBase, RAINBOW, CANDY } from '../stumble/CourseBase.js';
import { DisappearingPlatform } from '../tower/DisappearingPlatform.js';

export class SurvivalArenaCourse extends CourseBase {
  constructor(physics, scene) {
    super(physics, scene);
    this.courseWidth = SURVIVAL.ARENA_RADIUS + 10;
    this.finishPosition = null;
    this.finishZ = 999;
    this.disappearingPlatforms = [];
    this.phaseSpinners = {};
    this.phasesActivated = {};
    this.disappearBatches = {};
    this.elapsed = 0;
  }

  generate() {
    this._buildGroundTier();
    this._buildTier2();
    this._buildTier3();
    this._buildTier4();
    this._buildPeak();
    this._buildDecorations();
  }

  getProgress(pos) {
    return Math.min(100, Math.max(0, (pos.y / 18) * 100));
  }

  update(dt) {
    super.update(dt);
    this.elapsed += dt;
    if (this.elapsed >= SURVIVAL.PHASE_2_TIME && !this.phasesActivated[2]) {
      this.phasesActivated[2] = true;
      if (this.phaseSpinners[2]) this.phaseSpinners[2].value = 1.5;
    }
    if (this.elapsed >= SURVIVAL.PHASE_3_TIME && !this.phasesActivated[3]) {
      this.phasesActivated[3] = true;
      if (this.phaseSpinners[3]) this.phaseSpinners[3].value = 1.8;
      if (this.disappearBatches[0]) {
        for (const dp of this.disappearBatches[0]) dp.triggerDisappear();
      }
    }
    if (this.elapsed >= SURVIVAL.PHASE_4_TIME && !this.phasesActivated[4]) {
      this.phasesActivated[4] = true;
      if (this.phaseSpinners[4]) this.phaseSpinners[4].value = 2.0;
      if (this.disappearBatches[1]) {
        for (const dp of this.disappearBatches[1]) dp.triggerDisappear();
      }
    }
    if (this.elapsed >= SURVIVAL.PHASE_5_TIME && !this.phasesActivated[5]) {
      this.phasesActivated[5] = true;
      if (this.phaseSpinners[2]) this.phaseSpinners[2].value = 2.5;
      if (this.phaseSpinners[3]) this.phaseSpinners[3].value = 2.8;
      if (this.phaseSpinners[4]) this.phaseSpinners[4].value = 3.0;
    }
    for (const dp of this.disappearingPlatforms) dp.update(dt);
  }

  _addPhaseSpinner(cx, cy, cz, barLength, barHeight, barThick, phase, color) {
    const speedHolder = { value: 0 };
    this.phaseSpinners[phase] = speedHolder;
    const geo = new THREE.BoxGeometry(barLength, barHeight, barThick);
    const mat = new THREE.MeshToonMaterial({ color: color || 0xFF9800 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, cy, cz);
    this.scene.add(mesh);
    const postGeo = new THREE.CylinderGeometry(0.35, 0.35, barHeight + 0.6, 8);
    const post = new THREE.Mesh(postGeo, new THREE.MeshToonMaterial({ color: 0x555555 }));
    post.position.set(cx, cy, cz);
    this.scene.add(post);
    const tipGeo = new THREE.SphereGeometry(barThick * 0.7, 8, 8);
    const tipMat = new THREE.MeshToonMaterial({ color: 0xFFEB3B });
    mesh.add(new THREE.Mesh(tipGeo, tipMat).translateX(barLength / 2));
    mesh.add(new THREE.Mesh(tipGeo, tipMat).translateX(-barLength / 2));
    const body = this.physics.createKinematicBody(new THREE.Vector3(cx, cy, cz));
    this.physics.world.createCollider(
      this.physics.RAPIER.ColliderDesc.cuboid(barLength / 2, barHeight / 2, barThick / 2)
        .setFriction(0.3).setRestitution(0.5), body
    );
    let angle = 0;
    this.kinematicObjects.push({
      update: (dt) => {
        angle += speedHolder.value * dt;
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
        mesh.rotation.y = angle;
      }
    });
  }

  // GROUND TIER (y=0) - big open arena with ramps up to Tier 2
  _buildGroundTier() {
    this._addFloor(0, 0, 0, 14, 14, 0x4CAF50);
    this._addNeonEdge(0, 0, 0, 14, 14, 0x81C784);
    this._addSpinner(0, 1.0, 0, 10, 1.0, 1.0, 1.0, 0xFF9800);
    this._addBumper(-6, 0, -6, 0xFF6B6B);
    this._addBumper(6, 0, -6, 0x4ECDC4);
    this._addBumper(-6, 0, 6, 0xFFE66D);
    this._addBumper(6, 0, 6, 0xA78BFA);
    this._addRail(-14, 0, -14, -14, 0, 14);
    this._addRail(14, 0, -14, 14, 0, 14);
    this._addRail(-14, 0, -14, 14, 0, -14);
    this._addRail(-14, 0, 14, 14, 0, 14);
    // 4 ramps from ground (y=0) up to Tier 2 (y=4)
    this._addSlopeSegment(0, -14, -22, 0, 4, 4, 0x66BB6A, true, 0.9);
    this._addSlopeSegment(0, 14, 22, 0, 4, 4, 0x66BB6A, true, 0.9);
    this._addFloor(-16, 0, -4, 4, 4, 0x81C784);
    this._addSlopeSegment(-16, -4, 4, 0, 4, 4, 0x66BB6A, true, 0.9);
    this._addFloor(16, 0, -4, 4, 4, 0x81C784);
    this._addSlopeSegment(16, -4, 4, 0, 4, 4, 0x66BB6A, true, 0.9);
  }

  // TIER 2 (y=4) - ring of platforms at tops of ramps
  _buildTier2() {
    this._addFloor(0, 4, -24, 5, 4, 0x42A5F5);
    this._addNeonEdge(0, 4, -24, 5, 4, 0x90CAF9);
    this._addFloor(0, 4, 24, 5, 4, 0x2196F3);
    this._addNeonEdge(0, 4, 24, 5, 4, 0x90CAF9);
    this._addFloor(-16, 4, 4, 4, 5, 0x1E88E5);
    this._addNeonEdge(-16, 4, 4, 4, 5, 0x90CAF9);
    this._addFloor(16, 4, 4, 4, 5, 0x1565C0);
    this._addNeonEdge(16, 4, 4, 4, 5, 0x90CAF9);
    this._addBoxingGlove(-20, 5.5, 4, 5, 2.0, 0, 1);
    this._addBoxingGlove(20, 5.5, 4, 5, 2.0, 0.5, -1);
    this._addPhaseSpinner(0, 5.0, 0, 16, 0.8, 0.8, 2, 0xFFC107);
    this._addTrampoline(0, 4, -22, 1.5);
    this._addTrampoline(0, 4, 22, 1.5);
    this._addTrampoline(-16, 4, 6, 1.5);
    this._addTrampoline(16, 4, 6, 1.5);
  }

  // TIER 3 (y=9) - diagonal platforms with moving bridges
  _buildTier3() {
    this._addFloor(-10, 9, -10, 4, 4, 0x7E57C2);
    this._addNeonEdge(-10, 9, -10, 4, 4, 0xB388FF);
    this._addFloor(10, 9, -10, 4, 4, 0x9C27B0);
    this._addNeonEdge(10, 9, -10, 4, 4, 0xEA80FC);
    this._addFloor(-10, 9, 10, 4, 4, 0x9C27B0);
    this._addNeonEdge(-10, 9, 10, 4, 4, 0xEA80FC);
    this._addFloor(10, 9, 10, 4, 4, 0x7E57C2);
    this._addNeonEdge(10, 9, 10, 4, 4, 0xB388FF);
    this._addMovingPlatform(0, 9, -10, 3, 2.5, 0xCE93D8, "x", 7, 0.4);
    this._addMovingPlatform(0, 9, 10, 3, 2.5, 0xCE93D8, "x", 7, 0.4);
    this._addMovingPlatform(-10, 9, 0, 2.5, 3, 0xCE93D8, "z", 7, 0.4);
    this._addMovingPlatform(10, 9, 0, 2.5, 3, 0xCE93D8, "z", 7, 0.4);
    this._addPhaseSpinner(0, 10.0, 0, 14, 0.7, 0.7, 3, 0xFF1744);
    this._addTrampoline(-10, 9, -8, 1.3);
    this._addTrampoline(10, 9, 8, 1.3);
    const batch0 = [];
    const dp1 = new DisappearingPlatform(this.physics, new THREE.Vector3(-10, 9, 0), 4, 4);
    dp1.addToScene(this.scene);
    this.disappearingPlatforms.push(dp1);
    batch0.push(dp1);
    const dp2 = new DisappearingPlatform(this.physics, new THREE.Vector3(10, 9, 0), 4, 4);
    dp2.addToScene(this.scene);
    this.disappearingPlatforms.push(dp2);
    batch0.push(dp2);
    this.disappearBatches[0] = batch0;
  }

  // TIER 4 (y=14) - small platforms, getting dangerous
  _buildTier4() {
    this._addFloor(-5, 14, -5, 2.5, 2.5, 0xF44336);
    this._addFloor(5, 14, -5, 2.5, 2.5, 0xE91E63);
    this._addFloor(-5, 14, 5, 2.5, 2.5, 0xE91E63);
    this._addFloor(5, 14, 5, 2.5, 2.5, 0xF44336);
    this._addFloor(0, 14, 0, 3, 3, 0xFF9800);
    this._addTrampoline(0, 14, 0, 1.5);
    this._addBoostPad(-5, 14, -5, 1.5, 1.5, 1, 1);
    this._addBoostPad(5, 14, 5, 1.5, 1.5, -1, -1);
    this._addPhaseSpinner(0, 15.0, 0, 10, 0.6, 0.6, 4, 0xFFEB3B);
    const batch1 = [];
    const dp3 = new DisappearingPlatform(this.physics, new THREE.Vector3(0, 14, -5), 4, 4);
    dp3.addToScene(this.scene);
    this.disappearingPlatforms.push(dp3);
    batch1.push(dp3);
    const dp4 = new DisappearingPlatform(this.physics, new THREE.Vector3(0, 14, 5), 4, 4);
    dp4.addToScene(this.scene);
    this.disappearingPlatforms.push(dp4);
    batch1.push(dp4);
    this.disappearBatches[1] = batch1;
  }

  // PEAK (y=18)
  _buildPeak() {
    this._addFloor(0, 18, 0, 3, 3, 0xFFD700);
    this._addNeonEdge(0, 18, 0, 3, 3, 0xFFFF00);
    this._addCrown(0, 18 + 3, 0);
  }

  // DECORATIONS
  _buildDecorations() {
    this._addSpectatorIsland(-30, 8, -22);
    this._addSpectatorIsland(30, 12, 18);
    this._addSpectatorIsland(-28, 16, 24);
    this._addSpectatorIsland(28, 20, -20);
    this._addBalloon(-22, 16, 0, 0xFF1744);
    this._addBalloon(22, 20, 5, 0x00E5FF);
    this._addBalloon(0, 24, -22, 0xFFEA00);
    this._addBalloon(-14, 26, 16, 0xD500F9);
    this._addCloudCluster(-20, 16, 10, 1.0);
    this._addCloudCluster(16, 12, -14, 0.8);
    this._addCloudCluster(0, 20, 20, 0.9);
    this._addBunting(-14, 2, -14, 14, 2, -14, 10);
    this._addBunting(-10, 6, -10, 10, 6, -10, 8);
  }
}
