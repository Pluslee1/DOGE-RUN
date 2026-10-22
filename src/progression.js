import { CONFIG } from './config.js';

export const WORLDS = [
  { id: 'lagos', name: 'Lagos', flag: '🇳🇬', routes: ['Ojuelegba to Yaba', 'Lekki Link Bridge', 'Elegushi Beach', 'Lagos by Night'] },
  { id: 'japan', name: 'Japan', flag: '🇯🇵', routes: ['Sakura City', 'Sakura-dori', 'Hanami Boulevard', 'Sakura Station'] },
  { id: 'usa', name: 'USA', flag: '🇺🇸', routes: ['New York', 'Route 66', 'Miami Beach', 'Las Vegas'] },
];

export const UPGRADES = [
  { id: 'shieldDuration', name: 'Shield time', description: 'Power-up shields last longer.' },
  { id: 'magnetDuration', name: 'Magnet time', description: 'Bone and coin magnets last longer.' },
  { id: 'coinValue', name: 'Coin bonus', description: 'Each road coin is worth more.' },
];

const STORAGE_KEY = 'doge-rescue-career-v1';
const createDefault = () => ({
  coins: 0,
  selectedWorld: WORLDS[0].id,
  selectedLevel: 0,
  selectedVan: CONFIG.garage.vans[0].id,
  unlockedVans: [CONFIG.garage.vans[0].id],
  carriedDogColors: [],
  carriedDogs: [],
  shelteredDogs: [],
  shelteredDogTotal: 0,
  adoptedDogs: [],
  adoptedDogTotal: 0,
  carePackages: 0,
  shelterAdoptionAt: Date.now() + CONFIG.shelter.adoptionIntervalSeconds * 1000,
  shelterUpgrades: Object.fromEntries(Object.keys(CONFIG.shelter.upgradeCosts).map((id) => [id, 0])),
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
    profile.selectedVan = CONFIG.garage.vans.some((van) => van.id === saved.selectedVan)
      ? saved.selectedVan
      : profile.selectedVan;
    profile.unlockedVans = Array.from(new Set([
      CONFIG.garage.vans[0].id,
      ...(Array.isArray(saved.unlockedVans) ? saved.unlockedVans : []),
    ].filter((id) => CONFIG.garage.vans.some((van) => van.id === id))));
    const savedDogs = Array.isArray(saved.carriedDogs) ? saved.carriedDogs : [];
    profile.carriedDogs = savedDogs
      .filter((dog) => dog && CONFIG.dogs.colors.includes(dog.color))
      .slice(0, CONFIG.shelter.capacity)
      .map((dog, index) => ({
        name: typeof dog.name === 'string' && dog.name.trim()
          ? dog.name.trim().slice(0, 24)
          : CONFIG.dogs.names[index % CONFIG.dogs.names.length],
        color: dog.color,
      }));
    if (profile.carriedDogs.length === 0) {
      profile.carriedDogs = (Array.isArray(saved.carriedDogColors) ? saved.carriedDogColors : [])
        .filter((color) => CONFIG.dogs.colors.includes(color))
        .slice(0, CONFIG.shelter.capacity)
        .map((color, index) => ({
          name: CONFIG.dogs.names[index % CONFIG.dogs.names.length],
          color,
        }));
    }
    profile.carriedDogColors = profile.carriedDogs.map((dog) => dog.color);
    const savedShelteredDogs = Array.isArray(saved.shelteredDogs) ? saved.shelteredDogs : [];
    profile.shelteredDogs = savedShelteredDogs
      .filter((dog) => dog && CONFIG.dogs.colors.includes(dog.color))
      .slice(-CONFIG.shelter.rosterLimit)
      .map((dog, index) => ({
        name: typeof dog.name === 'string' && dog.name.trim()
          ? dog.name.trim().slice(0, 24)
          : CONFIG.dogs.names[index % CONFIG.dogs.names.length],
        color: dog.color,
      }));
    const savedAdoptedDogs = Array.isArray(saved.adoptedDogs) ? saved.adoptedDogs : [];
    profile.adoptedDogs = savedAdoptedDogs
      .filter((dog) => dog && CONFIG.dogs.colors.includes(dog.color))
      .slice(-CONFIG.shelter.rosterLimit)
      .map((dog, index) => ({
        name: typeof dog.name === 'string' && dog.name.trim()
          ? dog.name.trim().slice(0, 24)
          : CONFIG.dogs.names[index % CONFIG.dogs.names.length],
        color: dog.color,
      }));
    profile.adoptedDogTotal = Math.max(
      profile.adoptedDogs.length,
      Math.floor(Number(saved.adoptedDogTotal) || 0),
    );
    profile.carePackages = Math.max(0, Math.floor(Number(saved.carePackages) || 0));
    profile.shelteredDogTotal = Math.max(
      profile.shelteredDogs.length,
      Math.floor(Number(saved.shelteredDogTotal) || 0),
    );
    profile.shelterAdoptionAt = Math.max(0, Number(saved.shelterAdoptionAt) || 0)
      || Date.now() + (profile.shelteredDogs.length > CONFIG.shelter.residentComfortLimit
        ? CONFIG.shelter.crowdedAdoptionIntervalSeconds
        : CONFIG.shelter.adoptionIntervalSeconds) * 1000;
    profile.unlockedLevels = { ...profile.unlockedLevels, ...(saved.unlockedLevels || {}) };
    profile.upgrades = { ...(saved.upgrades || {}) };
    profile.shelterUpgrades = { ...profile.shelterUpgrades };
    for (const [id, costs] of Object.entries(CONFIG.shelter.upgradeCosts)) {
      profile.shelterUpgrades[id] = Math.min(
        costs.length,
        Math.max(0, Math.floor(Number(saved.shelterUpgrades?.[id]) || 0)),
      );
    }
    savedLevel = Math.max(0, Math.floor(Number(saved.selectedLevel) || 0));
  } catch {
    // Start with a clean profile when storage is unavailable or malformed.
  }
  profile.selectedLevel = Math.min(
    Math.max(0, Math.floor(Number(savedLevel) || 0)),
    CONFIG.progression.levelCount - 1,
  );
  if (!profile.unlockedVans.includes(profile.selectedVan)) profile.selectedVan = CONFIG.garage.vans[0].id;
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

function recordAdoption(dog) {
  profile.adoptedDogs.push(dog);
  profile.adoptedDogs = profile.adoptedDogs.slice(-CONFIG.shelter.rosterLimit);
  profile.adoptedDogTotal += 1;
  return dog;
}

export function recordShelterRescue(dogs) {
  const validDogs = (Array.isArray(dogs) ? dogs : [])
    .filter((dog) => dog && CONFIG.dogs.colors.includes(dog.color))
    .map((dog, index) => ({
      name: typeof dog.name === 'string' && dog.name.trim()
        ? dog.name.trim().slice(0, 24)
        : CONFIG.dogs.names[index % CONFIG.dogs.names.length],
      color: dog.color,
    }));
  if (validDogs.length === 0) return 0;
  profile.shelteredDogs.push(...validDogs);
  profile.shelteredDogTotal += validDogs.length;
  while (profile.shelteredDogs.length > CONFIG.shelter.rosterLimit) {
    recordAdoption(profile.shelteredDogs.shift());
  }
  if (!profile.shelterAdoptionAt) {
    profile.shelterAdoptionAt = Date.now() + CONFIG.shelter.adoptionIntervalSeconds * 1000;
  }
  return validDogs.length;
}

export function processShelterAdoptions(now = Date.now()) {
  if (!Number.isFinite(now)) return [];
  if (profile.shelteredDogs.length <= CONFIG.shelter.residentMinimum) {
    profile.shelterAdoptionAt = now + CONFIG.shelter.adoptionIntervalSeconds * 1000;
    return [];
  }
  if (profile.shelterAdoptionAt > now) return [];
  const adoptedDog = recordAdoption(profile.shelteredDogs.shift());
  const interval = profile.shelteredDogs.length > CONFIG.shelter.residentComfortLimit
    ? CONFIG.shelter.crowdedAdoptionIntervalSeconds
    : CONFIG.shelter.adoptionIntervalSeconds;
  profile.shelterAdoptionAt = now + interval * 1000;
  saveProfile();
  return [adoptedDog];
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

export function selectedVan() {
  return CONFIG.garage.vans.find((van) => van.id === profile.selectedVan) || CONFIG.garage.vans[0];
}

export function selectVan(id) {
  if (!profile.unlockedVans.includes(id)) return false;
  if (!CONFIG.garage.vans.some((van) => van.id === id)) return false;
  profile.selectedVan = id;
  saveProfile();
  return true;
}

export function unlockVan(id) {
  const van = CONFIG.garage.vans.find((candidate) => candidate.id === id);
  if (!van || profile.unlockedVans.includes(id) || profile.coins < van.price) return false;
  profile.coins -= van.price;
  profile.unlockedVans.push(id);
  profile.selectedVan = id;
  saveProfile();
  return true;
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

export function shelterUpgradeLevel(id) {
  const maximum = CONFIG.shelter.upgradeCosts[id]?.length || 0;
  return Math.min(maximum, Math.max(0, Math.floor(Number(profile.shelterUpgrades[id]) || 0)));
}

export function shelterUpgradeCount() {
  return Object.keys(CONFIG.shelter.upgradeCosts)
    .reduce((total, id) => total + shelterUpgradeLevel(id), profile.carePackages);
}

export function shelterLevel() {
  return 1 + shelterUpgradeCount();
}

export function shelterUpgradeCost(id) {
  return CONFIG.shelter.upgradeCosts[id]?.[shelterUpgradeLevel(id)] ?? null;
}

export function buyShelterUpgrade(id) {
  const cost = shelterUpgradeCost(id);
  if (cost === null || profile.coins < cost) return false;
  profile.coins -= cost;
  profile.shelterUpgrades[id] = shelterUpgradeLevel(id) + 1;
  saveProfile();
  return true;
}

export function shelterCarePackageCost() {
  return CONFIG.shelter.carePackageBaseCost
    + profile.carePackages * CONFIG.shelter.carePackageCostStep;
}

export function buyShelterCarePackage() {
  const cost = shelterCarePackageCost();
  if (profile.coins < cost) return false;
  profile.coins -= cost;
  profile.carePackages += 1;
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
