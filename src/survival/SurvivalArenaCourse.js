import * as THREE from 'three';
import { SURVIVAL } from '../utils/constants.js';
import { CourseBase, RAINBOW, CANDY } from '../stumble/CourseBase.js';
import { DisappearingPlatform } from '../tower/DisappearingPlatform.js';

export class SurvivalArenaCourse extends CourseBase {
  constructor(physics, scene) {
    super(physics, scene);
    this.courseWidth = SURVIVAL.ARENA_RADIUS;
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
    return Math.min(100, Math.max(0, (pos.y / 24) * 100));
  }

  update(dt) {
    super.update(dt);
    this.elapsed += dt;

    // Phase 2: Activate Tier 2 spinner
    if (this.elapsed >= SURVIVAL.PHASE_2_TIME && !this.phasesActivated[2]) {
      this.phasesActivated[2] = true;
      if (this.phaseSpinners[2]) this.phaseSpinners[2].value = 1.5;
    }

    // Phase 3: Activate Tier 3 spinner + first disappearing batch
    if (this.elapsed >= SURVIVAL.PHASE_3_TIME && !this.phasesActivated[3]) {
      this.phasesActivated[3] = true;
      if (this.phaseSpinners[3]) this.phaseSpinners[3].value = 1.8;
      if (this.disappearBatches[0]) {
        for (const dp of this.disappearBatches[0]) dp.triggerDisappear();
      }
    }

    // Phase 4: Activate Tier 4 spinner + second disappearing batch
    if (this.elapsed >= SURVIVAL.PHASE_4_TIME && !this.phasesActivated[4]) {
      this.phasesActivated[4] = true;
      if (this.phaseSpinners[4]) this.phaseSpinners[4].value = 2.0;
      if (this.disappearBatches[1]) {
        for (const dp of this.disappearBatches[1]) dp.triggerDisappear();
      }
    }

    // Phase 5: Speed up all active spinners
    if (this.elapsed >= SURVIVAL.PHASE_5_TIME && !this.phasesActivated[5]) {
      this.phasesActivated[5] = true;
      if (this.phaseSpinners[2]) this.phaseSpinners[2].value = 2.5;
      if (this.phaseSpinners[3]) this.phaseSpinners[3].value = 2.8;
      if (this.phaseSpinners[4]) this.phaseSpinners[4].value = 3.0;
    }

    // Update disappearing platforms
    for (const dp of this.disappearingPlatforms) {
      dp.update(dt);
    }
  }

  // ========== PHASE SPINNER ==========

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

  // ========== GROUND TIER (y=0) ==========

  _buildGroundTier() {
    // Central cross platform
    this._addFloor(0, 0, 0, 6, 12, 0x4CAF50);
    this._addFloor(0, 0, 0, 12, 6, 0x4CAF50);

    // Corner platforms
    this._addFloor(-9, 0, -9, 3, 3, 0x66BB6A);
    this._addFloor(9, 0, -9, 3, 3, 0x66BB6A);
    this._addFloor(-9, 0, 9, 3, 3, 0x66BB6A);
    this._addFloor(9, 0, 9, 3, 3, 0x66BB6A);

    // Neon edges on center
    this._addNeonEdge(0, 0, 0, 6, 12, 0x81C784);
    this._addNeonEdge(0, 0, 0, 12, 6, 0x81C784);

    // 2 always-active spinners
    this._addSpinner(0, 1.0, -4, 10, 1.0, 1.0, 1.5, 0xFF9800);
    this._addSpinner(0, 1.0, 4, 10, 1.0, 1.0, -1.8, 0xFF5722);

    // Bumpers near the gaps between platforms
    this._addBumper(-5, 0, -5, 0xFF6B6B);
    this._addBumper(5, 0, -5, 0x4ECDC4);
    this._addBumper(-5, 0, 5, 0xFFE66D);
    this._addBumper(5, 0, 5, 0xA78BFA);

    // Outer rails
    this._addRail(-12, 0, -12, -12, 0, 12);
    this._addRail(12, 0, -12, 12, 0, 12);
    this._addRail(-12, 0, -12, 12, 0, -12);
    this._addRail(-12, 0, 12, 12, 0, 12);

    // 4 trampolines to reach Tier 2
    this._addTrampoline(-8, 0, 0, 1.8);
    this._addTrampoline(8, 0, 0, 1.8);
    this._addTrampoline(0, 0, -8, 1.8);
    this._addTrampoline(0, 0, 8, 1.8);

    // Disappearing platforms on ground (batch 0 - triggers at Phase 3)
    const batch0 = [];
    for (const [dx, dz] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) {
      const dp = new DisappearingPlatform(
        this.physics, new THREE.Vector3(dx, 0, dz), 6, 6
      );
      dp.addToScene(this.scene);
      this.disappearingPlatforms.push(dp);
      batch0.push(dp);
    }
    this.disappearBatches[0] = batch0;
  }

  // ========== TIER 2 (y=6) ==========

  _buildTier2() {
    // 4 medium platforms at cardinal directions
    this._addFloor(-10, 6, 0, 4, 3, 0x42A5F5);
    this._addNeonEdge(-10, 6, 0, 4, 3, 0x90CAF9);
    this._addFloor(10, 6, 0, 4, 3, 0x2196F3);
    this._addNeonEdge(10, 6, 0, 4, 3, 0x90CAF9);
    this._addFloor(0, 6, -10, 3, 4, 0x1E88E5);
    this._addNeonEdge(0, 6, -10, 3, 4, 0x90CAF9);
    this._addFloor(0, 6, 10, 3, 4, 0x1565C0);
    this._addNeonEdge(0, 6, 10, 3, 4, 0x90CAF9);

    // Boxing gloves punching sideways
    this._addBoxingGlove(-14, 7.2, 0, 8, 2.5, 0, 1);
    this._addBoxingGlove(14, 7.2, 0, 8, 2.5, 0.5, -1);

    // Phase 2 spinner (dormant until 30s)
    this._addPhaseSpinner(0, 7.0, 0, 14, 0.8, 0.8, 2, 0xFFC107);

    // Trampolines on Tier 2 to reach Tier 3
    this._addTrampoline(-10, 6, 2, 1.5);
    this._addTrampoline(10, 6, -2, 1.5);
    this._addTrampoline(2, 6, 10, 1.5);
    this._addTrampoline(-2, 6, -10, 1.5);
  }

  // ========== TIER 3 (y=12) ==========

  _buildTier3() {
    // 4 small platforms at diagonals
    this._addFloor(-7, 12, -7, 3, 3, 0x7E57C2);
    this._addNeonEdge(-7, 12, -7, 3, 3, 0xB388FF);
    this._addFloor(7, 12, -7, 3, 3, 0x9C27B0);
    this._addNeonEdge(7, 12, -7, 3, 3, 0xEA80FC);
    this._addFloor(-7, 12, 7, 3, 3, 0x9C27B0);
    this._addNeonEdge(-7, 12, 7, 3, 3, 0xEA80FC);
    this._addFloor(7, 12, 7, 3, 3, 0x7E57C2);
    this._addNeonEdge(7, 12, 7, 3, 3, 0xB388FF);

    // Moving platforms connecting T3 platforms
    this._addMovingPlatform(0, 12, -7, 2.5, 2, 0xCE93D8, 'x', 5, 0.5);
    this._addMovingPlatform(0, 12, 7, 2.5, 2, 0xCE93D8, 'x', 5, 0.5);
    this._addMovingPlatform(-7, 12, 0, 2, 2.5, 0xCE93D8, 'z', 5, 0.5);
    this._addMovingPlatform(7, 12, 0, 2, 2.5, 0xCE93D8, 'z', 5, 0.5);

    // Phase 3 spinner (dormant until 60s)
    this._addPhaseSpinner(0, 13.0, 0, 12, 0.7, 0.7, 3, 0xFF1744);

    // Disappearing platforms on T3 (batch 1 - triggers at Phase 4)
    const batch1 = [];
    for (const [dx, dz] of [[-7, -7], [7, 7]]) {
      const dp = new DisappearingPlatform(
        this.physics, new THREE.Vector3(dx, 12, dz), 6, 6
      );
      dp.addToScene(this.scene);
      this.disappearingPlatforms.push(dp);
      batch1.push(dp);
    }
    this.disappearBatches[1] = batch1;
  }

  // ========== TIER 4 (y=18) ==========

  _buildTier4() {
    // Tiny platforms
    this._addFloor(-5, 18, -5, 2, 2, 0xF44336);
    this._addFloor(5, 18, -5, 2, 2, 0xE91E63);
    this._addFloor(-5, 18, 5, 2, 2, 0xE91E63);
    this._addFloor(5, 18, 5, 2, 2, 0xF44336);

    // Central platform with trampoline to peak
    this._addFloor(0, 18, 0, 2, 2, 0xFF9800);
    this._addTrampoline(0, 18, 0, 1.3);

    // Boost pads to help navigate between T4 platforms
    this._addBoostPad(-5, 18, -5, 1.2, 1.2, 1, 0);
    this._addBoostPad(5, 18, 5, 1.2, 1.2, -1, 0);

    // Trampolines on T3 to reach T4
    this._addTrampoline(-7, 12, -5, 1.3);
    this._addTrampoline(7, 12, 5, 1.3);

    // Phase 4 spinner (dormant until 90s)
    this._addPhaseSpinner(0, 19.0, 0, 10, 0.6, 0.6, 4, 0xFFEB3B);
  }

  // ========== PEAK (y=24) ==========

  _buildPeak() {
    // Final golden platform
    this._addFloor(0, 24, 0, 2.5, 2.5, 0xFFD700);
    this._addNeonEdge(0, 24, 0, 2.5, 2.5, 0xFFFF00);

    // Crown decoration
    this._addCrown(0, 24 + 3, 0);
  }

  // ========== DECORATIONS ==========

  _buildDecorations() {
    // Spectator islands
    this._addSpectatorIsland(-22, 10, -15);
    this._addSpectatorIsland(22, 15, 10);
    this._addSpectatorIsland(-18, 20, 20);
    this._addSpectatorIsland(20, 25, -18);

    // Balloons
    this._addBalloon(-16, 20, 0, 0xFF1744);
    this._addBalloon(16, 25, 5, 0x00E5FF);
    this._addBalloon(0, 30, -15, 0xFFEA00);
    this._addBalloon(-10, 35, 12, 0xD500F9);

    // Cloud clusters
    this._addCloudCluster(-15, 22, 8, 1.0);
    this._addCloudCluster(12, 18, -10, 0.8);
    this._addCloudCluster(0, 28, 15, 0.9);
    this._addCloudCluster(-10, 12, -12, 0.7);

    // Bunting
    this._addBunting(-12, 2, -12, 12, 2, -12, 10);
    this._addBunting(-10, 8, -8, 10, 8, -8, 8);
  }
}
