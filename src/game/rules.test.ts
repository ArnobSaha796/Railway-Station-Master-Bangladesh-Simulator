import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BENGALI_ANNOUNCEMENTS,
  clampVolume,
  createDefaultAudioSettings,
  createInitialSimState,
  formatGameTime,
  getDayPeriodLabel,
  nextSignalAspect,
  performStationInteraction,
  xpThresholdForLevel,
} from './rules';

test('default audio settings and volume clamping work safely', () => {
  const audio = createDefaultAudioSettings();
  assert.equal(audio.muted, false);
  assert.ok(audio.master > 0 && audio.master <= 1);
  assert.equal(clampVolume(1.5), 1);
  assert.equal(clampVolume(-0.4), 0);
  assert.equal(clampVolume(Number.NaN), 0);
  assert.ok(BENGALI_ANNOUNCEMENTS.length >= 3);
  assert.ok(BENGALI_ANNOUNCEMENTS[0].includes('২ নম্বর প্ল্যাটফর্মে'));
});

test('initial state matches prompt specifications', () => {
  const s = createInitialSimState();
  assert.equal(s.level, 1);
  assert.equal(s.money, 1000);
  assert.equal(s.xp, 0);
  assert.equal(s.reputation, 78);
  assert.equal(s.dayNumber, 1);
  assert.equal(s.track1Signal, 'red');
  assert.equal(s.track2Signal, 'red');
});

test('3-aspect signal cycles red -> yellow -> green -> red', () => {
  assert.equal(nextSignalAspect('red'), 'yellow');
  assert.equal(nextSignalAspect('yellow'), 'green');
  assert.equal(nextSignalAspect('green'), 'red');
});

test('time formatting wraps 24h cleanly', () => {
  assert.equal(formatGameTime(0), '12:00 AM');
  assert.equal(formatGameTime(7 * 60 + 15), '07:15 AM');
  assert.equal(formatGameTime(12 * 60 + 5), '12:05 PM');
  assert.equal(formatGameTime(17 * 60 + 45), '05:45 PM');
  assert.equal(getDayPeriodLabel(7 * 60 + 15), 'Dawn');
  assert.equal(getDayPeriodLabel(10 * 60), 'Morning');
  assert.equal(getDayPeriodLabel(17 * 60), 'Golden Dusk');
});

test('interactions grant rewards, cycle 3-aspect signals, and inspect platform trains cleanly', () => {
  let state = createInitialSimState();
  const res1 = performStationInteraction(state, 'tea_stall', 1000);
  state = res1.nextState;
  assert.equal(state.money, 1045);
  assert.equal(state.xp, 20);

  const resSig1 = performStationInteraction(state, 'signal_track1', 2000);
  state = resSig1.nextState;
  assert.equal(state.track1Signal, 'yellow');
  assert.equal(state.xp, 35);

  const resSig2 = performStationInteraction(state, 'signal_track1', 2500);
  state = resSig2.nextState;
  assert.equal(state.track1Signal, 'green');
  assert.equal(state.xp, 50);

  const resGate = performStationInteraction(state, 'crossing_gate', 3000);
  state = resGate.nextState;
  assert.equal(state.crossingGateClosed, true);

  const resInspect = performStationInteraction(
    state,
    'platform_train_1',
    3500,
    'Subarna Intercity Express (#702)',
  );
  state = resInspect.nextState;
  assert.equal(state.money, 1045 + 80);
  assert.equal(state.level, 2); // 20 + 15 + 15 + 15 + 35 = 100 -> Level 2
  assert.equal(state.xp, 0);
  assert.equal(state.xpToNext, xpThresholdForLevel(2));
  assert.equal(resInspect.leveledUp, true);

  const resDesk = performStationInteraction(state, 'dispatch_desk', 4000);
  assert.equal(resDesk.openDashboard, true);
});
