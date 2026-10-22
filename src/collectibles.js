import { CONFIG } from './config.js';
import { LANE_COUNT, laneBounds } from './world.js';

export function createPickupField(seed = 76543) {
  return {
    bones: [], coins: [], powerups: [], seed, lineCount: 0, nextId: 0,
    nextCoinId: 0, nextPowerupId: 0,
    coinSpawnTimer: CONFIG.coins.spawnIntervalSeconds,
    coinWaveCount: 0,
    powerupSpawnTimer: CONFIG.powerups.spawnIntervalSeconds,
    powerupSpawnCount: 0,
  };
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
}

export function updatePickups(game, field, dt) {
  field.coinSpawnTimer += dt;
  while (field.coinSpawnTimer >= CONFIG.coins.spawnIntervalSeconds) {
    field.coinSpawnTimer -= CONFIG.coins.spawnIntervalSeconds;
    spawnCoinTrail(field, game, field.coinWaveCount++);
  }
  field.powerupSpawnTimer += dt;
  while (field.powerupSpawnTimer >= CONFIG.powerups.spawnIntervalSeconds) {
    field.powerupSpawnTimer -= CONFIG.powerups.spawnIntervalSeconds;
    if (field.powerupSpawnCount === 0) {
      for (let index = 0; index < CONFIG.powerups.openingPairCount; index++) {
        spawnScheduledPowerup(field, game, field.powerupSpawnCount++, true);
      }
    } else {
      spawnScheduledPowerup(field, game, field.powerupSpawnCount++);
    }
  }

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

function spawnCoinTrail(field, game, waveIndex) {
  const rng = makeRng(field.seed ^ CONFIG.coins.seedSalt ^ (waveIndex * CONFIG.coins.waveSeedMultiplier));
  const count = CONFIG.coins.trailMin
    + Math.floor(rng() * (CONFIG.coins.trailMax - CONFIG.coins.trailMin + 1));
  const firstLane = Math.floor(rng() * LANE_COUNT);
  const switchesLane = rng() < CONFIG.coins.laneSwitchChance;

  for (let index = 0; index < count; index++) {
    const laneStep = switchesLane ? Math.floor(index / CONFIG.coins.laneChangeEvery) : 0;
    const lane = (firstLane + laneStep) % LANE_COUNT;
    const bounds = laneBounds(lane);
    field.coins.push({
      id: field.nextCoinId++, lane,
      x: bounds.center - CONFIG.coins.widthPx / 2,
      y: game.van.y - CONFIG.coins.spawnLeadPx - index * CONFIG.coins.spacingPx,
      width: CONFIG.coins.widthPx, height: CONFIG.coins.heightPx,
      taken: false, collectT: 0,
    });
  }
}

function spawnScheduledPowerup(field, game, spawnIndex, opening = false) {
  const rng = makeRng(field.seed ^ CONFIG.powerups.seedSalt ^ (spawnIndex * CONFIG.powerups.waveSeedMultiplier));
  const openingSideLane = game.van.lane === 0 ? 1 : game.van.lane - 1;
  const lane = opening
    ? (spawnIndex === 0 ? game.van.lane : openingSideLane)
    : Math.floor(rng() * LANE_COUNT);
  const bounds = laneBounds(lane);
  field.powerups.push({
    id: field.nextPowerupId++, lane,
    kind: spawnIndex % CONFIG.powerups.magnetEveryNth === 0 ? 'magnet' : 'shield',
    x: bounds.center - CONFIG.powerups.widthPx / 2,
    y: game.van.y - CONFIG.powerups.spawnLeadPx
      - (opening ? (spawnIndex % CONFIG.powerups.openingPairCount) * CONFIG.powerups.openingPairSpacingPx : 0),
    width: CONFIG.powerups.widthPx, height: CONFIG.powerups.heightPx,
    taken: false, collectT: 0,
  });
}

function attractToVan(pickup, game, dt) {
  if (game.magnetTimer <= 0) return;
  const pickupX = pickup.x + pickup.width / 2;
  const vanX = game.van.x + game.van.width / 2;
  const pickupY = pickup.y + pickup.height / 2;
  const vanFrontY = game.van.y + CONFIG.powerups.magnetTargetYOffsetPx;
  // Once a pickup has passed the van completely, don't yank it backward into view.
  if (pickupY > game.van.y + game.van.height) return;
  const dx = vanX - pickupX;
  const dy = vanFrontY - pickupY;
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
