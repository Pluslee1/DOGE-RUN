import { CONFIG } from './config.js';
import { companionReaction } from './city-conditions.js';

export function processTrafficCollision(game, field) {
  if (game.crashState === 'stopping') return null;
  const trafficSpeed = Math.max(game.speed, game.vanSpeed) * CONFIG.traffic.speedRatio;
  const movingSideways = game.van.x !== (game.van.previousX ?? game.van.x);

  // Check the van's swept side path as well as its front bumper. A lane change
  // can cross a nearby car even when the front-bumper test does not overlap.
  const contact = field.cars.find((car) => !car.damaged && !car.jumpCleared && (
    (movingSideways && overlapsSweptSide(game.van, car))
    || (game.vanSpeed > trafficSpeed && overlapsAabb(game.van, car))
  ));

  // Remember cars the van meets during a jump. Wait for the apex clearance so
  // pressing JUMP as a car reaches the bumper doesn't register as a crash on
  // the first low frame of the hop.
  if (game.isJumping) {
    if (contact) contact.jumpEncountered = true;
    if (game.jumpHeight >= CONFIG.jump.vehicleClearanceHeight) {
      for (const car of field.cars) {
        if (!car.jumpEncountered) continue;
        car.jumpCleared = true;
        car.jumpEncountered = false;
      }
    }
    return null;
  }

  const obstacle = field.cars.find((car) => !car.damaged && !car.jumpCleared && (
    car.jumpEncountered
    || (movingSideways && overlapsSweptSide(game.van, car))
    || (game.vanSpeed > trafficSpeed && overlapsAabb(game.van, car))
  ));
  if (!obstacle) return null;

  // Block the lane change at the point of impact. Keep the van on its original
  // lane so it cannot tunnel through the car or claim a bay it never reached.
  if (movingSideways) {
    game.van.x = game.van.previousX;
    game.van.slideFrom = game.van.x;
    game.van.slideTo = game.van.x;
    game.van.slideT = 1;
    game.van.lane = game.van.slideFromLane;
  }
  obstacle.jumpEncountered = false;
  obstacle.damaged = true;
  obstacle.damageT = 0;
  obstacle.knockbackX = (obstacle.x + obstacle.width / 2 < game.van.x + game.van.width / 2 ? 1 : -1)
    * CONFIG.crash.obstacleKnockbackPx;
  if (game.shieldTimer > 0) {
    game.shieldTimer = 0;
    game.cameraShake = Math.max(game.cameraShake, CONFIG.crash.firstHitShake * CONFIG.obstacles.shieldImpactShakeRatio);
    companionReaction(game, 'shieldMessage');
    return { stage: 'shield-blocked', obstacle };
  }
  game.crashCount += 1;
  game.hitRecoveryElapsed = 0;
  companionReaction(game, 'collisionMessage');

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

function overlapsSweptSide(van, vehicle) {
  const previousX = van.previousX ?? van.x;
  const left = Math.min(previousX, van.x);
  const right = Math.max(previousX + van.width, van.x + van.width);
  const vanFront = van.y;
  const vanRear = van.y - van.height;
  const overlapsLongitudinally = vehicle.y < vanFront && vehicle.y + vehicle.depth > vanRear;
  const overlapsLaterally = vehicle.x < right && vehicle.x + vehicle.width > left;
  return overlapsLongitudinally && overlapsLaterally;
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
