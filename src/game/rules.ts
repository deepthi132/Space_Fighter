export function circlesOverlap(
  firstX: number,
  firstY: number,
  firstRadius: number,
  secondX: number,
  secondY: number,
  secondRadius: number,
): boolean {
  const distanceSquared = (firstX - secondX) ** 2 + (firstY - secondY) ** 2;
  const radiusSum = firstRadius + secondRadius;
  return distanceSquared <= radiusSum ** 2;
}

export function wrapPosition(position: number, worldWidth: number, entityWidth: number): number {
  if (position < -entityWidth) return worldWidth;
  if (position > worldWidth) return -entityWidth;
  return position;
}

export function difficultyMultiplier(score: number): number {
  return Math.min(2.2, 1 + Math.max(0, score) / 60);
}
