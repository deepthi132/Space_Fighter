import {
  GAME_HEIGHT,
  GAME_WIDTH,
  MAX_LIVES,
  WEAPONS,
  isShipId,
  isWeaponId,
  type ShipId,
  type WeaponId,
} from './config';
import { Enemy, Explosion, Player, Projectile, ScorePopup } from './entities';
import { circlesOverlap, difficultyMultiplier } from './rules';

type GameStatus = 'ready' | 'running' | 'paused' | 'game-over';

interface SpaceFighterElements {
  canvas: HTMLCanvasElement;
  startButton: HTMLButtonElement;
  pauseButton: HTMLButtonElement;
  overlay: HTMLDivElement;
  overlayTitle: HTMLHeadingElement;
  overlayMessage: HTMLParagraphElement;
  scoreElement: HTMLElement;
  livesElement: HTMLElement;
  highScoreElement: HTMLElement;
  stateElement: HTMLElement;
  announcementElement: HTMLElement;
  weaponButtons: HTMLButtonElement[];
  shipButtons: HTMLButtonElement[];
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

const HIGH_SCORE_KEY = 'space-fighter-high-score';

export class SpaceFighterGame {
  private readonly elements: SpaceFighterElements;
  private readonly context: CanvasRenderingContext2D;
  private readonly player = new Player();
  private enemies = Array.from({ length: 5 }, (_, index) => new Enemy(index));
  private projectiles: Projectile[] = [];
  private explosions: Explosion[] = [];
  private scorePopups: ScorePopup[] = [];
  private readonly stars: Star[];
  private status: GameStatus = 'ready';
  private score = 0;
  private lives = MAX_LIVES;
  private highScore = this.readHighScore();
  private selectedWeapon: WeaponId = 'laser';
  private selectedShip: ShipId = 'scout';
  private leftPressed = false;
  private rightPressed = false;
  private firePressed = false;
  private activePointerId: number | null = null;
  private fireCooldown = 0;
  private lastTimestamp = performance.now();

  constructor(elements: SpaceFighterElements) {
    this.elements = elements;
    const context = elements.canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not supported in this browser.');
    this.context = context;
    this.stars = Array.from({ length: 85 }, () => this.createStar(true));

    this.bindEvents();
    this.updateControlSelection();
    this.updateInterface();
    this.render();
    requestAnimationFrame(this.loop);
  }

  private bindEvents(): void {
    this.elements.startButton.addEventListener('click', () => this.handlePrimaryAction());
    this.elements.pauseButton.addEventListener('click', () => this.togglePause());

    this.elements.weaponButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (isWeaponId(button.dataset.weapon)) this.selectWeapon(button.dataset.weapon);
      });
    });

    this.elements.shipButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (isShipId(button.dataset.ship)) this.selectShip(button.dataset.ship);
      });
    });

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.status === 'running') this.pause();
    });

    this.elements.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.elements.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.elements.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.elements.canvas.addEventListener('pointercancel', this.handlePointerUp);
  }

  private readonly loop = (timestamp: number): void => {
    const deltaSeconds = Math.min(0.05, Math.max(0, (timestamp - this.lastTimestamp) / 1000));
    this.lastTimestamp = timestamp;

    if (this.status === 'running') this.update(deltaSeconds);
    this.render();
    requestAnimationFrame(this.loop);
  };

  private start(): void {
    this.score = 0;
    this.lives = MAX_LIVES;
    this.fireCooldown = 0;
    this.projectiles = [];
    this.explosions = [];
    this.scorePopups = [];
    this.enemies = Array.from({ length: 5 }, (_, index) => new Enemy(index));
    this.player.setShip(this.selectedShip);
    this.player.reset();
    this.clearInput();
    this.status = 'running';
    this.lastTimestamp = performance.now();
    this.elements.overlay.hidden = true;
    this.elements.canvas.focus();
    this.announce('Game started. Three enemy escapes will end the run.');
    this.updateInterface();
  }

  private handlePrimaryAction(): void {
    if (this.status === 'paused') this.resume();
    else this.start();
  }

  private togglePause(): void {
    if (this.status === 'running') this.pause();
    else if (this.status === 'paused') this.resume();
  }

  private pause(): void {
    if (this.status !== 'running') return;
    this.status = 'paused';
    this.clearInput();
    this.showOverlay(
      'Flight paused',
      'Resume when you are ready to return to the sector.',
      'Resume',
    );
    this.announce('Game paused.');
    this.updateInterface();
  }

  private resume(): void {
    if (this.status !== 'paused') return;
    this.status = 'running';
    this.lastTimestamp = performance.now();
    this.elements.overlay.hidden = true;
    this.elements.canvas.focus();
    this.announce('Game resumed.');
    this.updateInterface();
  }

  private endGame(): void {
    this.status = 'game-over';
    this.clearInput();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
    this.showOverlay(
      'Mission complete',
      `Final score: ${this.score}. Launch again and defend the sector.`,
      'Play again',
    );
    this.announce(`Game over. Final score ${this.score}.`);
    this.updateInterface();
  }

  private update(deltaSeconds: number): void {
    this.updateStars(deltaSeconds);
    this.player.direction = Number(this.rightPressed) - Number(this.leftPressed);
    this.player.update(deltaSeconds);

    this.fireCooldown -= deltaSeconds;
    if (this.firePressed && this.fireCooldown <= 0) this.fire();

    this.projectiles.forEach((projectile) => projectile.update(deltaSeconds));
    this.projectiles = this.projectiles.filter((projectile) => projectile.active);

    const difficulty = difficultyMultiplier(this.score);
    for (let enemyIndex = 0; enemyIndex < this.enemies.length; enemyIndex += 1) {
      const enemy = this.enemies[enemyIndex];
      if (!enemy) continue;

      if (enemy.update(deltaSeconds, difficulty)) {
        this.lives -= 1;
        this.scorePopups.push(new ScorePopup(enemy.x, GAME_HEIGHT - 36, 'Life -1', '#ff7b96'));
        enemy.respawn(enemyIndex);
        if (this.lives <= 0) {
          this.endGame();
          break;
        }
      }

      for (const projectile of this.projectiles) {
        if (
          projectile.active &&
          circlesOverlap(
            enemy.x,
            enemy.y,
            enemy.radius,
            projectile.x,
            projectile.y,
            projectile.radius,
          )
        ) {
          projectile.active = false;
          const points = WEAPONS[this.selectedWeapon].hitScore;
          this.score += points;
          this.explosions.push(new Explosion(enemy.x, enemy.y));
          this.scorePopups.push(new ScorePopup(enemy.x, enemy.y, `+${points}`, '#6fffc3'));
          enemy.respawn(enemyIndex);
          break;
        }
      }
    }

    this.explosions.forEach((explosion) => explosion.update(deltaSeconds));
    this.explosions = this.explosions.filter((explosion) => explosion.active);
    this.scorePopups.forEach((popup) => popup.update(deltaSeconds));
    this.scorePopups = this.scorePopups.filter((popup) => popup.active);
    this.updateInterface();
  }

  private fire(): void {
    const weapon = WEAPONS[this.selectedWeapon];
    this.fireCooldown = weapon.fireInterval;
    weapon.offsets.forEach((offset) => {
      this.projectiles.push(new Projectile(this.player.centerX + offset, this.player.y, weapon));
    });
  }

  private render(): void {
    const gradient = this.context.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#071230');
    gradient.addColorStop(0.55, '#090d3f');
    gradient.addColorStop(1, '#17052d');
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.drawStars();
    this.drawGrid();
    this.enemies.forEach((enemy) => enemy.draw(this.context));
    this.projectiles.forEach((projectile) => projectile.draw(this.context));
    this.player.draw(this.context);
    this.explosions.forEach((explosion) => explosion.draw(this.context));
    this.scorePopups.forEach((popup) => popup.draw(this.context));
  }

  private drawGrid(): void {
    this.context.save();
    this.context.strokeStyle = 'rgba(102, 132, 255, 0.08)';
    this.context.lineWidth = 1;
    for (let x = 0; x <= GAME_WIDTH; x += 80) {
      this.context.beginPath();
      this.context.moveTo(x, 0);
      this.context.lineTo(x, GAME_HEIGHT);
      this.context.stroke();
    }
    for (let y = 0; y <= GAME_HEIGHT; y += 75) {
      this.context.beginPath();
      this.context.moveTo(0, y);
      this.context.lineTo(GAME_WIDTH, y);
      this.context.stroke();
    }
    this.context.restore();
  }

  private createStar(randomY: boolean): Star {
    return {
      x: Math.random() * GAME_WIDTH,
      y: randomY ? Math.random() * GAME_HEIGHT : -8,
      size: 0.8 + Math.random() * 1.8,
      speed: 12 + Math.random() * 28,
      alpha: 0.35 + Math.random() * 0.6,
    };
  }

  private updateStars(deltaSeconds: number): void {
    this.stars.forEach((star) => {
      star.y += star.speed * deltaSeconds;
      if (star.y > GAME_HEIGHT + 4) Object.assign(star, this.createStar(false));
    });
  }

  private drawStars(): void {
    this.stars.forEach((star) => {
      this.context.fillStyle = `rgba(220, 235, 255, ${star.alpha})`;
      this.context.fillRect(star.x, star.y, star.size, star.size);
    });
  }

  private selectWeapon(weaponId: WeaponId): void {
    this.selectedWeapon = weaponId;
    this.fireCooldown = 0;
    this.updateControlSelection();
  }

  private selectShip(shipId: ShipId): void {
    this.selectedShip = shipId;
    this.player.setShip(shipId);
    this.updateControlSelection();
  }

  private updateControlSelection(): void {
    this.elements.weaponButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.weapon === this.selectedWeapon));
    });
    this.elements.shipButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.ship === this.selectedShip));
    });
  }

  private updateInterface(): void {
    this.elements.scoreElement.textContent = String(this.score);
    this.elements.livesElement.textContent = String(Math.max(0, this.lives));
    this.elements.highScoreElement.textContent = String(this.highScore);
    this.elements.stateElement.textContent =
      this.status === 'game-over' ? 'Game over' : this.capitalize(this.status);
    this.elements.pauseButton.disabled = this.status === 'ready' || this.status === 'game-over';
    this.elements.pauseButton.textContent = this.status === 'paused' ? 'Resume' : 'Pause';
    this.elements.pauseButton.setAttribute('aria-pressed', String(this.status === 'paused'));
  }

  private showOverlay(title: string, message: string, action: string): void {
    this.elements.overlayTitle.textContent = title;
    this.elements.overlayMessage.textContent = message;
    this.elements.startButton.textContent = action;
    this.elements.overlay.hidden = false;
    this.elements.startButton.focus();
  }

  private announce(message: string): void {
    this.elements.announcementElement.textContent = message;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (this.isInteractiveTarget(event.target)) return;

    if (event.code === 'Enter' && !event.repeat && this.status !== 'running') {
      event.preventDefault();
      this.handlePrimaryAction();
      return;
    }

    if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) {
      event.preventDefault();
      this.togglePause();
      return;
    }

    if (this.status !== 'running') return;

    if (event.code === 'ArrowLeft') {
      event.preventDefault();
      this.leftPressed = true;
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      this.rightPressed = true;
    } else if (event.code === 'Space') {
      event.preventDefault();
      this.firePressed = true;
    } else if (event.code === 'Digit1') {
      this.selectWeapon('laser');
    } else if (event.code === 'Digit2') {
      this.selectWeapon('pulse');
    } else if (event.code === 'Digit3') {
      this.selectWeapon('cannon');
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    if (event.code === 'ArrowLeft') this.leftPressed = false;
    else if (event.code === 'ArrowRight') this.rightPressed = false;
    else if (event.code === 'Space') this.firePressed = false;
  };

  private handleWindowBlur = (): void => {
    this.clearInput();
    if (this.status === 'running') this.pause();
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (this.status !== 'running') return;
    event.preventDefault();
    this.activePointerId = event.pointerId;
    this.elements.canvas.setPointerCapture(event.pointerId);
    this.movePlayerToPointer(event);
    this.firePressed = true;
    this.fireCooldown = 0;
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId || this.status !== 'running') return;
    event.preventDefault();
    this.movePlayerToPointer(event);
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.firePressed = false;
  };

  private movePlayerToPointer(event: PointerEvent): void {
    const bounds = this.elements.canvas.getBoundingClientRect();
    const canvasX = (event.clientX - bounds.left) * (GAME_WIDTH / bounds.width);
    this.player.moveTo(canvasX);
  }

  private clearInput(): void {
    this.leftPressed = false;
    this.rightPressed = false;
    this.firePressed = false;
    this.activePointerId = null;
    this.player.direction = 0;
  }

  private isInteractiveTarget(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLElement &&
      Boolean(target.closest('button, input, textarea, select, [contenteditable]'))
    );
  }

  private readHighScore(): number {
    try {
      const value = Number.parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? '0', 10);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(this.highScore));
    } catch {
      // The game remains playable when storage is unavailable.
    }
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
