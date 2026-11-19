import type { ColliderBox } from './types';

export const WORLD_BOUNDS = {
  minX: -74,
  maxX: 74,
  minZ: -54,
  maxZ: 64,
} as const;

export const PLATFORM_HEIGHT = 0.65;
export const FOOTBRIDGE_HEIGHT = 4.85;
export const PLAYER_RADIUS = 0.42;
export const NPC_ADULT_RADIUS = 0.36;
export const NPC_CHILD_RADIUS = 0.28;
export const CHARACTER_CAPSULE_HEIGHT = 1.75;

/**
 * Returns the exact walkable ground elevation (Y) at world coordinate (x, z).
 * Smoothly interpolates platform ramps, pedestrian crossing, Footover Bridge deck/stairs,
 * and progressively constructed South Island Platforms (Tracks 3-6).
 */
export function groundHeightAt(x: number, z: number, currentY = 0, unlockedTracks = 2): number {
  let height = 0;

  // Platform 1 (North side: z in [-12.5, -4.7], main deck x in [-30, 30])
  if (z >= -12.5 && z <= -4.7) {
    if (x >= -30 && x <= 30) {
      height = Math.max(height, PLATFORM_HEIGHT);
    } else if (x >= -34 && x < -30) {
      const t = (x - -34) / 4;
      height = Math.max(height, t * PLATFORM_HEIGHT);
    } else if (x > 30 && x <= 34) {
      const t = 1 - (x - 30) / 4;
      height = Math.max(height, t * PLATFORM_HEIGHT);
    }
  }

  // Platform 1 Forecourt Entrance Ramp (North stairs/ramp into urban plaza)
  if (x >= 8 && x <= 14 && z >= -15.0 && z < -12.5) {
    const t = (z - -15.0) / 2.5;
    height = Math.max(height, t * PLATFORM_HEIGHT);
  }

  // Platform 1 Waiting Room & Ticket Counter West Apron
  if (x >= -24 && x <= -13 && z >= -15.0 && z < -12.5) {
    const t = (z - -15.0) / 2.5;
    height = Math.max(height, t * PLATFORM_HEIGHT);
  }

  // Platform 2 (Island Platform once Track 3 unlocks: z in [4.7, 11.5], main deck x in [-28, 28])
  if (z >= 4.7 && z <= 11.5) {
    if (x >= -28 && x <= 28) {
      height = Math.max(height, PLATFORM_HEIGHT);
    } else if (x >= -32 && x < -28) {
      const t = (x - -32) / 4;
      height = Math.max(height, t * PLATFORM_HEIGHT);
    } else if (x > 28 && x <= 32) {
      const t = 1 - (x - 28) / 4;
      height = Math.max(height, t * PLATFORM_HEIGHT);
    }
  }

  // Platform 2 South Ramp (exists only before Track 3 occupies z=13.3)
  if (unlockedTracks <= 2 && x >= 6 && x <= 12 && z > 11.5 && z <= 14.0) {
    const t = 1 - (z - 11.5) / 2.5;
    height = Math.max(height, t * PLATFORM_HEIGHT);
  }

  // Platform 3 Island (Unlocked at Station Level 3 / 4 Tracks: z in [21.0, 28.0], x in [-28, 28])
  if (unlockedTracks >= 4 && z >= 21.0 && z <= 28.0) {
    if (x >= -28 && x <= 28) {
      height = Math.max(height, PLATFORM_HEIGHT);
    } else if (x >= -32 && x < -28) {
      const t = (x - -32) / 4;
      height = Math.max(height, t * PLATFORM_HEIGHT);
    } else if (x > 28 && x <= 32) {
      const t = 1 - (x - 28) / 4;
      height = Math.max(height, t * PLATFORM_HEIGHT);
    }
  }

  // Platform 4 / South Glass Terminal Concourse (Unlocked at Station Level 5 / 6 Tracks: z in [37.5, 46.0])
  if (unlockedTracks >= 6 && z >= 37.5 && z <= 46.0) {
    if (x >= -30 && x <= 30) {
      height = Math.max(height, PLATFORM_HEIGHT);
    } else if (x >= -34 && x < -30) {
      const t = (x - -34) / 4;
      height = Math.max(height, t * PLATFORM_HEIGHT);
    } else if (x > 30 && x <= 34) {
      const t = 1 - (x - 30) / 4;
      height = Math.max(height, t * PLATFORM_HEIGHT);
    }
  }
  if (unlockedTracks >= 6 && x >= -6 && x <= 6 && z > 46.0 && z <= 48.5) {
    const t = 1 - (z - 46.0) / 2.5;
    height = Math.max(height, t * PLATFORM_HEIGHT);
  }

  // Pedestrian Track Crossing Walkway (x in [16, 21])
  // Tracks 1 & 2 corridor (z in [-4.7, 4.7])
  if (x >= 16 && x <= 21 && z >= -4.7 && z <= 4.7) {
    const trackPlankY = 0.14;
    if (z <= -3.5) {
      const t = (-3.5 - z) / 1.2;
      height = Math.max(height, trackPlankY + t * (PLATFORM_HEIGHT - trackPlankY));
    } else if (z >= 3.5) {
      const t = (z - 3.5) / 1.2;
      height = Math.max(height, trackPlankY + t * (PLATFORM_HEIGHT - trackPlankY));
    } else {
      height = Math.max(height, trackPlankY);
    }
  }

  // Tracks 3 & 4 pedestrian plank crossing (z in [11.5, 21.0])
  if (unlockedTracks >= 3 && x >= 16 && x <= 21 && z > 11.5 && z <= (unlockedTracks >= 4 ? 21.0 : 16.0)) {
    const trackPlankY = 0.14;
    if (z <= 12.6) {
      const t = (12.6 - z) / 1.1;
      height = Math.max(height, trackPlankY + t * (PLATFORM_HEIGHT - trackPlankY));
    } else if (unlockedTracks >= 4 && z >= 19.9) {
      const t = (z - 19.9) / 1.1;
      height = Math.max(height, trackPlankY + t * (PLATFORM_HEIGHT - trackPlankY));
    } else {
      height = Math.max(height, trackPlankY);
    }
  }

  // Tracks 5 & 6 pedestrian plank crossing (z in [28.0, 37.5])
  if (unlockedTracks >= 5 && x >= 16 && x <= 21 && z > 28.0 && z <= (unlockedTracks >= 6 ? 37.5 : 32.5)) {
    const trackPlankY = 0.14;
    if (z <= 29.1) {
      const t = (29.1 - z) / 1.1;
      height = Math.max(height, trackPlankY + t * (PLATFORM_HEIGHT - trackPlankY));
    } else if (unlockedTracks >= 6 && z >= 36.4) {
      const t = (z - 36.4) / 1.1;
      height = Math.max(height, trackPlankY + t * (PLATFORM_HEIGHT - trackPlankY));
    } else {
      height = Math.max(height, trackPlankY);
    }
  }

  // Footover Bridge Stairs & Elevated Deck (x in [-25.2, -22.8])
  // North staircase (z in [-12.0, -10.0], x in [-29.2, -22.8])
  if (z >= -12.0 && z <= -10.0 && x >= -29.2 && x <= -22.8 && currentY >= 0.4) {
    if (x <= -23.8) {
      const t = Math.max(0, Math.min(1, (x - -29.2) / 5.4));
      const stairY = PLATFORM_HEIGHT + t * (FOOTBRIDGE_HEIGHT - PLATFORM_HEIGHT);
      if (currentY >= stairY - 1.2) {
        height = Math.max(height, stairY);
      }
    } else if (currentY >= 3.1) {
      height = Math.max(height, FOOTBRIDGE_HEIGHT);
    }
  }

  // Platform 2 staircase (z in [9.6, 11.4], x in [-28.0, -22.8])
  if (z >= 9.6 && z <= 11.4 && x >= -28.0 && x <= -22.8 && currentY >= 0.4) {
    if (x <= -23.8) {
      const t = Math.max(0, Math.min(1, (x - -28.0) / 4.2));
      const stairY = PLATFORM_HEIGHT + t * (FOOTBRIDGE_HEIGHT - PLATFORM_HEIGHT);
      if (currentY >= stairY - 1.2) {
        height = Math.max(height, stairY);
      }
    } else if (currentY >= 3.1) {
      height = Math.max(height, FOOTBRIDGE_HEIGHT);
    }
  }

  // Platform 3 Island staircase (when Track 4 unlocked: z in [23.6, 25.4], x in [-28.0, -22.8])
  if (unlockedTracks >= 4 && z >= 23.6 && z <= 25.4 && x >= -28.0 && x <= -22.8 && currentY >= 0.4) {
    if (x <= -23.8) {
      const t = Math.max(0, Math.min(1, (x - -28.0) / 4.2));
      const stairY = PLATFORM_HEIGHT + t * (FOOTBRIDGE_HEIGHT - PLATFORM_HEIGHT);
      if (currentY >= stairY - 1.2) {
        height = Math.max(height, stairY);
      }
    } else if (currentY >= 3.1) {
      height = Math.max(height, FOOTBRIDGE_HEIGHT);
    }
  }

  // South Terminal Concourse staircase (when Track 6 unlocked: z in [39.6, 41.4], x in [-28.0, -22.8])
  if (unlockedTracks >= 6 && z >= 39.6 && z <= 41.4 && x >= -28.0 && x <= -22.8 && currentY >= 0.4) {
    if (x <= -23.8) {
      const t = Math.max(0, Math.min(1, (x - -28.0) / 4.2));
      const stairY = PLATFORM_HEIGHT + t * (FOOTBRIDGE_HEIGHT - PLATFORM_HEIGHT);
      if (currentY >= stairY - 1.2) {
        height = Math.max(height, stairY);
      }
    } else if (currentY >= 3.1) {
      height = Math.max(height, FOOTBRIDGE_HEIGHT);
    }
  }

  // Elevated Footover Bridge span over active tracks
  const bridgeMaxZ = unlockedTracks >= 6 ? 41.5 : unlockedTracks >= 4 ? 25.5 : 11.2;
  if (x >= -25.25 && x <= -22.75 && z >= -11.95 && z <= bridgeMaxZ && currentY >= 3.1) {
    height = Math.max(height, FOOTBRIDGE_HEIGHT);
  }

  // Level Road Crossing Asphalt Apron (x in [38.5, 45.5])
  const crossingMaxZ =
    unlockedTracks >= 6 ? 37.8 : unlockedTracks >= 5 ? 31.8 : unlockedTracks >= 4 ? 21.3 : unlockedTracks >= 3 ? 15.3 : 4.8;
  if (x >= 38.5 && x <= 45.5 && z >= -4.8 && z <= crossingMaxZ) {
    height = Math.max(height, 0.12);
  }

  return height;
}

/**
 * Resolves 2D circle-vs-AABB collisions on the XZ plane so actors slide
 * cleanly along buildings, trains, stalls, and props without getting stuck.
 */
export function resolveCircleAabbCollisions(
  posX: number,
  posZ: number,
  actorY: number,
  radius: number,
  colliders: readonly ColliderBox[],
): { x: number; z: number; collided: boolean } {
  let x = posX;
  let z = posZ;
  let collided = false;

  // Run 2 relaxation iterations to resolve corner overlaps cleanly
  for (let iter = 0; iter < 2; iter++) {
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      if (box.minY !== undefined && actorY < box.minY) {
        continue;
      }
      if (box.maxY !== undefined && actorY > box.maxY) {
        continue;
      }

      const closestX = Math.max(box.minX, Math.min(x, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(z, box.maxZ));
      const dx = x - closestX;
      const dz = z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        collided = true;
        if (distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          x += (dx / dist) * overlap;
          z += (dz / dist) * overlap;
        } else {
          // Center is inside the box; push out along minimum penetration axis
          const leftPen = x - box.minX;
          const rightPen = box.maxX - x;
          const topPen = z - box.minZ;
          const bottomPen = box.maxZ - z;
          const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
          if (minPen === leftPen) x = box.minX - radius;
          else if (minPen === rightPen) x = box.maxX + radius;
          else if (minPen === topPen) z = box.minZ - radius;
          else z = box.maxZ + radius;
        }
      }
    }
  }

  // Clamp to playable world perimeter
  const clampedX = Math.max(WORLD_BOUNDS.minX + radius, Math.min(WORLD_BOUNDS.maxX - radius, x));
  const clampedZ = Math.max(WORLD_BOUNDS.minZ + radius, Math.min(WORLD_BOUNDS.maxZ - radius, z));
  if (clampedX !== x || clampedZ !== z) {
    collided = true;
  }

  return { x: clampedX, z: clampedZ, collided };
}

export interface CapsuleEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  immovable?: boolean;
}

export interface PlayerNpcCollisionHit {
  npcId: string;
  pushDirX: number;
  pushDirZ: number;
  overlap: number;
}

/**
 * Capsule-vs-capsule collision between the player and all active NPCs.
 * Guarantees neither the player nor any NPC can ever walk through each other
 * from front, back, left, or right, and slides cleanly around walls/trains.
 */
export function resolvePlayerNpcCollisions(
  player: { x: number; y: number; z: number; radius: number },
  npcs: CapsuleEntity[],
  colliders: readonly ColliderBox[],
): { playerX: number; playerZ: number; hits: PlayerNpcCollisionHit[] } {
  let px = player.x;
  let pz = player.z;
  const hitMap = new Map<string, PlayerNpcCollisionHit>();

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      // Vertical capsule overlap check (e.g., player on footbridge vs NPC below)
      if (Math.abs(player.y - npc.y) >= CHARACTER_CAPSULE_HEIGHT - 0.35) {
        continue;
      }

      const dx = px - npc.x;
      const dz = pz - npc.z;
      const minDist = player.radius + npc.radius;
      const distSq = dx * dx + dz * dz;

      if (distSq < minDist * minDist) {
        let nx = 1;
        let nz = 0;
        let dist = Math.sqrt(distSq);
        if (dist > 1e-5) {
          nx = dx / dist;
          nz = dz / dist;
        } else {
          dist = 0;
          const angle = (i * 1.7) % (Math.PI * 2);
          nx = Math.cos(angle);
          nz = Math.sin(angle);
        }

        const overlap = minDist - dist;
        if (npc.immovable) {
          px += nx * (overlap + 0.005);
          pz += nz * (overlap + 0.005);
        } else {
          // Player absorbs 62%, NPC yields 38% so bump feels physical without launching either
          px += nx * (overlap * 0.62 + 0.003);
          pz += nz * (overlap * 0.62 + 0.003);
          npc.x -= nx * (overlap * 0.38);
          npc.z -= nz * (overlap * 0.38);

          const npcWorldResolved = resolveCircleAabbCollisions(
            npc.x,
            npc.z,
            npc.y,
            npc.radius,
            colliders,
          );
          npc.x = npcWorldResolved.x;
          npc.z = npcWorldResolved.z;
        }

        if (!hitMap.has(npc.id)) {
          hitMap.set(npc.id, {
            npcId: npc.id,
            pushDirX: -nx,
            pushDirZ: -nz,
            overlap,
          });
        }
      }
    }

    const playerWorldResolved = resolveCircleAabbCollisions(
      px,
      pz,
      player.y,
      player.radius,
      colliders,
    );
    px = playerWorldResolved.x;
    pz = playerWorldResolved.z;
  }

  return {
    playerX: px,
    playerZ: pz,
    hits: Array.from(hitMap.values()),
  };
}

/**
 * Resolves pairwise capsule collisions between active NPCs so crowds never stack or clip.
 */
export function resolveNpcPairCollisions(
  npcs: CapsuleEntity[],
  colliders: readonly ColliderBox[],
): void {
  const len = npcs.length;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < len; i++) {
      const a = npcs[i];
      for (let j = i + 1; j < len; j++) {
        const b = npcs[j];
        if (Math.abs(a.y - b.y) >= CHARACTER_CAPSULE_HEIGHT - 0.35) {
          continue;
        }
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const minDist = a.radius + b.radius;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const nx = dist > 1e-5 ? dx / dist : Math.cos(i + j);
          const nz = dist > 1e-5 ? dz / dist : Math.sin(i + j);
          const overlap = minDist - dist;

          if (a.immovable && b.immovable) continue;
          if (a.immovable) {
            b.x += nx * overlap;
            b.z += nz * overlap;
          } else if (b.immovable) {
            a.x -= nx * overlap;
            a.z -= nz * overlap;
          } else {
            const half = overlap * 0.5;
            a.x -= nx * half;
            a.z -= nz * half;
            b.x += nx * half;
            b.z += nz * half;
          }
        }
      }
    }

    for (let i = 0; i < len; i++) {
      const n = npcs[i];
      if (n.immovable) continue;
      const res = resolveCircleAabbCollisions(n.x, n.z, n.y, n.radius, colliders);
      n.x = res.x;
      n.z = res.z;
    }
  }
}
