import { CONFIG } from './config.js';

function makeRng(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createMission(seed, id = 0) {
  return generateMission(null, seed, id);
}

export function generateNextMission(previousMission, seed, id) {
  return generateMission(previousMission, seed, id);
}

function generateMission(previousMission, seed, id) {
  const rng = makeRng(seed);
  const availableColors = CONFIG.dogs.colors.filter((color) => color !== previousMission?.color);
  const color = availableColors[Math.floor(rng() * availableColors.length)];
  const count = CONFIG.tasks.minCount
    + Math.floor(rng() * (CONFIG.tasks.maxCount - CONFIG.tasks.minCount + 1));
  return { id, color, count, progress: 0 };
}
