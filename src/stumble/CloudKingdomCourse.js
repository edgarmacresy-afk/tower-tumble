import * as THREE from 'three';
import { CourseBase, RAINBOW, CANDY } from './CourseBase.js';

export class CloudKingdomCourse extends CourseBase {
  constructor(physics, scene) {
    super(physics, scene);
    this.courseWidth = 60;
    this.finishPosition = { x: -5, y: 1, z: 210 };
    this.finishRadius = 5;
    this.finishZ = 215;
  }

  generate() {
    this._buildCloudLaunchPad();
    this._buildRainbowBridge();
    this._buildCloudHopIslands();
    this._buildStormCorridor();
    this._buildGreatSkySlide();
    this._buildCloudFinish();
    this._buildCloudAtmosphere();
    this._buildCloudDecorations();
  }

  getProgress(pos) {
    return Math.min(100, Math.max(0, (pos.z / this.finishZ) * 100));
  }

  // ============================================
  //  SECTION 1: Cloud Launch Pad (Z: 0-20, Y: 0)
  // ============================================

  _buildCloudLaunchPad() {
    // Big fluffy cloud platform
    this._addFloor(0, 0, 8, 8, 10, 0xE3F2FD);
    this._addNeonEdge(0, 0, 8, 8, 10, 0xBBDEFB);

    // Start line
    this._addFloor(0, 0.03, -1, 6, 0.3, 0xFFFFFF);

    // Pastel lane patches
    const lc = [0xFFCDD2, 0xC8E6C9, 0xBBDEFB, 0xFFF9C4];
    for (let i = 0; i < 4; i++) this._addFloor(-4.5 + i * 3, 0.04, 2, 1.2, 1.2, lc[i]);

    // Rainbow start arch
    this._addRainbowArch(0, 0, -1.5, 1.2);

    // Silver rails
    this._addRail(-8, 0, -2, -8, 0, 18, 0xBDBDBD);
    this._addRail(8, 0, -2, 8, 0, 18, 0xBDBDBD);

    // Star bumpers
    this._addBumper(-4, 0, 14, 0xFFF9C4);
    this._addBumper(4, 0, 16, 0xFFF176);
    this._addBumper(0, 0, 10, 0xFFFFFF);

    // Clouds around start
    this._addCloudCluster(-12, 3, 5, 0.6);
    this._addCloudCluster(12, 4, 10, 0.5);
    this._addCloudCluster(-10, 5, 18, 0.4);

    this._addBunting(-7, 6, -1.5, 7, 6, -1.5, 14);
    this.checkpoints.push({ x: 0, y: 0, z: 5 });
  }

  // ============================================
  //  SECTION 2: Rainbow Bridge (Z: 25-67, Y: 0→6)
  // ============================================

  _buildRainbowBridge() {
    // Transition platform
    this._addFloor(0, 0, 22, 6, 3, 0xE1F5FE);
    this._addNeonEdge(0, 0, 22, 6, 3, 0xB3E5FC);

    // Rainbow ascending bridge segments
    const segments = [
      { z: 28, y: 0.5, c: 0xEF5350 },  // Red
      { z: 34, y: 1.2, c: 0xFF9800 },  // Orange
      // GAP Z: 37-39
      { z: 42, y: 2.0, c: 0xFFEE58 },  // Yellow
      { z: 48, y: 2.8, c: 0x66BB6A },  // Green
      // GAP Z: 51-53
      { z: 56, y: 3.8, c: 0x42A5F5 },  // Blue
      { z: 61, y: 4.8, c: 0x7E57C2 },  // Purple
    ];
    for (const seg of segments) {
      this._addFloor(0, seg.y, seg.z, 5, 2.5, seg.c);
      this._addNeonEdge(0, seg.y, seg.z, 5, 2.5, 0xFFFFFF);
    }

    // Landing platform
    this._addFloor(0, 6, 66, 5, 2.5, 0xCE93D8);
    this._addNeonEdge(0, 6, 66, 5, 2.5, 0xF3E5F5);

    // Wind gusts from alternating sides
    this._addWindGust(-7, 1.5, 30, 10, 2.5, 0, 1);
    this._addWindGust(7, 2.2, 40, 10, 2.8, Math.PI * 0.5, -1);
    this._addWindGust(-7, 3.5, 50, 10, 3.0, Math.PI, 1);
    this._addWindGust(7, 4.5, 58, 10, 2.6, 0.3, -1);

    // Spinner on the bridge
    this._addSpinner(0, 3.2, 45, 9, 0.8, 0.8, 1.5, 0xFFD700);

    // Partial rail on one side
    this._addRail(-5, 0.5, 26, -5, 4.8, 62, 0xBDBDBD);

    this.checkpoints.push({ x: 0, y: 1, z: 30 });
  }

  // ============================================
  //  SECTION 3: Cloud Hop Islands (Z: 70-110, Y: 4-8)
  // ============================================

  _buildCloudHopIslands() {
    // Entry island
    this._addFloor(0, 6, 70, 4, 2.5, 0xE3F2FD);
    this._addNeonEdge(0, 6, 70, 4, 2.5, 0xBBDEFB);

    // Static cloud islands at various heights
    this._addFloor(-4, 5.5, 78, 3, 2.5, 0xE1F5FE);
    this._addNeonEdge(-4, 5.5, 78, 3, 2.5, 0xB3E5FC);

    this._addFloor(3, 7, 85, 3, 2, 0xBBDEFB);
    this._addNeonEdge(3, 7, 85, 3, 2, 0x90CAF9);

    this._addFloor(-2, 6.5, 95, 3.5, 2.5, 0xE3F2FD);
    this._addNeonEdge(-2, 6.5, 95, 3.5, 2.5, 0xBBDEFB);

    this._addFloor(4, 7.5, 103, 3, 2, 0xE1F5FE);
    this._addNeonEdge(4, 7.5, 103, 3, 2, 0xB3E5FC);

    // Moving cloud platforms that drift left/right
    this._addMovingPlatform(0, 6.5, 82, 2.5, 2, 0xB3E5FC, 'x', 3, 0.8);
    this._addMovingPlatform(-1, 7, 90, 2.5, 1.8, 0xB3E5FC, 'x', 4, 0.6);
    this._addMovingPlatform(2, 7.5, 99, 2.2, 1.5, 0xB3E5FC, 'x', 3.5, 0.7);

    // Cloud trampolines for vertical hops
    this._addTrampoline(-3, 5.5, 75, 1.5);
    this._addTrampoline(1, 6, 88, 1.5);
    this._addTrampoline(-1, 6.5, 96, 1.5);

    // Spinner between islands
    this._addSpinner(0, 8, 93, 10, 0.8, 0.8, 1.2, 0x80DEEA);

    // Exit platform
    this._addFloor(0, 8, 110, 4, 2.5, 0xCE93D8);
    this._addNeonEdge(0, 8, 110, 4, 2.5, 0xF3E5F5);

    this.checkpoints.push({ x: 0, y: 6, z: 72 });
    this.checkpoints.push({ x: -2, y: 6.5, z: 95 });
  }

  // ============================================
  //  SECTION 4: Storm Corridor (Z: 115-147, Y: 8→10)
  // ============================================

  _buildStormCorridor() {
    // Entry platform
    this._addFloor(0, 8, 115, 4, 2.5, 0x90A4AE);
    this._addNeonEdge(0, 8, 115, 4, 2.5, 0xB0BEC5);

    // Narrow storm corridor segments (halfW=3)
    this._addFloor(0, 8.5, 123, 3.5, 4, 0x78909C);
    this._addNeonEdge(0, 8.5, 123, 3.5, 4, 0xB0BEC5);
    this._addFloor(0, 9, 132, 3.5, 4, 0x607D8B);
    this._addNeonEdge(0, 9, 132, 3.5, 4, 0x90A4AE);
    this._addFloor(0, 9.5, 141, 3.5, 3.5, 0x546E7A);
    this._addNeonEdge(0, 9.5, 141, 3.5, 3.5, 0x78909C);

    // Fast "lightning bolt" spinners
    this._addSpinner(0, 9.5, 121, 6.5, 0.6, 0.6, 3.0, 0xFFFF00);
    this._addSpinner(0, 10.0, 129, 6, 0.6, 0.6, -3.5, 0xFDD835);
    this._addSpinner(0, 10.5, 137, 6.5, 0.6, 0.6, 2.8, 0xFFFF00);

    // Wind pushers
    this._addWindGust(-5, 9.5, 125, 8, 2.0, 0, 1);
    this._addWindGust(5, 10, 134, 8, 2.2, Math.PI * 0.3, -1);

    // Rail on one side only
    this._addRail(-3.5, 8, 117, -3.5, 9.5, 144, 0x546E7A);

    // Exit platform at slide start height Y=10
    this._addFloor(0, 10, 147, 4, 2, 0x7E57C2);
    this._addNeonEdge(0, 10, 147, 4, 2, 0xB388FF);

    this.checkpoints.push({ x: 0, y: 8, z: 118 });
  }

  // ============================================
  //  SECTION 5: The Great Sky Slide (Z: 148-210, Y: 10→0)
  // ============================================

  _buildGreatSkySlide() {
    // Launch platform at top (with walls to funnel into slide)
    this._addFloor(0, 10, 150, 5, 2.5, 0xCE93D8);
    this._addNeonEdge(0, 10, 150, 5, 2.5, 0xF3E5F5);
    // Funnel walls at slide entrance
    this._addWall(-5, 11.2, 150, 0.25, 1.2, 2.5, 0xE1BEE7);
    this._addWall(5, 11.2, 150, 0.25, 1.2, 2.5, 0xE1BEE7);

    // SEGMENT 1: Straight downhill slide Z:152→168, Y:10→7
    this._addSlideSegment(0, 152, 168, 10, 7, 5, 0xCE93D8, 0xE1BEE7);
    this._addBumper(-2, 9, 157, 0xFFEB3B);
    this._addBumper(2, 8, 163, 0x80DEEA);

    // TURN RIGHT: banked turn with walls X=0 → X=8
    this._addFloor(2, 7, 170, 3.5, 2, 0xEF5350);
    this._addFloor(5.5, 7, 171, 3.5, 2, 0xFF9800);
    this._addFloor(8, 7, 172.5, 4, 2.5, 0xFFEE58);
    // Outer wall on the turn (keeps player from flying off)
    this._addWall(2, 8.2, 170, 0.2, 1.2, 2, 0xEF9A9A);
    this._addWall(12, 8.2, 172.5, 0.2, 1.2, 2.5, 0xFFF9C4);
    // Inner wall on the turn
    this._addWall(-1.5, 8.2, 170, 0.2, 1.2, 2, 0xEF9A9A);

    // SEGMENT 2: Straight downhill slide Z:175→190, Y:7→4
    this._addSlideSegment(8, 175, 190, 7, 4, 5, 0x66BB6A, 0xA5D6A7);
    this._addBumper(6, 6, 180, 0xFFEB3B);
    this._addBumper(10, 5.5, 186, 0xFF80AB);

    // TURN LEFT: banked turn with walls X=8 → X=-5
    this._addFloor(5, 4, 192, 3.5, 2, 0x42A5F5);
    this._addFloor(1, 3.5, 193, 3.5, 2, 0x7E57C2);
    this._addFloor(-3, 3, 194.5, 3.5, 2.5, 0xEC407A);
    // Outer wall on the turn
    this._addWall(8.5, 5.2, 192, 0.2, 1.2, 2, 0x90CAF9);
    this._addWall(-6.5, 4.2, 194.5, 0.2, 1.2, 2.5, 0xF48FB1);
    // Inner wall
    this._addWall(8.5, 5.2, 194.5, 0.2, 1.2, 2.5, 0x90CAF9);

    // SEGMENT 3: Steep final slide Z:197→208, Y:3→0
    this._addSlideSegment(-5, 197, 208, 3, 0, 5, 0xEF5350, 0xEF9A9A);
    this._addSpinner(-5, 2, 202, 7, 0.7, 0.7, 1.5, 0xFF9800);

    // Slide arch frames (decorative hoops over the slide)
    const archColors = [0xCE93D8, 0x66BB6A, 0xEF5350];
    const archPositions = [
      { x: 0, z: 155, y: 9.4 },
      { x: 0, z: 162, y: 7.9 },
      { x: 8, z: 180, y: 6.1 },
      { x: 8, z: 186, y: 4.9 },
      { x: -5, z: 200, y: 2.2 },
      { x: -5, z: 205, y: 1.0 },
    ];
    for (let i = 0; i < archPositions.length; i++) {
      const ap = archPositions[i];
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(5.5, 0.18, 8, 16, Math.PI),
        new THREE.MeshToonMaterial({ color: archColors[Math.floor(i / 2)] })
      );
      arch.position.set(ap.x, ap.y, ap.z);
      arch.rotation.y = Math.PI / 2;
      this.scene.add(arch);
    }

    this.checkpoints.push({ x: 0, y: 10, z: 150 });
    this.checkpoints.push({ x: 8, y: 7, z: 176 });
  }

  // ============================================
  //  FINISH
  // ============================================

  _buildCloudFinish() {
    // Finish platform
    this._addFloor(-5, 0, 210, 5.5, 3, 0xFFF9C4);
    this._addFloor(-5, 0.08, 210, 5, 2.5, 0xFFF176);
    this._addNeonEdge(-5, 0, 210, 5.5, 3, 0xFFFF00);

    // Rainbow finish arch
    this._addRainbowArch(-5, 0, 207, 1.0);

    // FINISH arch pillars
    this._addWall(-10.5, 3, 207, 0.4, 3, 0.4, 0xFFD700);
    this._addWall(0.5, 3, 207, 0.4, 3, 0.4, 0xFFD700);
    this._addWall(-5, 5.5, 207, 5.5, 0.5, 0.4, 0xFFD700);

    // Checkered banner
    const banner = new THREE.Mesh(
      new THREE.BoxGeometry(8, 1.5, 0.06),
      new THREE.MeshToonMaterial({ color: 0x212121 })
    );
    banner.position.set(-5, 5.5, 206.65);
    this.scene.add(banner);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 10; col++) {
        if ((row + col) % 2 === 0) continue;
        const c = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.45, 0.02),
          new THREE.MeshToonMaterial({ color: 0xFFFFFF })
        );
        c.position.set(-5 - 1.8 + col * 0.4, 5.0 + row * 0.45, 206.62);
        this.scene.add(c);
      }
    }

    this._addBunting(-10.5, 5, 207, 0.5, 5, 207, 12);

    // Confetti
    for (let i = 0; i < 30; i++) {
      const conf = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.1, 0.15),
        new THREE.MeshToonMaterial({ color: CANDY[i % CANDY.length] })
      );
      const rx = -5 + (Math.random() - 0.5) * 14;
      const ry = 2 + Math.random() * 6;
      const rz = 210 + (Math.random() - 0.5) * 10;
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

    // Spotlights
    for (const [sx, sz] of [[-5, -3], [5, 3]]) {
      const spot = new THREE.SpotLight(0xFFD700, 3, 20, Math.PI / 6);
      spot.position.set(-5 + sx, 8, 210 + sz);
      spot.target.position.set(-5, 3, 210);
      this.scene.add(spot);
      this.scene.add(spot.target);
    }
  }

  // ============================================
  //  ATMOSPHERE
  // ============================================

  _buildCloudAtmosphere() {
    // Clouds BELOW instead of ocean
    const cloudFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 800),
      new THREE.MeshToonMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.7 })
    );
    cloudFloor.rotation.x = -Math.PI / 2;
    cloudFloor.position.set(0, -15, 100);
    this.scene.add(cloudFloor);

    const cloudFloor2 = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 700),
      new THREE.MeshToonMaterial({ color: 0xE3F2FD, transparent: true, opacity: 0.5 })
    );
    cloudFloor2.rotation.x = -Math.PI / 2;
    cloudFloor2.position.set(0, -18, 100);
    this.scene.add(cloudFloor2);

    // Dense cloud clusters below the course
    const positions = [
      [-15, -8, 30], [10, -10, 50], [-20, -6, 80], [15, -9, 110],
      [-10, -7, 140], [20, -11, 170], [-25, -8, 200], [5, -10, 60],
      [25, -6, 90], [-5, -12, 130], [18, -7, 160], [-15, -9, 190],
      [0, -11, 20], [-30, -8, 100], [30, -10, 150],
    ];
    for (const [x, y, z] of positions) {
      this._addCloudCluster(x, y, z, 0.8 + Math.random() * 0.8);
    }
  }

  // ============================================
  //  DECORATIONS
  // ============================================

  _buildCloudDecorations() {
    // Hot air balloons
    this._addBalloon(-18, 20, 25, 0xFFD700);
    this._addBalloon(18, 25, 60, 0xE1F5FE);
    this._addBalloon(-25, 18, 120, 0xFFF9C4);
    this._addBalloon(20, 22, 180, 0xCE93D8);

    // Spectator islands
    this._addSpectatorIsland(-25, 10, 30);
    this._addSpectatorIsland(25, 12, 80);
    this._addSpectatorIsland(-20, 15, 140);
    this._addSpectatorIsland(20, 8, 200);

    // Cloud clusters above/around
    this._addCloudCluster(-12, 14, 40, 1.0);
    this._addCloudCluster(15, 16, 70, 0.8);
    this._addCloudCluster(-8, 18, 100, 1.2);
    this._addCloudCluster(20, 14, 130, 0.9);
    this._addCloudCluster(-15, 20, 160, 1.1);
    this._addCloudCluster(10, 16, 190, 0.8);
    this._addCloudCluster(-20, 12, 210, 0.7);
    this._addCloudCluster(25, 18, 40, 0.6);

    // Floating rainbow rings
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.18, 8, 24),
        new THREE.MeshToonMaterial({ color: RAINBOW[i * 3] })
      );
      const a = (i / 6) * Math.PI * 2;
      ring.position.set(Math.sin(a) * 15, 8 + i * 3, 40 + i * 30);
      this.scene.add(ring);
      this.decorAnimations.push({
        update: () => {
          const t = performance.now() / 1000;
          ring.rotation.x = t * 0.3 + i;
          ring.rotation.y = t * 0.2;
        }
      });
    }

    // Stars/sparkles near slide
    for (let i = 0; i < 12; i++) {
      const sa = (i / 12) * Math.PI * 2;
      const sr = 8 + Math.random() * 5;
      const sy = 5 + Math.random() * 8;
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2, 0),
        new THREE.MeshToonMaterial({ color: 0xFFF9C4 })
      );
      star.position.set(Math.cos(sa) * sr, sy, 150 + Math.sin(sa) * sr);
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

    // Bunting at key sections
    this._addBunting(-6, 2, 22, 6, 2, 22, 10);
    this._addBunting(-5, 8.5, 70, 5, 8.5, 70, 8);
    this._addBunting(-4, 10, 115, 4, 10, 115, 8);
  }
}
