import { GAME_HEIGHT, GAME_WIDTH, SHIPS, type ShipId, type WeaponConfig } from './config';
import { wrapPosition } from './rules';

export class Player {
  x = GAME_WIDTH / 2;
  y = GAME_HEIGHT - 78;
  direction = 0;
  shipId: ShipId = 'scout';

  get config() {
    return SHIPS[this.shipId];
  }

  get centerX(): number {
    return this.x + this.config.width / 2;
  }

  reset(): void {
    this.x = GAME_WIDTH / 2 - this.config.width / 2;
    this.y = GAME_HEIGHT - 78;
    this.direction = 0;
  }

  setShip(shipId: ShipId): void {
    const previousCenter = this.centerX;
    this.shipId = shipId;
    this.x = Math.min(
      GAME_WIDTH - this.config.width,
      Math.max(0, previousCenter - this.config.width / 2),
    );
  }

  moveTo(canvasX: number): void {
    this.x = Math.min(GAME_WIDTH - this.config.width, Math.max(0, canvasX - this.config.width / 2));
  }

  update(deltaSeconds: number): void {
    this.x += this.direction * this.config.speed * deltaSeconds;
    this.x = wrapPosition(this.x, GAME_WIDTH, this.config.width);
  }

  draw(context: CanvasRenderingContext2D): void {
    const { width, height, primary, secondary } = this.config;
    const center = this.x + width / 2;

    context.save();
    context.shadowColor = primary;
    context.shadowBlur = 14;

    context.fillStyle = secondary;
    context.beginPath();
    context.moveTo(this.x, this.y + height * 0.75);
    context.lineTo(center, this.y + height * 0.38);
    context.lineTo(this.x + width, this.y + height * 0.75);
    context.lineTo(this.x + width * 0.72, this.y + height);
    context.lineTo(this.x + width * 0.28, this.y + height);
    context.closePath();
    context.fill();

    context.fillStyle = primary;
    context.beginPath();
    context.moveTo(center, this.y);
    context.lineTo(this.x + width * 0.68, this.y + height * 0.82);
    context.lineTo(this.x + width * 0.32, this.y + height * 0.82);
    context.closePath();
    context.fill();

    context.fillStyle = '#12305d';
    context.beginPath();
    context.ellipse(center, this.y + height * 0.36, width * 0.1, height * 0.16, 0, 0, Math.PI * 2);
    context.fill();

    context.shadowColor = '#ff9f43';
    context.fillStyle = '#ffd166';
    context.fillRect(center - 5, this.y + height * 0.82, 10, 12);
    context.restore();
  }
}

export class Enemy {
  x = 0;
  y = 0;
  readonly radius = 24;
  private baseSpeed = 85;

  constructor(slot: number) {
    this.respawn(slot);
  }

  respawn(slot = 0): void {
    this.x = this.radius + Math.random() * (GAME_WIDTH - this.radius * 2);
    this.y = -60 - slot * 125 - Math.random() * 120;
    this.baseSpeed = 82 + Math.random() * 34;
  }

  update(deltaSeconds: number, difficulty: number): boolean {
    this.y += this.baseSpeed * difficulty * deltaSeconds;
    return this.y - this.radius > GAME_HEIGHT;
  }

  draw(context: CanvasRenderingContext2D): void {
    context.save();
    context.translate(this.x, this.y);
    context.shadowColor = '#ff5d9e';
    context.shadowBlur = 12;

    context.fillStyle = '#9a4dff';
    context.beginPath();
    context.ellipse(0, 2, 23, 17, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#d8c0ff';
    context.beginPath();
    context.ellipse(0, -9, 13, 10, 0, Math.PI, Math.PI * 2);
    context.fill();

    context.fillStyle = '#12052b';
    context.beginPath();
    context.arc(-6, -7, 2.5, 0, Math.PI * 2);
    context.arc(6, -7, 2.5, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = '#f6c8ff';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-20, 8);
    context.lineTo(-30, 16);
    context.moveTo(20, 8);
    context.lineTo(30, 16);
    context.stroke();
    context.restore();
  }
}

export class Projectile {
  active = true;
  x: number;
  y: number;
  private readonly config: WeaponConfig;

  constructor(x: number, y: number, config: WeaponConfig) {
    this.x = x;
    this.y = y;
    this.config = config;
  }

  get radius(): number {
    return Math.max(this.config.width, this.config.height) / 2;
  }

  update(deltaSeconds: number): void {
    this.y -= this.config.speed * deltaSeconds;
    if (this.y + this.config.height < 0) this.active = false;
  }

  draw(context: CanvasRenderingContext2D): void {
    context.save();
    context.fillStyle = this.config.color;
    context.shadowColor = this.config.color;
    context.shadowBlur = 10;
    context.fillRect(
      this.x - this.config.width / 2,
      this.y - this.config.height / 2,
      this.config.width,
      this.config.height,
    );
    context.restore();
  }
}

export class Explosion {
  private elapsed = 0;
  readonly duration = 0.4;
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  get active(): boolean {
    return this.elapsed < this.duration;
  }

  update(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
  }

  draw(context: CanvasRenderingContext2D): void {
    const progress = Math.min(1, this.elapsed / this.duration);
    const radius = 8 + progress * 38;

    context.save();
    context.globalAlpha = 1 - progress;
    context.strokeStyle = '#ffcf5a';
    context.lineWidth = 7 - progress * 4;
    context.shadowColor = '#ff6b35';
    context.shadowBlur = 20;
    context.beginPath();
    context.arc(this.x, this.y, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

export class ScorePopup {
  private elapsed = 0;
  readonly duration = 0.75;
  readonly x: number;
  y: number;
  readonly text: string;
  readonly color: string;

  constructor(x: number, y: number, text: string, color: string) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
  }

  get active(): boolean {
    return this.elapsed < this.duration;
  }

  update(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    this.y -= 42 * deltaSeconds;
  }

  draw(context: CanvasRenderingContext2D): void {
    context.save();
    context.globalAlpha = 1 - this.elapsed / this.duration;
    context.fillStyle = this.color;
    context.font = '700 24px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(this.text, this.x, this.y);
    context.restore();
  }
}
