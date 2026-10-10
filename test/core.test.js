import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hoursToTime,
  timeToHours,
  hoursToMinutes,
  minutesToHours,
} from '../src/core.js';

// We never compare floats with ===. timeToHours rounds to 6 decimal places
// internally, so comparing against literals with a tolerance of 1e-9 is
// safe and deterministic across machines.
const APPROX_EPS = 1e-9;
function approxEqual(actual, expected, msg) {
  assert.ok(
    Math.abs(actual - expected) < APPROX_EPS,
    msg || `expected ~${expected}, got ${actual}`,
  );
}

test('timeToHours parses HH:MM', () => {
  approxEqual(timeToHours('08:30'), 8.5);
});

test('timeToHours parses HH:MM:SS', () => {
  approxEqual(timeToHours('08:30:45'), 8.5125);
});

test('timeToHours accepts unpadded hours', () => {
  approxEqual(timeToHours('8:30'), 8.5);
});

test('timeToHours treats missing seconds as zero', () => {
  approxEqual(timeToHours('08:30'), timeToHours('08:30:00'));
});

test('timeToHours rejects 24:00 by convention', () => {
  assert.throws(() => timeToHours('24:00'), RangeError);
  assert.throws(() => timeToHours('24:00:00'), RangeError);
});

test('timeToHours rejects out-of-range minutes and seconds', () => {
  assert.throws(() => timeToHours('12:60'), RangeError);
  assert.throws(() => timeToHours('12:30:60'), RangeError);
});

test('timeToHours rejects non-string input', () => {
  assert.throws(() => timeToHours(830), TypeError);
  assert.throws(() => timeToHours(null), TypeError);
});

test('timeToHours rejects malformed strings', () => {
  assert.throws(() => timeToHours('08:30:'), RangeError);
  assert.throws(() => timeToHours('08'), RangeError);
  assert.throws(() => timeToHours('08:30:00:00'), RangeError);
  assert.throws(() => timeToHours('08:30:1.5'), RangeError);
  assert.throws(() => timeToHours('-01:00'), RangeError);
});

test('hoursToTime formats zero as 00:00:00', () => {
  assert.equal(hoursToTime(0), '00:00:00');
});

test('hoursToTime formats an exact half-hour', () => {
  assert.equal(hoursToTime(8.5), '08:30:00');
});

test('hoursToTime formats seconds', () => {
  assert.equal(hoursToTime(8.5125), '08:30:45');
});

test('hoursToTime rejects inputs >= 24', () => {
  assert.throws(() => hoursToTime(24), RangeError);
  assert.throws(() => hoursToTime(24.5), RangeError);
});

test('hoursToTime rejects negative and non-finite inputs', () => {
  assert.throws(() => hoursToTime(-1), RangeError);
  assert.throws(() => hoursToTime(NaN), TypeError);
  assert.throws(() => hoursToTime(Infinity), TypeError);
  assert.throws(() => hoursToTime('8'), TypeError);
});

test('hoursToTime and timeToHours round-trip over the supported domain', () => {
  for (let h = 0; h < 24; h += 0.25) {
    const formatted = hoursToTime(h);
    const back = timeToHours(formatted);
    approxEqual(back, h, `round-trip failed for ${h}`);
  }
});

test('hoursToMinutes rounds to the nearest whole minute', () => {
  assert.equal(hoursToMinutes(1), 60);
  assert.equal(hoursToMinutes(1.5), 90);
  assert.equal(hoursToMinutes(1.0083), 60); // ~0.5 min, rounds up
  assert.equal(hoursToMinutes(1.0042), 60); // ~0.25 min, rounds up
});

test('hoursToMinutes rejects negative and non-finite inputs', () => {
  assert.throws(() => hoursToMinutes(-1), RangeError);
  assert.throws(() => hoursToMinutes(NaN), TypeError);
});

test('minutesToHours converts whole minutes to decimal hours', () => {
  approxEqual(minutesToHours(60), 1);
  approxEqual(minutesToHours(90), 1.5);
});

test('minutesToHours allows values beyond one day', () => {
  approxEqual(minutesToHours(1440), 24);
  approxEqual(minutesToHours(2880), 48);
});

test('minutesToHours rejects negative and non-finite inputs', () => {
  assert.throws(() => minutesToHours(-1), RangeError);
  assert.throws(() => minutesToHours(NaN), TypeError);
});

test('index.js re-exports the four core functions', async () => {
  // Importing the barrel here verifies that the public surface documented in
  // the README matches what core.js actually exports.
  const mod = await import('../src/index.js');
  assert.equal(typeof mod.hoursToTime, 'function');
  assert.equal(typeof mod.timeToHours, 'function');
  assert.equal(typeof mod.hoursToMinutes, 'function');
  assert.equal(typeof mod.minutesToHours, 'function');
});
