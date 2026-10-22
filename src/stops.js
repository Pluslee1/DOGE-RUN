import { CONFIG } from './config.js';

export function createStopSystem() {
  const stops = {
    zones: [],
    nextIndex: 0,
    completed: 0,
    missed: 0,
    combo: 0,
    dwellProgress: 0,
    feedback: '',
    feedbackTimer: 0,
    successTimer: 0,
  };

  fillUpcomingZones(stops);
  return stops;
}

export function updateStopSystem(game, dt, buttons) {
  const stops = game.stops;
  stops.feedbackTimer = Math.max(0, stops.feedbackTimer - dt);
  stops.successTimer = Math.max(0, stops.successTimer - dt);
  stops.dwellProgress = 0;

  stops.zones = stops.zones.filter((zone) => (
    zone.state === 'upcoming'
    || zone.state === 'active'
    || (zone.state === 'missed'
      && zone.endZ >= game.distance - CONFIG.stops.reverseRecoveryMeters)
    || (zone.state === 'completed'
      && zone.endZ >= game.distance - CONFIG.stops.zoneLengthMeters)
  ));

  if (game.vanSpeed < 0) {
    const recoverableZone = [...stops.zones].reverse().find((item) => (
      item.state === 'missed'
      && game.distance <= item.endZ + CONFIG.stops.reverseRecoveryMeters
    ));
    if (recoverableZone) {
      recoverableZone.state = 'upcoming';
      recoverableZone.recovered = true;
      recoverableZone.dwellTimer = 0;
      recoverableZone.dwellReady = false;
      recoverableZone.dwellStartedElapsed = null;
      stops.missed = Math.max(0, stops.missed - 1);
    }
  }

  syncShelterStop(game);

  const zone = stops.zones.find((item) => item.state === 'upcoming' || item.state === 'active');
  if (!zone) {
    fillUpcomingZones(stops);
    return;
  }

  if (game.distance > zone.endZ) {
    zone.dwellTimer = 0;
    zone.dwellReady = false;
    zone.dwellStartedElapsed = null;
    if (game.vanSpeed < 0) {
      fillUpcomingZones(stops);
      return;
    }
    if (zone.state !== 'completed') {
      zone.state = 'missed';
      stops.missed += 1;
      stops.combo = 0;
      stops.feedback = '';
      stops.feedbackTimer = 0;
      stops.successTimer = 0;
    }
    fillUpcomingZones(stops);
    return;
  }

  if (game.distance >= zone.startZ) {
    if (zone.state === 'upcoming') {
      zone.state = 'active';
      zone.enteredAtElapsed = game.elapsed;
    }

    const brakeHeld = buttons && buttons.isPressed('brake');
    const zoneLane = game.van.lane === zone.lane;
    const stopped = speedKph(game.vanSpeed) <= CONFIG.stops.speedThresholdKph;

    if (brakeHeld && zoneLane && stopped) {
      if (zone.dwellTimer === 0) zone.dwellStartedElapsed = game.elapsed;
      zone.dwellTimer += dt;
      stops.dwellProgress = Math.min(zone.dwellTimer / CONFIG.stops.dwellSeconds, 1);
      if (zone.dwellTimer >= CONFIG.stops.dwellSeconds) zone.dwellReady = true;
    } else {
      if (!zone.dwellReady) {
        zone.dwellTimer = 0;
        zone.dwellStartedElapsed = null;
      }
    }

    if (zone.isShelter) {
      if (zone.dwellReady && !game.shelterUnloading && game.onboardDogs > 0) {
        beginShelterUnload(game, zone);
      }
      if (game.shelterUnloading?.zoneIndex === zone.index
        && game.shelterUnloading.dispatched >= game.shelterUnloading.total
        && game.shelterUnloading.dogsRemaining <= 0) {
        completeShelterDrop(game, zone);
      }
    } else if (zone.dwellReady && zone.dogsSpawned && zone.dogCount > 0 && zone.dogsBoarded >= zone.dogCount) {
      completeStop(game, zone);
    }
  }

  fillUpcomingZones(stops);
}

export function nextStopZone(game) {
  return game.stops.zones.find((zone) => zone.state === 'upcoming' || zone.state === 'active') || null;
}

function createZone(index) {
  const config = CONFIG.stops;
  const startZ = config.firstStopMeters + index * config.intervalMeters;
  return {
    startZ,
    endZ: startZ + config.zoneLengthMeters,
    name: config.names[index % config.names.length],
    index,
    lane: CONFIG.lanes.count - 1,
    isShelter: false,
    state: 'upcoming',
    dogsSpawned: false,
    recovered: false,
    dogCount: 0,
    dogsBoarded: 0,
    dwellReady: false,
    dwellTimer: 0,
    enteredAtElapsed: null,
    dwellStartedElapsed: null,
  };
}

function syncShelterStop(game) {
  if (game.onboardDogs < CONFIG.shelter.capacity) return;
  game.shelterDue = true;
  const nextZone = game.stops.zones.find((zone) => zone.state === 'upcoming');
  if (nextZone) nextZone.isShelter = true;
}

function beginShelterUnload(game, zone) {
  const total = game.carriedDogColors?.length || game.onboardDogs;
  game.shelterUnloading = {
    zoneIndex: zone.index,
    total,
    dispatched: 0,
    dogsRemaining: total,
    spawnTimer: CONFIG.shelter.unloadSpawnSeconds,
    targetX: CONFIG.road.right + CONFIG.shelter.unloadDoorOffsetPx,
    targetY: game.van.y
      - (((zone.startZ + zone.endZ) / 2 - game.distance) * CONFIG.distance.pixelsPerMeter)
      + CONFIG.shelter.unloadForwardOffsetPx,
  };
  game.parking.unloadingInProgress = true;
  game.parking.boardingInProgress = false;
}

function completeShelterDrop(game, zone) {
  const stops = game.stops;
  zone.state = 'completed';
  zone.dwellTimer = CONFIG.stops.dwellSeconds;
  stops.dwellProgress = 1;
  stops.completed++;
  stops.combo = 0;
  stops.feedback = 'DOGS DELIVERED TO DOGE SHELTER';
  stops.feedbackTimer = CONFIG.shelter.dropOffNoticeSeconds;
  stops.successTimer = CONFIG.shelter.dropOffNoticeSeconds;
  game.shelteredTotal = (game.shelteredTotal || 0) + game.shelterUnloading.total;
  game.dogsJustSheltered = (game.carriedDogs || []).map((dog) => ({ ...dog }));
  game.onboardDogs = 0;
  game.carriedDogColors = [];
  game.carriedDogs = [];
  game.shelterDogs = [];
  game.shelterDue = false;
  game.shelterUnloading = null;
  game.parking.unloadingInProgress = false;
  game.parking.boardingComplete = true;
  for (const upcoming of stops.zones) {
    if (upcoming.state === 'upcoming') upcoming.isShelter = false;
  }
}

function fillUpcomingZones(stops) {
  let unresolved = stops.zones.filter((zone) => zone.state === 'upcoming' || zone.state === 'active').length;
  while (unresolved < CONFIG.stops.visibleZoneCount) {
    stops.zones.push(createZone(stops.nextIndex));
    stops.nextIndex += 1;
    unresolved += 1;
  }
}

function completeStop(game, zone) {
  const stops = game.stops;
  zone.state = 'completed';
  zone.dwellTimer = CONFIG.stops.dwellSeconds;
  stops.dwellProgress = 1;
  stops.completed += 1;
  stops.combo += 1;

  const positionInZone = Math.max(0, Math.min(
    1,
    (game.distance - zone.startZ) / CONFIG.stops.zoneLengthMeters,
  ));
  const earlyBonus = Math.round(CONFIG.stops.earlyStopBonus * (1 - positionInZone));
  const perfectElapsed = zone.dwellStartedElapsed - zone.enteredAtElapsed;
  const perfectBonus = perfectElapsed <= CONFIG.stops.perfectStopSeconds
    ? CONFIG.stops.perfectTimeBonus
    : 0;
  const comboBonus = Math.max(0, stops.combo - 1) * CONFIG.stops.comboBonusPoints;
  const reward = CONFIG.stops.rewardPoints + earlyBonus + perfectBonus + comboBonus;

  game.stopPoints += reward;
  stops.feedback = `STOP COMPLETE  +${reward}`;
  stops.feedbackTimer = CONFIG.stops.feedbackSeconds;
  stops.successTimer = CONFIG.stops.feedbackSeconds;
}

function speedKph(speed) {
  return (Math.abs(speed) / CONFIG.distance.pixelsPerMeter) * 3.6;
}
