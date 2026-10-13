import { CONFIG } from './config.js';
import { LANE_COUNT, laneBounds } from './world.js';

export function createObstacleField(seed) {
  return { obstacles: [], seed: seed >>> 0, nextId: 0 };
}

export function spawnRoadObstacles(field, wave) {
  const rng = makeRng(field.seed + wave.index * CONFIG.obstacles.waveSeedMultiplier);
  if (rng() >= CONFIG.obstacles.spawnChance) return;

  const openLanes = [];
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const bounds = laneBounds(lane);
    if (bounds.center >= wave.gapStart && bounds.center <= wave.gapEnd) openLanes.push(lane);
  }
  // Keep at least one lane open beside the hazard so it is always avoidable.
  if (openLanes.length < 2) return;

  const lane = openLanes[Math.floor(rng() * openLanes.length)];
  const kinds = ['cone', 'crate', 'tire'];
  field.obstacles.push({
    id: field.nextId++,
    lane,
    x: laneBounds(lane).center - CONFIG.obstacles.width / 2,
    y: wave.y + CONFIG.obstacles.yOffset,
    width: CONFIG.obstacles.width,
    height: CONFIG.obstacles.depth,
    kind: kinds[Math.floor(rng() * kinds.length)],
    resolved: false,
  });
}

export function updateRoadObstacles(game, field, dt) {
  const van = game.van;
  const scroll = game.vanSpeed * dt * CONFIG.distance.pixelsPerMeter;
  for (const obstacle of field.obstacles) {
    if (obstacle.resolved) continue;
    obstacle.y += scroll;
    if (game.vanSpeed > 0 && overlaps(obstacle, van)) {
      obstacle.resolved = true;
      if (game.jumpHeight >= CONFIG.jump.obstacleClearanceHeight) {
        game.obstaclesCleared += 1;
      } else if (game.shieldTimer > 0) {
        game.shieldTimer = 0;
      } else {
        game.obstacleBumps += 1;
        game.vanSpeed = Math.max(CONFIG.obstacles.minimumBumpSpeed, game.vanSpeed - CONFIG.obstacles.bumpSpeedLoss);
        game.cameraShake = Math.max(game.cameraShake, CONFIG.obstacles.hitShake);
      }
      continue;
    }
    if (obstacle.y > CONFIG.logicalHeight + obstacle.height || obstacle.y < -CONFIG.logicalHeight) {
      obstacle.resolved = true;
    }
  }
  field.obstacles = field.obstacles.filter((obstacle) => !obstacle.resolved);
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
