import './style.css';
import { SpaceFighterGame } from './game/SpaceFighterGame';

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }
  return element as T;
}

new SpaceFighterGame({
  canvas: requireElement<HTMLCanvasElement>('gameCanvas'),
  startButton: requireElement<HTMLButtonElement>('start-btn'),
  pauseButton: requireElement<HTMLButtonElement>('pause-btn'),
  overlay: requireElement<HTMLDivElement>('game-overlay'),
  overlayTitle: requireElement<HTMLHeadingElement>('overlay-title'),
  overlayMessage: requireElement<HTMLParagraphElement>('overlay-message'),
  scoreElement: requireElement<HTMLElement>('score-value'),
  livesElement: requireElement<HTMLElement>('lives-value'),
  highScoreElement: requireElement<HTMLElement>('high-score-value'),
  stateElement: requireElement<HTMLElement>('state-value'),
  announcementElement: requireElement<HTMLElement>('game-announcement'),
  weaponButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-weapon]')),
  shipButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-ship]')),
});
