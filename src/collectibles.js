import { CONFIG } from './config.js';
import { LANE_COUNT, laneBounds } from './world.js';

export function createPickupField(seed = 76543) {
  return { bones: [], coins: [], powerups: [], seed, lineCount: 0, nextId: 0, nextCoinId: 0, nextPowerupId: 0 };
}

export function spawnBoneLine(field, wave) {
  const rng = makeRng(field.seed + wave.index * 104729);
  const { bones } = CONFIG;
  const openLanes = [];
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const bounds = laneBounds(lane);
    if (bounds.center >= wave.gapStart && bounds.center <= wave.gapEnd) openLanes.push(lane);
  }
  if (openLanes.length === 0) return;

  let aheadOffset = bones.yOffset;
  for (let patternIndex = 0; patternIndex < bones.patternsPerWave; patternIndex++) {
    const count = bones.patternCountMin
      + Math.floor(rng() * (bones.patternCountMax - bones.patternCountMin + 1));
    const pattern = openLanes.length > 1
      ? (wave.index + patternIndex) % 3
      : (wave.index + patternIndex) % 2;
    const startLaneIndex = Math.floor(rng() * openLanes.length);
    const centerOffset = (rng() - 0.5) * bones.length;
    const lastBoneOffset = (count - 1) * bones.patternSpacingPx;
    const patternStartY = patternIndex === 0
      ? wave.y + bones.yOffset
      : wave.y - aheadOffset - lastBoneOffset;

    for (let index = 0; index < count; index++) {
      const progress = count > 1 ? index / (count - 1) : 0;
      let lane = openLanes[startLaneIndex];
      let arc = 0;
      if (pattern === 1) {
        arc = Math.sin(progress * Math.PI) * bones.arcHeight;
      } else if (pattern === 2) {
        lane = openLanes[(startLaneIndex + index) % openLanes.length];
      }
      const laneCenter = laneBounds(lane).center;
      field.bones.push({
        id: field.nextId++,
        lane,
        x: laneCenter - bones.length / 2 + centerOffset,
        y: patternStartY + index * bones.patternSpacingPx,
        width: bones.length,
        height: bones.thickness,
        baseHeight: bones.height + arc,
        bobOffset: rng() * Math.PI * 2,
        taken: false,
        collectT: 0,
      });
    }

    if (patternIndex > 0) aheadOffset += lastBoneOffset + bones.patternGapPx;
  }
  field.lineCount += 1;
  spawnCoins(field, wave, openLanes);
  spawnPowerup(field, wave, openLanes);
}

export function updatePickups(game, field, dt) {
  for (const b of field.bones) {
    if (b.taken) {
      b.collectT = Math.min(CONFIG.bones.collectSeconds, b.collectT + dt);
      continue;
    }
    attractToVan(b, game, dt);
    b.y += game.vanSpeed * dt;
  }
  field.bones = field.bones.filter((b) => (
    b.taken
      ? b.collectT < CONFIG.bones.collectSeconds
      : b.y >= -CONFIG.bones.recycleMarginPx
        && b.y < CONFIG.logicalHeight + b.height
  ));

  let collected = 0;
  for (const b of field.bones) {
    if (!b.taken && overlaps(b, game.van)) {
      b.taken = true;
      b.collectT = 0;
      collected += 1;
    }
  }
  if (collected > 0) game.collected += collected;

  for (const coin of field.coins) {
    if (!coin.taken) {
      attractToVan(coin, game, dt);
      coin.y += game.vanSpeed * dt;
    } else coin.collectT += dt;
  }
  let coinsCollected = 0;
  for (const coin of field.coins) {
    if (!coin.taken && overlaps(coin, game.van)) {
      coin.taken = true;
      coin.collectT = 0;
      coinsCollected += 1;
    }
  }
  field.coins = field.coins.filter((coin) => coin.taken
    ? coin.collectT < CONFIG.bones.collectSeconds
    : coin.y >= -CONFIG.coins.recycleMarginPx && coin.y < CONFIG.logicalHeight + coin.height);
  game.coinsCollected = (game.coinsCollected || 0) + coinsCollected;

  for (const powerup of field.powerups) {
    if (powerup.taken) powerup.collectT += dt;
    else powerup.y += game.vanSpeed * dt;
    if (!powerup.taken && overlaps(powerup, game.van)) {
      powerup.taken = true;
      powerup.collectT = 0;
      const upgradeLevel = game.upgrades?.[powerup.kind === 'shield' ? 'shieldDuration' : 'magnetDuration'] || 0;
      const duration = powerup.kind === 'shield'
        ? CONFIG.powerups.shieldDurationSeconds
        : CONFIG.powerups.magnetDurationSeconds;
      const extra = upgradeLevel * CONFIG.powerups.durationUpgradeSeconds;
      if (powerup.kind === 'shield') game.shieldTimer = duration + extra;
      else game.magnetTimer = duration + extra;
    }
  }
  field.powerups = field.powerups.filter((pickup) => pickup.taken
    ? pickup.collectT < CONFIG.bones.collectSeconds
    : pickup.y >= -CONFIG.coins.recycleMarginPx && pickup.y < CONFIG.logicalHeight + pickup.height);
  return { bones: collected, coins: coinsCollected };
}

function spawnCoins(field, wave, openLanes) {
  const rng = makeRng(field.seed ^ CONFIG.coins.seedSalt ^ (wave.index * CONFIG.coins.waveSeedMultiplier));
  if (rng() >= CONFIG.coins.spawnChance) return;
  const lane = openLanes[Math.floor(rng() * openLanes.length)];
  const count = CONFIG.coins.trailMin + Math.floor(rng() * (CONFIG.coins.trailMax - CONFIG.coins.trailMin + 1));
  const bounds = laneBounds(lane);
  for (let index = 0; index < count; index++) {
    field.coins.push({
      id: field.nextCoinId++, lane,
      x: bounds.center - CONFIG.coins.widthPx / 2,
      y: wave.y + CONFIG.coins.yOffset - index * CONFIG.coins.spacingPx,
      width: CONFIG.coins.widthPx, height: CONFIG.coins.heightPx,
      taken: false, collectT: 0,
    });
  }
}

function spawnPowerup(field, wave, openLanes) {
  const rng = makeRng(field.seed ^ CONFIG.powerups.seedSalt ^ (wave.index * CONFIG.powerups.waveSeedMultiplier));
  if (rng() >= CONFIG.powerups.spawnChance) return;
  const lane = openLanes[Math.floor(rng() * openLanes.length)];
  const bounds = laneBounds(lane);
  field.powerups.push({
    id: field.nextPowerupId++, lane,
    kind: rng() < 0.5 ? 'shield' : 'magnet',
    x: bounds.center - CONFIG.powerups.widthPx / 2,
    y: wave.y + CONFIG.powerups.yOffset,
    width: CONFIG.powerups.widthPx, height: CONFIG.powerups.heightPx,
    taken: false, collectT: 0,
  });
}

function attractToVan(pickup, game, dt) {
  if (game.magnetTimer <= 0) return;
  const pickupX = pickup.x + pickup.width / 2;
  const vanX = game.van.x + game.van.width / 2;
  const pickupY = pickup.y + pickup.height / 2;
  const vanY = game.van.y + game.van.height / 2;
  const dx = vanX - pickupX;
  const dy = vanY - pickupY;
  const distance = Math.hypot(dx, dy);
  if (distance > CONFIG.powerups.magnetRangePx || distance === 0) return;
  const pull = Math.min(distance, CONFIG.powerups.magnetPullPxPerSecond * dt);
  pickup.x += (dx / distance) * pull;
  pickup.y += (dy / distance) * pull;
}

function overlaps(a, b) {
  return (
    a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
  );
}

function makeRng(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
