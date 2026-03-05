import * as THREE from 'three';
import { STUMBLE } from '../utils/constants.js';
import { CourseBase, RAINBOW, CANDY } from './CourseBase.js';

export class ObstacleCourse extends CourseBase {
  constructor(physics, scene) {
    super(physics, scene);
    this.courseWidth = 100;
    this.finishPosition = { x: 0, y: STUMBLE.TOWER_HEIGHT, z: STUMBLE.TOWER_BASE_Z };
    this.finishRadius = 5;
    this.finishZ = 999;
  }

  generate() {
    this._buildStartZone();
    this._buildSpinnerSection();
    this._buildBridgeA();
    this._buildBoxingSection();
    this._buildBridgeB();
    this._buildRollingBallHill();
    this._buildBalanceBeams();
    this._buildBridgeC();
    this._buildTrampolineZone();
    this._buildBoostToTower();
    this._buildSpiralTower();
    this._buildCrownFinish();
    this._buildOcean();
    this._buildDecorations();
  }

  getProgress(pos) {
    const towerBaseZ = STUMBLE.TOWER_BASE_Z - 5;
    if (pos.z < towerBaseZ) return Math.min(80, (pos.z / towerBaseZ) * 80);
    return 80 + Math.min(20, (Math.max(0, pos.y) / STUMBLE.TOWER_HEIGHT) * 20);
  }

  // ============================================
  //  COURSE SECTIONS
  // ============================================

  _buildStartZone() {
    this._addFloor(0, 0, 8, 8, 10, 0xE91E63);
    this._addNeonEdge(0, 0, 8, 8, 10, 0xFF80AB);
    this._addFloor(0, 0.03, -1, 6, 0.3, 0xFFFFFF);
    const lc = [0xFF1744, 0x2979FF, 0xFFEA00, 0x00E676];
    for (let i = 0; i < 4; i++) this._addFloor(-4.5 + i * 3, 0.04, 2, 1.2, 1.2, lc[i]);
    this._addWall(-7, 3.5, -1.5, 0.5, 3.5, 0.4, 0xFF1744);
    this._addWall(7, 3.5, -1.5, 0.5, 3.5, 0.4, 0x2979FF);
    this._addWall(0, 6.5, -1.5, 7, 0.6, 0.4, 0xFFEA00);
    this._addRail(-8, 0, -2, -8, 0, 18);
    this._addRail(8, 0, -2, 8, 0, 18);
    this._addBumper(-4, 0, 14, 0xFF9FF3);
    this._addBumper(4, 0, 16, 0x4ECDC4);
    this._addBunting(-7, 6, -1.5, 7, 6, -1.5, 14);
    this.checkpoints.push({ x: 0, y: 0, z: 5 });
  }

  _buildSpinnerSection() {
    this._addFloor(0, 0, 22, 7, 3, 0xAB47BC);
    this._addFloor(0, 0, 35, 7, 8, 0x9C27B0);
    this._addNeonEdge(0, 0, 35, 7, 8, 0xEA80FC);
    this._addFloor(0, 0, 55, 7, 8, 0x7B1FA2);
    this._addNeonEdge(0, 0, 55, 7, 8, 0xEA80FC);
    this._addFloor(0, 0, 72, 7, 5, 0x9C27B0);
    this._addSpinner(0, 1.0, 32, 12, 1.0, 1.0, 1.5, 0xFF9800);
    this._addSpinner(0, 1.0, 42, 10, 1.0, 1.2, -2.2, 0xFF5722);
    this._addSpinner(0, 1.8, 52, 13, 0.8, 0.8, 1.3, 0xFFC107);
    this._addSpinner(0, 1.0, 62, 11, 1.0, 1.0, -2.0, 0xFF9800);
    this._addSpinner(0, 1.0, 70, 8, 1.0, 1.0, 1.8, 0xFF5722);
    this._addSpinner(0, 2.3, 70, 12, 0.6, 0.6, -1.2, 0xFFC107);
    this._addRail(-7, 0, 27, -7, 0, 77);
    this._addRail(7, 0, 27, 7, 0, 77);
    this._addBumper(-5, 0, 38, 0xFF6B6B);
    this._addBumper(5, 0, 48, 0x4ECDC4);
    this.checkpoints.push({ x: 0, y: 0, z: 30 });
  }

  _buildBridgeA() {
    this._addFloor(-5, 0.5, 78, 3, 2, 0xFF7043);
    this._addFloor(-10, 1.2, 81, 3, 2, 0x00E5FF);
    this._addFloor(-15, 2.0, 83, 3, 2, 0xFFEA00);
    this._addFloor(-20, 3.0, 85, 4, 2, 0x00E676);
    this._addNeonEdge(-20, 3, 85, 4, 2, 0xFFFFFF);
  }

  _buildBoxingSection() {
    this._addFloor(-20, 3, 95, 7, 8, 0x7C4DFF);
    this._addNeonEdge(-20, 3, 95, 7, 8, 0xB388FF);
    this._addFloor(-20, 3, 113, 7, 8, 0x651FFF);
    this._addNeonEdge(-20, 3, 113, 7, 8, 0xB388FF);
    const leftWall = -27, rightWall = -13;
    this._addBoxingGlove(leftWall, 4.2, 90, 12, 2.5, 0, 1);
    this._addBoxingGlove(rightWall, 4.2, 95, 12, 2.8, Math.PI * 0.5, -1);
    this._addBoxingGlove(leftWall, 4.2, 101, 12, 3.0, Math.PI, 1);
    this._addBoxingGlove(rightWall, 4.2, 107, 12, 2.6, 0.3, -1);
    this._addBoxingGlove(leftWall, 4.2, 113, 10, 2.5, 0, 1);
    this._addBoxingGlove(rightWall, 4.2, 113, 10, 2.5, 0, -1);
    this._addBoxingGlove(leftWall, 4.2, 119, 13, 3.5, Math.PI * 0.3, 1);
    this._addRail(-27, 3, 87, -27, 3, 121);
    this._addBumper(-22, 3, 97, 0xFFEA00);
    this._addBumper(-18, 3, 109, 0x00E5FF);
    this.checkpoints.push({ x: -20, y: 3, z: 90 });
  }

  _buildBridgeB() {
    this._addFloor(-16, 2.5, 127, 2.5, 2, 0xF50057);
    this._addFloor(-10, 2.0, 130, 2.5, 2, 0xFF9100);
    this._addFloor(-4, 1.5, 133, 2.5, 2, 0xFFEA00);
    this._addFloor(3, 0.8, 136, 3, 2, 0x00E676);
    this._addFloor(10, 0, 139, 4, 2, 0x2979FF);
    this._addNeonEdge(10, 0, 139, 4, 2, 0xFFFFFF);
  }

  _buildRollingBallHill() {
    const cx = 10, halfW = 7;
    this._addFloor(cx, 0, 141, 7, 2.5, 0x66BB6A);
    this._addNeonEdge(cx, 0, 141, 7, 2.5, 0xB9F6CA);
    this._addSlopeSegment(cx, 143, 175, 0, 5, halfW, 0x66BB6A);
    this._addFloor(cx, 5, 177, 7, 2, 0x4CAF50);
    this._addNeonEdge(cx, 5, 177, 7, 2, 0xB9F6CA);
    const bc = [0xF44336, 0xFF9800, 0xE91E63, 0x9C27B0, 0x2196F3];
    this._addDownhillBall(7, 143, 174, 0, 5, 1.5, 0.25, 0, bc[0]);
    this._addDownhillBall(13, 143, 174, 0, 5, 1.5, 0.3, 0.33, bc[1]);
    this._addDownhillBall(10, 143, 174, 0, 5, 1.5, 0.28, 0.66, bc[2]);
    this._addDownhillBall(6, 143, 174, 0, 5, 1.3, 0.35, 0.15, bc[3]);
    this._addDownhillBall(14, 143, 174, 0, 5, 1.3, 0.32, 0.5, bc[4]);
    this._addRail(17, 0, 143, 17, 5, 177);
    this.checkpoints.push({ x: 10, y: 0, z: 143 });
  }

  _buildBalanceBeams() {
    this._addFloor(10, 5, 182, 4, 2, 0x00BCD4);
    this._addNeonEdge(10, 5, 182, 4, 2, 0x84FFFF);
    this._addFloor(10, 5, 189, 0.8, 3.5, 0xFFFFFF);
    this._addFloor(10, 5, 195, 3, 2, 0x00BCD4);
    this._addNeonEdge(10, 5, 195, 3, 2, 0x84FFFF);
    this._addFloor(8.5, 5, 199, 0.8, 1.5, 0xFFEA00);
    this._addFloor(11.5, 5, 203, 0.8, 1.5, 0xFF1744);
    this._addFloor(10, 5, 208, 4, 2, 0x00BCD4);
    this._addNeonEdge(10, 5, 208, 4, 2, 0x84FFFF);
    this.checkpoints.push({ x: 10, y: 5, z: 182 });
  }

  _buildBridgeC() {
    this._addFloor(6, 4, 213, 3, 2, 0xD500F9);
    this._addFloor(1, 2.5, 216, 3, 2, 0xFF9100);
    this._addFloor(-5, 1, 219, 4, 2, 0x00E5FF);
    this._addNeonEdge(-5, 1, 219, 4, 2, 0xFFFFFF);
  }

  _buildTrampolineZone() {
    this._addFloor(-5, 0, 222, 6, 1.5, 0x26A69A);
    this._addFloor(-5, -1, 233, 7, 8, 0x009688);
    this._addNeonEdge(-5, -1, 233, 7, 8, 0x64FFDA);
    this._addTrampoline(-8, -1, 227, 1.8);
    this._addTrampoline(-2, -1, 231, 1.8);
    this._addTrampoline(-7, -1, 235, 1.8);
    this._addTrampoline(-3, -1, 239, 1.8);
    this._addTrampoline(-5, -1, 243, 1.8);
    const pc = [0xFF1744, 0xFFEA00, 0x00E676, 0x2979FF, 0xD500F9];
    const pp = [{ x: -6, z: 228 }, { x: -3, z: 232 }, { x: -7, z: 236 }, { x: -3, z: 240 }, { x: -5, z: 244 }];
    for (let i = 0; i < pp.length; i++) {
      this._addFloor(pp[i].x, 3, pp[i].z, 2.5, 2, pc[i]);
      this._addNeonEdge(pp[i].x, 3, pp[i].z, 2.5, 2, 0xFFFFFF);
    }
    this._addFloor(-5, 3, 248, 4, 2, 0x76FF03);
    this._addRail(-12, -1, 225, -12, -1, 245);
    this._addBumper(-1, -1, 229, 0xFF9FF3);
    this._addBumper(-9, -1, 237, 0x4ECDC4);
    this.checkpoints.push({ x: -5, y: -1, z: 226 });
  }

  _buildBoostToTower() {
    this._addFloor(-4, 2, 250, 4, 1.5, 0xFFCA28);
    this._addFloor(-2, 1, 253, 4, 1.5, 0xFFCA28);
    this._addFloor(0, 0, 256, 6, 2, 0xFFB300);
    this._addNeonEdge(0, 0, 256, 6, 2, 0xFFD740);
    this._addBoostPad(-2, 0, 254, 1.5, 1.5, 0, 1);
    this._addBoostPad(2, 0, 257, 1.5, 1.5, 0, 1);
    this._addFloor(0, 0, 261, 8, 3, 0xFFD700);
    this._addNeonEdge(0, 0, 261, 8, 3, 0xFFF176);
    this._addBumper(-4, 0, 258, 0xFFE66D);
    this._addBumper(4, 0, 259, 0x4ECDC4);
    this.checkpoints.push({ x: 0, y: 0, z: 255 });
  }

  _buildSpiralTower() {
    const cx = 0, cz = STUMBLE.TOWER_BASE_Z;
    const radius = STUMBLE.TOWER_RADIUS;
    const numPlats = STUMBLE.TOWER_PLATFORMS;
    const heightStep = STUMBLE.TOWER_HEIGHT_STEP;
    const angleStep = (2 * Math.PI) / 10;

    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.2, STUMBLE.TOWER_HEIGHT + 4, 20),
      new THREE.MeshToonMaterial({ color: 0x7E57C2 })
    );
    col.position.set(cx, (STUMBLE.TOWER_HEIGHT + 4) / 2 - 2, cz);
    this.scene.add(col);

    for (let ry = 0; ry < STUMBLE.TOWER_HEIGHT; ry += 4) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.3, 0.18, 8, 20),
        new THREE.MeshToonMaterial({ color: CANDY[Math.floor(ry / 4) % CANDY.length] })
      );
      ring.position.set(cx, ry, cz);
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);
    }

    for (let i = 0; i < numPlats; i++) {
      const angle = i * angleStep;
      const py = i * heightStep;
      const px = cx + Math.cos(angle) * radius;
      const pz = cz + Math.sin(angle) * radius;
      const color = RAINBOW[i % RAINBOW.length];
      this._addFloor(px, py, pz, 2.2, 1.6, color);
      this._addNeonEdge(px, py, pz, 2.2, 1.6, 0xFFFFFF);
      if (i % 2 === 0) {
        const ox = px + Math.cos(angle) * 2.0;
        const oz = pz + Math.sin(angle) * 1.4;
        this._addWall(ox, py + 0.4, oz, 0.08, 0.4, 1.2, 0xFFD740);
      }
    }

    this._addSpinner(cx, 9.0 + 1.0, cz, 12, 0.7, 0.7, 1.0, 0xFF1744);
    this._addSpinner(cx, 18.0 + 1.0, cz, 12, 0.7, 0.7, -1.3, 0xFFEA00);
    this._addSpinner(cx, 27.0 + 1.0, cz, 11, 0.7, 0.7, 1.5, 0x00E5FF);
    this.checkpoints.push({ x: 0, y: 0, z: cz - 2 });
    const midA = 10 * angleStep;
    this.checkpoints.push({ x: cx + Math.cos(midA) * radius, y: 18, z: cz + Math.sin(midA) * radius });
  }

  _buildCrownFinish() {
    const cx = 0, cz = STUMBLE.TOWER_BASE_Z, topY = STUMBLE.TOWER_HEIGHT;
    this._addFloor(cx, topY, cz, 5, 5, 0xFFD700);
    this._addFloor(cx, topY + 0.08, cz, 4.5, 4.5, 0xFFF176);
    this._addNeonEdge(cx, topY, cz, 5, 5, 0xFFFF00);
    this._addWall(cx, topY + 1.0, cz + 1, 0.8, 1.0, 0.8, 0xFFD700);
    this._addWall(cx - 1.8, topY + 0.6, cz + 1, 0.7, 0.6, 0.7, 0xC0C0C0);
    this._addWall(cx + 1.8, topY + 0.4, cz + 1, 0.7, 0.4, 0.7, 0xCD7F32);
    this._addCrown(cx, topY + 3, cz);
    this._addWall(cx - 5.5, topY + 3, cz - 4.5, 0.4, 3, 0.4, 0xFFD700);
    this._addWall(cx + 5.5, topY + 3, cz - 4.5, 0.4, 3, 0.4, 0xFFD700);
    this._addWall(cx, topY + 5.5, cz - 4.5, 5.5, 0.5, 0.4, 0xFFD700);

    const banner = new THREE.Mesh(new THREE.BoxGeometry(8, 1.5, 0.06), new THREE.MeshToonMaterial({ color: 0x212121 }));
    banner.position.set(cx, topY + 5.5, cz - 4.85);
    this.scene.add(banner);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 10; col++) {
        if ((row + col) % 2 === 0) continue;
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.02), new THREE.MeshToonMaterial({ color: 0xFFFFFF }));
        c.position.set(cx - 1.8 + col * 0.4, topY + 5.0 + row * 0.45, cz - 4.88);
        this.scene.add(c);
      }
    }

    this._addBunting(cx - 5.5, topY + 5, cz - 4.5, cx + 5.5, topY + 5, cz - 4.5, 12);

    for (let i = 0; i < 40; i++) {
      const conf = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.1, 0.15),
        new THREE.MeshToonMaterial({ color: CANDY[i % CANDY.length] })
      );
      const rx = cx + (Math.random() - 0.5) * 14;
      const ry = topY + 2 + Math.random() * 7;
      const rz = cz + (Math.random() - 0.5) * 14;
      conf.position.set(rx, ry, rz);
      this.scene.add(conf);
      const sp = Math.random() * Math.PI * 2, spd = 0.5 + Math.random() * 1.5, by = ry;
      this.decorAnimations.push({
        update: () => {
          const t = performance.now() / 1000;
          conf.position.y = by + Math.sin(t * spd + sp) * 0.6;
          conf.rotation.x = t * spd;
          conf.rotation.z = t * spd * 0.7;
        }
      });
    }

    for (const [sx, sz] of [[-5, -3], [5, 3]]) {
      const spot = new THREE.SpotLight(0xFFD700, 3, 20, Math.PI / 6);
      spot.position.set(cx + sx, topY + 8, cz + sz);
      spot.target.position.set(cx, topY + 4, cz);
      this.scene.add(spot);
      this.scene.add(spot.target);
    }
  }

  _buildOcean() {
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 800),
      new THREE.MeshToonMaterial({ color: 0x0277BD, transparent: true, opacity: 0.7 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -25, 130);
    this.scene.add(water);

    const water2 = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 700),
      new THREE.MeshToonMaterial({ color: 0x039BE5, transparent: true, opacity: 0.4 })
    );
    water2.rotation.x = -Math.PI / 2;
    water2.position.set(0, -24, 130);
    this.scene.add(water2);
  }

  _buildDecorations() {
    this._addBalloon(-18, 18, 20, 0xFF1744);
    this._addBalloon(18, 22, 60, 0x00E5FF);
    this._addBalloon(-30, 15, 100, 0xFFEA00);
    this._addBalloon(25, 20, 150, 0xD500F9);
    this._addBalloon(-20, 30, 220, 0x00E676);
    this._addBalloon(15, 35, 260, 0xFF9100);
    this._addBalloon(-25, 25, 170, 0xF50057);
    this._addSpectatorIsland(-28, 12, 40);
    this._addSpectatorIsland(28, 15, 120);
    this._addSpectatorIsland(-25, 22, 250);
    this._addSpectatorIsland(20, 30, 270);
    this._addCloudCluster(-15, 16, 50, 1.2);
    this._addCloudCluster(20, 18, 90, 1.0);
    this._addCloudCluster(-10, 20, 150, 0.8);
    this._addCloudCluster(25, 15, 200, 1.1);
    this._addCloudCluster(-12, 25, 260, 0.9);
    this._addCloudCluster(15, 30, 280, 1.0);
    this._addCloudCluster(0, 22, 300, 0.7);
    this._addCloudCluster(-20, 10, 130, 0.8);
    this._addCloudCluster(30, 12, 50, 0.6);

    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.18, 8, 24),
        new THREE.MeshToonMaterial({ color: CANDY[i] })
      );
      const a = i * Math.PI * 0.5;
      ring.position.set(Math.sin(a) * 12, 6 + i * 8, STUMBLE.TOWER_BASE_Z + Math.cos(a) * 12);
      this.scene.add(ring);
      this.decorAnimations.push({
        update: () => {
          const t = performance.now() / 1000;
          ring.rotation.x = t * 0.3 + i;
          ring.rotation.y = t * 0.2;
        }
      });
    }

    const topY = STUMBLE.TOWER_HEIGHT, cz = STUMBLE.TOWER_BASE_Z;
    for (let i = 0; i < 15; i++) {
      const sa = (i / 15) * Math.PI * 2, sr = 7 + Math.random() * 4, sy = topY + Math.random() * 5;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshToonMaterial({ color: 0xFFF9C4 }));
      star.position.set(Math.cos(sa) * sr, sy, cz + Math.sin(sa) * sr);
      this.scene.add(star);
      const bsy = sy;
      this.decorAnimations.push({
        update: () => {
          const t = performance.now() / 1000;
          star.position.y = bsy + Math.sin(t * 1.5 + i) * 0.3;
          star.rotation.y = t;
        }
      });
    }

    this._addBunting(-7, 2.5, 22, 7, 2.5, 22, 10);
    this._addBunting(-24, 5.5, 87, -16, 5.5, 87, 8);
    this._addBunting(3, 2.5, 140, 17, 2.5, 140, 10);
    this._addBunting(-12, 1, 220, 2, 1, 220, 8);
  }
}
