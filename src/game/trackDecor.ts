import type { TrackId } from './types';

export type BallastVariant = 'mainline' | 'station_oiled' | 'siding_weathered' | 'iron_dust';

export interface BallastSegmentSpec {
  id: 'west' | 'station' | 'east';
  minX: number;
  maxX: number;
  centerX: number;
  lengthX: number;
  variant: BallastVariant;
  repeatX: number;
}

export interface SleeperWearProfile {
  zJitter: number;
  yawJitter: number;
  scaleY: number;
  sleeperHex: number;
  clipHex: number;
  inSpecialZone: boolean;
}

export interface WeedPlacement {
  x: number;
  z: number;
  yaw: number;
  tiltX: number;
  tiltZ: number;
  scale: number;
  tall: boolean;
  colorHex: number;
}

export interface CobblePlacement {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  sx: number;
  sy: number;
  sz: number;
  colorHex: number;
}

export interface DiscardedSleeperSpec {
  x: number;
  z: number;
  yaw: number;
  count: 2 | 3;
}

export const TRACK_Z_MAP: Record<TrackId, number> = {
  1: -3.0,
  2: 3.0,
  3: 13.3,
  4: 19.3,
  5: 29.8,
  6: 35.8,
  7: 48.8,
  8: 54.8,
};

interface PlatformEnvelope {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Physical station platform footprints (including end ramps) that trackside props/tall weeds must clear
const PLATFORM_ENVELOPES: PlatformEnvelope[] = [
  { minX: -34.2, maxX: 34.2, minZ: -12.6, maxZ: -4.62 }, // Platform 1
  { minX: -32.2, maxX: 32.2, minZ: 4.62, maxZ: 11.65 },  // Platform 2
  { minX: -32.2, maxX: 32.2, minZ: 20.92, maxZ: 28.1 },  // Platform 3
  { minX: -34.2, maxX: 34.2, minZ: 37.42, maxZ: 46.1 },  // Platform 4
  { minX: -34.2, maxX: 34.2, minZ: 56.42, maxZ: 64.6 },  // Platform 5
];

// Paired track cable troughs run along medians z = 0.0, 16.3, 32.8, 51.8
const MEDIAN_DUCT_Z = [0.0, 16.3, 32.8, 51.8] as const;

export function deterministicNoise(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return s - Math.floor(s);
}

export function isSpecialTrackworkX(trackId: TrackId, x: number): boolean {
  // Pedestrian plank crossings across station tracks
  if (x >= 15.0 && x <= 22.0) return true;
  // East paved road level crossing
  if (x >= 37.4 && x <= 46.8) return true;
  // West and East crossover turnouts between Track 1 and Track 2
  if (trackId <= 2 && ((x >= -41.5 && x <= -30.5) || (x >= 27.5 && x <= 38.5))) {
    return true;
  }
  return false;
}

export function isTrackDecorZoneClear(
  trackId: TrackId,
  x: number,
  z: number,
  minRailOffset = 1.55,
): boolean {
  const tz = TRACK_Z_MAP[trackId];
  // Never encroach inside active train dynamic clearance or sleeper core
  if (Math.abs(z - tz) < minRailOffset) return false;

  // Never encroach adjacent tracks either
  for (let t = 1 as TrackId; t <= 8; t = (t + 1) as TrackId) {
    if (Math.abs(z - TRACK_Z_MAP[t]) < minRailOffset) return false;
  }

  // Keep east road crossing, pedestrian plank crossings, and Track 1-2 switches crisp
  if (x >= 15.1 && x <= 21.9) return false;
  if (x >= 37.4 && x <= 46.8) return false;
  if (trackId <= 2 && Math.abs(z) < 2.25 && ((x >= -41.6 && x <= -30.4) || (x >= 27.4 && x <= 38.6))) {
    return false;
  }

  // Keep off station platform decks & ramps
  for (let i = 0; i < PLATFORM_ENVELOPES.length; i++) {
    const p = PLATFORM_ENVELOPES[i];
    if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) {
      return false;
    }
  }

  // Keep off median cable troughs (+/- 0.50m from trough center)
  for (let i = 0; i < MEDIAN_DUCT_Z.length; i++) {
    if (Math.abs(z - MEDIAN_DUCT_Z[i]) < 0.5) {
      return false;
    }
  }

  return true;
}

const TRACK_BALLAST_VARIANTS: Record<
  TrackId,
  { west: BallastVariant; station: BallastVariant; east: BallastVariant }
> = {
  1: { west: 'mainline', station: 'station_oiled', east: 'iron_dust' },
  2: { west: 'iron_dust', station: 'station_oiled', east: 'mainline' },
  3: { west: 'siding_weathered', station: 'mainline', east: 'siding_weathered' },
  4: { west: 'mainline', station: 'station_oiled', east: 'siding_weathered' },
  5: { west: 'iron_dust', station: 'siding_weathered', east: 'mainline' },
  6: { west: 'siding_weathered', station: 'station_oiled', east: 'iron_dust' },
  7: { west: 'mainline', station: 'iron_dust', east: 'siding_weathered' },
  8: { west: 'siding_weathered', station: 'mainline', east: 'iron_dust' },
};

export function getTrackBallastSegments(trackId: TrackId): BallastSegmentSpec[] {
  const cfg = TRACK_BALLAST_VARIANTS[trackId];
  // Strictly contiguous X ranges [-112, -32], [-32, +32], [+32, +112] -> zero overlap, zero Z-fighting
  return [
    {
      id: 'west',
      minX: -112,
      maxX: -32,
      centerX: -72,
      lengthX: 80,
      variant: cfg.west,
      repeatX: 17,
    },
    {
      id: 'station',
      minX: -32,
      maxX: 32,
      centerX: 0,
      lengthX: 64,
      variant: cfg.station,
      repeatX: 14,
    },
    {
      id: 'east',
      minX: 32,
      maxX: 112,
      centerX: 72,
      lengthX: 80,
      variant: cfg.east,
      repeatX: 17,
    },
  ];
}

// Weathered creosote, sun-bleached oak, oil-stained dark timber, and heavily oxidized/rusted iron sleepers
const SLEEPER_COLOR_PALETTE = [
  0x9a4b29, // rusted iron-oxide tie
  0x5a4638, // weathered creosote brown
  0xad542c, // heavy rust orange-brown
  0x3f332c, // oil-soaked dark timber
  0x84796b, // sun-bleached aged grey wood
  0x7c3e24, // corroded reddish tie
  0x54453a, // damp monsoon timber
] as const;

// Oxidized rail clips & tie-plates ranging from burnt rust to tarnished steel
const CLIP_COLOR_PALETTE = [
  0xa44b24, // heavy flaky iron rust
  0x6b3826, // dark oxidized steel
  0x885c42, // weathered bronze-rust
  0x737b82, // aged galvanized steel
  0xb2562a, // bright surface corrosion
] as const;

export function computeSleeperInstanceProps(
  trackId: TrackId,
  x: number,
  index: number,
): SleeperWearProfile {
  const inSpecialZone = isSpecialTrackworkX(trackId, x);
  const n1 = deterministicNoise(trackId * 313 + index * 17.3);
  const n2 = deterministicNoise(trackId * 571 + index * 29.7);
  const n3 = deterministicNoise(trackId * 829 + index * 43.1);

  // Give siding / older tracks slightly higher incidence of heavy rust tones
  const rustBias = trackId === 3 || trackId === 5 || trackId === 8 ? 0.55 : 0.38;
  const paletteIdx =
    n1 < rustBias
      ? Math.floor(n2 * 3)
      : Math.floor(n1 * SLEEPER_COLOR_PALETTE.length) % SLEEPER_COLOR_PALETTE.length;

  const clipIdx = Math.floor(n3 * CLIP_COLOR_PALETTE.length) % CLIP_COLOR_PALETTE.length;

  return {
    zJitter: inSpecialZone ? 0 : (n2 - 0.5) * 0.048,
    yawJitter: inSpecialZone ? 0 : (n1 - 0.5) * 0.036,
    scaleY: inSpecialZone ? 1 : 0.92 + n3 * 0.16,
    sleeperHex: SLEEPER_COLOR_PALETTE[paletteIdx],
    clipHex: CLIP_COLOR_PALETTE[clipIdx],
    inSpecialZone,
  };
}

const WEED_GREEN_PALETTE = [
  0x3c7d2f, // lush monsoon grass
  0x4d8c37, // fresh trackside weed green
  0x648c3a, // olive scrub grass
  0x7c8f3f, // sun-warmed yellow-green
  0x8c8a44, // dry straw-tipped sedge
  0x2e6426, // deep damp moss green
] as const;

const WEED_DRY_PALETTE = [
  0x7d8a3b, // yellowing dry grass
  0x968944, // sun-baked straw tuft
  0x607e36, // dusty roadside weed
  0x537432, // hardy scrub green
] as const;

export function generateTrackEdgeWeedPlacements(
  trackId: TrackId,
  seedBias = trackId * 19,
): WeedPlacement[] {
  const tz = TRACK_Z_MAP[trackId];
  const placements: WeedPlacement[] = [];

  for (let x = -98; x <= 98; x += 1.25) {
    const stationCore = Math.abs(x) < 31.5;
    const h1 = deterministicNoise(x * 3.17 + tz * 7.11 + seedBias);
    const h2 = deterministicNoise(x * 5.43 + tz * 11.37 + seedBias * 2);
    const h3 = deterministicNoise(x * 8.91 + tz * 2.71 + seedBias * 3);

    // Both North (-1) and South (+1) edges of each track's ballast shoulder
    for (const side of [-1, 1] as const) {
      const sideNoise = side === -1 ? h1 : h2;
      // Visible wild weeds along open station medians & denser overgrown weeds on approaches
      const densityThreshold = stationCore ? 0.34 : 0.18;
      if (sideNoise < densityThreshold) continue;

      const xPos = x + (h3 - 0.5) * 0.85;
      const distFromCenter = 1.64 + ((side === -1 ? h2 : h3) * 0.72);
      const zPos = tz + side * distFromCenter;

      if (!isTrackDecorZoneClear(trackId, xPos, zPos, 1.56)) continue;

      const allowTall = distFromCenter >= 1.78 && h3 > (stationCore ? 0.74 : 0.54);
      const palette = h2 > 0.68 ? WEED_DRY_PALETTE : WEED_GREEN_PALETTE;
      const colorHex = palette[Math.floor((h1 + h3) * 50) % palette.length];

      placements.push({
        x: xPos,
        z: zPos,
        yaw: h1 * Math.PI * 2,
        tiltX: (h2 - 0.5) * 0.24,
        tiltZ: (h3 - 0.5) * 0.24,
        scale: stationCore ? 0.82 + h2 * 0.42 : 0.94 + h2 * 0.62,
        tall: allowTall,
        colorHex,
      });
    }
  }

  return placements;
}

const COBBLE_PALETTE = [
  0x7a746a,
  0x5c574f,
  0x8b8377,
  0x4b4741,
  0x7b634e, // rust-stained granite
  0x989083, // pale limestone chip
] as const;

export function generateTrackShoulderCobbles(trackId: TrackId): CobblePlacement[] {
  const tz = TRACK_Z_MAP[trackId];
  const cobbles: CobblePlacement[] = [];

  for (let x = -96; x <= 96; x += 2.1) {
    const h1 = deterministicNoise(x * 4.31 + tz * 9.07 + trackId);
    const h2 = deterministicNoise(x * 7.19 + tz * 3.53 + trackId * 5);
    if (h1 < 0.3) continue;

    const side = h2 > 0.5 ? 1 : -1;
    const xPos = x + (h2 - 0.5) * 1.4;
    const zPos = tz + side * (1.88 + h1 * 0.5);

    if (!isTrackDecorZoneClear(trackId, xPos, zPos, 1.65)) continue;

    cobbles.push({
      x: xPos,
      z: zPos,
      yaw: h1 * Math.PI * 2,
      pitch: h2 * 0.5,
      sx: 0.9 + h1 * 0.9,
      sy: 0.38 + h2 * 0.28,
      sz: 0.8 + h2 * 0.85,
      colorHex: COBBLE_PALETTE[Math.floor((h1 + h2) * 100) % COBBLE_PALETTE.length],
    });
  }

  return cobbles;
}

export function getDiscardedSleeperPlacements(trackId: TrackId): DiscardedSleeperSpec[] {
  switch (trackId) {
    case 1:
      return [
        { x: -61.5, z: -5.45, yaw: 0.14, count: 3 },
        { x: 62.5, z: -5.5, yaw: -0.18, count: 2 },
      ];
    case 2:
      return [
        { x: -60.0, z: 5.55, yaw: -0.12, count: 2 },
        { x: 61.0, z: 5.6, yaw: 0.21, count: 3 },
      ];
    case 4:
      return [{ x: -49.5, z: 21.7, yaw: 0.16, count: 2 }];
    case 6:
      return [{ x: 61.5, z: 38.25, yaw: -0.15, count: 3 }];
    case 7:
      return [{ x: -49.5, z: 46.45, yaw: 0.11, count: 2 }];
    default:
      return [];
  }
}
