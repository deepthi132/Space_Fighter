import { describe, expect, it } from 'vitest';
import { circlesOverlap, difficultyMultiplier, wrapPosition } from './rules';

describe('circlesOverlap', () => {
  it('detects circles whose edges touch', () => {
    expect(circlesOverlap(0, 0, 10, 20, 0, 10)).toBe(true);
  });

  it('rejects circles outside their combined radius', () => {
    expect(circlesOverlap(0, 0, 10, 21, 0, 10)).toBe(false);
  });
});

describe('wrapPosition', () => {
  it('wraps an entity after it fully leaves the left edge', () => {
    expect(wrapPosition(-41, 800, 40)).toBe(800);
  });

  it('wraps an entity after it leaves the right edge', () => {
    expect(wrapPosition(801, 800, 40)).toBe(-40);
  });

  it('keeps an on-screen position unchanged', () => {
    expect(wrapPosition(400, 800, 40)).toBe(400);
  });
});

describe('difficultyMultiplier', () => {
  it('starts at normal speed and caps progression', () => {
    expect(difficultyMultiplier(0)).toBe(1);
    expect(difficultyMultiplier(600)).toBe(2.2);
  });
});
