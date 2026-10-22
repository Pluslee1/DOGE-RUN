import { CONFIG } from './config.js';

const CONDITION_ORDER = ['rain', 'sunset', 'roadworks', 'market'];

export function cityConditionAt(seed, distance) {
  const settings = CONFIG.cityConditions;
  if (distance < settings.firstEventMeters) return 'clear';

  const section = Math.floor((distance - settings.firstEventMeters) / settings.segmentMeters);
  const sectionOffset = (distance - settings.firstEventMeters) % settings.segmentMeters;
  if (sectionOffset >= settings.activeMeters) return 'clear';

  const rng = makeRng((seed ^ settings.seedSalt ^ Math.imul(section + 1, settings.segmentSeedMultiplier)) >>> 0);
  if (rng() >= settings.eventChance) return 'clear';

  const weights = settings.eventWeights;
  const totalWeight = CONDITION_ORDER.reduce((sum, condition) => sum + weights[condition], 0);
  let roll = rng() * totalWeight;
  for (const condition of CONDITION_ORDER) {
    roll -= weights[condition];
    if (roll < 0) return condition;
  }
  return CONDITION_ORDER[CONDITION_ORDER.length - 1];
}

export function cityConditionLabel(worldId, condition) {
  const labels = {
    clear: worldId === 'japan' ? 'SAKURA PETALS' : 'CITY DRIVE',
    rain: worldId === 'japan' ? 'RAIN · PETALS' : 'RAINY ROAD',
    sunset: 'GOLDEN HOUR',
    roadworks: 'ROADWORKS AHEAD',
    market: worldId === 'japan' ? 'SAKURA MARKET' : 'BUSY MARKET',
  };
  return labels[condition] || labels.clear;
}

export function companionReaction(game, message) {
  game.companionMessage = CONFIG.companion[message] || CONFIG.companion.idleMessage;
  game.companionTimer = CONFIG.companion.reactionSeconds;
}

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
