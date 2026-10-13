import { CONFIG } from './config.js';
import {
  laneVanX,
  laneBounds,
  clampDrivingLane,
  RESCUE_LANE,
} from './world.js';
import { createStopSystem, updateStopSystem } from './stops.js';
import { createMission } from './missions.js';

const SCROLL_LOOP_HEIGHT = CONFIG.logicalHeight + 240;
const START_LANE = 1;

const PARK_DURATION = CONFIG.parking.parkDuration;

export function createGame(seed = Date.now()) {
  return {
    state: 'ready',
    endReason: null,
    vanHealth: CONFIG.crash.vanHealth,
    crashCount: 0,
    crashState: 'clear',
    crashElapsed: 0,
    cameraShake: 0,
    jumpHeight: 0,
    jumpElapsed: 0,
    jumpCooldown: 0,
    isJumping: false,
    obstaclesCleared: 0,
    obstacleBumps: 0,
    crashFinalized: false,
    collected: 0,
    coinsCollected: 0,
    coinsEarned: 0,
    shieldTimer: 0,
    magnetTimer: 0,
    upgrades: {},
    route: null,
    elapsed: 0,
    distance: 0,
    scrollOffset: 0,
    speed: CONFIG.speed.start,
    van: {
      lane: START_LANE,
      x: laneVanX(START_LANE),
      slideFrom: laneVanX(START_LANE),
      slideTo: laneVanX(START_LANE),
      slideT: 1,
      y: CONFIG.van.screenY,
      width: CONFIG.van.width,
      height: CONFIG.van.height,
      rescued: 0,
      damageStage: 0,
    },
    rescued: 0,
    stopPoints: 0,
    stops: createStopSystem(),
    vanSpeed: CONFIG.speed.start,
    isRescuing: false,
    isReversing: false,
    buildings: createBuildings(),
    parking: {
      state: 'not-in-stop-zone',
      timer: 0,
      zoneIndex: null,
      boardingComplete: false,
      boardingInProgress: false,
    },
    task: createMission(seed ^ 0x27d4eb2d, 0),
    nextMissionId: 1,
    missionSeed: (seed ^ 0x165667b1) >>> 0,
    tasksCompleted: 0,
    celebrationTimer: 0,
  };
}

function createBuildings() {
  const { left, right } = CONFIG.road;
  const list = [];
  let x = left - 40;
  let seed = 1;
  while (x < right + 40) {
    const width = 40 + rand(seed++) * 34;
    const height = CONFIG.city.minHeight + rand(seed++) * (CONFIG.city.maxHeight - CONFIG.city.minHeight);
    list.push({
      x,
      width,
      height,
      baseY: CONFIG.city.minHeight + height,
      lit: rand(seed++) > 0.45,
      lights: Math.floor(2 + rand(seed++) * 4),
      seed: seed++,
    });
    x += width + CONFIG.city.laneGapMin + rand(seed++) * (CONFIG.city.laneGapMax - CONFIG.city.laneGapMin);
  }
  return list;
}

function rand(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function update(game, dt, laneStep = 0, buttons = null, jumpPressed = false) {
  if (game.state !== 'running') return false;

  if (laneStep && !game.parking.boardingInProgress && game.crashState !== 'stopping') {
    moveLane(game, Math.sign(laneStep));
  }

  const van = game.van;
  if (van.slideT < 1) {
    van.slideT = Math.min(1, van.slideT + dt / CONFIG.lanes.slideSeconds);
    van.x = van.slideFrom + (van.slideTo - van.slideFrom) * easeOut(van.slideT);
  } else {
    van.x = van.slideTo;
  }

  game.elapsed += dt;
  game.cameraShake = Math.max(0, game.cameraShake - CONFIG.crash.shakeDecayPerSecond * dt);

  const progress = Math.min(game.elapsed / CONFIG.speed.rampSeconds, 1);
  game.speed = CONFIG.speed.start + (CONFIG.speed.max - CONFIG.speed.start) * easeIn(progress);
  if (game.route) game.speed += game.route.level * CONFIG.progression.levelSpeedBonus;
  game.shieldTimer = Math.max(0, game.shieldTimer - dt);
  game.magnetTimer = Math.max(0, game.magnetTimer - dt);
  applyThrottle(game, dt, buttons);
  updateJump(game, dt, jumpPressed);

  // Update celebration timer
  if (game.celebrationTimer > 0) {
    game.celebrationTimer -= dt;
  }

  const spd = game.vanSpeed;
  const previousDistance = game.distance;
  const nextDistance = previousDistance + (spd * dt) / CONFIG.distance.pixelsPerMeter;
  game.distance = Math.max(0, nextDistance);
  const actualScroll = (game.distance - previousDistance) * CONFIG.distance.pixelsPerMeter;
  game.scrollOffset = (game.scrollOffset + actualScroll + SCROLL_LOOP_HEIGHT) % SCROLL_LOOP_HEIGHT;
  if (spd < 0 && nextDistance < 0) {
    game.vanSpeed = 0;
    game.isReversing = false;
  }

  if (game.crashState === 'stopping') {
    game.crashElapsed += dt;
    if (game.vanSpeed <= 0) {
      game.state = 'crashed';
      game.endReason = 'crash';
      game.crashState = 'halted';
    }
  }

  updateStopSystem(game, dt, buttons);
  updateParking(game, dt);

  return true;
}

function updateJump(game, dt, jumpPressed) {
  game.jumpCooldown = Math.max(0, game.jumpCooldown - dt);
  if (jumpPressed && !game.isJumping && game.jumpCooldown <= 0
    && game.crashState !== 'stopping' && !game.parking.boardingInProgress) {
    game.isJumping = true;
    game.jumpElapsed = 0;
  }
  if (!game.isJumping) {
    game.jumpHeight = 0;
    return;
  }

  game.jumpElapsed += dt;
  const progress = Math.min(1, game.jumpElapsed / CONFIG.jump.durationSeconds);
  game.jumpHeight = Math.sin(progress * Math.PI) * CONFIG.jump.maxHeight;
  if (progress >= 1) {
    game.isJumping = false;
    game.jumpHeight = 0;
    game.jumpCooldown = CONFIG.jump.cooldownSeconds;
  }
}

function updateParking(game, dt) {
  const van = game.van;
  const vanLeft = van.x;
  const vanRight = van.x + van.width;

  // Dogs board only when the van is positioned inside the right-lane stop zone.
  const inRescueLane = van.lane === RESCUE_LANE;
  const rescueLane = laneBounds(RESCUE_LANE);
  const withinRescueLane = vanLeft >= rescueLane.left - 2 && vanRight <= rescueLane.right + 2;
  const stopZone = game.stops.zones.find((zone) => (
    (zone.state === 'active' || zone.state === 'completed')
    && zone.lane === RESCUE_LANE
    && game.distance >= zone.startZ
    && game.distance <= zone.endZ
  ));
  const vanInStopZone = inRescueLane && withinRescueLane && Boolean(stopZone);

  if (!vanInStopZone) {
    game.parking.state = 'not-in-stop-zone';
    game.parking.timer = 0;
    game.parking.zoneIndex = null;
    game.parking.boardingComplete = false;
    game.parking.boardingInProgress = false;
    return;
  }

  game.parking.zoneIndex = stopZone.index;
  game.parking.boardingComplete = stopZone.dogCount > 0
    && stopZone.dogsBoarded >= stopZone.dogCount;
  if (game.parking.boardingComplete) game.parking.boardingInProgress = false;

  if (game.vanSpeed <= CONFIG.parking.stopSpeed) {
    game.parking.timer += dt;
    game.parking.state = game.parking.timer >= PARK_DURATION ? 'parked' : 'in-stop-zone-moving';
  } else {
    game.parking.timer = 0;
    game.parking.state = 'in-stop-zone-moving';
  }
}

function applyThrottle(game, dt, buttons) {
  if (game.crashState === 'stopping') {
    game.vanSpeed = Math.max(0, game.vanSpeed - CONFIG.crash.stopDeceleration * dt);
    game.isBoosting = false;
    game.isBraking = true;
    game.isReversing = false;
    return;
  }

  if (game.parking.boardingInProgress && !game.parking.boardingComplete) {
    game.vanSpeed = 0;
    game.isBoosting = false;
    game.isBraking = true;
    game.isReversing = false;
    return;
  }

  const normalSpeed = game.speed;
  const speedHeld = buttons && buttons.isPressed('speed');
  const brakeHeld = buttons && buttons.isPressed('brake');
  game.isBoosting = Boolean(speedHeld);
  game.isBraking = Boolean(brakeHeld);
  game.isReversing = false;

  if (brakeHeld) {
    if (isInsideYellowPickupBay(game) || game.distance <= 0) {
      game.vanSpeed = Math.max(0, game.vanSpeed - CONFIG.speed.brakeStrength * dt);
    } else {
      game.vanSpeed = Math.max(
        -CONFIG.speed.reverseMax,
        game.vanSpeed - CONFIG.speed.brakeStrength * dt,
      );
      if (game.vanSpeed < 0) {
        game.vanSpeed = Math.max(game.vanSpeed, -CONFIG.speed.reverseMax);
        game.isReversing = true;
      }
    }
    return;
  }

  if (speedHeld) {
    const boostTarget = Math.min(normalSpeed * CONFIG.speed.boostMultiplier, CONFIG.speed.maxBoost);
    game.vanSpeed = Math.min(game.vanSpeed + CONFIG.speed.boostAccel * dt, boostTarget);
    return;
  }

  // Releasing BRAKE always restores the current cruise target, including after a stop.
  const target = normalSpeed;
  const blend = 1 - Math.exp(-CONFIG.speed.cruiseRecoveryRate * dt);
  game.vanSpeed += (target - game.vanSpeed) * blend;
}

function isInsideYellowPickupBay(game) {
  if (game.van.lane !== RESCUE_LANE) return false;
  return game.stops.zones.some((zone) => (
    (zone.state === 'upcoming' || zone.state === 'active')
    && game.distance >= zone.startZ
    && game.distance <= zone.endZ
  ));
}

function moveLane(game, dir) {
  const van = game.van;
  // All three lanes are reachable; the rightmost lane contains rescue bays.
  const target = clampDrivingLane(van.lane + dir);
  if (target === van.lane) return;
  van.lane = target;
  van.slideFrom = van.x;
  van.slideTo = laneVanX(target);
  van.slideT = 0;
}

function easeOut(p) {
  return 1 - (1 - p) * (1 - p) * (1 - p);
}

function easeIn(p) {
  return 1 - (1 - p) * (1 - p);
}
