# Decimal Time Converter

Converts between 24-hour sexagesimal time strings (`HH:MM`, `HH:MM:SS`) and decimal hours. Intended for payroll, billing, and scientific time tracking where durations are recorded in hours with fractional parts.

## Usage

```js
import { timeToHours, hoursToTime, hoursToMinutes, minutesToHours } from 'decimal-time-converter';

const worked = timeToHours('08:30');    // 8.5
const formatted = hoursToTime(8.5);     // "08:30:00"
const billedMinutes = hoursToMinutes(8.5);   // 510
const asHours = minutesToHours(510);    // 8.5
```

## Why this exists

Payroll systems commonly record time worked in decimal hours (`8.5` rather than `8:30`), while humans read and enter time in sexagesimal form. This library does exactly that conversion in both directions, with input validation strict enough to catch typos like `24:00` or `12:60` before they silently corrupt a paycheck.

The deliberate trade-off is range. This library models a single 24-hour day, not durations or intervals. A 48-hour shift is out of scope for `hoursToTime` and `timeToHours`; if you need durations, use `minutesToHours` (which has no upper bound) and format the result yourself. Keeping the clock functions bounded to `[00:00, 24:00)` makes round-tripping lossless and the error cases unambiguous.

## Edge cases you will hit

- **`24:00` is rejected.** The library treats the clock domain as `[00:00, 24:00)`, matching ISO 8601's convention that `24:00` denotes the instant that begins the next day, not a time to be converted. If you have data containing `24:00`, normalize it to `00:00` before calling `timeToHours`.
- **Seconds are optional on input, always present on output.** `timeToHours('08:30')` and `timeToHours('08:30:00')` are equal. `hoursToTime` always returns `HH:MM:SS`; if you want `HH:MM`, strip the trailing `:00` yourself.
- **No timezones, no `Date`, no "now".** This is pure arithmetic on strings and numbers. If you need the current time, obtain it yourself and pass it in.
- **Floating point.** `timeToHours` and `minutesToHours` round to 6 decimal places (3.6 ms resolution) so that `8.5` stays `8.5` rather than `8.500000000000001`. Six places is finer than any payroll or scientific use case needs while remaining exact for every one-second sexagesimal value.
