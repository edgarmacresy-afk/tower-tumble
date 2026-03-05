import { TOWER } from '../utils/constants.js';

export class HUD {
  constructor() {
    this.heightValue = document.getElementById('height-value');
    this.timerValue = document.getElementById('timer-value');
    this.heightBarFill = document.getElementById('height-bar-fill');
    this.positionEl = document.getElementById('race-position');
    this.startTime = 0;
  }

  start() {
    this.startTime = performance.now() / 1000;
    document.getElementById('hud').style.display = 'block';
  }

  hide() {
    document.getElementById('hud').style.display = 'none';
  }

  getElapsedTime() {
    return performance.now() / 1000 - this.startTime;
  }

  showMessage(text) {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = 'position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);' +
      'font-size:2rem;font-weight:bold;color:#fff;text-shadow:0 0 10px #a78bfa,0 2px 4px #000;' +
      'pointer-events:none;z-index:100;transition:opacity 0.8s;';
    document.body.appendChild(msg);
    setTimeout(() => { msg.style.opacity = '0'; }, 1500);
    setTimeout(() => msg.remove(), 2400);
  }

  update(playerY, position, totalRacers) {
    // Height
    const height = Math.max(0, Math.floor(playerY));
    const progress = Math.min(100, (playerY / TOWER.TOTAL_HEIGHT) * 100);
    this.heightValue.textContent = `${height}m`;
    this.heightBarFill.style.height = `${progress}%`;

    // Timer
    const elapsed = this.getElapsedTime();
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    this.timerValue.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

    // Race position
    const suffix = position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th';
    this.positionEl.textContent = `${position}${suffix} / ${totalRacers}`;
  }
}
