import * as THREE from 'three';

const textureCache = new Map();
function loadTexture(url) {
  if (!textureCache.has(url)) {
    const loader = new THREE.TextureLoader();
    const p = new Promise((resolve, reject) => {
      loader.load(
        url,
        (tex) => { tex.colorSpace = THREE.SRGBColorSpace; resolve(tex); },
        undefined,
        reject
      );
    });
    textureCache.set(url, p);
  }
  return textureCache.get(url);
}

export class FriendBillboard {
  constructor(textureUrl = '/friends/subject.png') {
    this.group = new THREE.Group();
    this.elapsed = 0;
    this.velocity = new THREE.Vector3();
    this.squashTimer = 0;
    this.wasGrounded = true;
    // StumbleController writes character.body.rotation.x for the dive tilt.
    // Bean has a body mesh — Billy doesn't, so we stub it. The pitch is read
    // in onBeforeRender below to tilt the cutout forward when diving.
    this.body = { rotation: { x: 0, y: 0, z: 0 } };

    const mat = new THREE.MeshBasicMaterial({
      transparent: false,
      alphaTest: 0.5,
      side: THREE.FrontSide,
      color: 0xffffff,
      depthWrite: true,
    });
    const geo = new THREE.PlaneGeometry(2.0, 2.4);
    this.plane = new THREE.Mesh(geo, mat);
    this.plane.position.y = 0.6;
    this.group.add(this.plane);

    // Yaw-billboard via onBeforeRender: always face camera around Y,
    // cancelling out the physics-driven group rotation.
    const _groupQuat = new THREE.Quaternion();
    const _desired = new THREE.Quaternion();
    const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.plane.onBeforeRender = (_renderer, _scene, camera) => {
      const dx = camera.position.x - this.group.position.x;
      const dz = camera.position.z - this.group.position.z;
      _euler.y = Math.atan2(dx, dz);
      _euler.x = this.body.rotation.x; // dive tilt (set by StumbleController)
      _desired.setFromEuler(_euler);
      this.group.getWorldQuaternion(_groupQuat).invert();
      this.plane.quaternion.copy(_groupQuat.multiply(_desired));
    };

    loadTexture(textureUrl)
      .then((tex) => {
        const img = tex.image;
        const aspect = img && img.width && img.height ? img.width / img.height : 1;
        const height = 2.4;
        const width = height * aspect;
        this.plane.geometry.dispose();
        this.plane.geometry = new THREE.PlaneGeometry(width, height);
        this.plane.position.y = 0.6;
        mat.map = tex;
        mat.needsUpdate = true;
      })
      .catch((err) => {
        console.warn('[FriendBillboard] texture failed to load:', err);
        mat.color.set(0xff00ff);
      });
  }

  update(dt, grounded) {
    this.elapsed += dt;

    if (grounded && !this.wasGrounded) this.squashTimer = 0.2;
    this.wasGrounded = grounded;

    if (this.squashTimer > 0) {
      const t = this.squashTimer / 0.2;
      this.group.scale.y = 1 - 0.25 * t;
      this.group.scale.x = 1 + 0.15 * t;
      this.group.scale.z = 1 + 0.15 * t;
      this.squashTimer -= dt;
    } else {
      this.group.scale.y = 1 + Math.sin(this.elapsed * 2) * 0.02;
      this.group.scale.x = 1;
      this.group.scale.z = 1;
    }
  }
}
