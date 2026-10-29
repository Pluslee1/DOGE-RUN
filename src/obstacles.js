import { CONFIG } from './config.js';
import { LANE_COUNT, laneBounds } from './world.js';
import { companionReaction } from './city-conditions.js';

export function createObstacleField(seed) {
  return { obstacles: [], seed: seed >>> 0, nextId: 0 };
}

export function spawnRoadObstacles(field, wave) {
  const rng = makeRng(field.seed + wave.index * CONFIG.obstacles.waveSeedMultiplier);
  const difficulty = Math.max(0, Math.min(1, wave.difficulty || 0));
  const guaranteedKind = wave.index === 1 ? 'oilSlick' : wave.index === 2 ? 'pothole' : null;
  const spawnChance = CONFIG.obstacles.spawnChance
    + (CONFIG.obstacles.spawnChanceAtFullDifficulty - CONFIG.obstacles.spawnChance) * difficulty;
  if (!guaranteedKind && rng() >= spawnChance) return;

  const openLanes = [];
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const bounds = laneBounds(lane);
    if (bounds.center >= wave.gapStart && bounds.center <= wave.gapEnd) openLanes.push(lane);
  }
  // Keep at least one lane open beside the hazard so it is always avoidable.
  if (openLanes.length < 2) return;

  const lane = openLanes[Math.floor(rng() * openLanes.length)];
  const kinds = ['cone', 'crate', 'tire', 'oilSlick', 'pothole'];
  const kind = guaranteedKind || kinds[Math.floor(rng() * kinds.length)];
  const width = kind === 'oilSlick'
    ? CONFIG.obstacles.oilSlickWidth
    : kind === 'pothole'
      ? CONFIG.obstacles.potholeWidth
      : CONFIG.obstacles.width;
  const depth = kind === 'oilSlick'
    ? CONFIG.obstacles.oilSlickDepth
    : kind === 'pothole'
      ? CONFIG.obstacles.potholeDepth
      : CONFIG.obstacles.depth;
  field.obstacles.push({
    id: field.nextId++,
    lane,
    x: laneBounds(lane).center - width / 2,
    y: wave.y + CONFIG.obstacles.yOffset,
    width,
    height: depth,
    kind,
    resolved: false,
  });
}

export function updateRoadObstacles(game, field, dt) {
  const van = game.van;
  let oilHit = false;
  // vanSpeed is already expressed in screen pixels per second; applying the
  // meters-to-pixels scale here made hazards race forward ten times too fast.
  const scroll = game.vanSpeed * dt;
  for (const obstacle of field.obstacles) {
    if (obstacle.resolved) continue;
    obstacle.y += scroll;
    if (game.vanSpeed > 0 && overlaps(obstacle, van)) {
      obstacle.resolved = true;
      if (game.jumpHeight >= CONFIG.jump.obstacleClearanceHeight) {
        game.obstaclesCleared += 1;
      } else if (game.shieldTimer > 0) {
        game.shieldTimer = 0;
      } else if (obstacle.kind === 'oilSlick') {
        game.slipperyTimer = Math.max(game.slipperyTimer, CONFIG.obstacles.oilSlickSeconds);
        game.oilImpactTimer = CONFIG.obstacles.oilImpactSeconds;
        game.oilDriftTimer = CONFIG.obstacles.oilDriftSeconds;
        game.oilDriftDirection = van.lane === 0
          ? 1
          : van.lane === LANE_COUNT - 1
            ? -1
            : (Math.random() < 0.5 ? -1 : 1);
        game.cameraShake = Math.max(game.cameraShake, CONFIG.obstacles.oilHitShake);
        companionReaction(game, 'oilSlickMessage');
        oilHit = true;
      } else {
        game.obstacleBumps += 1;
        if (obstacle.kind === 'pothole') {
          game.potholeTimer = Math.max(game.potholeTimer, CONFIG.obstacles.potholeSlowSeconds);
          game.vanSpeed = Math.max(CONFIG.obstacles.minimumBumpSpeed, game.vanSpeed - CONFIG.obstacles.potholeSpeedLoss);
          game.cameraShake = Math.max(game.cameraShake, CONFIG.obstacles.potholeHitShake);
        } else {
          game.vanSpeed = Math.max(CONFIG.obstacles.minimumBumpSpeed, game.vanSpeed - CONFIG.obstacles.bumpSpeedLoss);
          game.cameraShake = Math.max(game.cameraShake, CONFIG.obstacles.hitShake);
        }
      }
      continue;
    }
    if (obstacle.y > CONFIG.logicalHeight + obstacle.height || obstacle.y < -CONFIG.logicalHeight) {
      obstacle.resolved = true;
    }
  }
  field.obstacles = field.obstacles.filter((obstacle) => !obstacle.resolved);
  return oilHit;
}

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y;
}

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
