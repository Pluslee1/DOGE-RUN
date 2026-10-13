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
    || zone.endZ >= game.distance - CONFIG.stops.zoneLengthMeters
  ));

  const zone = stops.zones.find((item) => item.state === 'upcoming' || item.state === 'active');
  if (!zone) {
    fillUpcomingZones(stops);
    return;
  }

  if (game.distance > zone.endZ) {
    zone.dwellTimer = 0;
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

    if (zone.dwellReady && zone.dogsSpawned && zone.dogCount > 0 && zone.dogsBoarded >= zone.dogCount) {
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
    state: 'upcoming',
    dogsSpawned: false,
    dogCount: 0,
    dogsBoarded: 0,
    dwellReady: false,
    dwellTimer: 0,
    enteredAtElapsed: null,
    dwellStartedElapsed: null,
  };
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
  return (speed / CONFIG.distance.pixelsPerMeter) * 3.6;
}
