import { CONFIG } from './config.js';
import { LANE_COUNT, RESCUE_LANE, laneBounds } from './world.js';

let nextVehicleId = 0;

export function createTrafficField(seed = 20251002) {
  return {
    cars: [],
    seed,
    waveCount: 0,
    sinceWave: spawnIntervalSeconds(CONFIG.speed.start, 0),
    onWave: null,
  };
}

// Traffic keeps moving forward while braking. When the van boosts, traffic
// accelerates too, but remains slower so the van gradually catches up.
export function updateTraffic(game, field, dt) {
  const trafficBaseSpeed = Math.max(game.speed, game.vanSpeed);
  const trafficSpeed = trafficBaseSpeed * CONFIG.traffic.speedRatio;

  for (const c of field.cars) {
    const passing = c.hornManeuver
      && (c.hornManeuver.phase === 'passing' || c.hornManeuver.phase === 'merging');
    const maneuverSpeed = passing
      ? Math.max(
        CONFIG.traffic.hornPassClearancePxPerSecond,
        game.vanSpeed - trafficSpeed + CONFIG.traffic.hornPassClearancePxPerSecond,
      )
      : 0;
    const carSpeed = trafficSpeed + maneuverSpeed;
    const jumpGap = game.van.y - (c.y + c.depth);
    const jumpPass = game.isJumping
      && game.vanSpeed > trafficSpeed
      && c.lane === game.van.lane
      && c.y < game.van.y
      && jumpGap <= CONFIG.traffic.jumpOvertakeRangePx;
    const jumpOvertake = jumpPass ? CONFIG.traffic.jumpOvertakeBoostPxPerSecond : 0;
    const relativeScroll = (game.vanSpeed - carSpeed + jumpOvertake) * dt;
    c.y += relativeScroll;
    c.travel += Math.abs(relativeScroll);
    c.worldDistance += (carSpeed * dt) / CONFIG.distance.pixelsPerMeter;
    advanceLaneChange(c, dt);
  }

  for (const car of field.cars) {
    updateHornManeuver(car, field, dt);
    updateBayLaneBehavior(car, field, game);
  }

  field.cars = field.cars.filter(keepCar(field));

  const interval = spawnIntervalSeconds(trafficBaseSpeed, game.distance);
  field.sinceWave += dt;
  if (game.crashState !== 'stopping' && field.sinceWave >= interval) {
    field.sinceWave -= interval;
    const eventDifficulty = game.cityCondition === 'market' || game.cityCondition === 'roadworks'
      ? CONFIG.cityConditions.roadworkTrafficDifficulty
      : 0;
    spawnWave(field, game, Math.max(difficultyAt(game.distance), eventDifficulty));
  }
}

export function requestHornManeuver(game, field) {
  if (game.state !== 'running' || game.vanSpeed <= 0) return false;

  const frontCar = field.cars
    .filter((car) => (
      car.lane === game.van.lane
      && car.targetLane === null
      && car.hornManeuver === null
      && car.y < game.van.y
      && game.van.y - car.y <= CONFIG.traffic.hornResponseDistancePx
    ))
    .sort((left, right) => right.y - left.y)[0];
  if (!frontCar || isBayApproach(game, frontCar.worldDistance)) return false;

  const sideLanes = [frontCar.lane - 1, frontCar.lane + 1]
    .filter((lane) => lane >= 0 && lane < LANE_COUNT);
  const freeLane = sideLanes.find((lane) => hasSafeLaneChangeGap(frontCar, field, lane));
  if (freeLane !== undefined) {
    frontCar.hornManeuver = { targetLane: freeLane, phase: 'merging', elapsed: 0 };
    startLaneChange(frontCar, freeLane);
    return true;
  }

  const targetLane = sideLanes
    .map((lane) => ({ lane, nearestGap: nearestLaneGap(frontCar, field, lane) }))
    .sort((left, right) => right.nearestGap - left.nearestGap)[0]?.lane;
  if (targetLane === undefined) return false;

  frontCar.hornManeuver = { targetLane, phase: 'passing', elapsed: 0 };
  return true;
}

function nearestLaneGap(car, field, lane) {
  let nearest = Infinity;
  for (const other of field.cars) {
    if (other.id === car.id || (other.lane !== lane && other.targetLane !== lane)) continue;
    const gap = Math.abs((car.y + car.depth / 2) - (other.y + other.depth / 2));
    nearest = Math.min(nearest, gap);
  }
  return nearest;
}

function updateHornManeuver(car, field, dt) {
  const maneuver = car.hornManeuver;
  if (!maneuver) return;
  maneuver.elapsed += dt;

  if (maneuver.phase === 'passing') {
    if (maneuver.elapsed >= CONFIG.traffic.hornManeuverTimeoutSeconds) {
      car.hornManeuver = null;
      return;
    }
    if (hasSafeLaneChangeGap(car, field, maneuver.targetLane)) {
      maneuver.phase = 'merging';
      startLaneChange(car, maneuver.targetLane);
    }
  }
}

// Keep a steady amount of road between waves as the van accelerates.
function spawnIntervalSeconds(speed, distance) {
  // Keep traffic visible as the speed ramp rises by keeping road-distance
  // between waves steady instead of leaving a fixed time gap between them.
  const difficulty = difficultyAt(distance);
  const gapSeconds = CONFIG.traffic.gapSeconds
    + (CONFIG.traffic.gapSecondsAtFullDifficulty - CONFIG.traffic.gapSeconds) * difficulty;
  return (gapSeconds * CONFIG.speed.start)
    / (speed * (1 - CONFIG.traffic.speedRatio));
}

function difficultyAt(distance) {
  const span = CONFIG.traffic.difficultyFullMeters - CONFIG.traffic.difficultyStartMeters;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (distance - CONFIG.traffic.difficultyStartMeters) / span));
}

// Retain cars beyond the far camera edge so they can drive into view from the
// road ahead; recycle them after they pass the van.
function keepCar(field) {
  return (c) => {
    if (c.y < CONFIG.logicalHeight + c.depth
      && c.y + c.depth > -CONFIG.traffic.approachBufferPx) return true;
    return false;
  };
}

function spawnWave(field, game, difficulty) {
  const rng = makeRng(field.seed + field.waveCount * 7919);
  field.waveCount += 1;

  const lead = field.waveCount === 1
    ? CONFIG.traffic.firstWaveLeadPx
    : CONFIG.traffic.spawnLeadPx;
  const waveY = game.van.y - lead;

  const occupied = [];

  const lanes = pickBlockedLanes(rng, difficulty);
  if (field.waveCount === 1 && lanes.length > 0) {
    const visibleApproachLane = Math.floor(LANE_COUNT / 2);
    lanes.splice(0, lanes.length, visibleApproachLane, ...lanes.filter((lane) => lane !== visibleApproachLane));
  }

  let tankerAssigned = false;
  const guaranteeTanker = field.waveCount === 1
    || field.waveCount % CONFIG.traffic.tankerGuaranteedEveryWaves === 0;
  for (const lane of lanes) {
    // Spread cars along the road's depth inside a wave. This gives each car
    // room to approach from the horizon instead of appearing side by side.
    const laneY = waveY + rng() * CONFIG.traffic.waveDepthSpreadPx;
    const actualLead = game.van.y - laneY;
    const worldDistance = game.distance + actualLead / CONFIG.distance.pixelsPerMeter;
    if (lane === RESCUE_LANE && isBayApproach(game, worldDistance)) continue;
    if (!laneHasRoom(field, lane, laneY)) continue;
    const forceTanker = guaranteeTanker && !tankerAssigned;
    placeInLane(field, lane, laneY, worldDistance, rng, forceTanker);
    tankerAssigned ||= forceTanker;
    occupied.push(lane);
  }

  const openLanes = [];
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    if (!occupied.includes(lane)) openLanes.push(lane);
  }
  if (openLanes.length === 0) return;

  const gap = widestRun(openLanes);
  if (field.onWave) {
    field.onWave({
      index: field.waveCount,
      y: waveY,
      gapStart: gap.left,
      gapEnd: gap.right,
    });
  }
}

// The gap a bone line or a dog may occupy: the widest contiguous run of lanes
// that ended up free, so nothing spawned inside it can ever hit a car.
function widestRun(openLanes) {
  let best = [];
  let run = [];

  for (let lane = 0; lane <= LANE_COUNT; lane++) {
    if (openLanes.includes(lane)) {
      run.push(lane);
      continue;
    }
    if (run.length > best.length) best = run;
    run = [];
  }

  const first = laneBounds(best[0]);
  const last = laneBounds(best[best.length - 1]);
  return { left: first.left, right: last.right };
}

// Reject a new car when another vehicle in its lane is still too close at the
// selected depth along the road.
function laneHasRoom(field, lane, waveY) {
  for (const c of field.cars) {
    if ((c.lane === lane || c.targetLane === lane)
      && Math.abs(c.y - waveY) < CONFIG.traffic.minSameLaneSpacing) return false;
  }
  return true;
}

function placeInLane(field, lane, waveY, worldDistance, rng, forceTanker = false) {
  const bounds = laneBounds(lane);
  const type = forceTanker ? 'tanker' : chooseTrafficType(rng);
  const dimensions = trafficDimensions(type);
  const width = Math.min(dimensions.width, bounds.right - bounds.left);
  const depth = dimensions.depth;

  const center = bounds.center;
  const x = center - width / 2;

  const car = {
    id: nextVehicleId++,
    lane,
    type,
    color: trafficColor(type, rng),
    riderColor: type === 'bike' ? randomColor(CONFIG.traffic.bikeRiderColors, rng) : null,
    passengerColor: type === 'bike' ? randomColor(CONFIG.traffic.passengerShirtColors, rng) : null,
    helmetColor: type === 'bike' ? randomColor(CONFIG.traffic.bikeHelmetColors, rng) : null,
    x,
    y: waveY,
    width,
    depth,
    travel: 0,
    worldDistance,
    targetLane: null,
    laneChangeFromX: x,
    laneChangeToX: x,
    laneChangeT: 1,
    hornManeuver: null,
  };

  field.cars.push(car);
}

function randomColor(colors, rng) {
  return colors[Math.floor(rng() * colors.length)];
}

function chooseTrafficType(rng) {
  const weights = CONFIG.traffic.vehicleTypeWeights;
  const roll = rng();
  let cumulative = 0;
  for (const [type, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (roll < cumulative) return type;
  }
  return 'sedan';
}

function trafficDimensions(type) {
  const traffic = CONFIG.traffic;
  const byType = {
    danfo: [traffic.danfoWidth, traffic.danfoDepth],
    sedan: [traffic.carWidth, traffic.carDepth],
    bike: [traffic.bikeWidth, traffic.bikeDepth],
    tanker: [traffic.tankerWidth, traffic.tankerDepth],
    van: [traffic.vanWidth, traffic.vanDepth],
    truck: [traffic.truckWidth, traffic.truckDepth],
  };
  const [width, depth] = byType[type] || byType.sedan;
  return { width, depth };
}

function trafficColor(type, rng) {
  const traffic = CONFIG.traffic;
  const palettes = {
    danfo: [traffic.danfoColor],
    sedan: traffic.sedanColors,
    bike: traffic.bikeFrameColor,
    tanker: [traffic.tankerCabColor],
    van: traffic.vanColors,
    truck: traffic.truckColors,
  };
  const palette = Array.isArray(palettes[type]) ? palettes[type] : [palettes[type]];
  return palette[Math.floor(rng() * palette.length)];
}

function pickBlockedLanes(rng, difficulty) {
  const { blockedLanesMin, blockedLanesMax } = CONFIG.traffic;
  const extraLaneChance = CONFIG.traffic.extraLaneChanceAtFullDifficulty * difficulty;
  const count = blockedLanesMin + Number(
    blockedLanesMax > blockedLanesMin && rng() < extraLaneChance,
  );
  const lanes = [];

  // Traffic may use every lane between bays. Bay approaches are cleared below.
  for (let lane = 0; lane < LANE_COUNT && lanes.length < count; lane++) {
    if (rng() < 0.5) lanes.push(lane);
  }
  for (let lane = 0; lane < LANE_COUNT && lanes.length < count; lane++) {
    if (!lanes.includes(lane)) lanes.push(lane);
  }
  return lanes;
}

function isBayApproach(game, distance) {
  return game.stops.zones.some((zone) => (
    distance >= zone.startZ - CONFIG.traffic.bayClearBeforeMeters
    && distance <= zone.endZ + CONFIG.traffic.bayClearAfterMeters
  ));
}

function updateBayLaneBehavior(car, field, game) {
  if (!isBayApproach(game, car.worldDistance)) return;

  // Clearing an upcoming rescue bay takes priority over a horn pass.
  car.hornManeuver = null;

  // A car that was moving into the rescue lane turns back before reaching a bay.
  if (car.targetLane === RESCUE_LANE) {
    startLaneChange(car, car.lane);
  }
  if (car.lane !== RESCUE_LANE || car.targetLane !== null) return;

  const candidates = [];
  for (let offset = 1; offset < LANE_COUNT; offset++) {
    const left = car.lane - offset;
    const right = car.lane + offset;
    if (left >= 0) candidates.push(left);
    if (right < LANE_COUNT) candidates.push(right);
  }
  const safeLane = candidates.find((lane) => hasSafeLaneChangeGap(car, field, lane));
  if (safeLane !== undefined) startLaneChange(car, safeLane);
}

function hasSafeLaneChangeGap(car, field, targetLane) {
  for (const other of field.cars) {
    if (other.id === car.id || (other.lane !== targetLane && other.targetLane !== targetLane)) continue;
    const centerGap = Math.abs((car.y + car.depth / 2) - (other.y + other.depth / 2));
    const requiredGap = CONFIG.traffic.laneChangeSafeGapPx
      + ((car.depth + other.depth) * CONFIG.traffic.laneChangeVehicleGapRatio) / 2;
    if (centerGap < requiredGap) return false;
  }
  return true;
}

function startLaneChange(car, targetLane) {
  if (targetLane < 0 || targetLane >= LANE_COUNT) return;
  car.targetLane = targetLane;
  car.laneChangeFromX = car.x;
  car.laneChangeToX = laneBounds(targetLane).center - car.width / 2;
  car.laneChangeT = 0;
}

function advanceLaneChange(car, dt) {
  if (car.targetLane === null) return;
  car.laneChangeT = Math.min(1, car.laneChangeT + dt / CONFIG.traffic.laneChangeSeconds);
  const eased = car.laneChangeT * car.laneChangeT * (3 - 2 * car.laneChangeT);
  car.x = car.laneChangeFromX + (car.laneChangeToX - car.laneChangeFromX) * eased;
  if (car.laneChangeT >= 1) {
    car.lane = car.targetLane;
    car.targetLane = null;
    if (car.hornManeuver?.phase === 'merging') car.hornManeuver = null;
  }
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
