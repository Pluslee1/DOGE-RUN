import { CONFIG } from './config.js';

export const WORLDS = [
  { id: 'lagos', name: 'Lagos', flag: '🇳🇬', routes: ['Ojuelegba to Yaba', 'Lekki Link Bridge', 'Elegushi Beach', 'Lagos by Night'] },
  { id: 'japan', name: 'Japan', flag: '🇯🇵', routes: ['Doge City', 'The Wilds', 'Doge Beach', 'Neon Doge City'] },
  { id: 'usa', name: 'USA', flag: '🇺🇸', routes: ['Big Apple', 'Route 66', 'Miami Beach', 'Vegas Strip'] },
];

export const UPGRADES = [
  { id: 'shieldDuration', name: 'Shield time', description: 'Power-up shields last longer.' },
  { id: 'magnetDuration', name: 'Magnet time', description: 'Bone and coin magnets last longer.' },
  { id: 'startingShield', name: 'Start shielded', description: 'Begin each run with a short shield.' },
  { id: 'coinValue', name: 'Coin bonus', description: 'Each road coin is worth more.' },
];

const STORAGE_KEY = 'doge-rescue-career-v1';
const createDefault = () => ({
  coins: 0,
  selectedWorld: WORLDS[0].id,
  selectedLevel: 0,
  unlockedLevels: Object.fromEntries(WORLDS.map((world) => [world.id, 0])),
  upgrades: {},
});

function loadProfile() {
  const profile = createDefault();
  let savedLevel = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    profile.coins = Math.max(0, Math.floor(Number(saved.coins) || 0));
    profile.selectedWorld = WORLDS.some((world) => world.id === saved.selectedWorld)
      ? saved.selectedWorld
      : profile.selectedWorld;
    profile.unlockedLevels = { ...profile.unlockedLevels, ...(saved.unlockedLevels || {}) };
    profile.upgrades = { ...(saved.upgrades || {}) };
    savedLevel = Math.max(0, Math.floor(Number(saved.selectedLevel) || 0));
  } catch {
    // Start with a clean profile when storage is unavailable or malformed.
  }
  profile.selectedLevel = Math.min(
    Math.max(0, Math.floor(Number(savedLevel) || 0)),
    CONFIG.progression.levelCount - 1,
  );
  return profile;
}

export const profile = loadProfile();

export function saveProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // The current session remains playable when browser storage is disabled.
  }
}

export function selectRoute(worldId, level) {
  const world = WORLDS.find((candidate) => candidate.id === worldId);
  if (!world) return false;
  const unlocked = Math.min(
    Math.max(0, Math.floor(Number(profile.unlockedLevels[worldId]) || 0)),
    CONFIG.progression.levelCount - 1,
  );
  if (!Number.isInteger(level) || level < 0 || level > unlocked) return false;
  profile.selectedWorld = worldId;
  profile.selectedLevel = level;
  saveProfile();
  return true;
}

export function selectedRoute() {
  const world = WORLDS.find((candidate) => candidate.id === profile.selectedWorld) || WORLDS[0];
  const level = Math.min(profile.selectedLevel, world.routes.length - 1);
  return { worldId: world.id, worldName: world.name, flag: world.flag, level, name: world.routes[level] };
}

export function upgradeLevel(id) {
  return Math.max(0, Math.floor(Number(profile.upgrades[id]) || 0));
}

export function upgradeCost(id) {
  const costs = CONFIG.garage.upgradeCosts[id] || [];
  return costs[upgradeLevel(id)] ?? null;
}

export function buyUpgrade(id) {
  const cost = upgradeCost(id);
  if (cost === null || profile.coins < cost) return false;
  profile.coins -= cost;
  profile.upgrades[id] = upgradeLevel(id) + 1;
  saveProfile();
  return true;
}

export function earnCoins(baseAmount) {
  const multiplier = 1 + upgradeLevel('coinValue');
  const earned = Math.max(0, Math.floor(baseAmount * CONFIG.coins.value * multiplier));
  profile.coins += earned;
  saveProfile();
  return earned;
}

export function recordTaskCompletion(route) {
  if (!route || !Object.prototype.hasOwnProperty.call(profile.unlockedLevels, route.worldId)) return;
  const nextLevel = Math.min(route.level + 1, CONFIG.progression.levelCount - 1);
  profile.unlockedLevels[route.worldId] = Math.max(profile.unlockedLevels[route.worldId], nextLevel);
  saveProfile();
}
