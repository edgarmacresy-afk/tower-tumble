import { RemotePlayer } from './RemotePlayer.js';

export class RemotePlayerManager {
  constructor(scene, localPlayerId) {
    this.scene = scene;
    this.localPlayerId = localPlayerId;
    this.players = new Map(); // id → RemotePlayer
  }

  addPlayer(id, name, color) {
    if (id === this.localPlayerId) return;
    if (this.players.has(id)) return;
    const rp = new RemotePlayer(id, name, color, this.scene);
    this.players.set(id, rp);
  }

  removePlayer(id) {
    const rp = this.players.get(id);
    if (rp) {
      rp.destroy(this.scene);
      this.players.delete(id);
    }
  }

  applyStateUpdate(playersData) {
    for (const state of playersData) {
      if (state.id === this.localPlayerId) continue;
      const rp = this.players.get(state.id);
      if (rp) rp.applyState(state);
    }
  }

  update(dt) {
    for (const rp of this.players.values()) {
      rp.update(dt);
    }
  }

  clear() {
    for (const rp of this.players.values()) {
      rp.destroy(this.scene);
    }
    this.players.clear();
  }
}
