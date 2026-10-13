import { CONFIG } from './config.js';
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

export function createStopDogField(seed = 31415) {
  return {
    dogs: [],
    seed,
    nextId: 0,
    boarded: Object.fromEntries(DOG_COLORS.map((color) => [color, 0])),
    boardTimer: 0,
  };
}

export function spawnStopDogs(field, stopY, task = null, stopIndex = 0) {
  const zoneSeed = (field.seed ^ Math.imul(stopIndex + 1, 0x9e3779b1)) >>> 0;
  const rng = makeRng(zoneSeed);
  const count = CONFIG.dogs.perStopMin
    + Math.floor(rng() * (CONFIG.dogs.perStopMax - CONFIG.dogs.perStopMin + 1));
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
    field.dogs.push({
      id: field.nextId++,
      stopIndex,
      missionId: task?.id ?? null,
      color: colors[index],
      x: curbX + (rng() - 0.5) * CONFIG.dogs.sidewalkJitterPx,
      y: stopY + offsets[index] - centerOffset,
      width: CONFIG.dogs.width,
      height: CONFIG.dogs.height,
      rotation: (rng() * 2 - 1) * CONFIG.dogs.idleRotationRadians,
      state: 'idle',
      enterT: 0,
      fromX: 0,
      fromY: 0,
      targetX: 0,
      targetY: 0,
      walkSpeed: CONFIG.dogs.walkSpeed * (0.88 + rng() * 0.24),
    });
  }

  return count;
}

export function updateStopDogs(game, field, dt) {
  game.isRescuing = false;
  const van = game.van;
  const sideDoorX = van.x + van.width * CONFIG.dogs.doorOffsetRatio;
  const sideDoorY = van.y + CONFIG.dogs.doorOffsetY;
  const stopZone = game.stops.zones.find((zone) => (
    (zone.state === 'active' || zone.state === 'completed')
    && game.distance >= zone.startZ
    && game.distance <= zone.endZ
    && van.lane === zone.lane
  ));

  for (const zone of game.stops.zones) {
    if (
      zone.state === 'upcoming'
      && !zone.dogsSpawned
      && zone.startZ - game.distance <= CONFIG.dogs.spawnLeadMeters
    ) {
      const distanceToStopCenter = (zone.startZ + zone.endZ) / 2 - game.distance;
      const stopY = van.y - distanceToStopCenter * CONFIG.distance.pixelsPerMeter;
      zone.dogCount = spawnStopDogs(field, stopY, game.task, zone.index);
      zone.dogsSpawned = true;
    }
  }

  if (field.boardTimer > 0) field.boardTimer = Math.max(0, field.boardTimer - dt);

  const dogsBoarded = stopZone && stopZone.dogCount > 0
    && stopZone.dogsBoarded >= stopZone.dogCount;
  const isParked = Boolean(
    stopZone
    && !dogsBoarded
    && game.parking
    && game.parking.state === 'parked'
    && game.vanSpeed <= CONFIG.parking.stopSpeed,
  );

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
        activeDog = true;
        game.parking.boardingInProgress = true;
        game.isRescuing = true;
      }
    } else if (dog.state === 'walking') {
      const dx = dog.targetX - dog.x;
      const dy = dog.targetY - dog.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= CONFIG.dogs.doorArrivalDistancePx) {
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

        const boardedZone = game.stops.zones.find((zone) => zone.index === dog.stopIndex);
        if (boardedZone) {
          boardedZone.dogsBoarded = Math.min(boardedZone.dogsBoarded + 1, boardedZone.dogCount);
          if (boardedZone.dogsBoarded >= boardedZone.dogCount) {
            game.parking.boardingComplete = true;
            game.parking.boardingInProgress = false;
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
