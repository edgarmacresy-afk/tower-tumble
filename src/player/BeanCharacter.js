import * as THREE from 'three';
import { COLORS } from '../utils/constants.js';

export class BeanCharacter {
  constructor(color) {
    this.group = new THREE.Group();
    this.elapsed = 0;
    this.velocity = new THREE.Vector3();
    this.squashTimer = 0;
    this.wasGrounded = true;

    const bodyColor = color || COLORS.PLAYER_PALETTE[Math.floor(Math.random() * COLORS.PLAYER_PALETTE.length)];
    const mat = new THREE.MeshToonMaterial({ color: bodyColor });
    const darkMat = new THREE.MeshToonMaterial({ color: new THREE.Color(bodyColor).multiplyScalar(0.7) });

    // Body (bean/capsule)
    const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.7, 8, 16);
    this.body = new THREE.Mesh(bodyGeo, mat);
    this.body.scale.set(0.9, 1.0, 0.85);
    this.group.add(this.body);

    // Eyes (googly)
    const eyeWhiteGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const eyeWhiteMat = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
    const pupilGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const pupilMat = new THREE.MeshToonMaterial({ color: 0x111111 });

    this.leftEye = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    this.leftEye.position.set(-0.12, 0.2, 0.3);
    this.group.add(this.leftEye);

    this.rightEye = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    this.rightEye.position.set(0.12, 0.2, 0.3);
    this.group.add(this.rightEye);

    this.leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    this.leftPupil.position.set(0, 0, 0.07);
    this.leftEye.add(this.leftPupil);

    this.rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    this.rightPupil.position.set(0, 0, 0.07);
    this.rightEye.add(this.rightPupil);

    this.pupilTarget = new THREE.Vector3();
    this.leftPupilOffset = new THREE.Vector3();
    this.rightPupilOffset = new THREE.Vector3();

    // Arms (stubby)
    const armGeo = new THREE.CapsuleGeometry(0.06, 0.15, 4, 8);
    this.leftArm = new THREE.Mesh(armGeo, darkMat);
    this.leftArm.position.set(-0.38, 0.0, 0);
    this.leftArm.rotation.z = 0.35;
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, darkMat);
    this.rightArm.position.set(0.38, 0.0, 0);
    this.rightArm.rotation.z = -0.35;
    this.group.add(this.rightArm);

    // Legs (slightly thicker)
    const legGeo = new THREE.CapsuleGeometry(0.07, 0.12, 4, 8);
    this.leftLeg = new THREE.Mesh(legGeo, darkMat);
    this.leftLeg.position.set(-0.12, -0.48, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, darkMat);
    this.rightLeg.position.set(0.12, -0.48, 0);
    this.group.add(this.rightLeg);
  }

  update(dt, grounded) {
    this.elapsed += dt;
    const speed = this.velocity.length();
    const moveRatio = Math.min(speed / 5, 1);
    const wobbleFreq = 12;

    // Body wobble when moving
    this.body.rotation.z = Math.sin(this.elapsed * wobbleFreq) * 0.08 * moveRatio;
    this.body.rotation.x = Math.sin(this.elapsed * wobbleFreq * 0.7) * 0.04 * moveRatio;

    // Leg walk cycle
    this.leftLeg.rotation.x = Math.sin(this.elapsed * wobbleFreq) * 0.4 * moveRatio;
    this.rightLeg.rotation.x = Math.sin(this.elapsed * wobbleFreq + Math.PI) * 0.4 * moveRatio;

    // Arm swing (opposite to legs)
    this.leftArm.rotation.x = Math.sin(this.elapsed * wobbleFreq + Math.PI) * 0.3 * moveRatio;
    this.rightArm.rotation.x = Math.sin(this.elapsed * wobbleFreq) * 0.3 * moveRatio;

    // Googly eye pupils - lag behind movement
    this.pupilTarget.set(
      -this.velocity.x * 0.01,
      -this.velocity.y * 0.005 - 0.02,
      0
    );
    this.leftPupilOffset.lerp(this.pupilTarget, 0.1);
    this.rightPupilOffset.lerp(this.pupilTarget, 0.08);
    this.leftPupil.position.set(this.leftPupilOffset.x, this.leftPupilOffset.y, 0.07);
    this.rightPupil.position.set(this.rightPupilOffset.x, this.rightPupilOffset.y, 0.07);

    // Squash & stretch on landing
    if (grounded && !this.wasGrounded) {
      this.squashTimer = 0.2;
    }
    this.wasGrounded = grounded;

    if (this.squashTimer > 0) {
      const t = this.squashTimer / 0.2;
      this.group.scale.y = 1 - 0.25 * t;
      this.group.scale.x = 1 + 0.15 * t;
      this.group.scale.z = 1 + 0.15 * t;
      this.squashTimer -= dt;
    } else {
      // Idle breathing
      this.group.scale.y = 1 + Math.sin(this.elapsed * 2) * 0.02;
      this.group.scale.x = 1;
      this.group.scale.z = 1;
    }
  }
}
