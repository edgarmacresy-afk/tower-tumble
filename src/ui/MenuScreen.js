export class MenuScreen {
  constructor(onStart) {
    this.startScreen = document.getElementById('start-screen');
    this.gameOverScreen = document.getElementById('gameover-screen');
    this.victoryScreen = document.getElementById('victory-screen');
    this.onStart = onStart;

    document.getElementById('start-btn').addEventListener('click', () => {
      this.hideAll();
      this.onStart();
    });

    document.getElementById('retry-btn').addEventListener('click', () => {
      this.hideAll();
      this.onStart();
    });

    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.hideAll();
      this.onStart();
    });
  }

  showStart() {
    this.hideAll();
    this.startScreen.style.display = 'flex';
  }

  showGameOver(position) {
    this.hideAll();
    const suffix = position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th';
    document.getElementById('final-position').textContent = `${position}${suffix}`;
    this.gameOverScreen.style.display = 'flex';
  }

  showVictory(time) {
    this.hideAll();
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    document.getElementById('final-time').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    this.victoryScreen.style.display = 'flex';
  }

  hideAll() {
    this.startScreen.style.display = 'none';
    this.gameOverScreen.style.display = 'none';
    this.victoryScreen.style.display = 'none';
  }
}
