import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FOOTBRIDGE_HEIGHT,
  groundHeightAt,
  PLATFORM_HEIGHT,
  PLAYER_RADIUS,
  resolveCircleAabbCollisions,
  WORLD_BOUNDS,
} from './physics';

test('groundHeightAt provides smooth ramps and raised platform decks', () => {
  // Center of Platform 1
  assert.equal(groundHeightAt(0, -8), PLATFORM_HEIGHT);
  // Center of Platform 2
  assert.equal(groundHeightAt(0, 8), PLATFORM_HEIGHT);
  // Open forecourt ground
  assert.equal(groundHeightAt(0, -25), 0);
  // West ramp of Platform 1 slopes smoothly
  const midRamp = groundHeightAt(-32, -8);
  assert.ok(midRamp > 0.3 && midRamp < 0.35);
  // Pedestrian crossing between platforms
  assert.equal(groundHeightAt(18, 0), 0.14);
});

test('resolveCircleAabbCollisions prevents penetrating solid walls and slides along edge', () => {
  const colliders = [
    { id: 'office', minX: -10, maxX: 6, minZ: -17, maxZ: -11.5 },
  ];
  // Player walking up against south wall of office (z = -11.5)
  const hit = resolveCircleAabbCollisions(-2, -11.6, 0.65, PLAYER_RADIUS, colliders);
  assert.equal(hit.collided, true);
  assert.ok(hit.z >= -11.5 + PLAYER_RADIUS - 1e-6);
  // X remains unchanged so player slides smoothly along wall
  assert.equal(hit.x, -2);
});

test('resolveCircleAabbCollisions clamps player inside world bounds', () => {
  const out = resolveCircleAabbCollisions(500, -500, 0, PLAYER_RADIUS, []);
  assert.equal(out.collided, true);
  assert.equal(out.x, WORLD_BOUNDS.maxX - PLAYER_RADIUS);
  assert.equal(out.z, WORLD_BOUNDS.minZ + PLAYER_RADIUS);
});

test('Footover Bridge guardrails hold player on bridge/stairs and ignore trains below', () => {
  const bridgeColliders = [
    { id: 'fb_rail_e_base', minX: -22.88, maxX: -21.0, minZ: -12.0, maxZ: 11.2, minY: 3.1 },
    { id: 'fb_rail_w_base', minX: -26.8, maxX: -25.12, minZ: -9.85, maxZ: 9.35, minY: 3.1 },
    { id: 'fb_rail_s_end_base', minX: -25.35, maxX: -22.65, minZ: 11.05, maxZ: 12.7, minY: 3.1 },
    { id: 'fb_stair1_n', minX: -29.0, maxX: -25.1, minZ: -13.3, maxZ: -11.92, minY: 0.9 },
    { id: 'fb_stair1_s', minX: -29.0, maxX: -25.1, minZ: -10.08, maxZ: -8.7, minY: 0.9 },
    { id: 'dyn_train_t1', minX: -28.0, maxX: 25.0, minZ: -3.5, maxZ: -0.9, maxY: 4.2 },
  ];

  // Player walking on elevated bridge deck (y = FOOTBRIDGE_HEIGHT) pushing east/west against borders stays on deck
  const pushEast = resolveCircleAabbCollisions(-22.75, 0, FOOTBRIDGE_HEIGHT, PLAYER_RADIUS, bridgeColliders);
  assert.equal(pushEast.collided, true);
  assert.ok(pushEast.x <= -22.88 - PLAYER_RADIUS + 1e-6);
  assert.equal(groundHeightAt(pushEast.x, pushEast.z, FOOTBRIDGE_HEIGHT, 2), FOOTBRIDGE_HEIGHT);

  const pushWest = resolveCircleAabbCollisions(-25.25, 0, FOOTBRIDGE_HEIGHT, PLAYER_RADIUS, bridgeColliders);
  assert.equal(pushWest.collided, true);
  assert.ok(pushWest.x >= -25.12 + PLAYER_RADIUS - 1e-6);
  assert.equal(groundHeightAt(pushWest.x, pushWest.z, FOOTBRIDGE_HEIGHT, 2), FOOTBRIDGE_HEIGHT);

  // Train directly underneath bridge deck (z = -2.2) does NOT collide with player high above on bridge
  const walkOverTrain = resolveCircleAabbCollisions(-24.0, -2.2, FOOTBRIDGE_HEIGHT, PLAYER_RADIUS, bridgeColliders);
  assert.equal(walkOverTrain.collided, false);
  assert.equal(walkOverTrain.x, -24.0);
  assert.equal(walkOverTrain.z, -2.2);

  // Player on Platform 1 below (y = PLATFORM_HEIGHT) passes underneath elevated railings unobstructed
  const belowBridge = resolveCircleAabbCollisions(-22.8, -7.5, PLATFORM_HEIGHT, PLAYER_RADIUS, bridgeColliders);
  assert.equal(belowBridge.collided, false);

  // Player halfway up North staircase (y = 2.6) is kept inside stair rails
  const stairSide = resolveCircleAabbCollisions(-26.5, -10.1, 2.6, PLAYER_RADIUS, bridgeColliders);
  assert.equal(stairSide.collided, true);
  assert.ok(stairSide.z <= -10.08 - PLAYER_RADIUS + 1e-6);
});
