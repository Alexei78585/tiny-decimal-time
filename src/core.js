/**
 * Decimal Time Converter — core conversion logic.
 *
 * Conventions chosen (stated plainly so users and tests share one reality):
 *
 * 1. Input range for the 24-hour clock is [00:00, 24:00). The value 24:00 is
 *    treated as invalid. This matches ISO 8601's "start of day" convention
 *    where 24:00 is reserved for a *point in time* that equals the following
 *    00:00, not a duration to be converted to decimal hours.
 *
 * 2. Seconds are an optional field. "08:30" means 8.5 decimal hours exactly,
 *    and "08:30:00" means the same thing. We do not produce a fractional
 *    result for "08:30:00"; an exact half-hour is 8.5, full stop.
 *
 * 3. Decimal hours are returned as ordinary JS numbers. For payroll use, the
 *    unavoidable 0.1 + 0.2 floating-point representation error is handled by
 *    rounding to 6 decimal places, which keeps 8.5 as 8.5 rather than
 *    8.500000000000001. Six places is precise to 3.6 milliseconds — finer
 *    than any payroll or scientific time sheet needs — while still exact for
 *    every sexagesimal value down to one-second resolution.
 *
 * 4. No leap seconds. This library assumes every minute has 60 seconds.
 *
 * 5. No Date objects, no timezones, no "now". Pure arithmetic on strings and
 *    numbers. If a caller wants the current time converted, they obtain it
 *    themselves and pass it in. This keeps the library deterministic.
 */

/**
 * Rounds to 6 decimal places without ever producing scientific-notation
 * strings, which toFixed() can do for very large/small inputs. We multiply,
 * round at the integer level, then divide — this keeps the result a Number
 * and avoids the "0.1 + 0.2" class of drift for the magnitudes we care about
 * (0–24 hours).
 *
 * @param {number} n
 * @returns {number}
 */
function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Parse a strict "HH:MM" or "HH:MM:SS" string into a Number of decimal hours.
 *
 * Accepts a leading zero or a leading space, e.g. " 8:30" and "08:30" are
 * both valid and equal. We trim whitespace because users paste times from
 * spreadsheets where leading/trailing spaces are common and invisible.
 *
 * Rejects "24:00:00" and any hour >= 24, per convention (1) above. Rejects
 * minutes >= 60 and seconds >= 60 (no leap seconds — convention 4).
 *
 * @param {string} time — "HH:MM" or "HH:MM:SS", optionally padded with spaces.
 * @returns {number} decimal hours, e.g. 8.5 for "08:30".
 * @throws {TypeError} if the input is not a string.
 * @throws {RangeError} if the string is not a valid 24-hour time in range.
 */
export function timeToHours(time) {
  if (typeof time !== 'string') {
    throw new TypeError(`timeToHours expects a string, got ${typeof time}`);
  }
  const trimmed = time.trim();
  const parts = trimmed.split(':');
  if (parts.length !== 2 && parts.length !== 3) {
    throw new RangeError(`Expected HH:MM or HH:MM:SS, got "${time}"`);
  }

  // Reject anything that isn't a plain non-negative decimal integer in each
  // slot. This naturally excludes "-01", "1.5", "1e2", "", and "+08".
  // (We allow "+" implicitly via /^\d+$/ which excludes it; see below.)
  const digitTest = /^\d+$/;
  const hourStr = parts[0];
  const minuteStr = parts[1];
  if (!digitTest.test(hourStr) || !digitTest.test(minuteStr)) {
    throw new RangeError(`Non-digit in time field: "${time}"`);
  }

  const hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr, 10);
  let seconds = 0;

  if (parts.length === 3) {
    if (!digitTest.test(parts[2])) {
      throw new RangeError(`Non-digit in seconds field: "${time}"`);
    }
    seconds = parseInt(parts[2], 10);
  }

  // 24:00 is reserved by convention (1). 24:00:01 etc. are obviously invalid.
  if (hours >= 24) {
    throw new RangeError(`Hour out of range [00, 24): "${time}"`);
  }
  if (minutes >= 60) {
    throw new RangeError(`Minute out of range [00, 60): "${time}"`);
  }
  if (seconds >= 60) {
    throw new RangeError(`Second out of range [00, 60): "${time}"`);
  }

  return round6(hours + minutes / 60 + seconds / 3600);
}

/**
 * Format a Number of decimal hours as an "HH:MM:SS" string.
 *
 * Negative inputs are rejected. Inputs >= 24 are rejected, mirroring the
 * input range of timeToHours so the two functions round-trip over the same
 * domain.
 *
 * Seconds are always emitted, even when zero. This keeps the output shape
 * stable for consumers like formatters that expect three fields. If you want
 * a shorter form, strip the trailing ":00" yourself — we will not guess.
 *
 * @param {number} hours — decimal hours, e.g. 8.5.
 * @returns {string} "HH:MM:SS" zero-padded.
 * @throws {TypeError} if the input is not a finite Number.
 * @throws {RangeError} if the input is negative or >= 24.
 */
export function hoursToTime(hours) {
  if (typeof hours !== 'number' || !Number.isFinite(hours)) {
    throw new TypeError(`hoursToTime expects a finite number, got ${String(hours)}`);
  }
  if (hours < 0) {
    throw new RangeError(`Negative hours not allowed: ${hours}`);
  }
  if (hours >= 24) {
    throw new RangeError(`Hours out of range [0, 24): ${hours}`);
  }

  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Convert decimal hours to a Number of whole minutes, rounded to the nearest
 * minute. Uses "round half up" (Math.round) because that is what payroll
 * systems conventionally do for partial-minute billing.
 *
 * @param {number} hours
 * @returns {number} whole minutes.
 * @throws {TypeError} if the input is not a finite Number.
 * @throws {RangeError} if the input is negative.
 */
export function hoursToMinutes(hours) {
  if (typeof hours !== 'number' || !Number.isFinite(hours)) {
    throw new TypeError(`hoursToMinutes expects a finite number, got ${String(hours)}`);
  }
  if (hours < 0) {
    throw new RangeError(`Negative hours not allowed: ${hours}`);
  }
  return Math.round(hours * 60);
}

/**
 * Convert a Number of minutes into decimal hours.
 *
 * No range restriction: durations expressed in minutes can exceed a day. We
 * only reject negatives (a duration is non-negative) and non-finite numbers.
 *
 * @param {number} minutes
 * @returns {number} decimal hours, rounded to 6 places.
 * @throws {TypeError} if the input is not a finite Number.
 * @throws {RangeError} if the input is negative.
 */
export function minutesToHours(minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    throw new TypeError(`minutesToHours expects a finite number, got ${String(minutes)}`);
  }
  if (minutes < 0) {
    throw new RangeError(`Negative minutes not allowed: ${minutes}`);
  }
  return round6(minutes / 60);
}
