// Per-level balance. Wave sizes follow a fixed curve (threat points of
// wave w = b0 * (1 + G*w)^P); `hp` scales droid HP and shields for that
// level only (bounties stay the same, so it is a pure difficulty knob).
// hp values are written by the balance pass (tools/sim/tune.mjs); see
// BALANCE.md for the intent and BALANCE_REPORT.md for the bot results.

export const GROWTH = 0.3;
export const POWER = 1.3;
export const STRENGTH = {
  'kamino-2': { b0: 6, hp: 0.93 },
  'kamino-3': { b0: 6.5, hp: 1.15 },
  'kamino-4': { b0: 7, hp: 1.19 },
  'geonosis-1': { b0: 7, hp: 1.42 },
  'geonosis-2': { b0: 7, hp: 1.01 },
  'geonosis-3': { b0: 7.5, hp: 0.71 },
  'geonosis-4': { b0: 7.5, hp: 1.42 },
  'kashyyyk-1': { b0: 8, hp: 1.6 },
  'kashyyyk-2': { b0: 8, hp: 0.78 },
  'kashyyyk-3': { b0: 8, hp: 1.06 },
  'kashyyyk-4': { b0: 8, hp: 1.37 },
  'umbara-1': { b0: 8.5, hp: 0.75 },
  'umbara-2': { b0: 8.5, hp: 0.52 },
  'umbara-3': { b0: 8.5, hp: 0.97 },
  'umbara-4': { b0: 8.5, hp: 1.91 },
  'mustafar-1': { b0: 9, hp: 1.42 },
  'mustafar-2': { b0: 9, hp: 1.25 },
  'mustafar-3': { b0: 9, hp: 1.28 },
  'mustafar-4': { b0: 9, hp: 0.97 },
};
