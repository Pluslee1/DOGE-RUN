import { CONFIG } from './config.js';

export function processTrafficCollision(game, field) {
  if (game.crashState === 'stopping' || game.vanSpeed <= 0) return null;
  const trafficSpeed = Math.max(game.speed, game.vanSpeed) * CONFIG.traffic.speedRatio;
  if (game.vanSpeed <= trafficSpeed) return null;

  const obstacle = field.cars.find((car) => !car.damaged && overlapsAabb(game.van, car));
  if (!obstacle) return null;

  obstacle.damaged = true;
  obstacle.damageT = 0;
  obstacle.knockbackX = (obstacle.x + obstacle.width / 2 < game.van.x + game.van.width / 2 ? 1 : -1)
    * CONFIG.crash.obstacleKnockbackPx;
  if (game.shieldTimer > 0) {
    game.shieldTimer = 0;
    game.cameraShake = Math.max(game.cameraShake, CONFIG.crash.firstHitShake * CONFIG.obstacles.shieldImpactShakeRatio);
    return { stage: 'shield-blocked', obstacle };
  }
  game.crashCount += 1;

  if (game.crashCount === 1) {
    game.vanHealth = CONFIG.crash.vanHealth - 1;
    game.van.damageStage = 1;
    game.cameraShake = CONFIG.crash.firstHitShake;
    return { stage: 'first-hit', obstacle };
  }

  game.vanHealth = 0;
  game.van.damageStage = 2;
  game.crashState = 'stopping';
  game.crashElapsed = 0;
  game.cameraShake = CONFIG.crash.secondHitShake;
  return { stage: 'fatal-hit', obstacle };
}

export function overlapsAabb(van, vehicle) {
  // Restrict the longitudinal bounds to the front bumper plane so a trailing
  // car cannot trigger a hit after it has already passed the van.
  return (
    vehicle.x < van.x + van.width
    && vehicle.x + vehicle.width > van.x
    && vehicle.y < van.y
    && vehicle.y + vehicle.depth > van.y
    && vehicle.y + vehicle.depth <= van.y + CONFIG.crash.bumperCollisionDepthPx
  );
}
