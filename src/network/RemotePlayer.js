import * as THREE from 'three';
import { BeanCharacter } from '../player/BeanCharacter.js';

export class RemotePlayer {
  constructor(id, name, color, scene) {
    this.id = id;
    this.name = name;
    this.color = color;

    this.character = new BeanCharacter(color);
    scene.add(this.character.group);

    // Interpolation targets
    this.targetPos = new THREE.Vector3(0, 2, 5);
    this.targetVel = new THREE.Vector3();
    this.targetRotY = 0;
    this.grounded = true;
    this.isDiving = false;
    this.finished = false;

    // Nameplate
    this._createNameplate(name, scene);
  }

  _createNameplate(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Dark pill background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    const r = 16;
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 48, r);
    ctx.fill();

    // White bold text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.slice(0, 12), 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    this.nameSprite = new THREE.Sprite(spriteMat);
    this.nameSprite.scale.set(2.5, 0.625, 1);
    this.character.group.add(this.nameSprite);
  }

  update(dt) {
    const lerpFactor = Math.min(1, 15 * dt);

    // Interpolate position
    this.character.group.position.lerp(this.targetPos, lerpFactor);

    // Interpolate rotation
    let diff = this.targetRotY - this.character.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.character.group.rotation.y += diff * lerpFactor;

    // Dive visual
    if (this.isDiving) {
      this.character.body.rotation.x = -0.8;
    } else {
      this.character.body.rotation.x *= 0.85; // smooth recovery
    }

    // Drive character animation with received velocity
    this.character.velocity.copy(this.targetVel);
    this.character.update(dt, this.grounded);

    // Nameplate above head
    if (this.nameSprite) {
      this.nameSprite.position.set(0, 1.2, 0);
    }
  }

  applyState(state) {
    this.targetPos.set(state.position.x, state.position.y, state.position.z);
    this.targetVel.set(state.velocity.x, state.velocity.y, state.velocity.z);
    this.targetRotY = state.rotationY;
    this.grounded = state.grounded;
    this.isDiving = state.isDiving;
    this.finished = !!state.finished;
  }

  destroy(scene) {
    scene.remove(this.character.group);
  }
}
