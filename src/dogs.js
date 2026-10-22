import { CONFIG } from './config.js';
import { companionReaction } from './city-conditions.js';
import { generateNextMission } from './missions.js';

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

const DOG_COLORS = CONFIG.dogs.colors;
const GONE = new Set(['aboard', 'lost']);

export function createStopDogField(seed = 31415, existingNames = []) {
  return {
    dogs: [],
    seed,
    nextId: 0,
    usedNames: new Set(existingNames),
    boarded: Object.fromEntries(DOG_COLORS.map((color) => [color, 0])),
    boardTimer: 0,
  };
}

export function spawnStopDogs(field, stopY, task = null, stopIndex = 0, maxCount = Infinity) {
  const zoneSeed = (field.seed ^ Math.imul(stopIndex + 1, 0x9e3779b1)) >>> 0;
  const rng = makeRng(zoneSeed);
  const count = Math.min(maxCount, CONFIG.dogs.perStopMin
    + Math.floor(rng() * (CONFIG.dogs.perStopMax - CONFIG.dogs.perStopMin + 1)));
  const specialType = rng() < CONFIG.dogs.specialStopChance
    ? ['puppies', 'hazard', 'detour'][stopIndex % 3]
    : null;
  const specialDogIndex = specialType ? Math.floor(rng() * count) : -1;
  const alreadyReserved = task
    ? field.dogs.filter((dog) => dog.missionId === task.id && dog.color === task.color && !GONE.has(dog.state)).length
    : 0;
  const targetNeeded = task ? Math.max(0, task.count - task.progress - alreadyReserved) : 0;
  const targetCount = Math.min(count, targetNeeded);
  const colors = Array.from({ length: targetCount }, () => task.color);

  while (colors.length < count) {
    const colorIndex = Math.floor(rng() * DOG_COLORS.length);
    colors.push(DOG_COLORS[colorIndex]);
  }
  shuffle(colors, rng);

  const offsets = [];
  let totalSpan = 0;
  for (let index = 0; index < count; index++) {
    if (index > 0) {
      totalSpan += CONFIG.dogs.spacingMinPx
        + rng() * (CONFIG.dogs.spacingMaxPx - CONFIG.dogs.spacingMinPx);
    }
    offsets.push(totalSpan);
  }
  const centerOffset = totalSpan / 2;
  const curbX = CONFIG.road.right + CONFIG.dogs.sidewalkOffsetPx + CONFIG.dogs.width / 2;

  for (let index = 0; index < count; index++) {
    const name = makeDogName(field, rng);
    field.dogs.push({
      id: field.nextId++,
      name,
      stopIndex,
      missionId: task?.id ?? null,
      color: colors[index],
      x: curbX + (rng() - 0.5) * CONFIG.dogs.sidewalkJitterPx,
      y: stopY + offsets[index] - centerOffset,
      width: CONFIG.dogs.width * (index === specialDogIndex && specialType === 'puppies' ? CONFIG.dogs.specialPuppyScale : 1),
      height: CONFIG.dogs.height * (index === specialDogIndex && specialType === 'puppies' ? CONFIG.dogs.specialPuppyScale : 1),
      rotation: (rng() * 2 - 1) * CONFIG.dogs.idleRotationRadians,
      state: 'idle',
      enterT: 0,
      fromX: 0,
      fromY: 0,
      targetX: 0,
      targetY: 0,
      walkSpeed: CONFIG.dogs.walkSpeed * (0.88 + rng() * 0.24),
      specialType: index === specialDogIndex ? specialType : null,
      routePlan: index === specialDogIndex && ['detour', 'hazard'].includes(specialType)
        ? [{
          x: curbX - CONFIG.dogs.specialRouteDetourPx,
          y: stopY + offsets[index] - centerOffset,
        }]
        : [],
      routeVia: [],
    });
  }

  return count;
}

function makeDogName(field, rng) {
  const names = CONFIG.dogs.names;
  const baseName = names[Math.floor(rng() * names.length)];
  let name = baseName;
  let suffix = 2;
  while (field.usedNames.has(name)) {
    name = `${baseName} ${suffix++}`;
  }
  field.usedNames.add(name);
  return name;
}

export function updateStopDogs(game, field, dt) {
  game.isRescuing = false;
  game.lastRescueTimer = Math.max(0, (game.lastRescueTimer || 0) - dt);
  const van = game.van;
  const sideDoorX = van.x + van.width * CONFIG.dogs.doorOffsetRatio;
  const sideDoorY = van.y + CONFIG.dogs.doorOffsetY;
  for (const zone of game.stops.zones) {
    if (zone.isShelter) {
      zone.dogsSpawned = true;
      continue;
    }
    if (
      (zone.state === 'upcoming' || zone.state === 'active')
      && !zone.dogsSpawned
      && zone.startZ - game.distance <= CONFIG.dogs.spawnLeadMeters
    ) {
      const capacityLeft = Math.max(0, CONFIG.shelter.capacity - game.onboardDogs);
      const distanceToStopCenter = (zone.startZ + zone.endZ) / 2 - game.distance;
      const stopY = van.y - distanceToStopCenter * CONFIG.distance.pixelsPerMeter;
      zone.dogCount = capacityLeft > 0
        ? spawnStopDogs(field, stopY, game.task, zone.index, capacityLeft)
        : 0;
      const specialDog = field.dogs.find((dog) => dog.stopIndex === zone.index && dog.specialType);
      zone.specialType = specialDog?.specialType || null;
      zone.specialLabel = ({ puppies: 'PUPPIES', hazard: 'HAZARD RESCUE', detour: 'SCENIC ROUTE' })[zone.specialType] || null;
      zone.dogsSpawned = true;
    }
    if (
      (zone.state === 'upcoming' || zone.state === 'active')
      && (zone.recovered || (game.parking.autoHoldForRescue && zone.index === game.parking.zoneIndex))
      && zone.dogsBoarded < zone.dogCount
      && zone.startZ - game.distance <= CONFIG.dogs.spawnLeadMeters
    ) {
      const existingDogs = field.dogs.filter((dog) => dog.stopIndex === zone.index && !GONE.has(dog.state)).length;
      const distanceToStopCenter = (zone.startZ + zone.endZ) / 2 - game.distance;
      const stopY = van.y - distanceToStopCenter * CONFIG.distance.pixelsPerMeter;
      const missingDogs = Math.max(0, zone.dogCount - zone.dogsBoarded - existingDogs);
      const restored = missingDogs > 0
        ? spawnStopDogs(field, stopY, game.task, zone.index, missingDogs)
        : 0;
      zone.dogCount = zone.dogsBoarded + existingDogs + restored;
      zone.recovered = false;
    }
  }

  const autoHoldZone = game.parking.autoHoldForRescue
    ? game.stops.zones.find((zone) => zone.index === game.parking.zoneIndex && !zone.isShelter)
    : null;
  const stopZone = autoHoldZone || game.stops.zones.find((zone) => (
    (zone.state === 'active' || zone.state === 'completed')
    && game.distance >= zone.startZ
    && game.distance <= zone.endZ
    && van.lane === zone.lane
  ));

  if (game.shelterUnloading) updateShelterDogs(game, dt, sideDoorX, sideDoorY);

  if (field.boardTimer > 0) field.boardTimer = Math.max(0, field.boardTimer - dt);

  const dogsBoarded = stopZone && stopZone.dogCount > 0
    && stopZone.dogsBoarded >= stopZone.dogCount;
  const isParked = Boolean(
    stopZone
    && !dogsBoarded
    && game.parking
    && (game.parking.autoHoldForRescue
      || (game.parking.state === 'parked'
        && Math.abs(game.vanSpeed) <= CONFIG.parking.stopSpeed)),
  );

  if (game.parking.autoHoldForRescue && stopZone) {
    const waitingDogs = field.dogs
      .filter((dog) => dog.stopIndex === stopZone.index && dog.state === 'idle')
      .sort((a, b) => a.id - b.id);
    const center = (waitingDogs.length - 1) / 2;
    waitingDogs.forEach((dog, index) => {
      dog.y = van.y + (index - center) * CONFIG.dogs.lineSpacingPx;
    });
  }

  if (!isParked) {
    for (const dog of field.dogs) {
      if (dog.state === 'walking' || dog.state === 'entering') {
        dog.state = 'idle';
        dog.x = dog.fromX;
        dog.y = dog.fromY;
      }
    }
  }

  let activeDog = field.dogs.some((dog) => dog.state === 'walking' || dog.state === 'entering');

  for (const dog of field.dogs) {
    if (dog.state === 'idle') {
      dog.y += game.vanSpeed * dt;
      if (
        isParked
        && dog.stopIndex === stopZone.index
        && !activeDog
        && field.boardTimer <= 0
        && Math.abs(dog.y - van.y) <= CONFIG.stops.zoneLengthMeters * CONFIG.distance.pixelsPerMeter
      ) {
        dog.state = 'walking';
        dog.fromX = dog.x;
        dog.fromY = dog.y;
        dog.targetX = sideDoorX;
        dog.targetY = sideDoorY;
        dog.routeVia = dog.routePlan?.map((point) => ({ ...point })) || [];
        if (dog.routeVia.length) {
          dog.finalTargetX = sideDoorX;
          dog.finalTargetY = sideDoorY;
          const waypoint = dog.routeVia[0];
          dog.targetX = waypoint.x;
          dog.targetY = waypoint.y;
        }
        activeDog = true;
        game.parking.boardingInProgress = true;
        game.isRescuing = true;
      }
    } else if (dog.state === 'walking') {
      const dx = dog.targetX - dog.x;
      const dy = dog.targetY - dog.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= CONFIG.dogs.doorArrivalDistancePx) {
        if (dog.routeVia?.length) {
          dog.routeVia.shift();
          const waypoint = dog.routeVia[0];
          dog.targetX = waypoint?.x ?? dog.finalTargetX;
          dog.targetY = waypoint?.y ?? dog.finalTargetY;
          if (!waypoint) dog.routeVia = [];
          continue;
        }
        dog.state = 'entering';
        dog.enterT = 0;
        dog.fromX = dog.x;
        dog.fromY = dog.y;
      } else {
        dog.x += (dx / distance) * dog.walkSpeed * dt;
        dog.y += (dy / distance) * dog.walkSpeed * dt;
      }
    } else if (dog.state === 'entering') {
      dog.enterT = Math.min(dog.enterT + dt, CONFIG.dogs.enterSeconds);
      const progress = CONFIG.dogs.enterSeconds > 0 ? dog.enterT / CONFIG.dogs.enterSeconds : 1;
      const eased = easeIn(progress);
      dog.x = dog.fromX + (dog.targetX - dog.fromX) * eased;
      dog.y = dog.fromY + (dog.targetY - dog.fromY) * eased;

      if (progress >= 1) {
        dog.state = 'aboard';
        field.boarded[dog.color] = (field.boarded[dog.color] || 0) + 1;
        game.van.rescued++;
        game.rescued++;
        companionReaction(game, 'rescueMessage');
        game.lastRescueName = dog.name;
        game.lastRescueTimer = CONFIG.dogs.nameToastSeconds;
        game.carriedDogs ||= [];
        if (game.carriedDogs.length < CONFIG.shelter.capacity) {
          game.carriedDogs.push({ name: dog.name, color: dog.color });
        }
        game.carriedDogColors ||= [];
        game.carriedDogColors = game.carriedDogs.map((savedDog) => savedDog.color);
        game.onboardDogs = game.carriedDogColors.length;

        const boardedZone = game.stops.zones.find((zone) => zone.index === dog.stopIndex);
        if (boardedZone) {
          boardedZone.dogsBoarded = Math.min(boardedZone.dogsBoarded + 1, boardedZone.dogCount);
          if (boardedZone.dogsBoarded >= boardedZone.dogCount) {
            game.parking.boardingComplete = true;
            game.parking.boardingInProgress = false;
            game.parking.autoHoldForRescue = false;
            game.parking.autoHoldTargetZ = null;
            // Resume the van automatically after the final dog boards, even if
            // BRAKE is still held; releasing BRAKE restores normal control.
            game.parking.autoReleasedBrake = true;
          }
        }

        if (game.task && dog.color === game.task.color) {
          game.task.progress++;
          if (game.task.progress >= game.task.count) {
            game.tasksCompleted++;
            game.collected += CONFIG.tasks.scorePerTask;
            game.celebrationTimer = CONFIG.tasks.celebrationDuration;
            game.task = generateNextMission(
              game.task,
              game.missionSeed + game.nextMissionId * 0x9e3779b1,
              game.nextMissionId,
            );
            game.nextMissionId++;
          }
        }

        field.boardTimer = CONFIG.dogs.boardDelay;
      }
    }
  }

  game.isRescuing = game.isRescuing || field.dogs.some((dog) => (
    dog.stopIndex === stopZone?.index && (dog.state === 'walking' || dog.state === 'entering')
  ));
  field.dogs = field.dogs.filter((dog) => (
    !GONE.has(dog.state) && dog.y < CONFIG.logicalHeight + dog.height
  ));
}

function updateShelterDogs(game, dt, sideDoorX, sideDoorY) {
  const unloading = game.shelterUnloading;
  game.shelterDogs ||= [];
  unloading.spawnTimer += dt;
  while (unloading.dispatched < unloading.total
    && unloading.spawnTimer >= CONFIG.shelter.unloadSpawnSeconds) {
    unloading.spawnTimer -= CONFIG.shelter.unloadSpawnSeconds;
    const color = game.carriedDogColors[unloading.dispatched] || DOG_COLORS[unloading.dispatched % DOG_COLORS.length];
    game.shelterDogs.push({
      id: unloading.dispatched,
      color,
      x: sideDoorX,
      y: sideDoorY,
      width: CONFIG.dogs.width,
      height: CONFIG.dogs.height,
      rotation: 0,
      state: 'walking',
      targetX: unloading.targetX,
      targetY: unloading.targetY,
      walkSpeed: CONFIG.shelter.unloadWalkSpeed,
    });
    unloading.dispatched++;
  }

  for (const dog of game.shelterDogs) {
    if (dog.state === 'walking') {
      const dx = dog.targetX - dog.x;
      const dy = dog.targetY - dog.y;
      const distance = Math.hypot(dx, dy);
      const step = dog.walkSpeed * dt;
      if (distance <= Math.max(step, CONFIG.dogs.doorArrivalDistancePx)) {
        dog.x = dog.targetX;
        dog.y = dog.targetY;
        dog.state = 'entering';
        dog.enterT = 0;
      } else if (distance > 0) {
        dog.x += (dx / distance) * step;
        dog.y += (dy / distance) * step;
      }
    } else if (dog.state === 'entering') {
      dog.enterT += dt;
      if (dog.enterT >= CONFIG.dogs.enterSeconds) {
        dog.state = 'sheltered';
        unloading.dogsRemaining--;
      }
    }
  }
}

export function getBoardedByColor(field) {
  return field.boarded;
}

function shuffle(values, rng) {
  for (let index = values.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
}

function easeIn(progress) {
  return 1 - (1 - progress) * (1 - progress);
}
