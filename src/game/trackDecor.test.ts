import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSleeperInstanceProps,
  generateTrackEdgeWeedPlacements,
  generateTrackShoulderCobbles,
  getDiscardedSleeperPlacements,
  getTrackBallastSegments,
  isTrackDecorZoneClear,
  TRACK_Z_MAP,
} from './trackDecor';
import type { TrackId } from './types';

test('getTrackBallastSegments covers [-112, 112] contiguously with varied ballast materials', () => {
  const seenCombos = new Set<string>();
  for (let t = 1 as TrackId; t <= 8; t = (t + 1) as TrackId) {
    const segs = getTrackBallastSegments(t);
    assert.equal(segs.length, 3);
    assert.equal(segs[0].minX, -112);
    assert.equal(segs[0].maxX, segs[1].minX);
    assert.equal(segs[1].maxX, segs[2].minX);
    assert.equal(segs[2].maxX, 112);
    assert.equal(
      segs.reduce((sum, s) => sum + s.lengthX, 0),
      224,
    );
    seenCombos.add(segs.map((s) => s.variant).join('|'));
  }
  assert.ok(seenCombos.size >= 4, 'Tracks should use distinct ballast material combinations');
});

test('computeSleeperInstanceProps produces rust/wear variation and stays straight at switches/crossings', () => {
  const uniqueColors = new Set<number>();
  let anyYaw = false;
  for (let i = 0; i < 60; i++) {
    const x = -90 + i * 2.5;
    const props = computeSleeperInstanceProps(1, x, i);
    uniqueColors.add(props.sleeperHex);
    if (!props.inSpecialZone && Math.abs(props.yawJitter) > 0.001) {
      anyYaw = true;
    }
  }
  assert.ok(uniqueColors.size >= 4, 'Sleepers should span multiple rusted and weathered shades');
  assert.ok(anyYaw, 'Non-special track sleepers should have subtle micro-jitter');

  // Inside east road level crossing (x = 42), sleepers stay aligned
  const crossingSleeper = computeSleeperInstanceProps(1, 42.0, 100);
  assert.equal(crossingSleeper.inSpecialZone, true);
  assert.equal(crossingSleeper.zJitter, 0);
  assert.equal(crossingSleeper.yawJitter, 0);
});

test('generateTrackEdgeWeedPlacements avoids rail gauge, platforms, crossings, switches, and cable ducts', () => {
  for (let t = 1 as TrackId; t <= 8; t = (t + 1) as TrackId) {
    const weeds = generateTrackEdgeWeedPlacements(t);
    assert.ok(weeds.length >= 25, `Track ${t} should have visible edge weeds`);
    const uniqueHues = new Set(weeds.map((w) => w.colorHex));
    assert.ok(uniqueHues.size >= 3, `Track ${t} weeds should vary in color`);

    for (const w of weeds) {
      assert.ok(
        isTrackDecorZoneClear(t, w.x, w.z, 1.55),
        `Weed at (${w.x}, ${w.z}) on Track ${t} violates decor clearance`,
      );
      // Never inside train gauge of any track
      for (let checkT = 1 as TrackId; checkT <= 8; checkT = (checkT + 1) as TrackId) {
        assert.ok(
          Math.abs(w.z - TRACK_Z_MAP[checkT]) >= 1.55,
          `Weed at z=${w.z} clips Track ${checkT} train envelope`,
        );
      }
      // Never inside plank crossing or east road crossing
      assert.ok(w.x < 15.1 || w.x > 21.9, `Weed at x=${w.x} sits on plank crossing`);
      assert.ok(w.x < 37.4 || w.x > 46.8, `Weed at x=${w.x} sits on road crossing`);
    }
  }
});

test('generateTrackShoulderCobbles and getDiscardedSleeperPlacements stay outside active track gauges', () => {
  for (let t = 1 as TrackId; t <= 8; t = (t + 1) as TrackId) {
    const cobbles = generateTrackShoulderCobbles(t);
    assert.ok(cobbles.length >= 20, `Track ${t} should have scattered shoulder cobbles`);
    for (const c of cobbles) {
      assert.ok(Math.abs(c.z - TRACK_Z_MAP[t]) >= 1.65);
      assert.ok(c.x < 15.1 || c.x > 21.9);
      assert.ok(c.x < 37.4 || c.x > 46.8);
    }

    const discarded = getDiscardedSleeperPlacements(t);
    for (const d of discarded) {
      assert.ok(Math.abs(d.z - TRACK_Z_MAP[t]) >= 2.25);
      assert.ok(Math.abs(d.x) > 45);
    }
  }
});
