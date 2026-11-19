import type { ManagedTrain, TrackId } from './types';

export type NavZone =
  | 'platform1'
  | 'platform2'
  | 'platform3'
  | 'platform4'
  | 'forecourt'
  | 'office'
  | 'ticket_counter'
  | 'waiting_room'
  | 'stall'
  | 'bench'
  | 'footbridge'
  | 'crossing'
  | 'info_board'
  | 'village';

export interface NavNode {
  id: string;
  x: number;
  y: number;
  z: number;
  zone: NavZone;
  platform?: TrackId;
  isTrackHazard?: boolean; // true for flat plank crossing over tracks
  minTracks?: number; // minimum unlockedTracks required for this node
  maxTracks?: number; // optional max unlockedTracks (for legacy south ramp before Track 3 builds)
  benchPose?: { rotY: number; seatOffsetX: number; seatOffsetZ: number };
  neighbors: string[];
}

export const NAV_NODES: readonly NavNode[] = [
  // Platform 1 main corridor (z = -6.9)
  {
    id: 'p1_far_w',
    x: -28.5,
    y: 0.65,
    z: -6.9,
    zone: 'platform1',
    platform: 1,
    neighbors: ['p1_w', 'fb_n_base'],
  },
  {
    id: 'p1_w',
    x: -18.0,
    y: 0.65,
    z: -6.9,
    zone: 'platform1',
    platform: 1,
    neighbors: ['p1_far_w', 'p1_mw', 'p1_bench_w', 'waiting_room', 'ticket_counter'],
  },
  {
    id: 'p1_mw',
    x: -10.0,
    y: 0.65,
    z: -6.9,
    zone: 'platform1',
    platform: 1,
    neighbors: ['p1_w', 'p1_center', 'info_board_1', 'p1_bench_w'],
  },
  {
    id: 'p1_center',
    x: -1.0,
    y: 0.65,
    z: -6.9,
    zone: 'platform1',
    platform: 1,
    neighbors: ['p1_mw', 'p1_me', 'office_desk', 'info_board_1', 'p1_bench_c'],
  },
  {
    id: 'p1_me',
    x: 7.0,
    y: 0.65,
    z: -6.9,
    zone: 'platform1',
    platform: 1,
    neighbors: ['p1_center', 'p1_e', 'p1_ramp_top', 'tea_stall', 'p1_bench_c', 'office_desk'],
  },
  {
    id: 'p1_e',
    x: 14.0,
    y: 0.65,
    z: -6.9,
    zone: 'platform1',
    platform: 1,
    neighbors: ['p1_me', 'p1_cross', 'tea_stall'],
  },
  {
    id: 'p1_cross',
    x: 18.5,
    y: 0.65,
    z: -6.9,
    zone: 'platform1',
    platform: 1,
    neighbors: ['p1_e', 'p1_far_e', 'crossing_n', 'p1_bench_e', 'fruit_stall'],
  },
  {
    id: 'p1_far_e',
    x: 26.5,
    y: 0.65,
    z: -6.9,
    zone: 'platform1',
    platform: 1,
    neighbors: ['p1_cross', 'fruit_stall', 'crossing_gate_west'],
  },

  // Platform 1 activity nodes
  {
    id: 'office_desk',
    x: 0.5,
    y: 0.65,
    z: -10.1,
    zone: 'office',
    platform: 1,
    neighbors: ['p1_center', 'p1_me', 'p1_bench_c'],
  },
  {
    id: 'info_board_1',
    x: -6.8,
    y: 0.65,
    z: -9.3,
    zone: 'info_board',
    platform: 1,
    neighbors: ['p1_mw', 'p1_center'],
  },
  {
    id: 'tea_stall',
    x: 12.5,
    y: 0.65,
    z: -8.3,
    zone: 'stall',
    platform: 1,
    neighbors: ['p1_me', 'p1_e'],
  },
  {
    id: 'fruit_stall',
    x: 22.0,
    y: 0.65,
    z: -8.3,
    zone: 'stall',
    platform: 1,
    neighbors: ['p1_cross', 'p1_far_e'],
  },
  {
    id: 'ticket_counter',
    x: -15.5,
    y: 0.65,
    z: -11.9,
    zone: 'ticket_counter',
    platform: 1,
    neighbors: ['p1_w', 'waiting_room', 'forecourt_ramp_w'],
  },
  {
    id: 'waiting_room',
    x: -21.5,
    y: 0.65,
    z: -12.0,
    zone: 'waiting_room',
    platform: 1,
    neighbors: ['p1_w', 'ticket_counter', 'fb_n_base', 'forecourt_ramp_w'],
  },
  {
    id: 'p1_ramp_top',
    x: 9.2,
    y: 0.65,
    z: -12.0,
    zone: 'platform1',
    platform: 1,
    neighbors: ['p1_me', 'forecourt_ramp_e'],
  },

  // Platform 1 benches
  {
    id: 'p1_bench_w',
    x: -14.0,
    y: 0.65,
    z: -8.8,
    zone: 'bench',
    platform: 1,
    benchPose: { rotY: 0, seatOffsetX: 0, seatOffsetZ: -0.95 },
    neighbors: ['p1_w', 'p1_mw'],
  },
  {
    id: 'p1_bench_c',
    x: 4.0,
    y: 0.65,
    z: -8.8,
    zone: 'bench',
    platform: 1,
    benchPose: { rotY: 0, seatOffsetX: 0, seatOffsetZ: -0.95 },
    neighbors: ['p1_center', 'p1_me', 'office_desk'],
  },
  {
    id: 'p1_bench_e',
    x: 18.0,
    y: 0.65,
    z: -8.8,
    zone: 'bench',
    platform: 1,
    benchPose: { rotY: 0, seatOffsetX: 0, seatOffsetZ: -0.95 },
    neighbors: ['p1_cross'],
  },

  // Forecourt & Station Entrance
  {
    id: 'forecourt_ramp_e',
    x: 11.0,
    y: 0.0,
    z: -16.2,
    zone: 'forecourt',
    neighbors: ['p1_ramp_top', 'forecourt_e', 'book_stall'],
  },
  {
    id: 'forecourt_ramp_w',
    x: -16.8,
    y: 0.0,
    z: -16.2,
    zone: 'forecourt',
    neighbors: ['ticket_counter', 'waiting_room', 'forecourt_w'],
  },
  {
    id: 'book_stall',
    x: 15.8,
    y: 0.0,
    z: -17.2,
    zone: 'stall',
    neighbors: ['forecourt_ramp_e', 'forecourt_e'],
  },
  {
    id: 'forecourt_w',
    x: -17.5,
    y: 0.0,
    z: -21.5,
    zone: 'forecourt',
    neighbors: ['forecourt_ramp_w', 'forecourt_c', 'station_entrance'],
  },
  {
    id: 'forecourt_c',
    x: 0.0,
    y: 0.0,
    z: -21.5,
    zone: 'forecourt',
    neighbors: ['forecourt_w', 'forecourt_e', 'station_entrance'],
  },
  {
    id: 'forecourt_e',
    x: 11.5,
    y: 0.0,
    z: -21.5,
    zone: 'forecourt',
    neighbors: ['forecourt_ramp_e', 'forecourt_c', 'book_stall', 'station_entrance', 'road_north'],
  },
  {
    id: 'station_entrance',
    x: 2.0,
    y: 0.0,
    z: -26.0,
    zone: 'forecourt',
    neighbors: ['forecourt_w', 'forecourt_c', 'forecourt_e'],
  },

  // East Plank Crossing (x = 18.5)
  {
    id: 'crossing_n',
    x: 18.5,
    y: 0.65,
    z: -4.6,
    zone: 'crossing',
    isTrackHazard: true,
    neighbors: ['p1_cross', 'crossing_mid'],
  },
  {
    id: 'crossing_mid',
    x: 18.5,
    y: 0.14,
    z: 0.0,
    zone: 'crossing',
    isTrackHazard: true,
    neighbors: ['crossing_n', 'crossing_s'],
  },
  {
    id: 'crossing_s',
    x: 18.5,
    y: 0.65,
    z: 4.6,
    zone: 'crossing',
    isTrackHazard: true,
    neighbors: ['crossing_mid', 'p2_cross'],
  },

  // West Footover Bridge (x = -24.0)
  {
    id: 'fb_n_base',
    x: -29.2,
    y: 0.65,
    z: -11.0,
    zone: 'footbridge',
    neighbors: ['p1_far_w', 'waiting_room', 'fb_n_top'],
  },
  {
    id: 'fb_n_top',
    x: -24.0,
    y: 4.85,
    z: -10.8,
    zone: 'footbridge',
    neighbors: ['fb_n_base', 'fb_s_top'],
  },
  {
    id: 'fb_s_top',
    x: -24.0,
    y: 4.85,
    z: 10.4,
    zone: 'footbridge',
    neighbors: ['fb_n_top', 'fb_s_base', 'fb_m_top'],
  },
  {
    id: 'fb_s_base',
    x: -28.0,
    y: 0.65,
    z: 10.4,
    zone: 'footbridge',
    neighbors: ['fb_s_top', 'p2_far_w'],
  },
  // Extended Footover Bridge to Island Platform 3 (Level 3 / 4 Tracks)
  {
    id: 'fb_m_top',
    x: -24.0,
    y: 4.85,
    z: 24.5,
    zone: 'footbridge',
    minTracks: 4,
    neighbors: ['fb_s_top', 'fb_m_base', 'fb_t4_top'],
  },
  {
    id: 'fb_m_base',
    x: -28.0,
    y: 0.65,
    z: 24.5,
    zone: 'footbridge',
    minTracks: 4,
    neighbors: ['fb_m_top', 'p3_far_w'],
  },
  // Extended Footover Bridge to South Glass Terminal Platform 4 (Level 5 / 6 Tracks)
  {
    id: 'fb_t4_top',
    x: -24.0,
    y: 4.85,
    z: 40.5,
    zone: 'footbridge',
    minTracks: 6,
    neighbors: ['fb_m_top', 'fb_t4_base'],
  },
  {
    id: 'fb_t4_base',
    x: -28.0,
    y: 0.65,
    z: 40.5,
    zone: 'footbridge',
    minTracks: 6,
    neighbors: ['fb_t4_top', 'p4_far_w'],
  },

  // Platform 2 main corridor (z = 6.9 north / 9.2 south)
  {
    id: 'p2_far_w',
    x: -25.0,
    y: 0.65,
    z: 6.9,
    zone: 'platform2',
    platform: 2,
    neighbors: ['fb_s_base', 'p2_w'],
  },
  {
    id: 'p2_w',
    x: -18.0,
    y: 0.65,
    z: 6.9,
    zone: 'platform2',
    platform: 2,
    neighbors: ['p2_far_w', 'p2_mw', 'p2_bench_w'],
  },
  {
    id: 'p2_mw',
    x: -10.0,
    y: 0.65,
    z: 6.9,
    zone: 'platform2',
    platform: 2,
    neighbors: ['p2_w', 'p2_center', 'jhalmuri_stall', 'p2_bench_w'],
  },
  {
    id: 'p2_center',
    x: -1.0,
    y: 0.65,
    z: 6.9,
    zone: 'platform2',
    platform: 2,
    neighbors: ['p2_mw', 'p2_me', 'jhalmuri_stall', 'p2_bench_c'],
  },
  {
    id: 'p2_me',
    x: 8.0,
    y: 0.65,
    z: 6.9,
    zone: 'platform2',
    platform: 2,
    neighbors: ['p2_center', 'p2_cross', 'p2_bench_c', 'info_board_2', 'p2_ramp_south'],
  },
  {
    id: 'p2_cross',
    x: 18.5,
    y: 0.65,
    z: 6.9,
    zone: 'platform2',
    platform: 2,
    neighbors: ['p2_me', 'p2_far_e', 'crossing_s', 'p2_bench_e', 'info_board_2', 'crossing_p2s'],
  },
  {
    id: 'p2_far_e',
    x: 24.5,
    y: 0.65,
    z: 6.9,
    zone: 'platform2',
    platform: 2,
    neighbors: ['p2_cross'],
  },

  // Platform 2 activity nodes
  {
    id: 'jhalmuri_stall',
    x: -6.0,
    y: 0.65,
    z: 7.9,
    zone: 'stall',
    platform: 2,
    neighbors: ['p2_mw', 'p2_center'],
  },
  {
    id: 'info_board_2',
    x: 11.2,
    y: 0.65,
    z: 8.5,
    zone: 'info_board',
    platform: 2,
    neighbors: ['p2_me', 'p2_cross'],
  },
  {
    id: 'p2_bench_w',
    x: -14.0,
    y: 0.65,
    z: 8.6,
    zone: 'bench',
    platform: 2,
    benchPose: { rotY: Math.PI, seatOffsetX: 0, seatOffsetZ: 0.9 },
    neighbors: ['p2_w', 'p2_mw'],
  },
  {
    id: 'p2_bench_c',
    x: 4.0,
    y: 0.65,
    z: 8.6,
    zone: 'bench',
    platform: 2,
    benchPose: { rotY: Math.PI, seatOffsetX: 0, seatOffsetZ: 0.9 },
    neighbors: ['p2_center', 'p2_me'],
  },
  {
    id: 'p2_bench_e',
    x: 18.0,
    y: 0.65,
    z: 8.6,
    zone: 'bench',
    platform: 2,
    benchPose: { rotY: Math.PI, seatOffsetX: 0, seatOffsetZ: 0.9 },
    neighbors: ['p2_cross'],
  },
  {
    id: 'p2_ramp_south',
    x: 9.0,
    y: 0.65,
    z: 11.2,
    zone: 'platform2',
    platform: 2,
    maxTracks: 2,
    neighbors: ['p2_me', 'village_lane_c'],
  },

  // East Plank Crossing extension south across Tracks 3-6 (x = 18.5)
  {
    id: 'crossing_p2s',
    x: 18.5,
    y: 0.65,
    z: 11.2,
    zone: 'crossing',
    minTracks: 3,
    neighbors: ['p2_cross', 'crossing_t3'],
  },
  {
    id: 'crossing_t3',
    x: 18.5,
    y: 0.14,
    z: 16.3,
    zone: 'crossing',
    isTrackHazard: true,
    minTracks: 3,
    neighbors: ['crossing_p2s', 'crossing_p3n'],
  },
  {
    id: 'crossing_p3n',
    x: 18.5,
    y: 0.65,
    z: 21.3,
    zone: 'crossing',
    minTracks: 4,
    neighbors: ['crossing_t3', 'p3_cross'],
  },
  {
    id: 'crossing_t5',
    x: 18.5,
    y: 0.14,
    z: 32.8,
    zone: 'crossing',
    isTrackHazard: true,
    minTracks: 5,
    neighbors: ['p3_cross', 'crossing_p4n'],
  },
  {
    id: 'crossing_p4n',
    x: 18.5,
    y: 0.65,
    z: 37.8,
    zone: 'crossing',
    minTracks: 6,
    neighbors: ['crossing_t5', 'p4_cross'],
  },

  // Island Platform 3 (Track 4 & Track 5, z = 24.5, Level 3 / 4+ Tracks)
  {
    id: 'p3_far_w',
    x: -25.0,
    y: 0.65,
    z: 24.5,
    zone: 'platform3',
    platform: 4,
    minTracks: 4,
    neighbors: ['fb_m_base', 'p3_w'],
  },
  {
    id: 'p3_w',
    x: -16.0,
    y: 0.65,
    z: 24.5,
    zone: 'platform3',
    platform: 4,
    minTracks: 4,
    neighbors: ['p3_far_w', 'p3_center', 'p3_bench_w'],
  },
  {
    id: 'p3_center',
    x: 0.0,
    y: 0.65,
    z: 24.5,
    zone: 'platform3',
    platform: 4,
    minTracks: 4,
    neighbors: ['p3_w', 'p3_me', 'p3_bench_c'],
  },
  {
    id: 'p3_me',
    x: 10.0,
    y: 0.65,
    z: 24.5,
    zone: 'platform3',
    platform: 5,
    minTracks: 4,
    neighbors: ['p3_center', 'p3_cross', 'p3_bench_c'],
  },
  {
    id: 'p3_cross',
    x: 18.5,
    y: 0.65,
    z: 24.5,
    zone: 'platform3',
    platform: 5,
    minTracks: 4,
    neighbors: ['p3_me', 'crossing_p3n', 'crossing_t5'],
  },
  {
    id: 'p3_bench_w',
    x: -12.0,
    y: 0.65,
    z: 24.5,
    zone: 'bench',
    platform: 4,
    minTracks: 4,
    benchPose: { rotY: 0, seatOffsetX: 0, seatOffsetZ: -0.5 },
    neighbors: ['p3_w'],
  },
  {
    id: 'p3_bench_c',
    x: 5.0,
    y: 0.65,
    z: 24.5,
    zone: 'bench',
    platform: 4,
    minTracks: 4,
    benchPose: { rotY: 0, seatOffsetX: 0, seatOffsetZ: -0.5 },
    neighbors: ['p3_center', 'p3_me'],
  },

  // South Terminal Concourse / Platform 4 (Track 6, z = 40.5, Level 5 / 6 Tracks)
  {
    id: 'p4_far_w',
    x: -25.0,
    y: 0.65,
    z: 40.5,
    zone: 'platform4',
    platform: 6,
    minTracks: 6,
    neighbors: ['fb_t4_base', 'p4_w'],
  },
  {
    id: 'p4_w',
    x: -14.0,
    y: 0.65,
    z: 40.5,
    zone: 'platform4',
    platform: 6,
    minTracks: 6,
    neighbors: ['p4_far_w', 'p4_center'],
  },
  {
    id: 'p4_center',
    x: 0.0,
    y: 0.65,
    z: 40.5,
    zone: 'platform4',
    platform: 6,
    minTracks: 6,
    neighbors: ['p4_w', 'p4_cross', 'south_city_plaza'],
  },
  {
    id: 'p4_cross',
    x: 18.5,
    y: 0.65,
    z: 40.5,
    zone: 'platform4',
    platform: 6,
    minTracks: 6,
    neighbors: ['p4_center', 'crossing_p4n'],
  },

  // Urban Promenade & City Forecourt Nodes
  {
    id: 'village_lane_c',
    x: 9.0,
    y: 0.0,
    z: 16.5,
    zone: 'village',
    maxTracks: 2,
    neighbors: ['p2_ramp_south', 'village_lane_w', 'village_lane_e'],
  },
  {
    id: 'village_lane_w',
    x: -8.0,
    y: 0.0,
    z: 18.0,
    zone: 'village',
    maxTracks: 2,
    neighbors: ['village_lane_c'],
  },
  {
    id: 'village_lane_e',
    x: 24.0,
    y: 0.0,
    z: 18.0,
    zone: 'village',
    maxTracks: 2,
    neighbors: ['village_lane_c'],
  },
  {
    id: 'south_city_plaza',
    x: 0.0,
    y: 0.0,
    z: 49.5,
    zone: 'village',
    minTracks: 6,
    neighbors: ['p4_center', 'south_city_e'],
  },
  {
    id: 'south_city_e',
    x: 26.0,
    y: 0.0,
    z: 49.5,
    zone: 'village',
    minTracks: 6,
    neighbors: ['south_city_plaza'],
  },
  {
    id: 'road_north',
    x: 34.0,
    y: 0.0,
    z: -14.0,
    zone: 'village',
    neighbors: ['forecourt_e', 'crossing_gate_west'],
  },
  {
    id: 'crossing_gate_west',
    x: 35.0,
    y: 0.0,
    z: -5.8,
    zone: 'crossing',
    neighbors: ['p1_far_e', 'road_north'],
  },
];

const NODE_MAP = new Map<string, NavNode>();
for (const n of NAV_NODES) {
  NODE_MAP.set(n.id, n);
}

export function isNavNodeUnlocked(node: NavNode, unlockedTracks = 2): boolean {
  if (node.minTracks !== undefined && unlockedTracks < node.minTracks) return false;
  if (node.maxTracks !== undefined && unlockedTracks > node.maxTracks) return false;
  return true;
}

export function getNavNode(id: string): NavNode | undefined {
  return NODE_MAP.get(id);
}

export function getNodesByZone(zone: NavZone, unlockedTracks = 2): NavNode[] {
  return NAV_NODES.filter((n) => n.zone === zone && isNavNodeUnlocked(n, unlockedTracks));
}

/**
 * Checks whether the pedestrian plank crossing at x = 18.5 is currently
 * blocked by an approaching/stopped/departing train.
 */
export function isPedestrianCrossingBlockedByTrain(trains: readonly ManagedTrain[]): boolean {
  for (let i = 0; i < trains.length; i++) {
    const t = trains[i];
    if (t.status === 'Scheduled' || t.status === 'Departed') continue;
    const halfSpan = ((t.coachCount + 1) * 11.1) / 2 + 5.5;
    if (Math.abs(t.x - 18.5) <= halfSpan) {
      return true;
    }
  }
  return false;
}

/**
 * Finds the nearest reachable nav node to world coordinate (x, y, z).
 */
export function findNearestNavNode(
  x: number,
  y: number,
  z: number,
  allowTrackHazards = true,
  unlockedTracks = 2,
): NavNode {
  let best = NAV_NODES[0];
  let bestCost = Infinity;

  for (let i = 0; i < NAV_NODES.length; i++) {
    const n = NAV_NODES[i];
    if (!isNavNodeUnlocked(n, unlockedTracks)) continue;
    if (!allowTrackHazards && n.isTrackHazard) continue;
    const dx = n.x - x;
    const dz = n.z - z;
    const dy = (n.y - y) * 2.5;
    const cost = dx * dx + dz * dz + dy * dy;
    if (cost < bestCost) {
      bestCost = cost;
      best = n;
    }
  }
  return best;
}

const PATH_CACHE = new Map<string, readonly string[]>();
const MAX_PATH_CACHE_SIZE = 1024;

/**
 * A* pathfinding across the station navigation graph.
 * Supports avoiding flat track hazards (for children or when a train blocks x=18.5,
 * automatically routing via the West Footover Bridge instead!) and caches paths cleanly.
 */
export function findNavPath(
  startId: string,
  goalId: string,
  options?: { avoidTrackHazards?: boolean; unlockedTracks?: number },
): string[] {
  const unlockedTracks = options?.unlockedTracks ?? 2;
  const startNode = NODE_MAP.get(startId);
  const goalNode = NODE_MAP.get(goalId);
  if (!startNode || !goalNode) return [];
  if (!isNavNodeUnlocked(goalNode, unlockedTracks)) return [];
  if (startId === goalId) return [goalId];

  const avoidHazards = Boolean(options?.avoidTrackHazards);
  const cacheKey = `${startId}|${goalId}|${avoidHazards ? 1 : 0}|${unlockedTracks}`;
  const cached = PATH_CACHE.get(cacheKey);
  if (cached) {
    return [...cached];
  }

  const openSet = new Set<string>([startId]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[startId, 0]]);
  const fScore = new Map<string, number>([
    [
      startId,
      Math.hypot(goalNode.x - startNode.x, goalNode.z - startNode.z),
    ],
  ]);

  while (openSet.size > 0) {
    let current = '';
    let lowestF = Infinity;
    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = id;
      }
    }

    if (current === goalId) {
      const path: string[] = [current];
      while (cameFrom.has(current)) {
        current = cameFrom.get(current)!;
        path.unshift(current);
      }
      if (PATH_CACHE.size >= MAX_PATH_CACHE_SIZE) {
        PATH_CACHE.clear();
      }
      PATH_CACHE.set(cacheKey, path);
      return [...path];
    }

    openSet.delete(current);
    const currNode = NODE_MAP.get(current);
    if (!currNode) continue;

    for (const nbId of currNode.neighbors) {
      const nb = NODE_MAP.get(nbId);
      if (!nb || !isNavNodeUnlocked(nb, unlockedTracks)) continue;
      if (avoidHazards && nb.isTrackHazard && nbId !== goalId) continue;

      const edgeCost =
        Math.hypot(nb.x - currNode.x, nb.z - currNode.z) + Math.abs(nb.y - currNode.y) * 1.4;
      const tentativeG = (gScore.get(current) ?? Infinity) + edgeCost;

      if (tentativeG < (gScore.get(nbId) ?? Infinity)) {
        cameFrom.set(nbId, current);
        gScore.set(nbId, tentativeG);
        fScore.set(nbId, tentativeG + Math.hypot(goalNode.x - nb.x, goalNode.z - nb.z));
        openSet.add(nbId);
      }
    }
  }

  // Fallback if hazards blocked all paths: try allowing hazard crossing
  if (avoidHazards) {
    const fallback = findNavPath(startId, goalId, { avoidTrackHazards: false, unlockedTracks });
    if (PATH_CACHE.size < MAX_PATH_CACHE_SIZE) {
      PATH_CACHE.set(cacheKey, fallback);
    }
    return [...fallback];
  }
  return [];
}
