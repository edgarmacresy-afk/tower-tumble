import * as THREE from 'three';
import { TOWER, COLORS } from '../utils/constants.js';
import { seededRandom } from '../utils/helpers.js';
import { Platform } from './Platform.js';
import { SpinningPlatform } from './SpinningPlatform.js';
import { MovingPlatform } from './MovingPlatform.js';
import { DisappearingPlatform } from './DisappearingPlatform.js';

export class TowerGenerator {
  constructor(physicsWorld, scene) {
    this.physics = physicsWorld;
    this.scene = scene;
    this.platforms = [];
    this.disappearingPlatforms = [];
    this.checkpoints = [];
    this.path = [];
    // One-way (semi-permeable) platforms — jump through from below, land from above
    this.oneWayPlatforms = [];
  }

  generate(seed = Date.now()) {
    const rng = seededRandom(seed);
    const totalHeight = TOWER.TOTAL_HEIGHT;

    let currentHeight = 0;
    let currentAngle = 0;
    let lastCheckpointHeight = 0;

    // Big starting platform
    const startPos = new THREE.Vector3(0, -0.15, 0);
    const startPlatform = new Platform(
      this.physics, startPos, 8, 8, 0x66BB6A
    );
    startPlatform.addToScene(this.scene);
    this.platforms.push(startPlatform);
    this.path.push(new THREE.Vector3(0, 0.5, 0));
    this.checkpoints.push({ height: 0, position: { x: 0, y: 2, z: 0 } });

    let prevPos = new THREE.Vector3(0, 0, 0);

    while (currentHeight < totalHeight) {
      // Cap first platform height so it's always reachable from the start
      const isFirst = prevPos.x === 0 && prevPos.z === 0 && currentHeight === 0;
      const maxStep = isFirst ? 1.8 : TOWER.HEIGHT_STEP_MAX;
      const heightStep = TOWER.HEIGHT_STEP_MIN + rng() * (maxStep - TOWER.HEIGHT_STEP_MIN);
      currentHeight += heightStep;

      // Checkpoint
      if (currentHeight - lastCheckpointHeight >= TOWER.CHECKPOINT_INTERVAL) {
        lastCheckpointHeight = currentHeight;
        const cpPos = this._addCheckpoint(currentHeight, prevPos, rng);
        prevPos = cpPos;
        currentHeight += 1.5;
        currentAngle = Math.atan2(cpPos.z, cpPos.x);
        continue;
      }

      // Keep platforms close to each other — limit horizontal jump distance
      const angleStep = (Math.PI / 5) + rng() * (Math.PI / 4);
      currentAngle += angleStep * (rng() > 0.4 ? 1 : -1);
      const radius = TOWER.MIN_RADIUS + rng() * (TOWER.MAX_RADIUS - TOWER.MIN_RADIUS);

      const x = Math.cos(currentAngle) * radius;
      const z = Math.sin(currentAngle) * radius;
      let pos = new THREE.Vector3(x, currentHeight, z);

      // Make sure platform is reachable from previous one
      // Max horizontal jump distance ~6 units, max vertical ~3 units
      let hDist = Math.sqrt((pos.x - prevPos.x) ** 2 + (pos.z - prevPos.z) ** 2);
      if (hDist > 6) {
        // Pull it closer toward the previous platform
        const dir = new THREE.Vector3(pos.x - prevPos.x, 0, pos.z - prevPos.z).normalize();
        pos.x = prevPos.x + dir.x * 5;
        pos.z = prevPos.z + dir.z * 5;
        hDist = 5;
      }

      const difficulty = currentHeight / totalHeight;
      const type = this._pickType(difficulty, rng);
      const platform = this._createPlatform(type, pos, TOWER.PLATFORM_WIDTH, TOWER.PLATFORM_DEPTH, currentAngle);
      platform.addToScene(this.scene);
      this.platforms.push(platform);
      this.path.push(new THREE.Vector3(pos.x, pos.y + 0.5, pos.z));
      prevPos = pos.clone();
    }

    // Victory platform
    const victoryPos = new THREE.Vector3(0, totalHeight + 2, 0);
    const victoryPlatform = new Platform(
      this.physics, victoryPos, 8, 8, COLORS.PLATFORM_VICTORY
    );
    victoryPlatform.addToScene(this.scene);
    this.platforms.push(victoryPlatform);
    this.victoryHeight = totalHeight + 2;
    this.path.push(new THREE.Vector3(0, totalHeight + 2.5, 0));

    // Golden beacon
    const beaconGeo = new THREE.CylinderGeometry(0.15, 0.4, 4, 8);
    const beaconMat = new THREE.MeshToonMaterial({
      color: COLORS.PLATFORM_VICTORY,
      emissive: COLORS.PLATFORM_VICTORY,
      emissiveIntensity: 0.5,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, totalHeight + 6, 0);
    this.scene.add(beacon);

    const beaconLight = new THREE.PointLight(COLORS.PLATFORM_VICTORY, 3, 40);
    beaconLight.position.set(0, totalHeight + 7, 0);
    this.scene.add(beaconLight);

    return this.platforms;
  }

  _addCheckpoint(height, prevPos, rng) {
    // Place checkpoint reachable from previous platform
    const angle = Math.atan2(prevPos.z, prevPos.x) + (rng() - 0.5) * 1.5;
    const radius = 1 + rng() * 2;
    const pos = new THREE.Vector3(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    );

    const platform = new Platform(this.physics, pos, 7, 6, COLORS.PLATFORM_CHECKPOINT);
    platform.addToScene(this.scene);
    this.platforms.push(platform);
    this.path.push(new THREE.Vector3(pos.x, height + 0.5, pos.z));

    // Mark as one-way: membership=0x0002, filter=0xFFFF
    // Rapier encoding: (membership << 16) | filter
    // Bodies whose filter excludes 0x0002 will pass straight through
    platform.collider.setCollisionGroups(0x0002FFFF);
    const topY = height + TOWER.PLATFORM_HEIGHT / 2;
    // A body can pass through until its center clears the top surface (~0.6 above it)
    this.oneWayPlatforms.push({ topY, passthroughY: topY + 0.6 });

    // Flag pole
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 6);
    const poleMat = new THREE.MeshToonMaterial({ color: 0xDDDDDD });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(pos.x, height + 1.5, pos.z);
    this.scene.add(pole);

    const flagGeo = new THREE.PlaneGeometry(0.8, 0.5);
    const flagMat = new THREE.MeshToonMaterial({
      color: COLORS.PLATFORM_CHECKPOINT,
      side: THREE.DoubleSide,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(pos.x + 0.4, height + 2.6, pos.z);
    this.scene.add(flag);

    const light = new THREE.PointLight(COLORS.PLATFORM_CHECKPOINT, 1, 15);
    light.position.set(pos.x, height + 1, pos.z);
    this.scene.add(light);

    this.checkpoints.push({
      height: height,
      position: { x: pos.x, y: height + 2, z: pos.z },
    });

    return pos;
  }

  getLastCheckpoint(playerHeight) {
    let best = this.checkpoints[0];
    for (const cp of this.checkpoints) {
      if (cp.height <= playerHeight) best = cp;
    }
    return best;
  }

  _createPlatform(type, pos, width, depth, angle) {
    switch (type) {
      case 'spinning':
        return new SpinningPlatform(this.physics, pos, width, depth);
      case 'moving':
        return new MovingPlatform(this.physics, pos, width, depth, angle);
      case 'disappearing': {
        const dp = new DisappearingPlatform(this.physics, pos, width, depth);
        this.disappearingPlatforms.push(dp);
        return dp;
      }
      default: {
        const color = COLORS.PLATFORM_STATIC[Math.floor(Math.random() * COLORS.PLATFORM_STATIC.length)];
        return new Platform(this.physics, pos, width, depth, color);
      }
    }
  }

  _pickType(difficulty, rng) {
    const roll = rng();
    if (difficulty < 0.3) return 'static';
    if (difficulty < 0.6) {
      if (roll < 0.65) return 'static';
      if (roll < 0.85) return 'moving';
      return 'spinning';
    }
    if (roll < 0.45) return 'static';
    if (roll < 0.7) return 'moving';
    if (roll < 0.9) return 'spinning';
    return 'disappearing';
  }

  update(dt) {
    for (const platform of this.platforms) {
      platform.update(dt);
    }
  }

  checkDisappearing(playerBody) {
    const pos = playerBody.translation();
    for (const dp of this.disappearingPlatforms) {
      if (dp.state !== 'solid') continue;
      const dx = Math.abs(pos.x - dp.basePosition.x);
      const dz = Math.abs(pos.z - dp.basePosition.z);
      const dy = pos.y - dp.basePosition.y;
      if (dx < dp.width / 2 + 0.3 && dz < dp.depth / 2 + 0.3 && dy > 0 && dy < 1.5) {
        dp.triggerDisappear();
      }
    }
  }
}
