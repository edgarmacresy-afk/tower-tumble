import * as THREE from 'three';

export const RAINBOW = [
  0xFF7043, 0xFF9800, 0xFFEE58, 0x66BB6A, 0x42A5F5,
  0x7E57C2, 0xEC407A, 0xFF7043, 0xFF9800, 0xFFEE58,
  0x66BB6A, 0x42A5F5, 0x7E57C2, 0xEC407A, 0xFF7043,
  0xFF9800, 0xFFEE58, 0x66BB6A, 0x42A5F5, 0x7E57C2,
];
export const CANDY = [0xFF1744, 0x00E5FF, 0xFFEA00, 0x00E676, 0xD500F9, 0xFF9100, 0x2979FF, 0xF50057];

export class CourseBase {
  constructor(physics, scene) {
    this.physics = physics;
    this.scene = scene;
    this.kinematicObjects = [];
    this.trampolines = [];
    this.boostPads = [];
    this.checkpoints = [];
    this.decorAnimations = [];
    this.courseWidth = 60;
    this.finishPosition = { x: 0, y: 0, z: 100 };
    this.finishRadius = 5;
    this.finishZ = 999;
  }

  generate() { throw new Error('Subclass must implement generate()'); }
  getProgress() { throw new Error('Subclass must implement getProgress()'); }

  update(dt) {
    for (const obj of this.kinematicObjects) obj.update(dt);
    for (const tramp of this.trampolines) {
      if (tramp.cooldown > 0) tramp.cooldown -= dt;
      if (tramp.bounceTimer > 0) {
        tramp.bounceTimer -= dt;
        tramp.mesh.scale.y = 0.3 + 0.7 * (1 - tramp.bounceTimer / 0.3);
      }
    }
    for (const pad of this.boostPads) {
      if (pad.cooldown > 0) pad.cooldown -= dt;
    }
    for (const anim of this.decorAnimations) anim.update(dt);
  }

  // ============================================
  //  CORE HELPERS
  // ============================================

  _addFloor(x, y, z, halfW, halfD, color) {
    const geo = new THREE.BoxGeometry(halfW * 2, 0.6, halfD * 2);
    const mat = new THREE.MeshToonMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - 0.3, z);
    this.scene.add(mesh);

    const underGeo = new THREE.BoxGeometry(halfW * 2, 0.15, halfD * 2);
    const darkerColor = new THREE.Color(color).multiplyScalar(0.6);
    const underMat = new THREE.MeshToonMaterial({ color: darkerColor });
    const under = new THREE.Mesh(underGeo, underMat);
    under.position.set(x, y - 0.68, z);
    this.scene.add(under);

    const body = this.physics.createStaticBody(new THREE.Vector3(x, y - 0.3, z));
    this.physics.addBoxCollider(body, { x: halfW, y: 0.3, z: halfD });
    return mesh;
  }

  _addWall(x, y, z, halfW, halfH, halfD, color) {
    const geo = new THREE.BoxGeometry(halfW * 2, halfH * 2, halfD * 2);
    const mat = new THREE.MeshToonMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    const body = this.physics.createStaticBody(new THREE.Vector3(x, y, z));
    this.physics.addBoxCollider(body, { x: halfW, y: halfH, z: halfD });
    return mesh;
  }

  _addRail(x1, y, z1, x2, z2, color) {
    const dx = x2 - x1, dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const railColor = color || 0xFFD740;

    for (const t of [0, 1]) {
      const px = x1 + dx * t, pz = z1 + dz * t;
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6);
      const postMat = new THREE.MeshToonMaterial({ color: railColor });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, y + 0.5, pz);
      this.scene.add(post);
    }

    const barGeo = new THREE.CylinderGeometry(0.05, 0.05, length, 6);
    const barMat = new THREE.MeshToonMaterial({ color: railColor });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set((x1 + x2) / 2, y + 0.9, (z1 + z2) / 2);
    bar.rotation.x = Math.PI / 2;
    bar.rotation.z = -angle;
    this.scene.add(bar);

    const body = this.physics.createStaticBody(new THREE.Vector3((x1 + x2) / 2, y + 0.5, (z1 + z2) / 2));
    const desc = this.physics.RAPIER.ColliderDesc.cuboid(0.05, 0.5, length / 2)
      .setFriction(0.3).setRestitution(0.3);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    desc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    this.physics.world.createCollider(desc, body);
  }

  _addNeonEdge(x, y, z, halfW, halfD, color) {
    const mat = new THREE.MeshToonMaterial({ color });
    const fg = new THREE.BoxGeometry(halfW * 2 + 0.2, 0.12, 0.12);
    for (const dz of [halfD, -halfD]) {
      const e = new THREE.Mesh(fg, mat);
      e.position.set(x, y + 0.02, z + dz);
      this.scene.add(e);
    }
    const sg = new THREE.BoxGeometry(0.12, 0.12, halfD * 2 + 0.2);
    for (const dx of [halfW, -halfW]) {
      const e = new THREE.Mesh(sg, mat);
      e.position.set(x + dx, y + 0.02, z);
      this.scene.add(e);
    }
  }

  _addSpinner(cx, cy, cz, barLength, barHeight, barThick, speed, color) {
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
        angle += speed * dt;
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
        mesh.rotation.y = angle;
      }
    });
  }

  _addTrampoline(x, y, z, radius) {
    const geo = new THREE.CylinderGeometry(radius, radius * 0.9, 0.3, 24);
    const mesh = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: 0x76FF03 }));
    mesh.position.set(x, y + 0.15, z);
    this.scene.add(mesh);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.12, 8, 24),
      new THREE.MeshToonMaterial({ color: 0x00E676 })
    );
    ring.position.set(x, y + 0.3, z);
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);

    const body = this.physics.createStaticBody(new THREE.Vector3(x, y + 0.15, z));
    this.physics.addBoxCollider(body, { x: radius, y: 0.15, z: radius });
    this.trampolines.push({ x, y: y + 0.3, z, radius, mesh, cooldown: 0, bounceTimer: 0 });
  }

  _addBoostPad(x, y, z, halfW, halfD, dirX, dirZ) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 2, 0.08, halfD * 2),
      new THREE.MeshToonMaterial({ color: 0x00E5FF })
    );
    mesh.position.set(x, y + 0.26, z);
    this.scene.add(mesh);

    const chevGeo = new THREE.BoxGeometry(halfW * 0.8, 0.06, halfD * 0.4);
    const chevMat = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(chevGeo, chevMat);
      c.position.set(x, y + 0.33, z - halfD * 0.5 + i * halfD * 0.5);
      this.scene.add(c);
    }

    this.boostPads.push({
      x, y: y + 0.26, z, halfW, halfD,
      dirX: dirX || 0, dirZ: dirZ || 1, mesh, cooldown: 0
    });
  }

  _addBoxingGlove(wallX, cy, cz, reach, speed, phase, dir) {
    const gloveGeo = new THREE.SphereGeometry(1.0, 16, 16);
    const gloveMesh = new THREE.Mesh(gloveGeo, new THREE.MeshToonMaterial({ color: 0xFF1744 }));
    gloveMesh.scale.set(1, 0.9, 1.2);
    this.scene.add(gloveMesh);

    const armGeo = new THREE.BoxGeometry(3, 0.5, 0.5);
    const armMesh = new THREE.Mesh(armGeo, new THREE.MeshToonMaterial({ color: 0xFFD740 }));
    this.scene.add(armMesh);

    const cuffGeo = new THREE.CylinderGeometry(0.6, 0.65, 0.35, 12);
    const cuffMesh = new THREE.Mesh(cuffGeo, new THREE.MeshToonMaterial({ color: 0xFFD740 }));
    cuffMesh.rotation.z = Math.PI / 2;
    this.scene.add(cuffMesh);

    const body = this.physics.createKinematicBody(new THREE.Vector3(wallX, cy, cz));
    this.physics.world.createCollider(
      this.physics.RAPIER.ColliderDesc.ball(1.0).setFriction(0.1).setRestitution(1.2), body
    );

    let time = phase || 0;
    this.kinematicObjects.push({
      update: (dt) => {
        time += dt;
        const punch = Math.pow(Math.max(0, Math.sin(time * speed)), 0.4);
        const extend = punch * reach;
        const gx = wallX + dir * (0.5 + extend);
        body.setNextKinematicTranslation({ x: gx, y: cy, z: cz });
        gloveMesh.position.set(gx, cy, cz);
        armMesh.position.set(wallX + dir * (extend * 0.4), cy, cz);
        cuffMesh.position.set(gx - dir * 1.0, cy, cz);
      }
    });
  }

  _addDownhillBall(laneX, bottomZ, topZ, bottomY, topY, radius, speed, phase, color) {
    const geo = new THREE.SphereGeometry(radius, 20, 20);
    const mat = new THREE.MeshToonMaterial({ color: color || 0xF44336 });
    const mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);

    const stripeMat = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
    const stripeGeo = new THREE.TorusGeometry(radius * 0.88, radius * 0.14, 6, 20);
    mesh.add(new THREE.Mesh(stripeGeo, stripeMat));
    const s2 = new THREE.Mesh(stripeGeo, stripeMat);
    s2.rotation.y = Math.PI / 2;
    mesh.add(s2);

    const eyeMat = new THREE.MeshToonMaterial({ color: 0x212121 });
    const eyeGeo = new THREE.SphereGeometry(radius * 0.12, 6, 6);
    mesh.add(new THREE.Mesh(eyeGeo, eyeMat).translateX(-radius * 0.25).translateY(radius * 0.2).translateZ(radius * 0.85));
    mesh.add(new THREE.Mesh(eyeGeo, eyeMat).translateX(radius * 0.25).translateY(radius * 0.2).translateZ(radius * 0.85));

    const body = this.physics.createKinematicBody(new THREE.Vector3(laneX, topY + radius, topZ));
    this.physics.world.createCollider(
      this.physics.RAPIER.ColliderDesc.ball(radius).setFriction(0.05).setRestitution(0.8), body
    );

    const totalZ = topZ - bottomZ;
    const totalY = topY - bottomY;
    let time = phase || 0;
    this.kinematicObjects.push({
      update: (dt) => {
        time += dt;
        const t = (time * speed) % 1;
        const z = topZ - t * totalZ;
        const y = bottomY + ((z - bottomZ) / totalZ) * totalY + radius;
        body.setNextKinematicTranslation({ x: laneX, y, z });
        mesh.position.set(laneX, y, z);
        mesh.rotation.x += speed * totalZ * dt / radius;
      }
    });
  }

  _addBumper(x, y, z, color) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.8, 12),
      new THREE.MeshToonMaterial({ color })
    );
    mesh.position.set(x, y + 0.4, z);
    this.scene.add(mesh);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.06, 6, 12),
      new THREE.MeshToonMaterial({ color: 0xFFFFFF })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y + 0.8, z);
    this.scene.add(ring);

    const body = this.physics.createStaticBody(new THREE.Vector3(x, y + 0.4, z));
    this.physics.world.createCollider(
      this.physics.RAPIER.ColliderDesc.cylinder(0.4, 0.35).setRestitution(0.9), body
    );
  }

  _addCrown(x, y, z) {
    const goldMat = new THREE.MeshToonMaterial({ color: 0xFFD700 });
    const goldShiny = new THREE.MeshToonMaterial({ color: 0xFFF176 });

    this.scene.add(new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.0, 1.2, 24), goldMat).translateX(x).translateY(y + 0.6).translateZ(z));
    this.scene.add(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.3, 24), new THREE.MeshToonMaterial({ color: 0xE65100 })).translateX(x).translateY(y + 0.8).translateZ(z));

    const gemColors = [0xE91E63, 0x2196F3, 0x4CAF50, 0xE91E63, 0x9C27B0];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const px = x + Math.cos(a) * 2.2, pz = z + Math.sin(a) * 2.2;
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.0, 6), goldShiny);
      point.position.set(px, y + 2.2, pz);
      this.scene.add(point);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), new THREE.MeshToonMaterial({ color: gemColors[i] }));
      gem.position.set(px, y + 1.5, pz);
      this.scene.add(gem);
    }

    this.scene.add(new THREE.PointLight(0xFFD700, 2, 15).translateX(x).translateY(y + 3).translateZ(z));

    for (let i = 0; i < 8; i++) {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshToonMaterial({ color: 0xFFF9C4 }));
      const sa = (i / 8) * Math.PI * 2, sr = 3.5, sy = y + 1.5 + Math.random() * 2;
      spark.position.set(x + Math.cos(sa) * sr, sy, z + Math.sin(sa) * sr);
      this.scene.add(spark);
      this.decorAnimations.push({
        update: () => {
          const t = performance.now() / 1000;
          spark.position.x = x + Math.cos(sa + t * 0.5) * sr;
          spark.position.z = z + Math.sin(sa + t * 0.5) * sr;
          spark.position.y = sy + Math.sin(t * 2 + i) * 0.3;
        }
      });
    }
  }

  // ============================================
  //  NEW HELPERS (for Cloud Kingdom + future maps)
  // ============================================

  _addWindGust(wallX, cy, cz, reach, speed, phase, dir) {
    // Big cloud fist visual
    const cloudMat = new THREE.MeshToonMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.9 });
    const gustGroup = new THREE.Group();
    gustGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 12), cloudMat));
    gustGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 10), cloudMat).translateX(1.0).translateY(0.4));
    gustGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 10), cloudMat).translateX(-0.8).translateY(-0.3));
    gustGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), cloudMat).translateX(0.3).translateY(0.9));
    gustGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), cloudMat).translateX(-0.5).translateY(0.6).translateZ(0.5));
    this.scene.add(gustGroup);

    // Wide wind trail
    const trailMat = new THREE.MeshToonMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.35 });
    const trail = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 0.6), trailMat);
    this.scene.add(trail);

    const body = this.physics.createKinematicBody(new THREE.Vector3(wallX, cy, cz));
    this.physics.world.createCollider(
      this.physics.RAPIER.ColliderDesc.ball(1.8).setFriction(0.1).setRestitution(1.5), body
    );

    let time = phase || 0;
    this.kinematicObjects.push({
      update: (dt) => {
        time += dt;
        const punch = Math.pow(Math.max(0, Math.sin(time * speed)), 0.4);
        const extend = punch * reach;
        const gx = wallX + dir * (0.5 + extend);
        body.setNextKinematicTranslation({ x: gx, y: cy, z: cz });
        gustGroup.position.set(gx, cy, cz);
        trail.position.set(wallX + dir * (extend * 0.4), cy, cz);
      }
    });
  }

  _addMovingPlatform(x, y, z, halfW, halfD, color, moveAxis, range, speed) {
    const geo = new THREE.BoxGeometry(halfW * 2, 0.6, halfD * 2);
    const mat = new THREE.MeshToonMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - 0.3, z);
    this.scene.add(mesh);

    const darkerColor = new THREE.Color(color).multiplyScalar(0.6);
    const under = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 2, 0.15, halfD * 2),
      new THREE.MeshToonMaterial({ color: darkerColor })
    );
    under.position.set(x, y - 0.68, z);
    this.scene.add(under);

    const body = this.physics.createKinematicBody(new THREE.Vector3(x, y - 0.3, z));
    const desc = this.physics.RAPIER.ColliderDesc.cuboid(halfW, 0.3, halfD)
      .setFriction(0.9).setRestitution(0.0);
    this.physics.world.createCollider(desc, body);

    let time = 0;
    this.kinematicObjects.push({
      update: (dt) => {
        time += dt;
        const offset = Math.sin(time * speed) * range;
        const px = moveAxis === 'x' ? x + offset : x;
        const pz = moveAxis === 'z' ? z + offset : z;
        body.setNextKinematicTranslation({ x: px, y: y - 0.3, z: pz });
        mesh.position.set(px, y - 0.3, pz);
        under.position.set(px, y - 0.68, pz);
      }
    });
  }

  _addSlopeSegment(cx, z1, z2, y1, y2, halfW, color, hasChevrons = true, friction = 0.7) {
    const dz = z2 - z1;
    const dy = y2 - y1;
    const slopeLen = Math.sqrt(dz * dz + dy * dy);
    const angle = Math.atan2(Math.abs(dy), Math.abs(dz));
    const sign = dy >= 0 ? -1 : 1; // negative rotation = ascending in +Z
    const midZ = (z1 + z2) / 2;
    const midY = (y1 + y2) / 2 - 0.3;

    const slopeGeo = new THREE.BoxGeometry(halfW * 2, 0.6, slopeLen);
    const slopeMat = new THREE.MeshToonMaterial({ color });
    const slopeMesh = new THREE.Mesh(slopeGeo, slopeMat);
    slopeMesh.position.set(cx, midY, midZ);
    slopeMesh.rotation.x = sign * angle;
    this.scene.add(slopeMesh);

    const darkerColor = new THREE.Color(color).multiplyScalar(0.6);
    const under = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 2, 0.15, slopeLen),
      new THREE.MeshToonMaterial({ color: darkerColor })
    );
    under.position.set(0, -0.38, 0);
    slopeMesh.add(under);

    for (const sx of [-halfW, halfW]) {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.14, slopeLen),
        new THREE.MeshToonMaterial({ color: new THREE.Color(color).multiplyScalar(1.3) })
      );
      edge.position.set(sx, 0.31, 0);
      slopeMesh.add(edge);
    }

    if (hasChevrons) {
      for (let i = 0; i < 6; i++) {
        const t = -0.5 + (i + 0.5) / 6;
        const chevron = new THREE.Mesh(
          new THREE.BoxGeometry(halfW * 1.4, 0.06, 0.5),
          new THREE.MeshToonMaterial({ color: i % 2 === 0 ? 0xFFEA00 : 0xFF9800 })
        );
        chevron.position.set(0, 0.31, t * slopeLen);
        slopeMesh.add(chevron);
      }
    }

    const body = this.physics.createStaticBody(new THREE.Vector3(cx, midY, midZ));
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(sign * angle, 0, 0));
    const desc = this.physics.RAPIER.ColliderDesc.cuboid(halfW, 0.3, slopeLen / 2)
      .setFriction(friction).setRestitution(0.0)
      .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    this.physics.world.createCollider(desc, body);

    return { mesh: slopeMesh, body, angle, midZ, midY };
  }

  _addSlideSegment(cx, z1, z2, y1, y2, halfW, slideColor, wallColor) {
    const dz = z2 - z1;
    const dy = y2 - y1;
    const slopeLen = Math.sqrt(dz * dz + dy * dy);
    const slopeAngle = Math.atan2(Math.abs(dy), Math.abs(dz));
    const sign = dy >= 0 ? -1 : 1;
    const midZ = (z1 + z2) / 2;
    const midY = (y1 + y2) / 2;

    // Trough curve — large radius for a shallow U-shape
    const slideRadius = halfW * 1.4;
    const arcAngle = 2 * Math.asin(Math.min(0.99, halfW / slideRadius));
    const wallHeight = slideRadius * (1 - Math.cos(arcAngle / 2));

    // Parent group for slope tilt
    const slideGroup = new THREE.Group();
    slideGroup.position.set(cx, midY, midZ);
    slideGroup.rotation.x = sign * slopeAngle;
    this.scene.add(slideGroup);

    // --- INNER TROUGH (half-pipe U-shape) ---
    const innerGeo = new THREE.CylinderGeometry(
      slideRadius, slideRadius, slopeLen, 28, 1, true,
      Math.PI - arcAngle / 2, arcAngle
    );
    const innerMesh = new THREE.Mesh(innerGeo, new THREE.MeshToonMaterial({
      color: slideColor, side: THREE.DoubleSide
    }));
    innerMesh.rotation.x = -Math.PI / 2;
    innerMesh.position.y = slideRadius;
    slideGroup.add(innerMesh);

    // --- OUTER SHELL (thicker, darker — gives the slide body) ---
    const shellRadius = slideRadius + 0.4;
    const shellGeo = new THREE.CylinderGeometry(
      shellRadius, shellRadius, slopeLen + 0.05, 28, 1, true,
      Math.PI - arcAngle / 2 - 0.02, arcAngle + 0.04
    );
    const shellMesh = new THREE.Mesh(shellGeo, new THREE.MeshToonMaterial({
      color: new THREE.Color(wallColor).multiplyScalar(0.7),
      side: THREE.DoubleSide
    }));
    shellMesh.rotation.x = -Math.PI / 2;
    shellMesh.position.y = slideRadius;
    slideGroup.add(shellMesh);

    // --- END CAPS (semicircle plugs at each end) ---
    const capShape = new THREE.Shape();
    const capSteps = 20;
    for (let i = 0; i <= capSteps; i++) {
      const theta = (Math.PI - arcAngle / 2) + (arcAngle * i / capSteps);
      const lx = slideRadius * Math.sin(theta);
      const ly = slideRadius - slideRadius * Math.cos(theta);
      if (i === 0) capShape.moveTo(lx, ly);
      else capShape.lineTo(lx, ly);
    }
    for (let i = capSteps; i >= 0; i--) {
      const theta = (Math.PI - arcAngle / 2) + (arcAngle * i / capSteps);
      const lx = shellRadius * Math.sin(theta);
      const ly = slideRadius - shellRadius * Math.cos(theta);
      capShape.lineTo(lx, ly);
    }
    capShape.closePath();
    const capGeo = new THREE.ShapeGeometry(capShape);
    const capMat = new THREE.MeshToonMaterial({ color: wallColor, side: THREE.DoubleSide });
    for (const zOff of [-slopeLen / 2, slopeLen / 2]) {
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(0, 0, zOff);
      cap.rotation.y = zOff > 0 ? 0 : Math.PI;
      slideGroup.add(cap);
    }

    // --- RIM LIPS (white tubes along top edges) ---
    const lipMat = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
    for (const side of [-1, 1]) {
      const lip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, slopeLen + 0.3, 8), lipMat
      );
      lip.rotation.x = Math.PI / 2;
      lip.position.set(side * halfW, wallHeight, 0);
      slideGroup.add(lip);
    }

    // --- SURFACE STRIPES (flat bands across the trough bottom) ---
    const stripeCount = Math.floor(slopeLen / 3);
    const brightColor = new THREE.Color(slideColor).multiplyScalar(1.3);
    for (let i = 0; i < stripeCount; i++) {
      const t = -0.5 + (i + 0.5) / stripeCount;
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(halfW * 1.2, 0.04, 0.4),
        new THREE.MeshToonMaterial({ color: i % 2 === 0 ? 0xFFFFFF : brightColor })
      );
      stripe.position.set(0, 0.06, t * slopeLen);
      slideGroup.add(stripe);
    }

    // --- WATER SHINE STREAKS (long thin white lines down the slide) ---
    const streakMat = new THREE.MeshToonMaterial({
      color: 0xFFFFFF, transparent: true, opacity: 0.25
    });
    for (let i = -2; i <= 2; i++) {
      const streak = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.02, slopeLen * 0.85), streakMat
      );
      streak.position.set(i * 1.2, 0.07, 0);
      slideGroup.add(streak);
    }

    // --- PHYSICS: flat bottom (slippery) ---
    const body = this.physics.createStaticBody(new THREE.Vector3(cx, midY, midZ));
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(sign * slopeAngle, 0, 0));
    const bottomDesc = this.physics.RAPIER.ColliderDesc
      .cuboid(halfW * 0.85, 0.12, slopeLen / 2)
      .setFriction(0.08).setRestitution(0.0)
      .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    this.physics.world.createCollider(bottomDesc, body);

    // --- PHYSICS: wall colliders at edges ---
    for (const side of [-1, 1]) {
      const wallBody = this.physics.createStaticBody(
        new THREE.Vector3(cx + side * halfW, midY + wallHeight * 0.4, midZ)
      );
      const wallDesc = this.physics.RAPIER.ColliderDesc
        .cuboid(0.2, wallHeight / 2 + 0.5, slopeLen / 2)
        .setFriction(0.15).setRestitution(0.4)
        .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      this.physics.world.createCollider(wallDesc, wallBody);
    }

    // --- SUPPORT STRUCTURE (pillars + cross-braces) ---
    const numPillars = Math.max(2, Math.floor(slopeLen / 5));
    const pillarMat = new THREE.MeshToonMaterial({ color: 0x9E9E9E });
    const braceMat = new THREE.MeshToonMaterial({ color: 0xBDBDBD });
    for (let i = 0; i < numPillars; i++) {
      const t = (i + 0.5) / numPillars;
      const pz = z1 + (z2 - z1) * t;
      const py = y1 + (y2 - y1) * t;
      const pillarH = Math.max(1.5, py + 1);
      for (const sx of [-halfW + 0.3, halfW - 0.3]) {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.3, pillarH, 8), pillarMat
        );
        pillar.position.set(cx + sx, py - pillarH / 2 - 0.3, pz);
        this.scene.add(pillar);
      }
      // Cross-brace
      const brace = new THREE.Mesh(
        new THREE.BoxGeometry(halfW * 2 - 0.6, 0.18, 0.18), braceMat
      );
      brace.position.set(cx, py - pillarH * 0.3, pz);
      this.scene.add(brace);
    }

    return { slideGroup, midZ, midY, angle: slopeAngle };
  }

  _addRainbowArch(x, y, z, scale) {
    const colors = [0xEF5350, 0xFF9800, 0xFFEE58, 0x66BB6A, 0x42A5F5, 0x5C6BC0, 0xAB47BC];
    const group = new THREE.Group();
    for (let i = 0; i < colors.length; i++) {
      const r = (3.0 - i * 0.2) * scale;
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.15 * scale, 8, 24, Math.PI),
        new THREE.MeshToonMaterial({ color: colors[i] })
      );
      arc.rotation.z = Math.PI / 2;
      arc.rotation.y = Math.PI / 2;
      arc.position.y = 0;
      group.add(arc);
    }
    group.position.set(x, y + 3 * scale, z);
    this.scene.add(group);
  }

  // ============================================
  //  DECORATION HELPERS
  // ============================================

  _addBalloon(x, y, z, color) {
    const group = new THREE.Group();
    const env = new THREE.Mesh(new THREE.SphereGeometry(2.0, 16, 16), new THREE.MeshToonMaterial({ color }));
    env.position.y = 2.0;
    env.scale.y = 1.3;
    group.add(env);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.0, 12), new THREE.MeshToonMaterial({ color }));
    cone.position.y = 0.2;
    cone.rotation.x = Math.PI;
    group.add(cone);

    const bandGeo = new THREE.TorusGeometry(1.8, 0.08, 6, 24);
    const bandMat = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.y = 1.2 + i * 0.8;
      band.rotation.x = Math.PI / 2;
      group.add(band);
    }

    const basket = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 1.0), new THREE.MeshToonMaterial({ color: 0x8D6E63 }));
    basket.position.y = -2.5;
    group.add(basket);

    const ropeGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.5, 4);
    const ropeMat = new THREE.MeshToonMaterial({ color: 0x795548 });
    for (let i = 0; i < 4; i++) {
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      const a = (i / 4) * Math.PI * 2;
      rope.position.set(Math.cos(a) * 0.4, -1.0, Math.sin(a) * 0.4);
      group.add(rope);
    }

    group.position.set(x, y, z);
    this.scene.add(group);
    const by = y;
    this.decorAnimations.push({
      update: () => {
        const t = performance.now() / 1000;
        group.position.y = by + Math.sin(t * 0.4 + x) * 0.8;
        group.rotation.y = Math.sin(t * 0.15 + z) * 0.1;
      }
    });
  }

  _addSpectatorIsland(x, y, z) {
    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 2, 1.5, 12),
      new THREE.MeshToonMaterial({ color: 0x81C784 })
    );
    island.position.set(x, y, z);
    this.scene.add(island);

    const rock = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 2.5, 8),
      new THREE.MeshToonMaterial({ color: 0x795548 })
    );
    rock.position.set(x, y - 2.0, z);
    rock.rotation.x = Math.PI;
    this.scene.add(rock);

    const beanColors = [0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0xA78BFA, 0xFF9FF3];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      const r = 0.8 + Math.random() * 1.2;
      const bean = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.15, 0.25, 4, 8),
        new THREE.MeshToonMaterial({ color: beanColors[i % beanColors.length] })
      );
      bean.position.set(x + Math.cos(a) * r, y + 1.1, z + Math.sin(a) * r);
      this.scene.add(bean);
    }

    const by = y;
    this.decorAnimations.push({
      update: () => {
        const t = performance.now() / 1000;
        const dy = Math.sin(t * 0.3 + x * 0.5) * 0.4;
        island.position.y = by + dy;
        rock.position.y = by - 2.0 + dy;
      }
    });
  }

  _addCloudCluster(x, y, z, scale) {
    const mat = new THREE.MeshToonMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.85 });
    const group = new THREE.Group();
    for (const p of [
      { dx: 0, dy: 0, dz: 0, r: 1.5 * scale },
      { dx: 1.2 * scale, dy: 0.3, dz: 0.5, r: 1.0 * scale },
      { dx: -1.0 * scale, dy: 0.2, dz: -0.3, r: 1.2 * scale },
      { dx: 0.5 * scale, dy: -0.2, dz: -0.8 * scale, r: 0.8 * scale },
    ]) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(p.r, 12, 12), mat);
      puff.position.set(p.dx, p.dy, p.dz);
      group.add(puff);
    }
    group.position.set(x, y, z);
    this.scene.add(group);
    const by = y;
    this.decorAnimations.push({
      update: () => { group.position.y = by + Math.sin(performance.now() / 1000 * 0.2 + x * 0.3) * 0.5; }
    });
  }

  _addBunting(x1, y1, z1, x2, y2, z2, numFlags) {
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const string = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, length, 4),
      new THREE.MeshToonMaterial({ color: 0x424242 })
    );
    string.position.set((x1 + x2) / 2, (y1 + y2) / 2 + 1.5, (z1 + z2) / 2);
    string.lookAt(x2, y2 + 1.5, z2);
    string.rotateX(Math.PI / 2);
    this.scene.add(string);

    for (let i = 0; i < numFlags; i++) {
      const t = (i + 0.5) / numFlags;
      const s = 0.3;
      const flagGeo = new THREE.BufferGeometry();
      flagGeo.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, -s, -s * 1.5, 0, s, -s * 1.5, 0]), 3
      ));
      flagGeo.computeVertexNormals();
      const flag = new THREE.Mesh(flagGeo, new THREE.MeshToonMaterial({
        color: CANDY[i % CANDY.length], side: THREE.DoubleSide
      }));
      flag.position.set(
        x1 + dx * t,
        (y1 + dy * t) + 1.5 - Math.sin(t * Math.PI) * 0.3,
        z1 + dz * t
      );
      flag.lookAt(flag.position.x + dx, flag.position.y, flag.position.z + dz);
      this.scene.add(flag);
    }
  }
}
