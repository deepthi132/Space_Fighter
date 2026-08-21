export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const MAX_LIVES = 3;

export type WeaponId = 'laser' | 'pulse' | 'cannon';

export interface WeaponConfig {
  label: string;
  fireInterval: number;
  speed: number;
  offsets: number[];
  color: string;
  width: number;
  height: number;
  hitScore: number;
}

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  laser: {
    label: 'Laser',
    fireInterval: 0.34,
    speed: 520,
    offsets: [0],
    color: '#f8f45a',
    width: 6,
    height: 20,
    hitScore: 3,
  },
  pulse: {
    label: 'Pulse',
    fireInterval: 0.16,
    speed: 640,
    offsets: [-10, 10],
    color: '#5de8ff',
    width: 5,
    height: 12,
    hitScore: 2,
  },
  cannon: {
    label: 'Cannon',
    fireInterval: 0.72,
    speed: 390,
    offsets: [-24, 0, 24],
    color: '#ff79d1',
    width: 10,
    height: 14,
    hitScore: 1,
  },
};

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];

export type ShipId = 'scout' | 'viper' | 'titan';

export interface ShipConfig {
  label: string;
  width: number;
  height: number;
  speed: number;
  primary: string;
  secondary: string;
}

export const SHIPS: Record<ShipId, ShipConfig> = {
  scout: {
    label: 'Scout',
    width: 54,
    height: 58,
    speed: 360,
    primary: '#f2f6ff',
    secondary: '#79b8ff',
  },
  viper: {
    label: 'Viper',
    width: 64,
    height: 60,
    speed: 430,
    primary: '#78efff',
    secondary: '#2479bd',
  },
  titan: {
    label: 'Titan',
    width: 82,
    height: 62,
    speed: 285,
    primary: '#ffb06e',
    secondary: '#a84824',
  },
};

export const SHIP_IDS = Object.keys(SHIPS) as ShipId[];

export function isWeaponId(value: string | undefined): value is WeaponId {
  return value !== undefined && WEAPON_IDS.includes(value as WeaponId);
}

export function isShipId(value: string | undefined): value is ShipId {
  return value !== undefined && SHIP_IDS.includes(value as ShipId);
}
