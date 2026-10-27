import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createBuildingSpawner } from './buildings.js';
import { SmokeEmitter } from './smoke.js';
import {
  PX_TO_WORLD,
  ROAD_HALF_WORLD,
  ROAD_WIDTH_PX,
  worldXOf,
  worldZOf,
  ROAD_CENTER_PX,
} from './world.js';

const VAN_WIDTH_WORLD = CONFIG.van.width * PX_TO_WORLD;
const VAN_LENGTH_WORLD = 150 * PX_TO_WORLD;
const ROAD_LENGTH_WORLD = 220;
const ROAD_START_Z = -30;

const LANE_COUNT = 3;
const DASH_LENGTH = 1.5;
const DASH_GAP = 2.6;
const DASH_PITCH = DASH_LENGTH + DASH_GAP;
const DASHES_PER_LANE = 26;
const VAN_WHEEL_RADIUS = 0.42;

const CAMERA = CONFIG.camera3D;
const CAMERA_FOV = CAMERA.fieldOfView;
const CITY = CONFIG.city;
const DAYLIGHT = CONFIG.daylight;
const ROAD_VISUAL = CONFIG.roadVisual;
const ROAD_SURFACE = CONFIG.roadSurface;

// --- Roadside scenery ---
// Keep houses and props clear of the road and the dog waiting area.
const DOG_SIDE_CLEARANCE = CONFIG.scenery.dogSideClearanceWorld;
const SIDEWALK_WIDTH = CONFIG.scenery.sidewalkWidth;
const LEFT_SCENERY_X = -ROAD_HALF_WORLD - SIDEWALK_WIDTH * 0.5;
const RIGHT_SCENERY_X = ROAD_HALF_WORLD + DOG_SIDE_CLEARANCE + SIDEWALK_WIDTH * 0.5;
const SCENERY_POOL_SIZE = CONFIG.scenery.poolSize;
const SCENERY_SPACING = CONFIG.scenery.spacing;
const SCENERY_RECYCLE_Z = ROAD_START_Z - CONFIG.scenery.recycleBehindZ;
const SCENERY_WRAP_DISTANCE = SCENERY_POOL_SIZE * SCENERY_SPACING;

export function createRenderer3D(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch (e) {
    console.error('WebGLRenderer creation failed:', e);
    alert('WebGL error: ' + e.message);
    throw e;
  }
  
  if (!renderer || !renderer.getContext) {
    console.error('Failed to get WebGL context');
    alert('WebGL context not available');
    throw new Error('No WebGL context');
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.render.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(DAYLIGHT.backgroundColor);
  scene.fog = new THREE.FogExp2(DAYLIGHT.fogColor, DAYLIGHT.fogDensity);

  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    CONFIG.logicalWidth / CONFIG.logicalHeight,
    0.1,
    400,
  );
  camera.position.set(CAMERA.offsetX, CAMERA.heightOffset, -CAMERA.rearOffset);
  scene.add(camera);
  const usaSunset = buildUsaSunset();
  camera.add(usaSunset);
  const cityEffects = buildCityConditionEffects(camera);

  const gradientMap = makeToonGradient();
  const road = buildRoad(gradientMap);
  let van = buildVan();
  // Draw an unmistakable force-field shell. Basic material keeps it visible
  // under toon lighting; disabling depth testing prevents the van from hiding
  // the shell where it overlaps the body.
  const shieldBubble = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 16),
    new THREE.MeshBasicMaterial({
      color: CONFIG.powerups.shieldColor,
      transparent: true,
      opacity: CONFIG.powerups.shieldBubbleOpacity,
      wireframe: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  shieldBubble.renderOrder = 20;
  shieldBubble.scale.set(...CONFIG.powerups.shieldBubbleScale);
  shieldBubble.position.y = CONFIG.powerups.shieldBubbleHeight;
  shieldBubble.visible = false;
  van.group.add(shieldBubble);
  van.smokeEmitter = createCrashSmokeEmitter(CONFIG.crash.vanSmokeCount, CONFIG.crash.vanSmokeColor, CONFIG.crash.vanSmokeSpawnPerSecond);
  van.fireEmitter = createCrashSmokeEmitter(CONFIG.crash.fireParticleCount, CONFIG.crash.fireColor, CONFIG.crash.fireParticleCount);
  van.group.add(van.smokeEmitter.points, van.fireEmitter.points);
  van.smokeEmitter.points.position.set(0, CONFIG.crash.smokeOriginY, CONFIG.vanVisual.playerBodyLength * CONFIG.crash.smokeOriginZRatio);
  van.fireEmitter.points.position.copy(van.smokeEmitter.points.position);
  const carPool = buildCarPool();
  const dogPool = buildDogPool();
  const bonePool = buildBonePool();
  const coinPool = buildCoinPool();
  const powerupPool = buildPowerupPool();
  const obstaclePool = buildObstaclePool();
  const stopZones = buildStopZonePool(gradientMap);
  const dogeShelter = buildDogeShelter(gradientMap);
  const scenery = buildScenery(gradientMap);
  const worldScenery = buildWorldScenery(gradientMap);
  const buildings = createBuildingSpawner(scene);
  let nitroCameraLead = 0;
  scene.add(road.group, van.group, carPool.group, dogPool.group, bonePool.group, coinPool.group, powerupPool.group, obstaclePool.group, stopZones.group, dogeShelter, scenery.group, worldScenery.group);

  const hemisphere = new THREE.HemisphereLight(
    DAYLIGHT.hemisphereSkyColor,
    DAYLIGHT.hemisphereGroundColor,
    DAYLIGHT.hemisphereIntensity,
  );
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(DAYLIGHT.sunColor, DAYLIGHT.sunIntensity);
  sun.position.set(...DAYLIGHT.sunPosition);
  sun.castShadow = true;
  sun.shadow.mapSize.set(DAYLIGHT.shadowMapSize, DAYLIGHT.shadowMapSize);
  sun.shadow.camera.near = DAYLIGHT.shadowCameraNear;
  sun.shadow.camera.far = DAYLIGHT.shadowCameraFar;
  sun.shadow.camera.left = -DAYLIGHT.shadowCameraBounds;
  sun.shadow.camera.right = DAYLIGHT.shadowCameraBounds;
  sun.shadow.camera.top = DAYLIGHT.shadowCameraBounds;
  sun.shadow.camera.bottom = -DAYLIGHT.shadowCameraBounds;
  sun.shadow.bias = DAYLIGHT.shadowBias;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);

  // Keep the roadside fixtures in their daytime state; the scene is now a fixed daylight run.
  buildings.setNightFactor(0);
  scenery.setNightFactor(0);

  let cameraX = 0;
  let wheelSpin = 0;
  let shelterWorld = null;

  return {
    enterShelter(vehicle, residents = [], upgrades = {}, carePackages = 0) {
      if (shelterWorld) disposeObject(shelterWorld.scene);
      shelterWorld = buildWalkableShelter(vehicle, residents, upgrades, carePackages, gradientMap);
      shelterWorld.vanArrivalTimer = CONFIG.shelter.vanArrivalReactionSeconds;
      shelterWorld.camera.aspect = camera.aspect;
      shelterWorld.camera.updateProjectionMatrix();
    },

    toggleShelterDoor() {
      if (!shelterWorld || !shelterWorld.doorNearby) return false;
      const settings = CONFIG.shelter;
      const frontZ = settings.buildingCenterZ + settings.buildingDepth / 2;
      if (shelterWorld.doorOpen && shelterWorld.camera.position.z < frontZ) return false;
      shelterWorld.doorOpen = !shelterWorld.doorOpen;
      return true;
    },

    petShelterDog() {
      const dog = shelterWorld?.nearestPetDog;
      if (!dog) return null;
      const settings = CONFIG.shelter;
      dog.petTimer = settings.petReactionSeconds;
      dog.petHeartTimer = settings.petReactionSeconds;
      dog.targetX = dog.group.position.x;
      dog.targetZ = dog.group.position.z;
      dog.pause = settings.petReactionSeconds;
      dog.group.rotation.y = Math.atan2(
        shelterWorld.camera.position.x - dog.group.position.x,
        -(shelterWorld.camera.position.z - dog.group.position.z),
      );
      if (shelterWorld.volunteerTaskAssigned && !shelterWorld.volunteerTaskComplete) {
        shelterWorld.volunteerTaskDogs.add(dog);
        shelterWorld.volunteerTaskComplete = shelterWorld.volunteerTaskDogs.size >= settings.volunteerTaskDogCount;
      }
      return {
        name: dog.name,
        taskProgress: shelterWorld.volunteerTaskDogs.size,
        taskRequired: settings.volunteerTaskDogCount,
        taskActive: shelterWorld.volunteerTaskAssigned && !shelterWorld.volunteerTaskTurnedIn,
      };
    },

    interactShelterRoom() {
      const world = shelterWorld;
      if (!world?.roomAction) return null;
      const { type, index = 0 } = world.roomAction;
      world.roomEffect = type;
      world.roomEffectIndex = index;
      world.roomEffectTimer = type === 'bed'
        ? CONFIG.shelter.roomBedRestSeconds
        : CONFIG.shelter.roomInteractionSeconds;
      if (type === 'bed') return { text: 'Fresh, soft beds are ready for a dog to nap. Zzz!' };
      if (type === 'toy') return { text: 'You toss a toy for playtime. The dogs are ready!' };
      return { text: 'Care station checked: fresh water and supplies are ready.' };
    },

    talkToShelterVolunteer() {
      if (!shelterWorld?.volunteerNearby) return null;
      const settings = CONFIG.shelter;
      shelterWorld.volunteerTaskAssigned = true;
      if (shelterWorld.volunteerTaskComplete && !shelterWorld.volunteerTaskTurnedIn) {
        shelterWorld.volunteerTaskTurnedIn = true;
        return { text: `Thanks for greeting the dogs! You helped ${settings.volunteerTaskDogCount} different friends feel welcome.` };
      }
      if (shelterWorld.volunteerTaskDogs.size > 0 && !shelterWorld.volunteerTaskTurnedIn) {
        return { text: `Could you pet ${settings.volunteerTaskDogCount} different dogs? You have greeted ${shelterWorld.volunteerTaskDogs.size}/${settings.volunteerTaskDogCount}.` };
      }
      return { text: `Hi, I’m ${settings.volunteerName}. The dogs have fresh water and clean beds today. Could you pet ${settings.volunteerTaskDogCount} different dogs so they feel welcome?` };
    },

    updateShelterUpgrades(upgrades) {
      if (!shelterWorld) return;
      for (const [type, groups] of Object.entries(shelterWorld.upgradeProps)) {
        groups.forEach((group, index) => {
          group.visible = (upgrades[type] || 0) >= index + 1;
        });
      }
    },

    updateShelterResidents(savedResidents = []) {
      if (!shelterWorld) return;
      shelterWorld.syncResidents(savedResidents);
    },

    updateShelterCarePackages(count = 0) {
      if (!shelterWorld) return;
      shelterWorld.carePackageProps.forEach((group, index) => {
        group.visible = index < count;
      });
    },

    renderShelter(dt, time, walkInput = { x: 0, z: 0 }, onDogBark = null) {
      if (!shelterWorld) return;
      const settings = CONFIG.shelter;
      const { camera: shelterCamera, residents } = shelterWorld;
      const movementBlend = 1 - Math.exp(-settings.cameraMoveDamping * dt);
      const forwardX = -Math.sin(shelterWorld.yaw);
      const forwardZ = -Math.cos(shelterWorld.yaw);
      const rightX = Math.cos(shelterWorld.yaw);
      const rightZ = -Math.sin(shelterWorld.yaw);
      const targetX = (forwardX * walkInput.z + rightX * walkInput.x) * settings.walkSpeed;
      const targetZ = (forwardZ * walkInput.z + rightZ * walkInput.x) * settings.walkSpeed;
      shelterWorld.velocityX += (targetX - shelterWorld.velocityX) * movementBlend;
      shelterWorld.velocityZ += (targetZ - shelterWorld.velocityZ) * movementBlend;
      const currentX = shelterCamera.position.x;
      const currentZ = shelterCamera.position.z;
      const roomBackZ = settings.buildingCenterZ - settings.buildingDepth / 2;
      const roomFrontZ = settings.buildingCenterZ + settings.buildingDepth / 2;
      const insideRoomBounds = shelterWorld.doorOpen
        && currentZ < roomFrontZ
        && currentZ > roomBackZ + settings.walkerCollisionRadius
        && Math.abs(currentX) < settings.wallWidth / 2;
      const nextX = THREE.MathUtils.clamp(
        currentX + shelterWorld.velocityX * dt,
        -settings.yardHalfWidth + settings.yardFenceInset,
        settings.yardHalfWidth - settings.yardFenceInset,
      );
      const nextZ = THREE.MathUtils.clamp(
        currentZ + shelterWorld.velocityZ * dt,
        -settings.yardGateZ + settings.yardFenceInset,
        settings.yardGateZ - settings.yardFenceInset,
      );
      const doorPassable = shelterWorld.doorAngle >= settings.doorOpenRadians * settings.doorPassableAngleRatio;
      const roomSideWallHit = insideRoomBounds
        && Math.abs(nextX) >= settings.wallWidth / 2 - settings.walkerCollisionRadius;
      const roomBackWallHit = insideRoomBounds && nextZ <= roomBackZ + settings.walkerCollisionRadius;
      const volunteerX = shelterWorld.volunteerGroup.position.x;
      const volunteerZ = shelterWorld.volunteerGroup.position.z;
      const volunteerHitX = Math.hypot(nextX - volunteerX, currentZ - volunteerZ)
        < settings.volunteerCollisionRadius;
      const allowedX = (shelterWalkerBlocked(nextX, currentZ, settings, shelterWorld.doorOpen && doorPassable, insideRoomBounds) || volunteerHitX || roomSideWallHit)
        ? currentX
        : nextX;
      const volunteerHitZ = Math.hypot(allowedX - volunteerX, nextZ - volunteerZ)
        < settings.volunteerCollisionRadius;
      const allowedZ = (shelterWalkerBlocked(allowedX, nextZ, settings, shelterWorld.doorOpen && doorPassable, insideRoomBounds) || volunteerHitZ || roomBackWallHit)
        ? currentZ
        : nextZ;
      if (allowedX === currentX && nextX !== currentX) shelterWorld.velocityX = 0;
      if (allowedZ === currentZ && nextZ !== currentZ) shelterWorld.velocityZ = 0;
      shelterCamera.position.x = allowedX;
      shelterCamera.position.z = allowedZ;
      const targetDoorAngle = shelterWorld.doorOpen ? settings.doorOpenRadians : 0;
      const doorTurn = settings.doorAnimationSpeed * dt;
      shelterWorld.doorAngle += Math.sign(targetDoorAngle - shelterWorld.doorAngle)
        * Math.min(Math.abs(targetDoorAngle - shelterWorld.doorAngle), doorTurn);
      shelterWorld.doorPivot.rotation.y = shelterWorld.doorAngle;
      const doorZ = settings.buildingCenterZ + settings.buildingDepth / 2;
      shelterWorld.doorNearby = Math.hypot(shelterCamera.position.x, shelterCamera.position.z - doorZ)
        <= settings.doorInteractionDistance;
      shelterWorld.canCloseDoor = !shelterWorld.doorOpen || shelterCamera.position.z >= doorZ;
      shelterWorld.roomEffectTimer = Math.max(0, shelterWorld.roomEffectTimer - dt);
      if (shelterWorld.roomEffectTimer === 0) shelterWorld.roomEffect = '';
      const insideRoom = shelterWorld.doorOpen && shelterCamera.position.z < doorZ - settings.roomEntryInset;
      shelterWorld.roomAction = null;
      let roomActionDistance = Infinity;
      if (insideRoom) {
        for (const station of shelterWorld.roomStations) {
          const distance = Math.hypot(shelterCamera.position.x - station.x, shelterCamera.position.z - station.z);
          if (distance <= station.interactionRadius && distance < roomActionDistance) {
            shelterWorld.roomAction = station;
            roomActionDistance = distance;
          }
        }
      }
      for (const [index, bed] of shelterWorld.roomProps.beds.entries()) {
        bed.napCue.visible = shelterWorld.roomEffect === 'bed'
          && shelterWorld.roomEffectIndex === index
          && shelterWorld.roomEffectTimer > 0;
      }
      const toyPlaying = shelterWorld.roomEffect === 'toy' && shelterWorld.roomEffectTimer > 0;
      shelterWorld.roomProps.toyBall.position.y = settings.roomToyBallRadius
        + (toyPlaying ? Math.abs(Math.sin(time * settings.roomToyBounceFrequency)) * settings.roomToyBounceHeight : 0);
      shelterWorld.roomProps.toyBall.rotation.x = toyPlaying ? Math.sin(time * settings.roomToyBounceFrequency) : 0;
      shelterWorld.roomProps.careLight.material.color.set(
        shelterWorld.roomEffect === 'care' && shelterWorld.roomEffectTimer > 0
          ? settings.roomCareReadyLightColor
          : settings.roomCareIdleLightColor,
      );
      shelterCamera.position.y = settings.cameraEyeHeight;
      shelterCamera.rotation.set(0, shelterWorld.yaw, 0, 'YXZ');
      let nearestPetDog = null;
      let nearestPetDistance = settings.petInteractionDistance;
      shelterWorld.vanArrivalTimer = Math.max(0, shelterWorld.vanArrivalTimer - dt);
      for (const [index, dog] of residents.entries()) {
        dog.pause = Math.max(0, dog.pause - dt);
        dog.petTimer = Math.max(0, dog.petTimer - dt);
        dog.petHeartTimer = Math.max(0, dog.petHeartTimer - dt);
        dog.barkTimer = Math.max(0, dog.barkTimer - dt);
        dog.barkCooldown = Math.max(0, dog.barkCooldown - dt);
        const vanArrived = shelterWorld.vanArrivalTimer > 0;
        if (vanArrived) {
          const rowX = (index - (residents.length - 1) / 2) * settings.dogGateGatherSpacing;
          dog.targetX = THREE.MathUtils.clamp(rowX, -settings.yardHalfWidth + settings.dogRoamBoundaryInset, settings.yardHalfWidth - settings.dogRoamBoundaryInset);
          dog.targetZ = settings.yardGateZ - settings.dogGateGatherInset;
          if (index % settings.dogChasePairSize === 0 && !dog.arrivalBarkPlayed && Math.hypot(dog.targetX - dog.group.position.x, dog.targetZ - dog.group.position.z) < settings.dogChaseCatchupRadius) {
            dog.barkTimer = settings.dogArrivalBarkSeconds;
            dog.barkCooldown = settings.dogBarkCooldownSeconds;
            dog.arrivalBarkPlayed = true;
            onDogBark?.();
          }
        } else {
          dog.ambientTimer -= dt;
          if (dog.ambientTimer <= 0) {
            dog.ambientPhase = (dog.ambientPhase + 1) % settings.dogAmbientDurations.length;
            dog.ambientMode = settings.dogAmbientModes[dog.ambientPhase];
            dog.ambientTimer = settings.dogAmbientDurations[dog.ambientPhase];
            if (dog.ambientMode === 'bark' && dog.barkCooldown === 0) {
              dog.barkTimer = settings.dogBarkSeconds;
              dog.barkCooldown = settings.dogBarkCooldownSeconds;
              onDogBark?.();
            }
            if (dog.ambientMode === 'roam') dog.pause = 0;
          }
          if (dog.ambientMode === 'chase' && index % settings.dogChasePairSize === settings.dogChaseFollowerIndex
            && index >= settings.dogChaseFollowerIndex && residents.length > 1) {
            const playmate = residents[index - settings.dogChaseFollowerIndex];
            const directionX = Math.sin(playmate.group.rotation.y);
            const directionZ = -Math.cos(playmate.group.rotation.y);
            dog.targetX = THREE.MathUtils.clamp(playmate.group.position.x - directionX * settings.dogChaseFollowDistance, -settings.yardHalfWidth + settings.dogRoamBoundaryInset, settings.yardHalfWidth - settings.dogRoamBoundaryInset);
            dog.targetZ = THREE.MathUtils.clamp(playmate.group.position.z - directionZ * settings.dogChaseFollowDistance, -settings.yardHalfDepth + settings.dogRoamBoundaryInset, settings.dogRoamFrontLimitZ);
            if (Math.hypot(dog.targetX - dog.group.position.x, dog.targetZ - dog.group.position.z) < settings.dogChaseCatchupRadius) {
              dog.ambientTimer = Math.min(dog.ambientTimer, dt);
            }
          }
        }
        const dx = dog.targetX - dog.group.position.x;
        const dz = dog.targetZ - dog.group.position.z;
        const distance = Math.hypot(dx, dz);
        let moved = 0;
        const napping = !vanArrived && dog.ambientMode === 'nap' && dog.petTimer === 0;
        const resting = napping || (!vanArrived && dog.ambientMode === 'bark' && dog.petTimer === 0);
        if (dog.petTimer > 0 || resting) {
          dog.targetX = dog.group.position.x;
          dog.targetZ = dog.group.position.z;
          if (dog.petTimer > 0) dog.group.rotation.y = Math.atan2(
            shelterCamera.position.x - dog.group.position.x,
            -(shelterCamera.position.z - dog.group.position.z),
          );
        } else if (distance < 0.08) {
          dog.group.position.x = dog.targetX;
          dog.group.position.z = dog.targetZ;
          if (dog.pause === 0) {
            const angle = dog.phase + Math.floor(time / settings.dogRoamPauseSeconds + index) * settings.dogRoamAngleStep;
            const radius = settings.dogRoamRadius * settings.dogRoamRadiusScales[index % settings.dogRoamRadiusScales.length];
            dog.targetX = THREE.MathUtils.clamp(dog.anchorX + Math.cos(angle) * radius, -settings.yardHalfWidth + settings.dogRoamBoundaryInset, settings.yardHalfWidth - settings.dogRoamBoundaryInset);
            dog.targetZ = THREE.MathUtils.clamp(dog.anchorZ + Math.sin(angle) * radius, -settings.yardHalfDepth + settings.dogRoamBoundaryInset, settings.dogRoamFrontLimitZ);
            dog.pause = settings.dogRoamPauseSeconds;
          }
        } else {
          const chasing = dog.ambientMode === 'chase'
            && index % settings.dogChasePairSize === settings.dogChaseFollowerIndex;
          const dogSpeed = vanArrived ? settings.dogGateGatherSpeed
            : chasing ? settings.dogChaseSpeed : settings.dogRoamSpeed;
          moved = Math.min(distance, dogSpeed * dt);
          dog.group.position.x += dx / distance * moved;
          dog.group.position.z += dz / distance * moved;
          dog.group.rotation.y = Math.atan2(dx, -dz);
          dog.gaitPhase += moved * settings.dogWalkCycleSpeed;
        }
        for (const leg of dog.model.legPivots) {
          const step = dog.gaitPhase + leg.phase;
          leg.pivot.rotation.x = napping ? settings.dogNapLegBendRadians
            : moved > 0 ? Math.sin(step) * settings.dogWalkLegSwing : 0;
          leg.knee.rotation.x = napping ? settings.dogNapLegBendRadians
            : moved > 0
            ? Math.max(0, Math.sin(step)) * settings.dogWalkKneeBendRadians
            : 0;
        }
        dog.model.group.scale.y = settings.worldDogScale * (napping ? settings.dogNapScaleRatio : 1);
        const chasing = !vanArrived && dog.ambientMode === 'chase'
          && index % settings.dogChasePairSize === settings.dogChaseFollowerIndex;
        const wagFrequency = dog.petTimer > 0 || vanArrived || chasing ? settings.petTailWagFrequency : settings.dogTailWagFrequency;
        const wagAmplitude = dog.petTimer > 0 || vanArrived || chasing ? settings.petTailWagAmplitude : settings.dogTailWagAmplitude;
        dog.model.tail.rotation.x = CONFIG.dogs.fallbackVisual.tailTiltRadians
          + Math.sin(time * wagFrequency + index) * wagAmplitude;
        dog.model.jaw.scale.y = dog.model.jawBaseScaleY
          * (dog.barkTimer > 0 ? settings.dogBarkMouthOpenRatio : 1);
        dog.barkSprite.visible = dog.barkTimer > 0;
        if (dog.barkTimer > 0) dog.barkSprite.position.y = settings.dogBarkSpriteY
          + Math.sin(time * settings.petTailWagFrequency) * settings.dogBarkRise;
        dog.napSprite.visible = napping;
        if (napping) dog.napSprite.position.y = settings.dogNapSpriteY
          + Math.sin(time * settings.dogTailWagFrequency) * settings.dogBarkRise;
        dog.petHeart.visible = dog.petHeartTimer > 0;
        if (dog.petHeartTimer > 0) {
          const heartProgress = 1 - dog.petHeartTimer / settings.petReactionSeconds;
          dog.petHeart.position.y = settings.petHeartHeight + heartProgress * settings.petHeartRise;
          dog.petHeart.material.opacity = Math.min(
            1,
            (1 - heartProgress) / (1 - settings.petHeartFadeStartRatio),
          );
        }
        const playerDistance = Math.hypot(
          shelterCamera.position.x - dog.group.position.x,
          shelterCamera.position.z - dog.group.position.z,
        );
        if (playerDistance <= nearestPetDistance) {
          nearestPetDistance = playerDistance;
          nearestPetDog = dog;
        }
      }
      shelterWorld.nearestPetDog = nearestPetDog;
      const volunteer = shelterWorld.volunteerGroup;
      const volunteerDistance = Math.hypot(
        shelterCamera.position.x - volunteer.position.x,
        shelterCamera.position.z - volunteer.position.z,
      );
      shelterWorld.volunteerNearby = volunteerDistance <= settings.volunteerInteractionDistance;
      let volunteerMessage = '';
      if (shelterWorld.volunteerNearby) {
        shelterWorld.volunteerRig.leftLeg.rotation.x = 0;
        shelterWorld.volunteerRig.rightLeg.rotation.x = 0;
        shelterWorld.volunteerRig.leftArm.rotation.x = 0;
        shelterWorld.volunteerRig.rightArm.rotation.x = 0;
        shelterWorld.volunteerRig.person.position.y = 0;
        volunteer.rotation.y = Math.atan2(
          shelterCamera.position.x - volunteer.position.x,
          shelterCamera.position.z - volunteer.position.z,
        );
        if (!shelterWorld.volunteerGreetingShown) {
          shelterWorld.volunteerGreetingShown = true;
          shelterWorld.volunteerTaskAssigned = true;
          volunteerMessage = settings.volunteerGreeting;
        }
      } else {
        const waypoints = settings.volunteerPatrolPoints;
        let target = waypoints[shelterWorld.volunteerWaypoint];
        let dx = target[0] - volunteer.position.x;
        let dz = target[1] - volunteer.position.z;
        let waypointDistance = Math.hypot(dx, dz);
        if (waypointDistance <= settings.volunteerPatrolArrivalRadius) {
          shelterWorld.volunteerWaypoint = (shelterWorld.volunteerWaypoint + 1) % waypoints.length;
          target = waypoints[shelterWorld.volunteerWaypoint];
          dx = target[0] - volunteer.position.x;
          dz = target[1] - volunteer.position.z;
          waypointDistance = Math.hypot(dx, dz);
        }
        if (waypointDistance > 0) {
          const stride = Math.min(settings.volunteerPatrolSpeed * dt, waypointDistance);
          volunteer.position.x += dx / waypointDistance * stride;
          volunteer.position.z += dz / waypointDistance * stride;
          volunteer.rotation.y = Math.atan2(dx, dz);
          const gait = Math.sin(time * settings.volunteerWalkCycleFrequency);
          shelterWorld.volunteerRig.leftLeg.rotation.x = gait * settings.volunteerLegSwingRadians;
          shelterWorld.volunteerRig.rightLeg.rotation.x = -gait * settings.volunteerLegSwingRadians;
          shelterWorld.volunteerRig.leftArm.rotation.x = -gait * settings.volunteerArmSwingRadians;
          shelterWorld.volunteerRig.rightArm.rotation.x = gait * settings.volunteerArmSwingRadians;
          shelterWorld.volunteerRig.person.position.y = Math.abs(gait) * settings.volunteerBodyBobHeight;
        }
      }
      shelterWorld.volunteerNameplate.position.set(
        volunteer.position.x, settings.volunteerNameplateY, volunteer.position.z,
      );
      for (const car of shelterWorld.streetCars) {
        car.group.position.x += car.direction * settings.streetCarSpeed * dt;
        const limit = settings.streetRoadWidth / 2 + settings.streetCarLength;
        if (car.direction > 0 && car.group.position.x > limit) car.group.position.x = -limit;
        if (car.direction < 0 && car.group.position.x < -limit) car.group.position.x = limit;
      }
      renderer.render(shelterWorld.scene, shelterCamera);
      return {
        doorNearby: shelterWorld.doorNearby,
        doorOpen: shelterWorld.doorOpen,
        canCloseDoor: shelterWorld.canCloseDoor,
        roomAction: shelterWorld.roomAction,
        petDogName: shelterWorld.nearestPetDog?.name || '',
        volunteerNearby: shelterWorld.volunteerNearby,
        volunteerMessage,
        volunteerTaskAssigned: shelterWorld.volunteerTaskAssigned,
        volunteerTaskProgress: shelterWorld.volunteerTaskDogs.size,
        volunteerTaskRequired: settings.volunteerTaskDogCount,
        volunteerTaskComplete: shelterWorld.volunteerTaskComplete,
        volunteerTaskTurnedIn: shelterWorld.volunteerTaskTurnedIn,
      };
    },

    turnShelterCamera(deltaX) {
      if (shelterWorld) shelterWorld.yaw -= deltaX * CONFIG.shelter.cameraLookSensitivity;
    },

    setVehicle(vehicle) {
      if (!vehicle || van.vehicleId === vehicle.id) return;
      const smokeEmitter = van.smokeEmitter;
      const fireEmitter = van.fireEmitter;
      const oldGroup = van.group;
      disposeObject(van.model);
      van.nitroEffect?.dispose();
      oldGroup.remove(van.model);
      scene.remove(oldGroup);
      van = buildVan(vehicle);
      van.smokeEmitter = smokeEmitter;
      van.fireEmitter = fireEmitter;
      van.model.scale.copy(van.visualScale);
      van.group.add(van.smokeEmitter.points, van.fireEmitter.points);
      van.smokeEmitter.points.position.set(0, CONFIG.crash.smokeOriginY, CONFIG.vanVisual.playerBodyLength * CONFIG.crash.smokeOriginZRatio);
      van.fireEmitter.points.position.copy(van.smokeEmitter.points.position);
      van.group.add(shieldBubble);
      scene.add(van.group);
    },

    resize(cssWidth, cssHeight, dpr) {
      try {
        renderer.setPixelRatio(Math.min(dpr, CONFIG.render.maxPixelRatio));
        renderer.setSize(cssWidth, cssHeight, false);
        camera.aspect = cssWidth / cssHeight;
        camera.updateProjectionMatrix();
        if (shelterWorld) {
          shelterWorld.camera.aspect = cssWidth / cssHeight;
          shelterWorld.camera.updateProjectionMatrix();
        }
      } catch (e) {
        console.error('resize error:', e);
      }
    },

    render(game, dt, field, dogs, time, pickups = null, obstacles = null) {
      try {
        const travelled = game.vanSpeed * dt * PX_TO_WORLD;

        updateRoad(road, travelled);
        updateVan(van, game, dt);
        const worldId = game.route?.worldId || 'lagos';
        const isLagos = worldId === 'lagos';
        usaSunset.visible = worldId === 'usa' || game.cityCondition === 'sunset';
        const baseSkyColor = isLagos
          ? DAYLIGHT.backgroundColor
          : CONFIG.worldScenery[worldId === 'japan' ? 'backgroundJapan' : 'backgroundUSA'];
        const baseFogColor = isLagos
          ? DAYLIGHT.fogColor
          : CONFIG.worldScenery[worldId === 'japan' ? 'fogJapan' : 'fogUSA'];
        const isRainy = game.cityCondition === 'rain';
        const isSunset = game.cityCondition === 'sunset';
        scene.background.set(isRainy ? CONFIG.cityConditions.rainSkyColor
          : isSunset ? CONFIG.cityConditions.sunsetSkyColor : baseSkyColor);
        scene.fog.color.set(isRainy ? CONFIG.cityConditions.rainFogColor
          : isSunset ? CONFIG.cityConditions.sunsetFogColor : baseFogColor);
        sun.intensity = DAYLIGHT.sunIntensity * (isRainy
          ? CONFIG.cityConditions.rainSunIntensity
          : isSunset ? CONFIG.cityConditions.sunsetSunIntensity : 1);
        hemisphere.intensity = DAYLIGHT.hemisphereIntensity * (isRainy
          ? CONFIG.cityConditions.rainHemisphereIntensity
          : isSunset ? CONFIG.cityConditions.sunsetHemisphereIntensity : 1);
        scenery.group.visible = isLagos;
        scenery.setMarketActive(isLagos && game.cityCondition === 'market');
        buildings.setVisible(isLagos);
        road.setWorld(worldId);
        road.setRain(isRainy);
        worldScenery.setWorld(worldId);
        worldScenery.update(travelled);
        cityEffects.update(game.cityCondition, worldId, time, dt, travelled);
        shieldBubble.visible = game.shieldTimer > 0;
        if (shieldBubble.visible) {
          shieldBubble.material.opacity = CONFIG.powerups.shieldBubbleOpacity
            * (0.88 + Math.sin(time * CONFIG.bones.bobFrequency) * 0.12);
        }
        van.smokeEmitter.setEnabled(game.van.damageStage >= 2);
        van.fireEmitter.setEnabled(game.van.damageStage >= 2);
        van.smokeEmitter.update(dt);
        van.fireEmitter.update(dt);
        const nitroActive = game.state === 'running' && game.isBoosting && !game.isBraking;
        van.nitroEffect?.update(time, nitroActive);
        const targetNitroLead = nitroActive ? CONFIG.nitro.cameraLeadWorld : 0;
        const cameraBlend = 1 - Math.exp(-CONFIG.nitro.cameraBlendRate * dt);
        nitroCameraLead += (targetNitroLead - nitroCameraLead) * cameraBlend;

        if (field) updateCarMeshes(carPool, field.cars, dt);
        if (dogs) {
          updateDogMeshes(dogPool, [
            ...dogs.dogs,
            ...(game.shelterDogs || []),
            ...getShelterResidentViews(game),
          ], time, dt);
        }
        if (pickups) {
          updateBoneMeshes(bonePool, pickups.bones, time);
          updateCoinMeshes(coinPool, pickups.coins, time);
          updatePowerupMeshes(powerupPool, pickups.powerups, time);
        }
        if (obstacles) updateObstacleMeshes(obstaclePool, obstacles.obstacles);
        updateStopZoneMeshes(stopZones, game);
        updateDogeShelter(dogeShelter, game);
        updateScenery(scenery, travelled);
        buildings.update(game.distance * CONFIG.distance.pixelsPerMeter * PX_TO_WORLD);
        wheelSpin += travelled / VAN_WHEEL_RADIUS;
        for (const wheel of van.wheels) wheel.rotation.y = wheelSpin;

        cameraX += (van.worldX - cameraX) * CAMERA.followRate;
        const shakeX = Math.sin(time * CONFIG.crash.cameraShakeFrequencyX) * game.cameraShake;
        const shakeY = Math.cos(time * CONFIG.crash.cameraShakeFrequencyY)
          * game.cameraShake * CONFIG.crash.cameraShakeVerticalRatio;
        camera.position.set(
          cameraX + CAMERA.offsetX + shakeX,
          van.group.position.y + CAMERA.heightOffset + shakeY,
          van.group.position.z - CAMERA.rearOffset,
        );
        camera.lookAt(
          cameraX,
          van.group.position.y + CAMERA.lookHeightOffset,
          van.group.position.z + CAMERA.lookAheadDistance - nitroCameraLead,
        );

        renderer.render(scene, camera);
      } catch (e) {
        console.error('render error:', e);
        if (!window.__renderErrorShown) {
          window.__renderErrorShown = true;
          alert('Render error: ' + e.message + '\n\nCheck console (F12) for details.');
        }
      }
    },
  };
}

function createShelterPetHeartTexture(settings) {
  const canvas = document.createElement('canvas');
  canvas.width = settings.petHeartCanvasSize;
  canvas.height = settings.petHeartCanvasSize;
  const context = canvas.getContext('2d');
  const size = canvas.width;
  context.beginPath();
  context.moveTo(size * 0.5, size * 0.86);
  context.bezierCurveTo(size * 0.37, size * 0.73, size * 0.12, size * 0.55, size * 0.12, size * 0.34);
  context.bezierCurveTo(size * 0.12, size * 0.1, size * 0.4, size * 0.06, size * 0.5, size * 0.28);
  context.bezierCurveTo(size * 0.6, size * 0.06, size * 0.88, size * 0.1, size * 0.88, size * 0.34);
  context.bezierCurveTo(size * 0.88, size * 0.55, size * 0.63, size * 0.73, size * 0.5, size * 0.86);
  context.closePath();
  context.fillStyle = settings.petHeartColor;
  context.fill();
  context.lineWidth = size * 0.055;
  context.strokeStyle = settings.petHeartOutlineColor;
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createShelterBarkTexture(settings) {
  const canvas = document.createElement('canvas');
  canvas.width = settings.dogBarkCanvasWidth;
  canvas.height = settings.dogBarkCanvasHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff8e9';
  context.beginPath();
  context.roundRect(settings.dogAmbientBubbleInset, settings.dogAmbientBubbleInset,
    canvas.width - settings.dogAmbientBubbleInset * 2,
    canvas.height - settings.dogAmbientBubbleInset * 2, settings.dogAmbientBubbleCornerRadius);
  context.fill();
  context.strokeStyle = '#287ca2';
  context.lineWidth = settings.dogAmbientBubbleOutlineWidth;
  context.stroke();
  context.fillStyle = '#145b47';
  context.font = `900 ${settings.dogAmbientBubbleFontSize}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('WOOF!', canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createShelterNapTexture(settings) {
  const canvas = document.createElement('canvas');
  canvas.width = settings.dogNapCanvasWidth;
  canvas.height = settings.dogNapCanvasHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = '#e8f6ff';
  context.beginPath();
  context.roundRect(settings.dogAmbientBubbleInset, settings.dogAmbientBubbleInset,
    canvas.width - settings.dogAmbientBubbleInset * 2,
    canvas.height - settings.dogAmbientBubbleInset * 2, settings.dogAmbientBubbleCornerRadius);
  context.fill();
  context.strokeStyle = '#287ca2';
  context.lineWidth = settings.dogAmbientBubbleOutlineWidth;
  context.stroke();
  context.fillStyle = '#245f87';
  context.font = `900 ${settings.dogAmbientBubbleFontSize}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Zzz', canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function shelterWalkerBlocked(x, z, settings, doorPassable, playerInsideRoom = false) {
  const radius = settings.walkerCollisionRadius;
  const buildingFrontZ = settings.buildingCenterZ + settings.buildingDepth / 2;
  const buildingBackZ = settings.buildingCenterZ - settings.buildingDepth / 2;
  const insideBuilding = Math.abs(x) <= settings.wallWidth / 2 + radius
    && z <= buildingFrontZ + radius
    && z >= buildingBackZ - radius;
  if (insideBuilding) {
    const insideDoorway = doorPassable
      && Math.abs(x) <= settings.doorOpeningWidth / 2 - radius
      && z > buildingBackZ + radius;
    const insideRoom = doorPassable
      && playerInsideRoom
      && Math.abs(x) <= settings.wallWidth / 2 - radius
      && z > buildingBackZ + radius
      && z < buildingFrontZ - settings.roomEntryInset;
    if (!insideDoorway && !insideRoom) return true;
    const roomObstacles = [
      ...settings.roomBeds.map((bed) => ({ x: bed.x, z: bed.z, radius: bed.collisionRadius })),
      { ...settings.roomToyPosition, radius: settings.roomToyCollisionRadius },
      { ...settings.roomCarePosition, radius: settings.roomCareCollisionRadius },
    ];
    if (roomObstacles.some((obstacle) => Math.hypot(
      x - obstacle.x,
      z - (settings.buildingCenterZ + obstacle.z),
    ) < obstacle.radius + radius)) return true;
  }

  const vanX = settings.worldVanX;
  const vanZ = settings.worldVanZ;
  return Math.abs(x - vanX) <= settings.vanCollisionHalfWidth + radius
    && Math.abs(z - vanZ) <= settings.vanCollisionHalfDepth + radius;
}

function buildWalkableShelter(vehicle, savedResidents, upgrades, carePackages, gradientMap) {
  const settings = CONFIG.shelter;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9bd8eb);
  scene.fog = new THREE.Fog(0x9bd8eb, 32, 72);
  const camera = new THREE.PerspectiveCamera(
    settings.cameraFieldOfView,
    CONFIG.logicalWidth / CONFIG.logicalHeight,
    0.1,
    100,
  );
  camera.position.set(0, settings.cameraEyeHeight, 11);
  scene.add(camera);

  const volunteerGroup = new THREE.Group();
  const volunteerRig = addShelterVolunteer(volunteerGroup, 0, 0, settings.volunteerShirtColor, gradientMap);
  const volunteer = volunteerRig.person;
  volunteer.scale.setScalar(settings.volunteerScale);
  volunteerGroup.position.set(settings.volunteerX, 0, settings.volunteerZ);
  scene.add(volunteerGroup);
  const volunteerNameplate = createVolunteerNameplate(settings);
  volunteerNameplate.position.set(settings.volunteerX, settings.volunteerNameplateY, settings.volunteerZ);
  scene.add(volunteerNameplate);

  scene.add(new THREE.HemisphereLight(0xe6f8ff, 0x566b45, 2.15));
  const sun = new THREE.DirectionalLight(0xffe3ad, 2.5);
  sun.position.set(-8, 14, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(CONFIG.daylight.shadowMapSize, CONFIG.daylight.shadowMapSize);
  scene.add(sun);

  const grassMaterial = new THREE.MeshToonMaterial({ color: settings.yardGrassColor });
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(settings.yardGrassWidth, settings.yardGrassLength), grassMaterial);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.08;
  grass.receiveShadow = true;
  scene.add(grass);
  const pathMaterial = new THREE.MeshToonMaterial({ color: settings.yardPathColor });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(settings.yardPathWidth, settings.yardPathLength), pathMaterial);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, -0.035, settings.yardPathZ);
  path.receiveShadow = true;
  scene.add(path);
  const pathSeamMaterial = new THREE.MeshBasicMaterial({ color: settings.yardPathPaverColor });
  const pathSeamGeometry = new THREE.PlaneGeometry(settings.yardPathPaverWidth, settings.yardPathPaverDepth);
  for (let z = settings.yardPathZ - settings.yardPathLength / 2 + settings.yardPathPaverSpacing; z < settings.yardPathZ + settings.yardPathLength / 2; z += settings.yardPathPaverSpacing) {
    const seam = new THREE.Mesh(pathSeamGeometry, pathSeamMaterial);
    seam.rotation.x = -Math.PI / 2;
    seam.position.set(0, settings.yardPathPaverLift, z);
    scene.add(seam);
  }

  const wallMaterial = new THREE.MeshToonMaterial({ color: settings.wallColor });
  const roofMaterial = new THREE.MeshToonMaterial({ color: settings.roofColor });
  const trimMaterial = new THREE.MeshToonMaterial({ color: 0xfff0ca });
  const building = new THREE.Group();
  building.position.set(0, 0, settings.buildingCenterZ);
  scene.add(building);
  const wall = (width, height, depth, x, y, z, material = wallMaterial) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    building.add(mesh);
    return mesh;
  };
  const doorWidth = settings.doorOpeningWidth;
  const sideWidth = (settings.wallWidth - doorWidth) / 2;
  wall(sideWidth, settings.wallHeight, settings.wallDepth, -(doorWidth + sideWidth) / 2, settings.wallHeight / 2, 0);
  wall(sideWidth, settings.wallHeight, settings.wallDepth, (doorWidth + sideWidth) / 2, settings.wallHeight / 2, 0);
  wall(doorWidth, settings.wallHeight - 2.5, settings.wallDepth, 0, settings.wallHeight - (settings.wallHeight - 2.5) / 2, 0);
  wall(settings.wallWidth + 0.3, 0.38, settings.wallDepth + 0.35, 0, settings.wallHeight + 0.19, 0, roofMaterial);
  wall(settings.wallWidth + 0.7, 0.2, 0.48, 0, 2.65, 3.05, trimMaterial);
  const interior = new THREE.Mesh(new THREE.PlaneGeometry(settings.wallWidth, settings.wallHeight), new THREE.MeshToonMaterial({ color: settings.roomInnerWallColor, side: THREE.DoubleSide }));
  interior.position.set(0, settings.wallHeight / 2, -settings.wallDepth / 2 + 0.04);
  building.add(interior);

  const roomFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(settings.wallWidth - settings.roomFloorInset * 2, settings.wallDepth - settings.roomFloorInset * 2),
    new THREE.MeshToonMaterial({ color: settings.roomFloorColor }),
  );
  roomFloor.rotation.x = -Math.PI / 2;
  roomFloor.position.y = 0.015;
  roomFloor.receiveShadow = true;
  building.add(roomFloor);
  const roomSideWall = new THREE.Mesh(
    new THREE.PlaneGeometry(settings.wallDepth - settings.roomFloorInset * 2, settings.wallHeight),
    new THREE.MeshToonMaterial({ color: settings.roomInnerWallColor, side: THREE.DoubleSide }),
  );
  for (const side of [-1, 1]) {
    const panel = roomSideWall.clone();
    panel.position.set(side * (settings.wallWidth / 2 - settings.roomFloorInset), settings.wallHeight / 2, 0);
    panel.rotation.y = Math.PI / 2;
    building.add(panel);
  }

  const roomProps = { beds: [], toyBall: null, careLight: null };
  const bedFrameMaterial = new THREE.MeshToonMaterial({ color: settings.roomBedFrameColor });
  const bedMatMaterial = new THREE.MeshToonMaterial({ color: settings.roomBedMatColor });
  const pillowMaterial = new THREE.MeshToonMaterial({ color: settings.roomBedPillowColor });
  for (const [index, bedPosition] of settings.roomBeds.entries()) {
    const bed = new THREE.Group();
    bed.position.set(bedPosition.x, 0, bedPosition.z);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(settings.roomBedWidth, settings.roomBedFrameHeight, settings.roomBedLength),
      bedFrameMaterial,
    );
    frame.position.y = settings.roomBedFrameHeight / 2;
    frame.castShadow = true;
    bed.add(frame);
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(settings.roomBedWidth * settings.roomBedMattressWidthRatio, settings.roomBedMattressHeight, settings.roomBedLength * settings.roomBedMattressLengthRatio),
      bedMatMaterial,
    );
    mattress.position.y = settings.roomBedFrameHeight + settings.roomBedMattressHeight / 2;
    mattress.castShadow = true;
    bed.add(mattress);
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(settings.roomBedPillowWidth, settings.roomBedPillowHeight, settings.roomBedPillowDepth),
      pillowMaterial,
    );
    pillow.position.set(0, settings.roomBedFrameHeight + settings.roomBedMattressHeight + settings.roomBedPillowHeight / 2, -settings.roomBedLength * settings.roomBedPillowInsetRatio);
    bed.add(pillow);
    building.add(bed);
    roomProps.beds.push({ group: bed, mattress, index, napCue: null });
  }

  const toyBasket = new THREE.Group();
  toyBasket.position.set(settings.roomToyPosition.x, 0, settings.roomToyPosition.z);
  const basket = new THREE.Mesh(
    new THREE.CylinderGeometry(settings.roomToyBasketRadius * settings.roomToyBaseRatio, settings.roomToyBasketRadius, settings.roomToyBasketHeight, settings.roomToySegments, 1, true),
    new THREE.MeshToonMaterial({ color: settings.roomToyBasketColor, side: THREE.DoubleSide }),
  );
  basket.position.y = settings.roomToyBasketHeight / 2;
  toyBasket.add(basket);
  const basketRim = new THREE.Mesh(
    new THREE.TorusGeometry(settings.roomToyBasketRadius * settings.roomToyBaseRatio, settings.roomToyRimTube, settings.roomToyTorusSegments, settings.roomToyTorusSegments),
    new THREE.MeshToonMaterial({ color: settings.roomToyRimColor }),
  );
  basketRim.rotation.x = Math.PI / 2;
  basketRim.position.y = settings.roomToyBasketHeight;
  toyBasket.add(basketRim);
  const toyBall = new THREE.Mesh(
    new THREE.SphereGeometry(settings.roomToyBallRadius, settings.roomToyBallSegments, settings.roomToyBallSegments),
    new THREE.MeshToonMaterial({ color: settings.roomToyBallColor }),
  );
  toyBall.position.set(settings.roomToyBallOffsetX, settings.roomToyBallRadius, settings.roomToyBallOffsetZ);
  toyBall.castShadow = true;
  toyBasket.add(toyBall);
  building.add(toyBasket);
  roomProps.toyBall = toyBall;

  const careStation = new THREE.Group();
  careStation.position.set(settings.roomCarePosition.x, 0, settings.roomCarePosition.z);
  const careTop = new THREE.Mesh(
    new THREE.BoxGeometry(settings.roomCareTableWidth, settings.roomCareTableTopHeight, settings.roomCareTableDepth),
    new THREE.MeshToonMaterial({ color: settings.roomCareTableColor }),
  );
  careTop.position.y = settings.roomCareTableHeight;
  careTop.castShadow = true;
  careStation.add(careTop);
  const careLegGeometry = new THREE.BoxGeometry(settings.roomCareLegWidth, settings.roomCareTableHeight, settings.roomCareLegDepth);
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const leg = new THREE.Mesh(careLegGeometry, bedFrameMaterial);
      leg.position.set(x * (settings.roomCareTableWidth / 2 - settings.roomCareLegInset), settings.roomCareTableHeight / 2, z * (settings.roomCareTableDepth / 2 - settings.roomCareLegInset));
      careStation.add(leg);
    }
  }
  const waterDish = new THREE.Mesh(
    new THREE.CylinderGeometry(settings.roomCareBowlRadius * settings.roomCareBowlTopRatio, settings.roomCareBowlRadius, settings.roomCareBowlHeight, settings.roomCareSegments),
    new THREE.MeshToonMaterial({ color: settings.roomCareBowlColor }),
  );
  waterDish.position.set(-settings.roomCareSupplySpacing, settings.roomCareTableHeight + settings.roomCareBowlHeight / 2, 0);
  careStation.add(waterDish);
  const careBottle = new THREE.Mesh(
    new THREE.CylinderGeometry(settings.roomCareBottleRadius, settings.roomCareBottleRadius * settings.roomCareBottleBaseRatio, settings.roomCareBottleHeight, settings.roomCareSegments),
    new THREE.MeshToonMaterial({ color: settings.roomCareBottleColor }),
  );
  careBottle.position.set(settings.roomCareSupplySpacing, settings.roomCareTableHeight + settings.roomCareBottleHeight / 2, 0);
  careStation.add(careBottle);
  const careLightMaterial = new THREE.MeshBasicMaterial({ color: settings.roomCareIdleLightColor });
  const careLight = new THREE.Mesh(
    new THREE.SphereGeometry(settings.roomCareLightRadius, settings.roomCareSegments, settings.roomCareSegments),
    careLightMaterial,
  );
  careLight.position.set(0, settings.roomCareTableHeight + settings.roomCareLightY, -settings.roomCareTableDepth / 2);
  careStation.add(careLight);
  building.add(careStation);
  roomProps.careLight = careLight;

  const signCanvas = document.createElement('canvas');
  signCanvas.width = 768;
  signCanvas.height = 160;
  const signContext = signCanvas.getContext('2d');
  signContext.fillStyle = '#176b50';
  signContext.fillRect(0, 0, signCanvas.width, signCanvas.height);
  signContext.strokeStyle = '#ffdf87';
  signContext.lineWidth = 10;
  signContext.strokeRect(8, 8, signCanvas.width - 16, signCanvas.height - 16);
  signContext.fillStyle = '#fff4d4';
  signContext.font = '900 66px system-ui, sans-serif';
  signContext.textAlign = 'center';
  signContext.textBaseline = 'middle';
  signContext.fillText('DOGE SHELTER', signCanvas.width / 2, signCanvas.height / 2);
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(settings.signWidth, settings.signHeight),
    new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false }),
  );
  sign.position.set(0, settings.wallHeight - 0.82, settings.wallDepth / 2 + 0.035);
  building.add(sign);
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-doorWidth / 2, 0, settings.wallDepth / 2 + settings.doorPanelDepth / 2);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth, settings.doorPanelHeight, settings.doorPanelDepth),
    new THREE.MeshToonMaterial({ color: 0x654837 }),
  );
  door.position.set(doorWidth / 2, settings.doorPanelHeight / 2, 0);
  door.castShadow = true;
  doorPivot.add(door);
  const doorInset = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth * 0.68, settings.doorPanelHeight * 0.68, settings.doorPanelDepth * 0.22),
    new THREE.MeshToonMaterial({ color: 0x91d8c6 }),
  );
  doorInset.position.set(doorWidth / 2, settings.doorPanelHeight * 0.56, settings.doorPanelDepth * 0.58);
  doorPivot.add(doorInset);
  building.add(doorPivot);
  const windowMaterial = new THREE.MeshToonMaterial({ color: 0x8ed8e2 });
  for (const x of [-3.05, 3.05]) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.1, 0.06), windowMaterial);
    window.position.set(x, 2.25, settings.wallDepth / 2 + 0.045);
    building.add(window);
  }

  const fenceMaterial = new THREE.MeshToonMaterial({ color: 0xffe4ab });
  const fenceRailMaterial = new THREE.MeshToonMaterial({ color: 0xd59b59 });
  const fencePost = new THREE.BoxGeometry(0.16, settings.fenceHeight, 0.16);
  const fenceRail = new THREE.BoxGeometry(settings.fencePostSpacing, 0.12, 0.12);
  const fenceGroup = new THREE.Group();
  scene.add(fenceGroup);
  const addFence = (x, z, horizontal) => {
    const post = new THREE.Mesh(fencePost, fenceMaterial);
    post.position.set(x, settings.fenceHeight / 2, z);
    post.castShadow = true;
    fenceGroup.add(post);
    if (horizontal) {
      const rail = new THREE.Mesh(fenceRail, fenceRailMaterial);
      rail.position.set(x + settings.fencePostSpacing / 2, settings.fenceHeight * 0.58, z);
      fenceGroup.add(rail);
    }
  };
  const backZ = 13;
  const sideX = 12.5;
  for (let x = -sideX; x <= sideX; x += settings.fencePostSpacing) {
    if (Math.abs(x) > 3) addFence(x, backZ, x + settings.fencePostSpacing <= sideX);
  }
  for (let z = -13; z < backZ; z += settings.fencePostSpacing) {
    for (const x of [-sideX, sideX]) {
      const post = new THREE.Mesh(fencePost, fenceMaterial);
      post.position.set(x, settings.fenceHeight / 2, z);
      post.castShadow = true;
      fenceGroup.add(post);
      if (z + settings.fencePostSpacing <= backZ) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, settings.fencePostSpacing), fenceRailMaterial);
        rail.position.set(x, settings.fenceHeight * 0.58, z + settings.fencePostSpacing / 2);
        fenceGroup.add(rail);
      }
    }
  }

  const frontFenceMaterial = new THREE.MeshToonMaterial({ color: settings.yardEdgeColor });
  const frontRail = new THREE.BoxGeometry(settings.fencePostSpacing, settings.fenceRailThickness, settings.fenceRailDepth);
  for (let x = -sideX; x <= sideX; x += settings.fencePostSpacing) {
    if (Math.abs(x) < settings.gatePostExclusionX) continue;
    const post = new THREE.Mesh(fencePost, frontFenceMaterial);
    post.position.set(x, settings.fenceHeight / 2, settings.yardGateZ);
    fenceGroup.add(post);
    if (x + settings.fencePostSpacing <= sideX) {
      const rail = new THREE.Mesh(frontRail, fenceRailMaterial);
      rail.position.set(x + settings.fencePostSpacing / 2, settings.fenceHeight * settings.fenceRailHeightRatio, settings.yardGateZ);
      fenceGroup.add(rail);
    }
  }
  for (const x of [-settings.gatePanelOffsetX, settings.gatePanelOffsetX]) {
    const gate = new THREE.Mesh(new THREE.BoxGeometry(settings.gatePanelWidth, settings.gateHeight, settings.gatePanelDepth), frontFenceMaterial);
    gate.position.set(x, settings.gateHeight / 2, settings.yardGateZ);
    fenceGroup.add(gate);
    const gateRail = new THREE.Mesh(new THREE.BoxGeometry(settings.gatePanelWidth, settings.gateRailHeight, settings.gateRailDepth), fenceRailMaterial);
    gateRail.position.set(x, settings.gateHeight * settings.gateRailHeightRatio, settings.yardGateZ);
    fenceGroup.add(gateRail);
  }
  const gateArch = new THREE.Mesh(
    new THREE.TorusGeometry(settings.gateArchRadius, settings.gateArchTube, settings.gateArchRadialSegments, settings.gateArchSegments, Math.PI),
    new THREE.MeshToonMaterial({ color: settings.gateArchColor }),
  );
  gateArch.position.set(0, settings.gateHeight, settings.yardGateZ);
  gateArch.castShadow = true;
  fenceGroup.add(gateArch);
  const gatePillarGeometry = new THREE.BoxGeometry(settings.gatePillarWidth, settings.gatePillarHeight, settings.gatePillarDepth);
  for (const x of [-settings.gateArchRadius, settings.gateArchRadius]) {
    const pillar = new THREE.Mesh(gatePillarGeometry, new THREE.MeshToonMaterial({ color: settings.gateArchColor }));
    pillar.position.set(x, settings.gatePillarHeight / 2, settings.yardGateZ);
    pillar.castShadow = true;
    fenceGroup.add(pillar);
  }

  const streetRoad = new THREE.Mesh(
    new THREE.PlaneGeometry(settings.streetRoadWidth, settings.streetRoadDepth),
    new THREE.MeshToonMaterial({ color: settings.streetRoadColor }),
  );
  streetRoad.rotation.x = -Math.PI / 2;
  streetRoad.position.set(0, -0.02, settings.streetRoadZ);
  streetRoad.receiveShadow = true;
  scene.add(streetRoad);
  const streetMarkMaterial = new THREE.MeshBasicMaterial({ color: settings.streetLaneMarkColor });
  for (let x = -settings.streetRoadWidth / 2; x < settings.streetRoadWidth / 2; x += settings.streetLaneMarkLength + settings.streetLaneMarkGap) {
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(settings.streetLaneMarkLength, settings.streetLaneMarkWidth), streetMarkMaterial);
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(x, 0.005, settings.streetRoadZ);
    scene.add(mark);
  }
  const houses = new THREE.Group();
  const houseColors = settings.streetHouseColors.map((color) => new THREE.MeshToonMaterial({ color }));
  const houseRoof = new THREE.MeshToonMaterial({ color: settings.streetHouseRoofColor });
  const houseWindow = new THREE.MeshToonMaterial({ color: settings.streetHouseWindowColor });
  const towerCount = settings.streetHouseRows * Math.ceil(settings.streetRoadWidth / settings.streetHouseSpacing + settings.streetHouseCountPadding);
  const maxFloors = Math.ceil(Math.max(...settings.streetTowerHeights) / settings.streetTowerFloorHeight);
  const maxFrontWindows = towerCount * maxFloors * settings.streetTowerWindowColumns;
  const frontWindows = new THREE.InstancedMesh(
    new THREE.BoxGeometry(settings.streetHouseWindowWidth, settings.streetHouseWindowHeight, settings.houseWindowDepth),
    houseWindow,
    maxFrontWindows,
  );
  const sideWindows = new THREE.InstancedMesh(
    new THREE.BoxGeometry(settings.streetHouseWindowWidth, settings.streetHouseWindowHeight, settings.houseWindowDepth),
    houseWindow,
    maxFrontWindows * 2,
  );
  const windowTransform = new THREE.Object3D();
  let frontWindowCount = 0;
  let sideWindowCount = 0;
  const towerLobby = new THREE.MeshToonMaterial({ color: settings.streetTowerLobbyColor });
  const towerAccent = new THREE.MeshToonMaterial({ color: settings.streetTowerAccentColor });
  for (let row = 0; row < settings.streetHouseRows; row++) {
    for (let index = 0; index < Math.ceil(settings.streetRoadWidth / settings.streetHouseSpacing + settings.streetHouseCountPadding); index++) {
      const x = -settings.streetRoadWidth / 2 + settings.streetHouseSpacing * (index + 0.5 + (row % 2) * settings.streetHouseRowStaggerRatio);
      const tower = new THREE.Group();
      const height = settings.streetTowerHeights[index % settings.streetTowerHeights.length];
      const width = settings.streetTowerWidths[index % settings.streetTowerWidths.length];
      const depth = settings.streetTowerDepths[index % settings.streetTowerDepths.length];
      const towerZ = settings.streetRoadZ + settings.streetRoadDepth / 2 + depth / 2
        + settings.streetHouseSetback + row * settings.streetHouseRearRowSpacing;
      const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), houseColors[index % houseColors.length]);
      body.position.y = height / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      tower.add(body);

      const floors = Math.floor((height - settings.streetTowerWindowFloorInset) / settings.streetTowerFloorHeight);
      for (let floor = 0; floor < floors; floor++) {
        const y = settings.streetTowerWindowFloorInset + floor * settings.streetTowerFloorHeight;
        for (let column = 0; column < settings.streetTowerWindowColumns; column++) {
          const windowX = (column - (settings.streetTowerWindowColumns - 1) / 2) * settings.streetTowerWindowColumnSpacing;
          windowTransform.position.set(x + windowX, y, towerZ - depth / 2 - settings.streetTowerWindowFrontOffset);
          windowTransform.rotation.set(0, 0, 0);
          windowTransform.updateMatrix();
          frontWindows.setMatrixAt(frontWindowCount++, windowTransform.matrix);
          for (const side of [-1, 1]) {
            const sideWindowZ = (column - (settings.streetTowerWindowColumns - 1) / 2) * settings.streetTowerSideWindowSpacing;
            windowTransform.position.set(
              x + side * (width / 2 + settings.streetTowerWindowSideOffset),
              y,
              towerZ + sideWindowZ,
            );
            windowTransform.rotation.set(0, Math.PI / 2, 0);
            windowTransform.updateMatrix();
            sideWindows.setMatrixAt(sideWindowCount++, windowTransform.matrix);
          }
        }
      }

      const lobby = new THREE.Mesh(
        new THREE.BoxGeometry(settings.streetHouseDoorWidth, settings.streetHouseDoorHeight, settings.houseDoorDepth),
        towerLobby,
      );
      lobby.position.set(0, settings.streetHouseDoorHeight / 2, -depth / 2 - settings.houseDoorFrontOffset);
      tower.add(lobby);
      const lobbyCanopy = new THREE.Mesh(
        new THREE.BoxGeometry(width * settings.streetTowerSetbackRatio, settings.streetHouseRoofHeight, settings.streetHouseRoofOverhang),
        towerAccent,
      );
      lobbyCanopy.position.set(0, settings.streetHouseDoorHeight + settings.streetHouseRoofHeight / 2, -depth / 2 - settings.houseDoorFrontOffset);
      tower.add(lobbyCanopy);

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(width + settings.streetHouseRoofOverhang, settings.streetHouseRoofHeight, depth + settings.streetHouseRoofOverhang),
        houseRoof,
      );
      roof.position.y = height + settings.streetHouseRoofHeight / 2;
      tower.add(roof);
      const penthouse = new THREE.Mesh(
        new THREE.BoxGeometry(width * settings.streetTowerSetbackRatio, settings.streetTowerPenthouseHeight, depth * settings.streetTowerSetbackRatio),
        towerAccent,
      );
      penthouse.position.y = height + settings.streetHouseRoofHeight + settings.streetTowerPenthouseHeight / 2;
      tower.add(penthouse);
      tower.position.set(x, 0, towerZ);
      houses.add(tower);
    }
  }
  frontWindows.count = frontWindowCount;
  frontWindows.instanceMatrix.needsUpdate = true;
  frontWindows.castShadow = true;
  frontWindows.receiveShadow = true;
  sideWindows.count = sideWindowCount;
  sideWindows.instanceMatrix.needsUpdate = true;
  sideWindows.castShadow = true;
  sideWindows.receiveShadow = true;
  houses.add(frontWindows, sideWindows);
  createShelterSideBlocks(settings, houses, houseColors, houseWindow);
  scene.add(houses);
  createShelterBackFence(settings, scene);
  const streetCars = Array.from({ length: settings.streetCarCount }, (_, index) => createShelterStreetCar(settings, index));
  streetCars.forEach((car) => scene.add(car.group));

  const van = buildVan(vehicle || CONFIG.garage.vans[0]);
  van.group.position.set(settings.worldVanX, 0, settings.worldVanZ);
  van.group.rotation.y = Math.PI;
  van.group.scale.setScalar(settings.worldVanScale);
  scene.add(van.group);
  const petHeartTexture = createShelterPetHeartTexture(settings);
  const barkTexture = createShelterBarkTexture(settings);
  const napTexture = createShelterNapTexture(settings);
  for (const bed of roomProps.beds) {
    const napCue = new THREE.Sprite(new THREE.SpriteMaterial({ map: napTexture, transparent: true, depthWrite: false }));
    napCue.scale.set(settings.roomBedNapCueWidth, settings.roomBedNapCueHeight, 1);
    napCue.position.set(0, settings.roomBedNapCueY, 0);
    napCue.visible = false;
    bed.group.add(napCue);
    bed.napCue = napCue;
  }
  for (const bed of roomProps.beds) {
    const napCue = new THREE.Sprite(new THREE.SpriteMaterial({ map: napTexture, transparent: true, depthWrite: false }));
    napCue.scale.set(settings.roomBedNapCueWidth, settings.roomBedNapCueHeight, 1);
    napCue.position.set(0, settings.roomBedNapCueY, 0);
    napCue.visible = false;
    bed.group.add(napCue);
    bed.napCue = napCue;
  }
  const residents = (savedResidents || []).slice(-settings.residentDisplayCount).map((resident, index) => {
    const model = createFallbackDog();
    const coat = new THREE.Color(CONFIG.dogs.coatColors[resident.color] || CONFIG.dogs.coatColors.golden);
    model.fur.color.copy(coat);
    model.group.scale.setScalar(settings.worldDogScale);
    const row = Math.floor(index / settings.worldDogColumns);
    const x = settings.worldDogStartX + (index % settings.worldDogColumns) * settings.worldDogSpacing
      + row * settings.worldDogRowOffsetX;
    const z = settings.worldDogStartZ - row * settings.worldDogRowSpacing;
    const group = new THREE.Group();
    group.add(model.group);
    group.position.set(x, 0, z);
    scene.add(group);
    const petHeart = new THREE.Sprite(new THREE.SpriteMaterial({
      map: petHeartTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    }));
    petHeart.scale.set(settings.petHeartSize, settings.petHeartSize, 1);
    petHeart.position.y = settings.petHeartHeight;
    petHeart.visible = false;
    group.add(petHeart);
    const barkSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: barkTexture, transparent: true, depthWrite: false }));
    barkSprite.scale.set(settings.dogBarkSpriteWidth, settings.dogBarkSpriteHeight, 1);
    barkSprite.position.y = settings.dogBarkSpriteY;
    barkSprite.visible = false;
    group.add(barkSprite);
    const napSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: napTexture, transparent: true, depthWrite: false }));
    napSprite.scale.set(settings.dogNapSpriteWidth, settings.dogNapSpriteHeight, 1);
    napSprite.position.y = settings.dogNapSpriteY;
    napSprite.visible = false;
    group.add(napSprite);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.68, 16), new THREE.MeshBasicMaterial({ color: 0x284431, transparent: true, opacity: 0.26 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;
    group.add(shadow);
    return {
      group, model, petHeart, name: resident.name || `Shelter dog ${index + 1}`,
      barkSprite, napSprite,
      barkTimer: index % settings.dogArrivalBarkStride === 0 ? settings.dogArrivalBarkSeconds : 0,
      barkCooldown: settings.dogBarkCooldownSeconds,
      arrivalBarkPlayed: index % settings.dogArrivalBarkStride === 0,
      petTimer: 0, petHeartTimer: 0,
      anchorX: x, anchorZ: z, phase: index * settings.dogRoamAngleStep,
      targetX: x, targetZ: z, pause: index * settings.dogRoamPauseStagger, gaitPhase: index * Math.PI,
      ambientPhase: index % settings.dogAmbientDurations.length,
      ambientMode: settings.dogAmbientModes[index % settings.dogAmbientModes.length],
      ambientTimer: settings.dogAmbientDurations[index % settings.dogAmbientDurations.length],
      stepDirection: 1,
    };
  });

  const bedMaterial = new THREE.MeshToonMaterial({ color: 0xe38a75 });
  const bedGeometry = new THREE.CylinderGeometry(0.78, 0.78, 0.16, 16);
  for (const [index, x] of [-8.2, 8.2].entries()) {
    const bed = new THREE.Mesh(bedGeometry, bedMaterial);
    bed.position.set(x, 0.08, -1 + index * 3);
    bed.castShadow = true;
    scene.add(bed);
  }
  const bowlMaterial = new THREE.MeshToonMaterial({ color: 0x79c6d2 });
  for (const x of [-6.8, 6.8]) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.18, 12), bowlMaterial);
    bowl.position.set(x, 0.1, 4.3);
    scene.add(bowl);
  }
  const toyMaterial = new THREE.MeshToonMaterial({ color: 0xf4bf46 });
  for (const [index, x] of [-settings.toyEdgeX, settings.toyEdgeX, -settings.toyEdgeX].entries()) {
    const toy = new THREE.Mesh(new THREE.SphereGeometry(settings.toyRadius, 12, 8), toyMaterial);
    toy.position.set(x, settings.toyRadius, settings.toyStartZ + index * settings.toySpacingZ);
    scene.add(toy);
  }
  const toyUpgradeProps = [];
  const toyAgility = new THREE.Group();
  toyAgility.position.set(settings.toyUpgradeX, 0, settings.stationUpgradeZ);
  const hoop = new THREE.Mesh(
    new THREE.TorusGeometry(settings.upgradeHoopRadius, settings.upgradeHoopTube, 8, 16),
    new THREE.MeshToonMaterial({ color: 0x65cf9b }),
  );
  hoop.position.set(0, settings.upgradeHoopRadius + 0.12, 0);
  toyAgility.add(hoop);
  const hoopBase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.28), new THREE.MeshToonMaterial({ color: 0x8d6542 }));
  hoopBase.position.y = 0.09;
  toyAgility.add(hoopBase);
  toyAgility.visible = false;
  scene.add(toyAgility);
  toyUpgradeProps.push(toyAgility);
  const toyPlaySet = new THREE.Group();
  toyPlaySet.position.set(settings.toyUpgradeX + 1.8, 0, settings.stationUpgradeZ + 1.4);
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.5, 12, 1, true), new THREE.MeshToonMaterial({ color: 0xe88b65, side: THREE.DoubleSide }));
  tunnel.rotation.z = Math.PI / 2;
  tunnel.position.y = 0.48;
  toyPlaySet.add(tunnel);
  for (const x of [-0.56, 0.56]) {
    const support = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.52, 8), new THREE.MeshToonMaterial({ color: 0xffd36a }));
    support.position.set(x, 0.26, 0);
    toyPlaySet.add(support);
  }
  toyPlaySet.visible = false;
  scene.add(toyPlaySet);
  toyUpgradeProps.push(toyPlaySet);

  const foodUpgradeProps = [];
  const feedDrum = new THREE.Group();
  feedDrum.position.set(settings.foodUpgradeX, 0, settings.stationUpgradeZ);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(settings.upgradeBarrelRadius, settings.upgradeBarrelRadius, settings.upgradeBarrelHeight, 12), new THREE.MeshToonMaterial({ color: 0x5d9c6c }));
  drum.position.y = settings.upgradeBarrelHeight / 2;
  feedDrum.add(drum);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(settings.upgradeBarrelRadius * 1.08, settings.upgradeBarrelRadius * 1.08, 0.1, 12), new THREE.MeshToonMaterial({ color: 0xdda95b }));
  lid.position.y = settings.upgradeBarrelHeight;
  feedDrum.add(lid);
  feedDrum.visible = false;
  scene.add(feedDrum);
  foodUpgradeProps.push(feedDrum);
  const buffet = new THREE.Group();
  buffet.position.set(settings.foodUpgradeX, 0, settings.stationUpgradeZ + 2.1);
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 0.62), new THREE.MeshToonMaterial({ color: 0xd89b62 }));
  table.position.y = 0.4;
  buffet.add(table);
  for (const x of [-settings.upgradeExtraBowlX, settings.upgradeExtraBowlX]) {
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.13, 12), new THREE.MeshToonMaterial({ color: 0x72cad0 }));
    dish.position.set(x, 0.88, 0);
    buffet.add(dish);
  }
  buffet.visible = false;
  scene.add(buffet);
  foodUpgradeProps.push(buffet);

  const carePackageProps = [];
  const carePackageCrate = new THREE.BoxGeometry(...settings.carePackageCrateSize);
  const carePackageMaterial = new THREE.MeshToonMaterial({ color: 0xc38a4b });
  const carePackageBandMaterial = new THREE.MeshToonMaterial({ color: 0x526e56 });
  const carePackageSackMaterial = new THREE.MeshToonMaterial({ color: 0xe6d09a });
  for (let index = 0; index < settings.carePackageDisplayLimit; index += 1) {
    const crate = new THREE.Group();
    const row = Math.floor(index / settings.carePackageRowLength);
    const column = index % settings.carePackageRowLength;
    crate.position.set(
      settings.carePackageX + column * settings.carePackageSpacing,
      row * settings.carePackageCrateSize[1],
      settings.carePackageZ + row * settings.carePackageSpacing,
    );
    const box = new THREE.Mesh(carePackageCrate, carePackageMaterial);
    box.position.y = settings.carePackageCrateSize[1] / 2;
    box.castShadow = true;
    crate.add(box);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(settings.carePackageCrateSize[0] * 0.18, settings.carePackageCrateSize[1] * 1.02, settings.carePackageCrateSize[2] * 1.02),
      carePackageBandMaterial,
    );
    band.position.y = settings.carePackageCrateSize[1] / 2;
    crate.add(band);
    const sack = new THREE.Mesh(
      new THREE.SphereGeometry(settings.carePackageSackRadius, 8, 6),
      carePackageSackMaterial,
    );
    sack.scale.y = settings.carePackageSackHeight / (settings.carePackageSackRadius * 2);
    sack.position.set(0, settings.carePackageCrateSize[1] + settings.carePackageSackHeight / 2, 0);
    crate.add(sack);
    crate.visible = index < carePackages;
    scene.add(crate);
    carePackageProps.push(crate);
  }

  const shadeUpgradeProps = [];
  const playShade = new THREE.Group();
  playShade.position.set(settings.shadeUpgradeX, 0, settings.shadeUpgradeZ);
  const shadeCanvas = new THREE.Mesh(
    new THREE.BoxGeometry(settings.shadeUpgradeWidth, 0.16, settings.shadeUpgradeDepth),
    new THREE.MeshToonMaterial({ color: settings.shadeCanvasColor }),
  );
  shadeCanvas.position.y = settings.shadeUpgradeHeight;
  playShade.add(shadeCanvas);
  const shadeTrim = new THREE.Mesh(
    new THREE.BoxGeometry(settings.shadeUpgradeWidth + 0.08, 0.1, 0.28),
    new THREE.MeshToonMaterial({ color: settings.shadeTrimColor }),
  );
  shadeTrim.position.set(0, settings.shadeUpgradeHeight - 0.1, settings.shadeUpgradeDepth / 2 - 0.12);
  playShade.add(shadeTrim);
  for (const x of [-settings.shadeUpgradeWidth / 2, settings.shadeUpgradeWidth / 2]) {
    for (const z of [-settings.shadeUpgradeDepth / 2, settings.shadeUpgradeDepth / 2]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(settings.shadePostRadius, settings.shadePostRadius, settings.shadeUpgradeHeight, 8),
        new THREE.MeshToonMaterial({ color: 0x8d6542 }),
      );
      post.position.set(x, settings.shadeUpgradeHeight / 2, z);
      playShade.add(post);
    }
  }
  playShade.visible = false;
  scene.add(playShade);
  shadeUpgradeProps.push(playShade);

  const washUpgradeProps = [];
  const washStation = new THREE.Group();
  washStation.position.set(settings.washUpgradeX, 0, settings.washUpgradeZ);
  const washPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(...settings.washPlatformSize),
    new THREE.MeshToonMaterial({ color: 0xb7a27d }),
  );
  washPlatform.position.y = settings.washLegHeight - settings.washPlatformSize[1] / 2;
  washStation.add(washPlatform);
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(settings.washPostRadius, settings.washPostRadius, settings.washLegHeight, 8),
        new THREE.MeshToonMaterial({ color: 0x8d6542 }),
      );
      leg.position.set(
        x * (settings.washPlatformSize[0] / 2 - settings.washPostRadius),
        settings.washLegHeight / 2,
        z * (settings.washPlatformSize[2] / 2 - settings.washPostRadius),
      );
      washStation.add(leg);
    }
  }
  const tubMaterial = new THREE.MeshToonMaterial({ color: settings.washUpgradeColor });
  const tubWidth = settings.washTubSize[0];
  const tubHeight = settings.washTubSize[1];
  const tubDepth = settings.washTubSize[2];
  const tubWallThickness = settings.washTubWallThickness;
  const tubBottom = new THREE.Mesh(new THREE.BoxGeometry(tubWidth, tubWallThickness, tubDepth), tubMaterial);
  tubBottom.position.y = settings.washLegHeight + tubWallThickness / 2;
  washStation.add(tubBottom);
  for (const side of [-1, 1]) {
    const longWall = new THREE.Mesh(new THREE.BoxGeometry(tubWallThickness, tubHeight, tubDepth), tubMaterial);
    longWall.position.set(side * (tubWidth / 2 - tubWallThickness / 2), settings.washLegHeight + tubHeight / 2, 0);
    washStation.add(longWall);
    const endWall = new THREE.Mesh(new THREE.BoxGeometry(tubWidth - tubWallThickness * 2, tubHeight, tubWallThickness), tubMaterial);
    endWall.position.set(0, settings.washLegHeight + tubHeight / 2, side * (tubDepth / 2 - tubWallThickness / 2));
    washStation.add(endWall);
  }
  const washWater = new THREE.Mesh(
    new THREE.BoxGeometry(...settings.washWaterSize),
    new THREE.MeshToonMaterial({ color: settings.washWaterColor, transparent: true, opacity: 0.84 }),
  );
  washWater.position.y = settings.washLegHeight + tubHeight - settings.washWaterSize[1] / 2;
  washStation.add(washWater);
  const faucet = new THREE.Mesh(
    new THREE.CylinderGeometry(settings.washShowerRadius, settings.washShowerRadius, settings.washShowerHeight / 2, 8),
    new THREE.MeshToonMaterial({ color: settings.washMetalColor }),
  );
  faucet.position.set(0, settings.washLegHeight + tubHeight + settings.washShowerHeight / 4, -tubDepth / 2);
  washStation.add(faucet);
  washStation.visible = false;
  scene.add(washStation);
  washUpgradeProps.push(washStation);

  const washShower = new THREE.Group();
  washShower.position.set(settings.washUpgradeX, 0, settings.washUpgradeZ);
  const showerPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(settings.washShowerRadius, settings.washShowerRadius, settings.washShowerHeight, 8),
    new THREE.MeshToonMaterial({ color: settings.washMetalColor }),
  );
  showerPipe.position.set(tubWidth / 2, settings.washShowerHeight / 2, 0);
  washShower.add(showerPipe);
  const showerArm = new THREE.Mesh(
    new THREE.CylinderGeometry(settings.washShowerRadius, settings.washShowerRadius, tubDepth / 2, 8),
    new THREE.MeshToonMaterial({ color: settings.washMetalColor }),
  );
  showerArm.rotation.x = Math.PI / 2;
  showerArm.position.set(tubWidth / 2, settings.washShowerHeight, -tubDepth / 4);
  washShower.add(showerArm);
  const showerHead = new THREE.Mesh(
    new THREE.SphereGeometry(settings.washShowerHeadRadius, 10, 8),
    new THREE.MeshToonMaterial({ color: settings.washMetalColor }),
  );
  showerHead.position.set(tubWidth / 2, settings.washShowerHeight, -tubDepth / 2);
  washShower.add(showerHead);
  const dropsMaterial = new THREE.MeshToonMaterial({ color: settings.washWaterColor });
  for (const x of [-1, 0, 1]) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(settings.washShowerDropRadius, 8, 6), dropsMaterial);
    drop.position.set(tubWidth / 2 + x * settings.washShowerHeadRadius, settings.washShowerHeight - settings.washShowerHeadRadius, -tubDepth / 2);
    washShower.add(drop);
  }
  washShower.visible = false;
  scene.add(washShower);
  washUpgradeProps.push(washShower);

  const gardenUpgradeProps = [];
  const garden = new THREE.Group();
  garden.position.set(settings.gardenUpgradeX, 0, settings.gardenUpgradeZ);
  for (let bedIndex = 0; bedIndex < 3; bedIndex += 1) {
    const bed = new THREE.Group();
    bed.position.x = (bedIndex - 1) * settings.gardenPlanterSpacing;
    const planter = new THREE.Mesh(new THREE.BoxGeometry(...settings.gardenPlanterSize), new THREE.MeshToonMaterial({ color: 0x9a6849 }));
    planter.position.y = settings.gardenPlanterSize[1] / 2;
    bed.add(planter);
    const soil = new THREE.Mesh(
      new THREE.BoxGeometry(settings.gardenPlanterSize[0] - settings.gardenSoilHeight, settings.gardenSoilHeight, settings.gardenPlanterSize[2] - settings.gardenSoilHeight),
      new THREE.MeshToonMaterial({ color: 0x594331 }),
    );
    soil.position.y = settings.gardenPlanterSize[1] + settings.gardenSoilHeight / 2;
    bed.add(soil);
    for (const plantX of [-1, 1]) {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(settings.gardenStemRadius, settings.gardenStemRadius, settings.gardenPlantHeight, 7),
        new THREE.MeshToonMaterial({ color: settings.gardenLeafColor }),
      );
      stem.position.set(plantX * settings.gardenPlanterSize[0] / 4, settings.gardenPlanterSize[1] + settings.gardenSoilHeight + settings.gardenPlantHeight / 2, 0);
      bed.add(stem);
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(settings.gardenPetalRadius, 10, 8),
        new THREE.MeshToonMaterial({ color: settings.gardenFlowerColors[bedIndex] }),
      );
      bloom.position.set(stem.position.x, settings.gardenPlanterSize[1] + settings.gardenSoilHeight + settings.gardenPlantHeight, 0);
      bed.add(bloom);
    }
    garden.add(bed);
  }
  garden.visible = false;
  scene.add(garden);
  gardenUpgradeProps.push(garden);

  const gardenInBloom = new THREE.Group();
  gardenInBloom.position.set(settings.gardenUpgradeX, 0, settings.gardenUpgradeZ);
  for (let plantIndex = 0; plantIndex < 3; plantIndex += 1) {
    const shrub = new THREE.Mesh(
      new THREE.SphereGeometry(settings.gardenShrubRadius, 9, 7),
      new THREE.MeshToonMaterial({ color: settings.gardenLeafColor }),
    );
    shrub.position.set((plantIndex - 1) * settings.gardenPlanterSpacing, settings.gardenPlanterSize[1] + settings.gardenShrubRadius / 2, settings.gardenPlanterSize[2] / 2);
    gardenInBloom.add(shrub);
  }
  gardenInBloom.visible = false;
  scene.add(gardenInBloom);
  gardenUpgradeProps.push(gardenInBloom);

  const kennelUpgradeProps = [];
  const kennelWing = new THREE.Group();
  kennelWing.position.set(settings.kennelUpgradeX, 0, settings.kennelUpgradeZ);
  const [kennelWidth, kennelHeight, kennelDepth] = settings.kennelWingSize;
  const kennelWall = settings.kennelWallThickness;
  const kennelFloor = new THREE.Mesh(new THREE.BoxGeometry(kennelWidth, kennelWall, kennelDepth), new THREE.MeshToonMaterial({ color: 0xc1aa83 }));
  kennelFloor.position.y = kennelWall / 2;
  kennelWing.add(kennelFloor);
  const kennelBack = new THREE.Mesh(new THREE.BoxGeometry(kennelWidth, kennelHeight, kennelWall), new THREE.MeshToonMaterial({ color: settings.kennelWallColor }));
  kennelBack.position.set(0, kennelHeight / 2, -kennelDepth / 2 + kennelWall / 2);
  kennelWing.add(kennelBack);
  for (const side of [-1, 1]) {
    const kennelSide = new THREE.Mesh(new THREE.BoxGeometry(kennelWall, kennelHeight, kennelDepth), new THREE.MeshToonMaterial({ color: settings.kennelWallColor }));
    kennelSide.position.set(side * (kennelWidth / 2 - kennelWall / 2), kennelHeight / 2, 0);
    kennelWing.add(kennelSide);
  }
  const kennelDivider = new THREE.Mesh(new THREE.BoxGeometry(settings.kennelDividerThickness, kennelHeight, kennelDepth - kennelWall), new THREE.MeshToonMaterial({ color: settings.kennelWallColor }));
  kennelDivider.position.set(0, kennelHeight / 2, kennelWall / 2);
  kennelWing.add(kennelDivider);
  const kennelRoof = new THREE.Mesh(
    new THREE.BoxGeometry(kennelWidth + settings.kennelRoofOverhang, settings.kennelRoofThickness, kennelDepth + settings.kennelRoofOverhang),
    new THREE.MeshToonMaterial({ color: settings.kennelRoofColor }),
  );
  kennelRoof.position.y = kennelHeight + settings.kennelRoofThickness / 2;
  kennelWing.add(kennelRoof);
  const kennelBarMaterial = new THREE.MeshToonMaterial({ color: settings.kennelBarColor });
  for (const bayCenter of [-kennelWidth / 4, kennelWidth / 4]) {
    for (const side of [-1, 1]) {
      const doorPost = new THREE.Mesh(
        new THREE.CylinderGeometry(settings.kennelBarRadius, settings.kennelBarRadius, settings.kennelDoorHeight, 8),
        kennelBarMaterial,
      );
      doorPost.position.set(bayCenter + side * settings.kennelDoorWidth / 2, settings.kennelDoorHeight / 2, kennelDepth / 2);
      kennelWing.add(doorPost);
    }
  }
  kennelWing.visible = false;
  scene.add(kennelWing);
  kennelUpgradeProps.push(kennelWing);

  const kennelRun = new THREE.Group();
  kennelRun.position.set(settings.kennelUpgradeX, 0, settings.kennelUpgradeZ + (kennelDepth + settings.kennelRunDepth) / 2);
  const kennelRunFloor = new THREE.Mesh(new THREE.BoxGeometry(settings.kennelRunWidth, settings.kennelWallThickness, settings.kennelRunDepth), new THREE.MeshToonMaterial({ color: settings.gardenLeafColor }));
  kennelRunFloor.position.y = settings.kennelWallThickness / 2;
  kennelRun.add(kennelRunFloor);
  for (const x of [-settings.kennelRunWidth / 2, settings.kennelRunWidth / 2]) {
    for (const z of [-settings.kennelRunDepth / 2, settings.kennelRunDepth / 2]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(settings.kennelRunPostRadius, settings.kennelRunPostRadius, settings.kennelRunHeight, 8),
        kennelBarMaterial,
      );
      post.position.set(x, settings.kennelRunHeight / 2, z);
      kennelRun.add(post);
    }
  }
  for (const y of [settings.kennelRunHeight / 2, settings.kennelRunHeight]) {
    for (const z of [-settings.kennelRunDepth / 2, settings.kennelRunDepth / 2]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(settings.kennelRunWidth, settings.kennelRunRailThickness, settings.kennelRunRailThickness),
        kennelBarMaterial,
      );
      rail.position.set(0, y, z);
      kennelRun.add(rail);
    }
    for (const x of [-settings.kennelRunWidth / 2, settings.kennelRunWidth / 2]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(settings.kennelRunRailThickness, settings.kennelRunRailThickness, settings.kennelRunDepth),
        kennelBarMaterial,
      );
      rail.position.set(x, y, 0);
      kennelRun.add(rail);
    }
  }
  kennelRun.visible = false;
  scene.add(kennelRun);
  kennelUpgradeProps.push(kennelRun);

  const roomStations = [
    ...settings.roomBeds.map((bed, index) => ({
      type: 'bed', index, x: bed.x, z: settings.buildingCenterZ + bed.z,
      interactionRadius: bed.interactionRadius, label: 'Rest at the bed',
    })),
    {
      type: 'toy', x: settings.roomToyPosition.x, z: settings.buildingCenterZ + settings.roomToyPosition.z,
      interactionRadius: settings.roomToyInteractionRadius, label: 'Play with the toys',
    },
    {
      type: 'care', x: settings.roomCarePosition.x, z: settings.buildingCenterZ + settings.roomCarePosition.z,
      interactionRadius: settings.roomCareInteractionRadius, label: 'Use the care station',
    },
  ];
  const world = {
    scene, camera, residents, yaw: 0, velocityX: 0, velocityZ: 0,
    doorPivot, doorAngle: 0, doorOpen: false, doorNearby: false, canCloseDoor: false,
    roomProps, roomStations, roomAction: null, roomEffect: '', roomEffectIndex: 0, roomEffectTimer: 0,
    volunteerNearby: false, volunteerTaskAssigned: false, volunteerTaskComplete: false,
    volunteerTaskTurnedIn: false, volunteerTaskDogs: new Set(),
    volunteerGroup, volunteerRig, volunteerNameplate, volunteerWaypoint: 0,
    volunteerGreetingShown: false,
    streetCars,
    upgradeProps: {
      toys: toyUpgradeProps, food: foodUpgradeProps, shade: shadeUpgradeProps,
      wash: washUpgradeProps, garden: gardenUpgradeProps, kennel: kennelUpgradeProps,
    },
    carePackageProps,
    carePackages,
    syncResidents(nextResidents) {
      const visibleResidents = (nextResidents || []).slice(-settings.residentDisplayCount);
      for (const [index, resident] of residents.entries()) {
        const savedResident = visibleResidents[index];
        resident.group.visible = Boolean(savedResident);
        if (!savedResident) continue;
        resident.name = savedResident.name || `Shelter dog ${index + 1}`;
        resident.model.fur.color.setHex(
          CONFIG.dogs.coatColors[savedResident.color] || CONFIG.dogs.coatColors.golden,
        );
      }
    },
  };
  world.syncResidents(savedResidents);
  for (const [type, groups] of Object.entries(world.upgradeProps)) {
    groups.forEach((group, index) => { group.visible = (upgrades[type] || 0) >= index + 1; });
  }
  return world;
}

function createShelterSideBlocks(settings, parent, wallMaterials, windowMaterial) {
  const roofMaterial = new THREE.MeshToonMaterial({ color: settings.streetHouseRoofColor });
  const accentMaterial = new THREE.MeshToonMaterial({ color: settings.streetTowerAccentColor });
  const innerWindows = new THREE.Group();
  const endWindows = new THREE.Group();
  for (const side of [-1, 1]) {
    for (let index = 0; index < settings.shelterSideBlockCentersZ.length; index++) {
      const width = settings.shelterSideBlockWidths[index % settings.shelterSideBlockWidths.length];
      const depth = settings.shelterSideBlockDepths[index % settings.shelterSideBlockDepths.length];
      const height = settings.shelterSideBlockHeights[index % settings.shelterSideBlockHeights.length];
      const x = side * settings.shelterSideBlockX;
      const z = settings.shelterSideBlockCentersZ[index];
      const building = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        wallMaterials[(index + (side > 0 ? 1 : 0)) % wallMaterials.length],
      );
      body.position.y = height / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      building.add(body);

      const floors = Math.floor((height - settings.shelterSideBlockWindowFloorInset) / settings.streetTowerFloorHeight);
      const inward = -side;
      for (let floor = 0; floor < floors; floor++) {
        const y = settings.shelterSideBlockWindowFloorInset + floor * settings.streetTowerFloorHeight;
        for (let column = 0; column < settings.shelterSideBlockWindowColumns; column++) {
          const zOffset = (column - (settings.shelterSideBlockWindowColumns - 1) / 2) * settings.shelterSideBlockWindowSpacing;
          const sideWindow = new THREE.Mesh(
            new THREE.BoxGeometry(settings.houseWindowDepth, settings.streetHouseWindowHeight, settings.streetHouseWindowWidth),
            windowMaterial,
          );
          sideWindow.position.set(x + inward * (width / 2 + settings.shelterSideBlockWindowOffset), y, z + zOffset);
          innerWindows.add(sideWindow);

          const frontWindow = new THREE.Mesh(
            new THREE.BoxGeometry(settings.streetHouseWindowWidth, settings.streetHouseWindowHeight, settings.houseWindowDepth),
            windowMaterial,
          );
          frontWindow.position.set(x + zOffset, y, z - depth / 2 - settings.shelterSideBlockWindowOffset);
          endWindows.add(frontWindow);
        }
      }

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(width + settings.streetHouseRoofOverhang, settings.shelterSideBlockRoofHeight, depth + settings.streetHouseRoofOverhang),
        roofMaterial,
      );
      roof.position.y = height + settings.shelterSideBlockRoofHeight / 2;
      building.add(roof);
      const penthouse = new THREE.Mesh(
        new THREE.BoxGeometry(width * settings.streetTowerSetbackRatio, settings.streetTowerPenthouseHeight, depth * settings.streetTowerSetbackRatio),
        accentMaterial,
      );
      penthouse.position.y = height + settings.shelterSideBlockRoofHeight + settings.streetTowerPenthouseHeight / 2;
      building.add(penthouse);
      building.position.set(x, 0, z);
      parent.add(building);
    }
  }
  parent.add(innerWindows, endWindows);
}

function createShelterBackFence(settings, scene) {
  const fence = new THREE.Group();
  const width = settings.shelterBackFenceWidth;
  const height = settings.shelterBackFenceHeight;
  const depth = settings.shelterBackFenceDepth;
  const baseHeight = settings.shelterBackFenceBaseHeight;
  const metal = new THREE.MeshToonMaterial({ color: settings.shelterBackFenceMetalColor });
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, baseHeight, depth),
    new THREE.MeshToonMaterial({ color: settings.shelterBackFenceBaseColor }),
  );
  base.position.y = baseHeight / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  fence.add(base);

  const slatHeight = height - baseHeight;
  const slatCount = Math.ceil(width / settings.shelterBackFenceSlatSpacing) + 1;
  const slats = new THREE.InstancedMesh(
    new THREE.BoxGeometry(settings.shelterBackFenceSlatWidth, slatHeight, depth),
    metal,
    slatCount,
  );
  const transform = new THREE.Object3D();
  let slatIndex = 0;
  for (let x = -width / 2; x <= width / 2 && slatIndex < slatCount; x += settings.shelterBackFenceSlatSpacing) {
    transform.position.set(x, baseHeight + slatHeight / 2, 0);
    transform.updateMatrix();
    slats.setMatrixAt(slatIndex++, transform.matrix);
  }
  slats.count = slatIndex;
  slats.instanceMatrix.needsUpdate = true;
  slats.castShadow = true;
  slats.receiveShadow = true;
  fence.add(slats);

  const railYs = [height - settings.shelterBackFenceRailHeight / 2, baseHeight + slatHeight * 0.52];
  for (const y of railYs) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(width, settings.shelterBackFenceRailHeight, settings.shelterBackFenceRailDepth),
      metal,
    );
    rail.position.y = y;
    rail.castShadow = true;
    fence.add(rail);
  }

  const postCount = Math.ceil(width / settings.shelterBackFencePostSpacing) + 1;
  const posts = new THREE.InstancedMesh(
    new THREE.BoxGeometry(settings.shelterBackFencePostWidth, height, settings.shelterBackFencePostWidth),
    metal,
    postCount,
  );
  let postIndex = 0;
  for (let x = -width / 2; x <= width / 2 && postIndex < postCount; x += settings.shelterBackFencePostSpacing) {
    transform.position.set(x, height / 2, 0);
    transform.updateMatrix();
    posts.setMatrixAt(postIndex++, transform.matrix);
  }
  posts.count = postIndex;
  posts.instanceMatrix.needsUpdate = true;
  posts.castShadow = true;
  posts.receiveShadow = true;
  fence.add(posts);

  const canvas = document.createElement('canvas');
  canvas.width = settings.shelterBackSignCanvasWidth;
  canvas.height = settings.shelterBackSignCanvasHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = settings.shelterBackSignFillColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = settings.shelterBackSignBorderColor;
  context.lineWidth = settings.shelterBackSignBorder * canvas.width / settings.shelterBackSignWidth;
  context.strokeRect(context.lineWidth / 2, context.lineWidth / 2, canvas.width - context.lineWidth, canvas.height - context.lineWidth);
  context.fillStyle = settings.shelterBackSignTextColor;
  context.font = `bold ${Math.floor(canvas.height * 0.58)}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('OWN THE DOGE', canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(settings.shelterBackSignWidth, settings.shelterBackSignHeight),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide }),
  );
  sign.position.set(0, settings.shelterBackSignY, depth / 2 + settings.shelterBackSignBorder);
  fence.add(sign);

  fence.position.z = settings.shelterBackFenceZ;
  scene.add(fence);
}

function createShelterStreetCar(settings, index) {
  const group = new THREE.Group();
  const direction = index % 2 === 0 ? 1 : -1;
  const laneIndex = Math.floor(index / 2);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(settings.streetCarLength, settings.streetCarBodyHeight, settings.streetCarWidth),
    new THREE.MeshToonMaterial({ color: settings.streetCarColors[index % settings.streetCarColors.length] }),
  );
  body.position.y = settings.streetCarBodyLift;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(settings.streetCarLength * settings.streetCarCabinLengthRatio, settings.streetCarCabinHeight, settings.streetCarWidth * settings.streetCarCabinWidthRatio),
    new THREE.MeshToonMaterial({ color: settings.streetCarGlassColor }),
  );
  cabin.position.set(-direction * settings.streetCarLength * settings.streetCarCabinOffsetRatio, settings.streetCarCabinLift, 0);
  group.add(cabin);
  const wheelGeometry = new THREE.CylinderGeometry(settings.streetCarWheelRadius, settings.streetCarWheelRadius, settings.streetCarWheelDepth, settings.streetCarWheelSegments);
  const wheelMaterial = new THREE.MeshToonMaterial({ color: settings.streetCarTrimColor });
  for (const x of [-settings.streetCarLength * settings.streetCarWheelLengthRatio, settings.streetCarLength * settings.streetCarWheelLengthRatio]) {
    for (const z of [-settings.streetCarWidth * settings.streetCarWheelWidthRatio, settings.streetCarWidth * settings.streetCarWheelWidthRatio]) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, settings.streetCarWheelLift, z);
      group.add(wheel);
    }
  }
  const laneOffset = settings.streetRoadDepth * settings.streetLaneRatio * direction;
  group.position.set(
    direction > 0
      ? -settings.streetRoadWidth / 2 + settings.streetCarSpacing * (laneIndex + settings.streetCarInitialSpacingOffset)
      : settings.streetRoadWidth / 2 - settings.streetCarSpacing * (laneIndex + settings.streetCarInitialSpacingOffset),
    0,
    settings.streetRoadZ + laneOffset,
  );
  return { group, direction };
}

export function createGaragePreview(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.render.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x172337);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(5.8, 3.4, 6.2);
  camera.lookAt(0, 1.05, 0);
  scene.add(new THREE.HemisphereLight(0xe4f3ff, 0x56452f, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffe0a0, 3.2);
  keyLight.position.set(-4, 8, 5);
  scene.add(keyLight);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 48),
    new THREE.MeshStandardMaterial({ color: 0x26364a, roughness: 0.88 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  scene.add(floor);

  const holder = new THREE.Group();
  scene.add(holder);
  let vehicleId = null;
  let vehicleModel = null;
  let rotation = 0.52;
  let dragX = null;
  function setVehicle(vehicle) {
    if (!vehicle || vehicle.id === vehicleId) return;
    if (vehicleModel) {
      holder.remove(vehicleModel.group);
      disposeObject(vehicleModel.group);
    }
    vehicleId = vehicle.id;
    vehicleModel = buildVan(vehicle);
    holder.add(vehicleModel.group);
    draw();
  }
  canvas.addEventListener('pointerdown', (event) => {
    dragX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (dragX === null) return;
    rotation += (event.clientX - dragX) * CONFIG.garage.previewRotateSensitivity;
    dragX = event.clientX;
    holder.rotation.y = rotation;
    draw();
  });
  canvas.addEventListener('pointerup', () => { dragX = null; });
  canvas.addEventListener('pointercancel', () => { dragX = null; });

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) return;
    const pixelRatio = renderer.getPixelRatio();
    if (canvas.width !== Math.round(width * pixelRatio)
      || canvas.height !== Math.round(height * pixelRatio)) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
  }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(draw).observe(canvas);
  else window.addEventListener('resize', draw);
  return { setVehicle };
}

function buildUsaSunset() {
  const settings = CONFIG.worldScenery;
  const group = new THREE.Group();
  group.position.set(settings.usaSunsetScreenX, settings.usaSunsetScreenY, -settings.usaSunsetDistance);
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext('2d');
  const color = new THREE.Color(settings.usaSunsetGlowColor);
  const red = Math.round(color.r * 255);
  const green = Math.round(color.g * 255);
  const blue = Math.round(color.b * 255);
  const gradient = context.createRadialGradient(128, 128, 12, 128, 128, 128);
  gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 0.4)`);
  gradient.addColorStop(0.45, `rgba(${red}, ${green}, ${blue}, 0.2)`);
  gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  const glowTexture = new THREE.CanvasTexture(textureCanvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }));
  glow.scale.set(settings.usaSunsetGlowSize, settings.usaSunsetGlowSize, 1);
  glow.renderOrder = 1;
  group.add(glow);

  const sunDisk = new THREE.Mesh(
    new THREE.CircleGeometry(settings.usaSunsetCoreSize / 2, 48),
    new THREE.MeshBasicMaterial({
      color: settings.usaSunsetCoreColor,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  sunDisk.position.z = 0.08;
  sunDisk.renderOrder = 2;
  group.add(sunDisk);
  group.visible = false;
  return group;
}

function disposeObject(object) {
  object.traverse((part) => {
    if (!part.isMesh && !part.isSprite) return;
    part.geometry?.dispose();
    const materials = Array.isArray(part.material) ? part.material : [part.material];
    for (const material of materials) {
      material?.map?.dispose();
      material?.dispose();
    }
  });
}

function makeToonGradient() {
  const steps = new Uint8Array([70, 140, 210, 255]);
  const texture = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

function toonMaterial(color, gradientMap) {
  return new THREE.MeshToonMaterial({ color, gradientMap });
}

function buildRoad(gradientMap) {
  const group = new THREE.Group();
  const roadMaterial = createAsphaltMaterial();
  const brtBarriers = buildBrtBarriers(gradientMap);
  const busStopHatches = buildBusStopHatches(gradientMap);
  const gantry = buildHighwayGantry();
  const sidewalks = [];
  let roadWorldTint = CONFIG.worldScenery.neutralRoadTint;
  let roadIsWet = false;
  const updateRoadFinish = () => {
    roadMaterial.color.setHex(roadIsWet ? CONFIG.cityConditions.wetRoadTint : roadWorldTint);
    roadMaterial.roughness = roadIsWet ? CONFIG.cityConditions.wetRoadRoughness : ROAD_SURFACE.asphaltRoughness;
    roadMaterial.metalness = roadIsWet ? CONFIG.cityConditions.wetRoadMetalness : 0;
  };

  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_WIDTH_PX * PX_TO_WORLD, ROAD_LENGTH_WORLD),
    roadMaterial,
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.z = ROAD_START_Z + ROAD_LENGTH_WORLD / 2;
  surface.receiveShadow = true;
  group.add(surface);

  const kerbMaterial = toonMaterial(0xf4f4f4, gradientMap);
  for (const side of [1]) {
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.36, ROAD_LENGTH_WORLD), kerbMaterial);
    kerb.position.set(side * (ROAD_HALF_WORLD + 0.22), 0.18, ROAD_START_Z + ROAD_LENGTH_WORLD / 2);
    group.add(kerb);
  }

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, ROAD_LENGTH_WORLD),
    toonMaterial(CONFIG.palette.roadside, gradientMap),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.position.z = ROAD_START_Z + ROAD_LENGTH_WORLD / 2;
  group.add(ground);

  group.add(brtBarriers.group, busStopHatches.group, gantry.group);

  const sidewalkMaterial = toonMaterial(CONFIG.palette.sidewalk, gradientMap);
  for (const side of [-1, 1]) {
    const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(SIDEWALK_WIDTH, ROAD_LENGTH_WORLD), sidewalkMaterial);
    sidewalk.rotation.x = -Math.PI / 2;
    const sidewalkX = side < 0
      ? -ROAD_HALF_WORLD - SIDEWALK_WIDTH / 2
      : ROAD_HALF_WORLD + DOG_SIDE_CLEARANCE + SIDEWALK_WIDTH / 2;
    sidewalk.position.set(sidewalkX, 0.005, ROAD_START_Z + ROAD_LENGTH_WORLD / 2);
    group.add(sidewalk);
    sidewalks.push(sidewalk);
  }

  const dashMaterial = toonMaterial(CONFIG.palette.laneMark, gradientMap);
  const dashGeometry = new THREE.BoxGeometry(0.22, 0.04, DASH_LENGTH);
  const lanes = [];
  const laneWidth = (ROAD_WIDTH_PX * PX_TO_WORLD) / LANE_COUNT;

  for (let lane = 0; lane < LANE_COUNT - 1; lane++) {
    const x = -ROAD_HALF_WORLD + laneWidth * (lane + 1);
    const dashes = [];
    for (let i = 0; i < DASHES_PER_LANE; i++) {
      const dash = new THREE.Mesh(dashGeometry, dashMaterial);
      dash.position.set(x, 0.03, ROAD_START_Z + i * DASH_PITCH);
      group.add(dash);
      dashes.push(dash);
    }
    lanes.push(dashes);
  }

  return {
    group,
    lanes,
    brtBarriers,
    busStopHatches,
    gantry,
    setWorld(worldId) {
      const isLagos = worldId === 'lagos';
      const isJapan = worldId === 'japan';
      sidewalks.forEach((sidewalk) => { sidewalk.visible = isLagos; });
      ground.visible = isLagos;
      roadWorldTint = isJapan
        ? CONFIG.worldScenery.japanRoadTint
        : worldId === 'usa'
          ? CONFIG.worldScenery.usaRoadTint
          : CONFIG.worldScenery.neutralRoadTint;
      updateRoadFinish();
      dashMaterial.color.set(worldId === 'usa'
        ? CONFIG.worldScenery.usaLaneMarkColor
        : CONFIG.palette.laneMark);
      brtBarriers.group.visible = isLagos;
      busStopHatches.group.visible = isLagos;
      gantry.setWorld(worldId);
    },
    setRain(active) {
      roadIsWet = active;
      updateRoadFinish();
    },
  };
}

function buildCityConditionEffects(camera) {
  const settings = CONFIG.cityConditions;
  const rng = makeRng(settings.seedSalt);
  const rainPositions = new Float32Array(settings.rainCount * 6);
  const rainParticles = [];
  for (let index = 0; index < settings.rainCount; index++) {
    rainParticles.push({
      x: (rng() - 0.5) * settings.rainWidth,
      y: (rng() - 0.5) * settings.rainHeight,
      z: -rng() * settings.rainDepth,
    });
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({
    color: settings.rainColor,
    transparent: true,
    opacity: settings.rainOpacity,
    depthTest: false,
    depthWrite: false,
  }));
  rain.renderOrder = 30;
  rain.frustumCulled = false;
  rain.visible = false;
  camera.add(rain);

  const petalGeometry = new THREE.SphereGeometry(1, ...settings.petalSegments);
  const petalMaterial = new THREE.MeshBasicMaterial({
    color: settings.petalColor,
    transparent: true,
    opacity: settings.petalOpacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const petals = new THREE.InstancedMesh(petalGeometry, petalMaterial, settings.petalCount);
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.renderOrder = 28;
  petals.frustumCulled = false;
  const petalDummy = new THREE.Object3D();
  const petalPositions = Array.from({ length: settings.petalCount }, () => ({
    x: (rng() - 0.5) * settings.petalAreaWidth,
    y: (rng() - 0.5) * settings.petalAreaHeight,
    z: -(settings.petalMinimumDepth + rng() * settings.petalAreaDepth),
    phase: rng() * Math.PI * 2,
    spin: (rng() - 0.5) * settings.petalWindSpeed,
  }));
  for (let index = 0; index < petalPositions.length; index++) {
    const petal = petalPositions[index];
    petalDummy.position.set(petal.x, petal.y, petal.z);
    petalDummy.scale.set(...settings.petalSize);
    petalDummy.rotation.set(petal.phase, petal.phase, petal.phase);
    petalDummy.updateMatrix();
    petals.setMatrixAt(index, petalDummy.matrix);
  }
  petals.instanceMatrix.needsUpdate = true;
  camera.add(petals);

  const roadworks = buildRoadworkViewProps(settings);
  camera.add(roadworks);
  const market = buildMarketViewProps(settings);
  camera.add(market);

  return {
    update(condition, worldId, time, dt, travelled) {
      rain.visible = condition === 'rain';
      if (rain.visible) {
        const positions = rainGeometry.attributes.position;
        for (let index = 0; index < rainParticles.length; index++) {
          const particle = rainParticles[index];
          particle.y -= settings.rainFallSpeed * dt;
          particle.x += settings.rainDrift * dt;
          if (particle.y < -settings.rainHeight / 2) {
            particle.y = settings.rainHeight / 2;
            particle.x = (rng() - 0.5) * settings.rainWidth;
            particle.z = -rng() * settings.rainDepth;
          }
          const offset = index * 2;
          positions.setXYZ(offset, particle.x, particle.y, particle.z);
          positions.setXYZ(offset + 1,
            particle.x + settings.rainDrift * settings.rainStreakLength,
            particle.y - settings.rainStreakLength,
            particle.z);
        }
        positions.needsUpdate = true;
      }

      petals.visible = worldId === 'japan';
      if (petals.visible) {
        for (let index = 0; index < petalPositions.length; index++) {
          const petal = petalPositions[index];
          petal.y -= settings.petalFallSpeed * dt;
          petal.x += (petal.spin + Math.sin(time * settings.petalWobbleFrequency + petal.phase) * settings.petalWobble) * dt;
          if (petal.y < -settings.petalAreaHeight / 2) {
            petal.y = settings.petalResetHeight;
            petal.x = (rng() - 0.5) * settings.petalAreaWidth;
            petal.z = -(settings.petalMinimumDepth + rng() * settings.petalAreaDepth);
          }
          petalDummy.position.set(petal.x, petal.y, petal.z);
          petalDummy.rotation.set(time * petal.spin, time * settings.petalWobbleFrequency + petal.phase, petal.phase);
          petalDummy.scale.set(...settings.petalSize);
          petalDummy.updateMatrix();
          petals.setMatrixAt(index, petalDummy.matrix);
        }
        petals.instanceMatrix.needsUpdate = true;
      }
      roadworks.visible = condition === 'roadworks';
      market.visible = condition === 'market';
      for (const props of [roadworks, market]) {
        props.position.z += travelled;
        if (props.position.z > -settings.minimumPropViewDistance) {
          props.position.z -= props.userData.repeatDepth;
        }
      }
    },
  };
}

function buildRoadworkViewProps(settings) {
  const group = new THREE.Group();
  group.position.z = -settings.roadworkViewDistance;
  group.userData.repeatDepth = settings.roadworkDepth;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const coneGeometry = new THREE.ConeGeometry(1, 1, settings.roadworkGeometrySegments);
  const orange = new THREE.MeshBasicMaterial({ color: settings.roadworkConeColor });
  const yellow = new THREE.MeshBasicMaterial({ color: settings.roadworkBarrierColor });
  const dark = new THREE.MeshBasicMaterial({ color: settings.roadworkSignColor });
  const sign = new THREE.Mesh(box, dark);
  sign.scale.set(...settings.roadworkSignSize);
  sign.position.set(ROAD_HALF_WORLD * settings.roadworkSignXRatio, settings.roadworkViewHeight + settings.roadworkSignPoleHeight, 0);
  group.add(sign);
  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(...settings.roadworkSignTextSize),
    new THREE.MeshBasicMaterial({
      map: createPaintedTextTexture(
        'ROAD WORKS',
        ...settings.roadworkSignCanvasSize,
        settings.roadworkSignBackgroundColor,
        settings.roadworkSignTextColor,
      ),
      color: settings.roadworkSignTextColor,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  signFace.position.set(ROAD_HALF_WORLD * settings.roadworkSignXRatio, settings.roadworkViewHeight + settings.roadworkSignPoleHeight, settings.roadworkSignSize[2]);
  group.add(signFace);
  for (const side of [-1, 1]) {
    const barrier = new THREE.Mesh(box, yellow);
    barrier.scale.set(...settings.roadworkBarrierSize);
    barrier.position.set(side * ROAD_HALF_WORLD * settings.roadworkRoadEdgeRatio, settings.roadworkViewHeight, 0);
    group.add(barrier);
    for (let index = 0; index < settings.roadworkConeCount; index++) {
      const cone = new THREE.Mesh(coneGeometry, orange);
      cone.scale.set(...settings.roadworkConeSize);
      cone.position.set(
        side * ROAD_HALF_WORLD * settings.roadworkRoadEdgeRatio,
        settings.roadworkViewHeight + settings.roadworkConeSize[1] / 2,
        (index - (settings.roadworkConeCount - 1) / 2) * settings.roadworkPropSpacing,
      );
      group.add(cone);
    }
  }
  group.visible = false;
  return group;
}

function buildMarketViewProps(settings) {
  const group = new THREE.Group();
  group.position.z = -settings.marketViewDistance;
  group.userData.repeatDepth = settings.marketRepeatDepth;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const awning = new THREE.MeshBasicMaterial({ color: settings.marketStallColor });
  const trim = new THREE.MeshBasicMaterial({ color: settings.marketTrimColor });
  const base = new THREE.MeshBasicMaterial({ color: settings.marketBaseColor });
  for (const side of [-1, 1]) {
    for (let index = 0; index < 2; index++) {
      const stall = new THREE.Group();
      const x = side * ROAD_HALF_WORLD * settings.marketRoadEdgeRatio;
      const z = -index * settings.marketStallSpacingZ;
      const counter = new THREE.Mesh(box, base);
      counter.scale.set(settings.marketStallWidth, settings.marketStallHeight * settings.marketCounterHeightRatio, settings.marketStallDepth * settings.marketCounterDepthRatio);
      counter.position.y = settings.marketViewHeight + settings.marketStallHeight * settings.marketCounterHeightRatio / 2;
      stall.add(counter);
      const canopy = new THREE.Mesh(box, index === 0 ? awning : trim);
      canopy.scale.set(settings.marketStallWidth * settings.marketCanopyWidthRatio, settings.marketStallHeight * settings.marketCanopyHeightRatio, settings.marketStallDepth);
      canopy.position.y = settings.marketViewHeight + settings.marketStallHeight * settings.marketCanopyYOffsetRatio;
      stall.add(canopy);
      for (const edge of [-1, 1]) {
        const post = new THREE.Mesh(box, trim);
        post.scale.set(settings.marketPostSize, settings.marketStallHeight * settings.marketPostHeightRatio, settings.marketPostSize);
        post.position.set(edge * settings.marketStallWidth * settings.marketPostXRatio, settings.marketViewHeight + settings.marketStallHeight * settings.marketPostYOffsetRatio, 0);
        stall.add(post);
      }
      stall.position.set(x, 0, z);
      group.add(stall);
    }
  }
  group.visible = false;
  return group;
}

function createAsphaltMaterial() {
  const size = ROAD_SURFACE.canvasSize;
  const colorCanvas = document.createElement('canvas');
  const roughnessCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  for (const canvas of [colorCanvas, roughnessCanvas, bumpCanvas]) {
    canvas.width = size;
    canvas.height = size;
  }
  const colorContext = colorCanvas.getContext('2d');
  const roughnessContext = roughnessCanvas.getContext('2d');
  const bumpContext = bumpCanvas.getContext('2d');
  colorContext.fillStyle = ROAD_SURFACE.asphaltBaseColor;
  colorContext.fillRect(0, 0, size, size);
  roughnessContext.fillStyle = `rgb(${ROAD_SURFACE.asphaltRoughnessBase},${ROAD_SURFACE.asphaltRoughnessBase},${ROAD_SURFACE.asphaltRoughnessBase})`;
  roughnessContext.fillRect(0, 0, size, size);
  bumpContext.fillStyle = `rgb(${ROAD_SURFACE.asphaltBumpBase},${ROAD_SURFACE.asphaltBumpBase},${ROAD_SURFACE.asphaltBumpBase})`;
  bumpContext.fillRect(0, 0, size, size);

  const rng = makeRng(ROAD_SURFACE.seed);
  for (let index = 0; index < ROAD_SURFACE.asphaltSpeckleCount; index++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = ROAD_SURFACE.asphaltSpeckleSizeMin + rng() * ROAD_SURFACE.asphaltSpeckleSizeRange;
    const delta = Math.round((rng() - 0.5) * ROAD_SURFACE.asphaltNoiseSpread);
    const grey = Math.max(0, Math.min(255, ROAD_SURFACE.asphaltSpeckleColorBase + delta));
    colorContext.fillStyle = `rgba(${grey},${grey},${grey},${ROAD_SURFACE.asphaltAlphaMin + rng() * ROAD_SURFACE.asphaltAlphaRange})`;
    colorContext.fillRect(x, y, radius, radius);
    const roughness = Math.max(0, Math.min(255, ROAD_SURFACE.asphaltRoughnessBase + delta));
    roughnessContext.fillStyle = `rgb(${roughness},${roughness},${roughness})`;
    roughnessContext.fillRect(x, y, radius, radius);
    const bump = Math.max(0, Math.min(255, ROAD_SURFACE.asphaltBumpBase + delta * ROAD_SURFACE.asphaltBumpContrast));
    bumpContext.fillStyle = `rgb(${bump},${bump},${bump})`;
    bumpContext.fillRect(x, y, radius, radius);
  }

  const colorMap = makeRepeatTexture(colorCanvas, ROAD_SURFACE.asphaltRepeatX, ROAD_SURFACE.asphaltRepeatZ, true);
  const roughnessMap = makeRepeatTexture(roughnessCanvas, ROAD_SURFACE.asphaltRepeatX, ROAD_SURFACE.asphaltRepeatZ);
  const bumpMap = makeRepeatTexture(bumpCanvas, ROAD_SURFACE.asphaltRepeatX, ROAD_SURFACE.asphaltRepeatZ);
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: colorMap,
    roughnessMap,
    bumpMap,
    roughness: ROAD_SURFACE.asphaltRoughness,
    bumpScale: ROAD_SURFACE.asphaltBumpScale,
  });
}

function makeRepeatTexture(canvas, repeatX, repeatZ, isColor = false) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatZ);
  texture.anisotropy = ROAD_SURFACE.textureAnisotropy;
  if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildBrtBarriers(gradientMap) {
  const group = new THREE.Group();
  const segments = [];
  const paint = ROAD_VISUAL;
  const laneWidth = ROAD_WIDTH_PX * PX_TO_WORLD / LANE_COUNT;
  const dividerX = -ROAD_HALF_WORLD + laneWidth;
  const pitch = paint.brtBarrierSegmentLength + paint.brtBarrierGap;
  const count = Math.ceil(ROAD_LENGTH_WORLD / pitch);
  const bodyGeometry = new THREE.BoxGeometry(paint.brtBarrierWidth, paint.brtBarrierHeight, paint.brtBarrierSegmentLength);
  const stripeGeometry = new THREE.BoxGeometry(
    paint.brtBarrierStripeWidth,
    paint.brtBarrierStripeHeight,
    paint.brtBarrierWidth + paint.brtBarrierGap,
  );
  const bodyMaterial = toonMaterial(paint.brtBarrierColor, gradientMap);
  const stripeMaterial = toonMaterial(paint.brtBarrierStripeColor, gradientMap);

  for (let index = 0; index < count; index++) {
    const segment = new THREE.Group();
    segment.position.set(dividerX, 0, ROAD_START_Z + index * pitch);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = paint.brtBarrierHeight / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    segment.add(body);

    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe.position.y = paint.brtBarrierHeight * 0.72;
    segment.add(stripe);
    group.add(segment);
    segments.push(segment);
  }

  return { group, segments };
}

function buildBusStopHatches(gradientMap) {
  const group = new THREE.Group();
  const patterns = [];
  const paint = ROAD_VISUAL;
  const laneWidth = ROAD_WIDTH_PX * PX_TO_WORLD / LANE_COUNT;
  const laneCenterX = ROAD_HALF_WORLD - laneWidth / 2;
  const usableWidth = laneWidth - paint.busStopEdgeMargin * 2;
  const paintMaterial = toonMaterial(paint.busStopColor, gradientMap);
  const lineGeometry = new THREE.BoxGeometry(paint.busStopLineWidth, paint.busStopPaintHeight, paint.busStopLength);
  const endGeometry = new THREE.BoxGeometry(usableWidth, paint.busStopPaintHeight, paint.busStopLineWidth);
  const stripeGeometry = new THREE.BoxGeometry(paint.busStopLineWidth, paint.busStopPaintHeight, paint.busStopStripeLength);
  const labelBackgroundGeometry = new THREE.BoxGeometry(
    paint.busStopLabelWidth,
    paint.busStopPaintHeight,
    paint.busStopLabelLength,
  );
  const labelBackgroundMaterial = toonMaterial(paint.busStopColor, gradientMap);
  const labelTexture = createPaintedTextTexture(
    'BUS STOP',
    paint.busStopLabelCanvasWidth,
    paint.busStopLabelCanvasHeight,
    ROAD_VISUAL.busStopColor,
    CONFIG.palette.road,
  );
  const labelMaterial = new THREE.MeshBasicMaterial({
    map: labelTexture,
    transparent: true,
    toneMapped: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const labelGeometry = new THREE.PlaneGeometry(paint.busStopLabelWidth, paint.busStopLabelLength);
  const stripeCount = Math.floor(paint.busStopLength / paint.busStopStripeSpacing);

  for (let index = 0; index < paint.busStopRepeatCount; index++) {
    const pattern = new THREE.Group();
    pattern.position.set(
      laneCenterX,
      0,
      ROAD_START_Z + CONFIG.roadVisual.busStopFirstOffset + index * paint.busStopRepeatSpacing,
    );

    for (const edge of [-1, 1]) {
      const line = new THREE.Mesh(lineGeometry, paintMaterial);
      line.position.set(edge * (laneWidth / 2 - paint.busStopEdgeMargin), paint.busStopPaintHeight / 2, 0);
      pattern.add(line);
    }
    for (const end of [-1, 1]) {
      const line = new THREE.Mesh(endGeometry, paintMaterial);
      line.position.set(0, paint.busStopPaintHeight / 2, end * (paint.busStopLength / 2));
      pattern.add(line);
    }

    for (let stripeIndex = 0; stripeIndex < stripeCount; stripeIndex++) {
      const stripe = new THREE.Mesh(stripeGeometry, paintMaterial);
      stripe.position.set(
        0,
        paint.busStopPaintHeight / 2,
        -paint.busStopLength / 2 + (stripeIndex + 0.5) * paint.busStopStripeSpacing,
      );
      stripe.rotation.y = paint.busStopStripeAngle;
      pattern.add(stripe);
    }

    const labelBackground = new THREE.Mesh(labelBackgroundGeometry, labelBackgroundMaterial);
    labelBackground.position.y = paint.busStopPaintHeight / 2 + CONFIG.roadVisual.busStopLabelLift;
    pattern.add(labelBackground);
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.rotation.x = -Math.PI / 2;
    label.position.y = paint.busStopPaintHeight + CONFIG.roadVisual.busStopLabelLift * 2;
    pattern.add(label);

    group.add(pattern);
    patterns.push(pattern);
  }

  return { group, patterns };
}

function buildHighwayGantry() {
  const group = new THREE.Group();
  const paint = ROAD_VISUAL;
  const metal = new THREE.MeshStandardMaterial({ color: paint.gantryMetalColor, metalness: 0.62, roughness: 0.42 });
  const frameGeometry = new THREE.BoxGeometry(1, 1, 1);
  const outerX = ROAD_HALF_WORLD + paint.gantryPostOffset;
  const beam = new THREE.Mesh(frameGeometry, metal);
  beam.scale.set(outerX * 2, paint.gantryBeamHeight, paint.gantryBeamDepth);
  beam.position.y = paint.gantryHeight;
  beam.castShadow = true;
  group.add(beam);

  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(frameGeometry, metal);
    post.scale.set(paint.gantryPostWidth, paint.gantryHeight, paint.gantryPostWidth);
    post.position.set(side * outerX, paint.gantryHeight / 2, 0);
    post.castShadow = true;
    group.add(post);
  }

  const labelsByWorld = {
    lagos: ['LAGOS', 'BRT LANE', 'MAINLAND'],
    japan: ['SAKURA CITY', 'SAKURA-DORI', 'HANAMI STREET'],
    usa: ['NEW YORK', 'ROUTE 66', 'MAIN STREET'],
  };
  const faceMaterials = [];
  const laneWidth = ROAD_WIDTH_PX * PX_TO_WORLD / LANE_COUNT;
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const laneCenterX = -ROAD_HALF_WORLD + laneWidth * (lane + 0.5);
    const sign = new THREE.Group();
    const backing = new THREE.Mesh(frameGeometry, metal);
    backing.scale.set(paint.gantrySignWidth, paint.gantrySignHeight, paint.gantrySignDepth);
    backing.position.y = paint.gantrySignY;
    backing.castShadow = true;
    sign.add(backing);

    const texture = createSignTexture(labelsByWorld.lagos[lane]);
    const faceMaterial = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    faceMaterials.push(faceMaterial);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(paint.gantrySignWidth * paint.gantryFaceWidthRatio, paint.gantrySignHeight * paint.gantryFaceHeightRatio),
      faceMaterial,
    );
    face.position.set(0, paint.gantrySignY, -paint.gantrySignDepth / 2 - paint.gantryFaceOffset);
    face.rotation.y = Math.PI;
    sign.add(face);
    sign.position.x = laneCenterX;
    group.add(sign);
  }

  group.position.z = paint.gantryStartZ;
  let activeWorld = 'lagos';
  return {
    group,
    setWorld(worldId) {
      const nextWorld = labelsByWorld[worldId] ? worldId : 'lagos';
      if (nextWorld === activeWorld) return;
      activeWorld = nextWorld;
      for (let lane = 0; lane < faceMaterials.length; lane++) {
        faceMaterials[lane].map?.dispose();
        faceMaterials[lane].map = createSignTexture(labelsByWorld[activeWorld][lane], activeWorld);
        faceMaterials[lane].needsUpdate = true;
      }
    },
  };
}

function createPaintedTextTexture(text, width, height, backgroundColor, textColor) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);
  context.fillStyle = `#${backgroundColor.toString(16).padStart(6, '0')}`;
  context.fillRect(0, 0, width, height);
  context.fillStyle = `#${textColor.toString(16).padStart(6, '0')}`;
  context.font = `900 ${CONFIG.roadVisual.busStopFontSize}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, width / 2, height / 2, width * CONFIG.roadVisual.busStopTextWidthRatio);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSignTexture(text, worldId = 'lagos') {
  const paint = ROAD_VISUAL;
  const signColor = worldId === 'japan'
    ? CONFIG.worldScenery.gantrySignColorJapan
    : worldId === 'usa'
      ? CONFIG.worldScenery.gantrySignColorUSA
      : paint.gantrySignColor;
  const canvas = document.createElement('canvas');
  canvas.width = paint.gantryLabelCanvasWidth;
  canvas.height = paint.gantryLabelCanvasHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = `#${signColor.toString(16).padStart(6, '0')}`;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = `#${paint.gantryTextColor.toString(16).padStart(6, '0')}`;
  context.lineWidth = paint.gantryBorderWidth;
  context.strokeRect(paint.gantryBorderInset, paint.gantryBorderInset, canvas.width - paint.gantryBorderInset * 2, canvas.height - paint.gantryBorderInset * 2);
  context.fillStyle = `#${paint.gantryTextColor.toString(16).padStart(6, '0')}`;
  context.font = `bold ${paint.gantryFontSize}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width * paint.gantryTextWidthRatio);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function updateRoad(road, travelled) {
  for (const dashes of road.lanes) {
    for (const dash of dashes) {
      dash.position.z -= travelled;
      while (dash.position.z < ROAD_START_Z) {
        dash.position.z += DASH_PITCH * DASHES_PER_LANE;
      }
      while (dash.position.z > ROAD_START_Z + DASH_PITCH * DASHES_PER_LANE) {
        dash.position.z -= DASH_PITCH * DASHES_PER_LANE;
      }
    }
  }

  for (const segment of road.brtBarriers.segments) {
    segment.position.z -= travelled;
    wrapZ(segment, ROAD_START_Z, ROAD_LENGTH_WORLD);
  }
  for (const hatch of road.busStopHatches.patterns) {
    hatch.position.z -= travelled;
    wrapZ(hatch, ROAD_START_Z - ROAD_VISUAL.busStopLength, ROAD_LENGTH_WORLD);
  }
  road.gantry.group.position.z -= travelled;
  wrapZ(road.gantry.group, ROAD_START_Z, ROAD_LENGTH_WORLD);
}

function wrapZ(object, lowerBound, wrapDistance) {
  while (object.position.z < lowerBound) object.position.z += wrapDistance;
  while (object.position.z > lowerBound + wrapDistance) object.position.z -= wrapDistance;
}

// Worst case a wave blocks 2 lanes and the slowest traffic takes 12.6s to cross
// the spawn-to-despawn span, so up to ~12 cars can be alive at once early on.
const CAR_POOL_SIZE = 20;
const DOG_POOL_SIZE = CONFIG.shelter.capacity
  + CONFIG.stops.visibleZoneCount * CONFIG.dogs.perStopMax
  + CONFIG.shelter.residentDisplayCount;

// Keep both procedural traffic silhouettes per slot; logical traffic records
// select which one is visible, avoiding per-frame mesh creation.
function buildCarPool() {
  const group = new THREE.Group();
  const meshes = [];
  const trafficTypes = Object.keys(CONFIG.traffic.vehicleTypeWeights);

  for (let index = 0; index < CAR_POOL_SIZE; index++) {
    const variants = Object.fromEntries(trafficTypes.map((type) => [
      type,
      createTrafficCar(type, trafficColorForSlot(type, index), index),
    ]));
    for (const variant of Object.values(variants)) {
      variant.group.visible = false;
      group.add(variant.group);
    }
    meshes.push({ variants, carId: null });
  }
  return { group, meshes };
}

// Traffic uses the same rounded arcade vehicle generator as the player, without branding.
function createTrafficCar(type, color, slotIndex = 0) {
  if (type === 'bike') {
    const bike = createTrafficBike(color);
    bike.smokeEmitter = createCrashSmokeEmitter(CONFIG.crash.obstacleSmokeCount, CONFIG.crash.smokeColor, CONFIG.crash.smokeSpawnPerSecond);
    bike.group.add(bike.smokeEmitter.points);
    bike.smokeEmitter.points.position.set(0, CONFIG.crash.smokeOriginY * CONFIG.crash.smokeOriginBikeHeightRatio, CONFIG.crash.smokeOriginZRatio);
    bike.impactBurst = createTrafficImpactBurst();
    bike.group.add(bike.impactBurst.group);
    return bike;
  }
  const danfo = type === 'danfo';
  const traffic = CONFIG.traffic;
  const dimensionsByType = {
    danfo: [traffic.danfoWidth, traffic.danfoDepth, traffic.danfoBodyHeight, traffic.danfoCabinHeight],
    sedan: [traffic.carWidth, traffic.carDepth, traffic.sedanBodyHeight, traffic.sedanCabinHeight],
    tanker: [traffic.tankerWidth, traffic.tankerDepth, traffic.sedanBodyHeight, traffic.sedanCabinHeight],
    van: [traffic.vanWidth, traffic.vanDepth, traffic.danfoBodyHeight, traffic.danfoCabinHeight],
    truck: [traffic.truckWidth, traffic.truckDepth, traffic.danfoBodyHeight, traffic.danfoCabinHeight],
  };
  const [widthPx, lengthPx, bodyHeight, cabinHeight] = dimensionsByType[type] || dimensionsByType.sedan;
  const width = widthPx * PX_TO_WORLD;
  const length = lengthPx * PX_TO_WORLD;
  const stylized = createStylizedVan(color, false, {
    width,
    length,
    bodyHeight,
    cabinHeight,
    wheelRadius: ['tanker', 'van', 'truck'].includes(type) ? traffic.utilityWheelRadius : traffic.wheelRadius,
    danfo,
  });
  if (type === 'tanker') addTankerBody(stylized.group, width, length);
  if (type === 'truck') addTruckCargo(stylized.group, width, length, slotIndex);
  stylized.smokeEmitter = createCrashSmokeEmitter(CONFIG.crash.obstacleSmokeCount, CONFIG.crash.smokeColor, CONFIG.crash.smokeSpawnPerSecond);
  stylized.group.add(stylized.smokeEmitter.points);
  stylized.smokeEmitter.points.position.set(0, CONFIG.crash.smokeOriginY, length * CONFIG.crash.smokeOriginZRatio);
  stylized.impactBurst = createTrafficImpactBurst();
  stylized.group.add(stylized.impactBurst.group);
  stylized.group.userData.type = type;
  return stylized;
}

function createTrafficImpactBurst() {
  const group = new THREE.Group();
  group.position.y = CONFIG.crash.smokeOriginY;
  group.visible = false;
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: CONFIG.crash.obstacleExplosionColor,
    transparent: true,
    opacity: CONFIG.crash.obstacleExplosionFlashOpacity,
    depthWrite: false,
  });
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: CONFIG.crash.obstacleExplosionHotColor,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), flashMaterial);
  const core = new THREE.Mesh(new THREE.SphereGeometry(CONFIG.crash.obstacleExplosionCoreRadius, 8, 6), coreMaterial);
  group.add(flash, core);
  const debrisMaterial = new THREE.MeshBasicMaterial({
    color: CONFIG.crash.obstacleExplosionColor,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  const shards = Array.from({ length: CONFIG.crash.obstacleExplosionDebrisCount }, (_, index) => {
    const shard = new THREE.Mesh(new THREE.BoxGeometry(
      CONFIG.crash.obstacleExplosionShardWidth,
      CONFIG.crash.obstacleExplosionShardHeight,
      CONFIG.crash.obstacleExplosionShardDepth,
    ), debrisMaterial);
    const angle = (index / CONFIG.crash.obstacleExplosionDebrisCount) * Math.PI * 2;
    const rise = index % 2 === 0
      ? CONFIG.crash.obstacleExplosionShardRiseHigh
      : CONFIG.crash.obstacleExplosionShardRiseLow;
    const direction = new THREE.Vector3(Math.cos(angle), rise, Math.sin(angle)).normalize();
    group.add(shard);
    return { mesh: shard, direction, turn: index % 2 === 0 ? 1 : -1 };
  });
  return { group, flash, core, flashMaterial, coreMaterial, debrisMaterial, shards, elapsed: 0 };
}

function updateTrafficImpactBurst(burst, dt, start = false) {
  if (start) {
    burst.elapsed = 0;
    burst.group.visible = true;
  }
  if (!burst.group.visible) return;
  burst.elapsed += dt;
  const progress = Math.min(burst.elapsed / CONFIG.crash.obstacleExplosionSeconds, 1);
  const radius = CONFIG.crash.obstacleExplosionRadius;
  burst.flash.scale.setScalar(radius * progress);
  burst.core.scale.setScalar(radius * (1 - progress) * CONFIG.crash.obstacleExplosionCoreScaleRatio);
  burst.flashMaterial.opacity = (1 - progress) * CONFIG.crash.obstacleExplosionFlashFadeRatio;
  burst.coreMaterial.opacity = 1 - progress;
  burst.debrisMaterial.opacity = 1 - progress;
  for (const shard of burst.shards) {
    shard.mesh.position.copy(shard.direction).multiplyScalar(
      CONFIG.crash.obstacleExplosionDebrisTravel * progress,
    );
    const spin = progress * shard.turn * CONFIG.crash.obstacleExplosionShardSpin;
    shard.mesh.rotation.set(spin, spin, spin);
  }
  if (progress >= 1) burst.group.visible = false;
}

function trafficColorForSlot(type, index) {
  const traffic = CONFIG.traffic;
  const palettes = {
    danfo: [traffic.danfoColor],
    sedan: traffic.sedanColors,
    bike: [traffic.bikeFrameColor],
    tanker: [traffic.tankerCabColor],
    van: traffic.vanColors,
    truck: traffic.truckColors,
  };
  const palette = palettes[type] || traffic.sedanColors;
  return palette[index % palette.length];
}

function addTankerBody(parent, width, length) {
  const traffic = CONFIG.traffic;
  const visual = traffic.bikeVisual;
  const tankMaterial = new THREE.MeshStandardMaterial({ color: traffic.tankerColor, roughness: visual.tankerRoughness, metalness: visual.tankerMetalness });
  const radius = Math.min(traffic.tankerRadius, width * visual.tankerWidthRatio);
  const tankLength = length * visual.tankerLengthRatio;
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, tankLength, 24), tankMaterial);
  tank.rotation.x = Math.PI / 2;
  tank.position.set(0, traffic.utilityWheelRadius + traffic.sedanBodyHeight + radius * visual.tankerPositionYRadiusRatio, length * visual.tankerPositionZRatio);
  tank.castShadow = true;
  tank.receiveShadow = true;
  parent.add(tank);

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = traffic.tankerLabelCanvasWidth;
  labelCanvas.height = traffic.tankerLabelCanvasHeight;
  const labelContext = labelCanvas.getContext('2d');
  labelContext.fillStyle = `#${traffic.tankerLabelColor.toString(16).padStart(6, '0')}`;
  labelContext.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
  labelContext.strokeStyle = `#${traffic.tankerSafetyColor.toString(16).padStart(6, '0')}`;
  labelContext.lineWidth = labelCanvas.height * 0.09;
  labelContext.strokeRect(labelContext.lineWidth, labelContext.lineWidth, labelCanvas.width - labelContext.lineWidth * 2, labelCanvas.height - labelContext.lineWidth * 2);
  labelContext.fillStyle = `#${traffic.tankerLabelTextColor.toString(16).padStart(6, '0')}`;
  labelContext.font = `900 ${Math.round(labelCanvas.height * 0.67)}px Arial, sans-serif`;
  labelContext.textAlign = 'center';
  labelContext.textBaseline = 'middle';
  labelContext.fillText('FUEL', labelCanvas.width / 2, labelCanvas.height / 2);
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture, side: THREE.DoubleSide, toneMapped: false });
  for (const side of [-1, 1]) {
    const label = new THREE.Mesh(new THREE.PlaneGeometry(
      tankLength * traffic.tankerLabelWidthRatio,
      radius * traffic.tankerLabelHeightRatio,
    ), labelMaterial);
    label.rotation.y = side * Math.PI / 2;
    label.position.set(side * radius * 0.99, tank.position.y, tank.position.z);
    parent.add(label);
  }
  const rearFuelLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 1.45, radius * 0.72),
    labelMaterial,
  );
  rearFuelLabel.position.set(0, tank.position.y, tank.position.z - tankLength / 2 - 0.015);
  parent.add(rearFuelLabel);

  const rimMaterial = new THREE.MeshStandardMaterial({ color: visual.tankerRimColor, metalness: visual.rimMetalness, roughness: visual.rimRoughness });
  const safetyMaterial = new THREE.MeshStandardMaterial({ color: traffic.tankerSafetyColor, metalness: visual.rimMetalness, roughness: visual.rimRoughness });
  for (const [index, offset] of visual.tankerRimOffsets.entries()) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * visual.tankerRimRadiusRatio, radius * visual.tankerRimTubeRatio, visual.tankerRimRadialSegments, visual.tankerRimTubularSegments), index === 1 ? safetyMaterial : rimMaterial);
    rim.position.set(0, tank.position.y, length * visual.tankerPositionZRatio + tankLength * offset);
    rim.castShadow = true;
    parent.add(rim);
  }
}

function addTruckCargo(parent, width, length, slotIndex) {
  const traffic = CONFIG.traffic;
  const cargoColor = traffic.cargoColors[slotIndex % traffic.cargoColors.length];
  const cargoMaterial = new THREE.MeshStandardMaterial({ color: cargoColor, roughness: traffic.bikeVisual.truckCargoRoughness });
  const cargoLength = length * traffic.bikeVisual.truckCargoLengthRatio;
  const cargo = new THREE.Mesh(
    new THREE.BoxGeometry(width * traffic.bikeVisual.truckCargoWidthRatio, traffic.cargoHeight, cargoLength),
    cargoMaterial,
  );
  const wheelRadius = traffic.utilityWheelRadius;
  cargo.position.set(0, wheelRadius + traffic.bikeVisual.cargoCabHeight + traffic.cargoHeight / 2, length * traffic.cargoOffsetZRatio);
  cargo.castShadow = true;
  cargo.receiveShadow = true;
  parent.add(cargo);
}

function createTrafficBike(frameColor) {
  const traffic = CONFIG.traffic;
  const visual = traffic.bikeVisual;
  const group = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({ color: frameColor, roughness: visual.bikeFrameRoughness, metalness: visual.bikeFrameMetalness });
  const tireMaterial = new THREE.MeshStandardMaterial({ color: visual.bikeTireColor, roughness: visual.bikeTireRoughness });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: visual.bikeMetalColor, roughness: visual.bikeMetalRoughness, metalness: visual.bikeMetalness });
  const seatMaterial = new THREE.MeshStandardMaterial({ color: traffic.bikeSeatColor, roughness: visual.bikeSeatRoughness });
  const wheels = [];
  const wheelGeometry = new THREE.CylinderGeometry(
    traffic.bikeWheelRadius,
    traffic.bikeWheelRadius,
    traffic.bikeWidth * PX_TO_WORLD * visual.wheelThicknessRatio,
    visual.spokeSegments,
  );
  for (const z of traffic.bikeWheelZOffsets) {
    const wheel = new THREE.Mesh(wheelGeometry, tireMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, traffic.bikeWheelRadius, z);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
    const hubRadius = traffic.bikeWheelRadius * visual.hubRadiusRatio;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(hubRadius, hubRadius, traffic.bikeWidth * PX_TO_WORLD * visual.hubThicknessRatio, visual.smallRoundSegments), metalMaterial);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(wheel.position);
    group.add(hub);
  }

  const fairing = new THREE.Mesh(new THREE.SphereGeometry(1, visual.bikeFairingWidthSegments, visual.bikeFairingHeightSegments), frameMaterial);
  fairing.scale.set(...visual.fairingScale);
  fairing.position.set(...visual.fairingPosition);
  group.add(fairing);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(...visual.seatSize), seatMaterial);
  seat.position.set(...visual.seatPosition);
  group.add(seat);
  const handleRadius = traffic.bikeWheelRadius * visual.bikeHandleRadiusRatio;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(handleRadius, handleRadius, visual.handleLength, visual.bikeHandleSegments), metalMaterial);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, visual.handleHeight, visual.handleZ);
  group.add(handle);

  const riderMaterial = new THREE.MeshStandardMaterial({ color: traffic.bikeRiderColors[0], roughness: visual.bikeClothingRoughness });
  const passengerMaterial = new THREE.MeshStandardMaterial({ color: traffic.passengerShirtColors[0], roughness: visual.bikeClothingRoughness });
  const helmetMaterial = new THREE.MeshStandardMaterial({ color: traffic.bikeHelmetColors[0], roughness: visual.bikeHelmetRoughness, metalness: visual.bikeHelmetMetalness });
  const headMaterial = new THREE.MeshStandardMaterial({ color: traffic.bikeSkinColor, roughness: visual.bikeSkinRoughness });
  const bodyGeometry = new THREE.CapsuleGeometry(visual.riderTorsoRadius, visual.riderTorsoLength, visual.bikeCapsuleCapSegments, visual.capsuleRadialSegments);
  const headGeometry = new THREE.SphereGeometry(visual.riderHeadRadius, visual.smallRoundSegments, visual.bikeHeadSegments);
  const people = [
    { offset: traffic.bikeRiderOffset, height: traffic.bikeRiderHeight, material: riderMaterial, helmet: true, scale: visual.bikeRiderScale },
    { offset: traffic.bikePassengerOffset, height: traffic.bikePassengerHeight, material: passengerMaterial, helmet: true, scale: traffic.bikePassengerScale },
  ];
  for (const person of people) {
    const torso = new THREE.Mesh(bodyGeometry, person.material);
    torso.scale.set(person.scale, person.scale, person.scale);
    torso.position.set(person.offset[0], person.offset[1], person.offset[2]);
    torso.rotation.x = visual.riderLeanRadians;
    group.add(torso);
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.scale.setScalar(person.scale);
    head.position.set(person.offset[0], person.offset[1] + person.height * visual.bikeHeadHeightRatio, person.offset[2] + visual.bikeHeadForwardOffset);
    group.add(head);
    if (person.helmet) {
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(visual.helmetRadius, visual.bikeHelmetWidthSegments, visual.bikeHelmetHeightSegments), helmetMaterial);
      helmet.scale.set(person.scale, person.scale * visual.helmetHeightRatio, person.scale);
      helmet.position.copy(head.position);
      helmet.position.y += visual.helmetOffsetY * person.scale;
      group.add(helmet);
    }
  }

  group.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  group.userData.type = 'bike';
  return { group, wheels, bodyMaterial: frameMaterial, riderMaterial, passengerMaterial, helmetMaterial, wheelSpinAxis: 'x' };
}

function buildDogPool() {
  const group = new THREE.Group();
  const meshes = [];
  const hazardGeometry = new THREE.ConeGeometry(
    CONFIG.dogs.specialHazardConeRadius,
    CONFIG.dogs.specialHazardConeHeight,
    7,
  );
  const hazardMaterial = new THREE.MeshToonMaterial({ color: CONFIG.dogs.specialHazardConeColor });
  for (let i = 0; i < DOG_POOL_SIZE; i++) {
    const holder = new THREE.Group();
    const fallback = createFallbackDog();
    holder.add(fallback.group);
    const hazardMarker = new THREE.Mesh(hazardGeometry, hazardMaterial);
    hazardMarker.position.y = CONFIG.dogs.specialHazardConeHeight / 2;
    hazardMarker.visible = false;
    holder.add(hazardMarker);
    holder.visible = false;
    group.add(holder);
    meshes.push({ holder, fallback, hazardMarker, instance: null, color: null });
  }
  const pool = { group, meshes, asset: null, cloneModel: null, failed: false };
  loadConfiguredDogModel(pool);
  return pool;
}

function buildBonePool() {
  const group = new THREE.Group();
  const views = [];
  const config = CONFIG.bones;
  const material = new THREE.MeshStandardMaterial({
    color: 0xfff3d1,
    roughness: 0.3,
    metalness: 0.1,
  });
  const plusMaterial = new THREE.MeshToonMaterial({
    color: config.plusColor,
    emissive: config.plusEmissiveColor,
    emissiveIntensity: 0.28,
    gradientMap: makeToonGradient(),
  });
  const plusVerticalGeometry = new THREE.BoxGeometry(
    config.plusThicknessWorld,
    config.plusSizeWorld,
    config.plusDepthWorld,
  );
  const plusHorizontalGeometry = new THREE.BoxGeometry(
    config.plusSizeWorld,
    config.plusThicknessWorld,
    config.plusDepthWorld,
  );
  const stemGeometry = new THREE.CylinderGeometry(
    config.stemRadius,
    config.stemRadius,
    config.stemLength,
    config.radialSegments,
  );
  const endGeometry = new THREE.SphereGeometry(
    config.tipRadius,
    config.sphereWidthSegments,
    config.sphereHeightSegments,
  );
  const sparkGeometry = createBoneSparkGeometry(config.sparkCount);

  for (let index = 0; index < config.poolSize; index++) {
    const holder = new THREE.Group();
    const bone = new THREE.Group();
    const plus = new THREE.Group();
    const stem = new THREE.Mesh(stemGeometry, material);
    stem.rotation.x = Math.PI / 2;
    bone.add(stem);
    for (const end of [-1, 1]) {
      for (const side of [-1, 1]) {
        const knob = new THREE.Mesh(endGeometry, material);
        knob.position.set(side * config.tipPairOffset, 0, end * config.tipOffset);
        bone.add(knob);
      }
    }
    bone.traverse((mesh) => {
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    const verticalPlusBar = new THREE.Mesh(plusVerticalGeometry, plusMaterial);
    const horizontalPlusBar = new THREE.Mesh(plusHorizontalGeometry, plusMaterial);
    for (const mesh of [verticalPlusBar, horizontalPlusBar]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      plus.add(mesh);
    }

    const sparkMaterial = new THREE.PointsMaterial({
      color: 0xffdf72,
      size: config.sparkSize,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const spark = new THREE.Points(sparkGeometry, sparkMaterial);
    spark.visible = false;
    holder.add(bone, plus, spark);
    holder.visible = false;
    group.add(holder);
    views.push({ holder, bone, plus, spark, id: null });
  }

  return { group, views, byId: new Map() };
}

function createBoneSparkGeometry(count) {
  const positions = [];
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const height = (index % 3 - 1) * CONFIG.bones.sparkVerticalSpread;
    positions.push(Math.cos(angle), height, Math.sin(angle));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function buildCoinPool() {
  const group = new THREE.Group();
  const views = [];
  const settings = CONFIG.coins;
  const geometry = new THREE.CylinderGeometry(
    settings.radius,
    settings.radius,
    settings.depth,
    settings.radialSegments,
  );
  const sideMaterial = new THREE.MeshStandardMaterial({
    color: settings.edgeColor,
    roughness: settings.edgeRoughness,
    metalness: settings.edgeMetalness,
  });
  const faceTexture = createCoinFaceTexture(settings);
  const faceMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: faceTexture,
    toneMapped: false,
  });
  const coinMaterials = [sideMaterial, faceMaterial, faceMaterial];
  const rimGeometry = new THREE.TorusGeometry(
    settings.radius * settings.rimRadiusRatio,
    settings.rimTubeRadius,
    settings.rimSegments,
    settings.radialSegments,
  );
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: settings.rimColor,
    roughness: settings.rimRoughness,
    metalness: settings.rimMetalness,
    emissive: settings.rimColor,
    emissiveIntensity: settings.rimEmissiveIntensity,
  });
  for (let index = 0; index < settings.poolSize; index++) {
    const holder = new THREE.Group();
    const coin = new THREE.Group();
    const body = new THREE.Mesh(geometry, coinMaterials);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    coin.add(body);
    for (const side of [-1, 1]) {
      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.position.z = side * (settings.depth * 0.5 + settings.rimTubeRadius * settings.rimFaceOffsetRatio);
      rim.castShadow = true;
      rim.receiveShadow = true;
      coin.add(rim);
    }
    holder.add(coin);
    holder.visible = false;
    group.add(holder);
    views.push({ id: null, holder, coin });
  }
  return { group, views, byId: new Map() };
}

function createCoinFaceTexture(settings) {
  const canvas = document.createElement('canvas');
  canvas.width = settings.faceCanvasSize;
  canvas.height = settings.faceCanvasSize;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const center = settings.faceCanvasSize / 2;
  const edge = settings.faceCanvasSize * settings.faceRimRatio;
  const color = (value) => `#${value.toString(16).padStart(6, '0')}`;
  const gradient = context.createRadialGradient(
    center * settings.gradientCenterXRatio,
    center * settings.gradientCenterYRatio,
    center * settings.gradientInnerRadiusRatio,
    center,
    center,
    center,
  );
  gradient.addColorStop(0, '#fff4bd');
  gradient.addColorStop(settings.gradientMidpointRatio, color(settings.color));
  gradient.addColorStop(1, color(settings.edgeColor));
  context.fillStyle = gradient;
  context.fillRect(0, 0, settings.faceCanvasSize, settings.faceCanvasSize);
  context.strokeStyle = color(settings.rimColor);
  context.lineWidth = edge;
  context.beginPath();
  context.arc(center, center, center - edge * 0.95, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = color(settings.pawMarkColor);
  const padRadius = settings.faceCanvasSize * settings.pawPadRadiusRatio;
  const toeRadius = settings.faceCanvasSize * settings.pawToeRadiusRatio;
  context.beginPath();
  context.ellipse(
    center,
    center + settings.faceCanvasSize * settings.pawPadYOffsetRatio,
    padRadius,
    padRadius * CONFIG.coins.pawPadHeightRatio,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  for (const [x, y, rotation] of settings.pawToeMarks) {
    context.beginPath();
    context.ellipse(
      center + x * settings.faceCanvasSize,
      center + y * settings.faceCanvasSize,
      toeRadius,
      toeRadius * settings.pawToeHeightRatio,
      rotation,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = settings.textureAnisotropy;
  return texture;
}

function updateCoinMeshes(pool, coins, time) {
  const activeIds = new Set(coins.map((coin) => coin.id));
  for (const [id, view] of pool.byId) {
    if (activeIds.has(id)) continue;
    view.id = null;
    view.holder.visible = false;
    pool.byId.delete(id);
  }
  for (const coin of coins) {
    let view = pool.byId.get(coin.id);
    if (!view) {
      view = pool.views.find((candidate) => candidate.id === null);
      if (!view) continue;
      view.id = coin.id;
      pool.byId.set(coin.id, view);
    }
    const collected = coin.taken;
    const progress = collected ? Math.min(1, coin.collectT / CONFIG.bones.collectSeconds) : 0;
    view.holder.visible = true;
    view.holder.position.set(
      worldXOf(coin.x, coin.width),
      CONFIG.coins.floatHeight + Math.sin(time * CONFIG.coins.bobFrequency + coin.id) * CONFIG.coins.bobAmplitude,
      worldZOf(coin.y),
    );
    view.coin.rotation.y = time * CONFIG.coins.spinRadiansPerSecond;
    view.holder.scale.setScalar(collected ? 1 - progress : 1);
  }
}

function buildPowerupPool() {
  const group = new THREE.Group();
  const views = [];
  const settings = CONFIG.powerups;
  const shieldMaterial = new THREE.MeshStandardMaterial({ color: settings.shieldColor, emissive: settings.shieldColor, emissiveIntensity: 0.35, transparent: true, opacity: 0.82, roughness: 0.22, metalness: 0.12 });
  const magnetMaterial = new THREE.MeshToonMaterial({
    color: settings.magnetColor,
    emissive: settings.magnetColor,
    emissiveIntensity: settings.magnetGlowIntensity,
  });
  const iconMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const shieldGeometry = new THREE.SphereGeometry(0.34, 14, 10);
  const plusGeometry = new THREE.BoxGeometry(0.1, 0.48, 0.08);
  const crossGeometry = new THREE.BoxGeometry(0.34, 0.1, 0.08);
  const magnetPole = new THREE.BoxGeometry(...settings.magnetPoleSize);
  const magnetBridge = new THREE.BoxGeometry(...settings.magnetBridgeSize);
  const magnetTip = new THREE.BoxGeometry(...settings.magnetTipSize);
  const magnetTipMaterial = new THREE.MeshBasicMaterial({ color: settings.magnetTipColor });
  for (let index = 0; index < settings.poolSize; index++) {
    const holder = new THREE.Group();
    const variants = { shield: new THREE.Group(), magnet: new THREE.Group() };
    const orb = new THREE.Mesh(shieldGeometry, shieldMaterial);
    const vertical = new THREE.Mesh(plusGeometry, iconMaterial);
    const horizontal = new THREE.Mesh(crossGeometry, iconMaterial);
    variants.shield.add(orb, vertical, horizontal);
    const left = new THREE.Mesh(magnetPole, magnetMaterial);
    const right = new THREE.Mesh(magnetPole, magnetMaterial);
    const bridge = new THREE.Mesh(magnetBridge, magnetMaterial);
    const leftTip = new THREE.Mesh(magnetTip, magnetTipMaterial);
    const rightTip = new THREE.Mesh(magnetTip, magnetTipMaterial);
    left.position.x = -settings.magnetPoleOffsetX;
    right.position.x = settings.magnetPoleOffsetX;
    bridge.position.y = settings.magnetBridgeYOffset;
    leftTip.position.set(-settings.magnetPoleOffsetX, settings.magnetTipYOffset, 0);
    rightTip.position.set(settings.magnetPoleOffsetX, settings.magnetTipYOffset, 0);
    variants.magnet.add(left, right, bridge, leftTip, rightTip);
    for (const variant of Object.values(variants)) {
      variant.traverse((mesh) => { if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
      holder.add(variant);
    }
    holder.visible = false;
    group.add(holder);
    views.push({ id: null, holder, variants });
  }
  return { group, views, byId: new Map() };
}

function updatePowerupMeshes(pool, pickups, time) {
  const activeIds = new Set(pickups.map((pickup) => pickup.id));
  for (const [id, view] of pool.byId) {
    if (activeIds.has(id)) continue;
    view.id = null;
    view.holder.visible = false;
    pool.byId.delete(id);
  }
  for (const pickup of pickups) {
    let view = pool.byId.get(pickup.id);
    if (!view) {
      view = pool.views.find((candidate) => candidate.id === null);
      if (!view) continue;
      view.id = pickup.id;
      pool.byId.set(pickup.id, view);
    }
    const progress = pickup.taken ? Math.min(1, pickup.collectT / CONFIG.bones.collectSeconds) : 0;
    view.holder.visible = true;
    view.holder.position.set(
      worldXOf(pickup.x, pickup.width),
      CONFIG.powerups.floatHeight + Math.sin(time * CONFIG.powerups.bobFrequency + pickup.id) * CONFIG.powerups.bobAmplitude,
      worldZOf(pickup.y),
    );
    view.holder.rotation.y = time * CONFIG.powerups.spinRadiansPerSecond;
    view.holder.scale.setScalar(CONFIG.powerups.visualScale * (pickup.taken ? 1 - progress : 1));
    for (const [kind, mesh] of Object.entries(view.variants)) mesh.visible = kind === pickup.kind;
  }
}

function buildObstaclePool() {
  const settings = CONFIG.obstacles;
  const group = new THREE.Group();
  const coneMaterial = new THREE.MeshToonMaterial({ color: settings.coneColor });
  const baseMaterial = new THREE.MeshToonMaterial({ color: settings.coneBaseColor });
  const crateMaterial = new THREE.MeshToonMaterial({ color: settings.crateColor, gradientMap: makeToonGradient() });
  const tireMaterial = new THREE.MeshToonMaterial({ color: settings.tireColor });
  const coneGeometry = new THREE.ConeGeometry(settings.coneRadius, settings.coneHeight, settings.segments);
  const baseGeometry = new THREE.CylinderGeometry(settings.coneRadius * 1.45, settings.coneRadius * 1.6, settings.coneBaseHeight, settings.segments);
  const crateGeometry = new THREE.BoxGeometry(...settings.crateSize);
  const tireGeometry = new THREE.TorusGeometry(settings.tireRadius, settings.tireTubeRadius, settings.segments, settings.segments * 2);
  const views = [];

  for (let index = 0; index < settings.poolSize; index++) {
    const holder = new THREE.Group();
    const variants = {};
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = settings.coneBaseHeight / 2;
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = settings.coneBaseHeight + settings.coneHeight / 2;
    const crate = new THREE.Mesh(crateGeometry, crateMaterial);
    crate.position.y = settings.crateSize[1] / 2;
    const tire = new THREE.Mesh(tireGeometry, tireMaterial);
    tire.rotation.x = Math.PI / 2;
    tire.position.y = settings.tireRadius * 0.55;
    for (const mesh of [base, cone, crate, tire]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    const coneGroup = new THREE.Group();
    coneGroup.add(base, cone);
    variants.cone = coneGroup;
    variants.crate = crate;
    variants.tire = tire;
    holder.add(coneGroup, crate, tire);
    holder.visible = false;
    group.add(holder);
    views.push({ id: null, holder, variants });
  }
  return { group, views, byId: new Map() };
}

function updateObstacleMeshes(pool, obstacles) {
  const activeIds = new Set(obstacles.map((obstacle) => obstacle.id));
  for (const [id, view] of pool.byId) {
    if (activeIds.has(id)) continue;
    view.id = null;
    view.holder.visible = false;
    pool.byId.delete(id);
  }
  for (const obstacle of obstacles) {
    let view = pool.byId.get(obstacle.id);
    if (!view) {
      view = pool.views.find((candidate) => candidate.id === null);
      if (!view) continue;
      view.id = obstacle.id;
      pool.byId.set(obstacle.id, view);
    }
    view.holder.visible = true;
    view.holder.position.set(worldXOf(obstacle.x, obstacle.width), 0, worldZOf(obstacle.y));
    for (const [kind, mesh] of Object.entries(view.variants)) mesh.visible = kind === obstacle.kind;
  }
}

function updateBoneMeshes(pool, bones, time) {
  const activeIds = new Set(bones.map((bone) => bone.id));
  for (const [id, view] of pool.byId) {
    if (activeIds.has(id)) continue;
    view.id = null;
    view.holder.visible = false;
    view.spark.visible = false;
    view.spark.material.opacity = 0;
    pool.byId.delete(id);
  }

  for (const bone of bones) {
    let view = pool.byId.get(bone.id);
    if (!view) {
      view = pool.views.find((candidate) => candidate.id === null);
      if (!view) continue;
      view.id = bone.id;
      pool.byId.set(bone.id, view);
    }

    const collected = bone.taken;
    const progress = collected
      ? Math.min(1, bone.collectT / CONFIG.bones.collectSeconds)
      : 0;
    const bob = Math.sin(time * CONFIG.bones.bobFrequency + bone.bobOffset) * CONFIG.bones.hoverHeight;
    const isPlus = bone.kind === 'plus';
    view.holder.visible = true;
    view.bone.visible = !isPlus;
    view.plus.visible = isPlus;
    view.holder.position.set(
      worldXOf(bone.x, bone.width),
      bone.baseHeight + bob,
      worldZOf(bone.y),
    );
    const icon = isPlus ? view.plus : view.bone;
    icon.rotation.y = time * CONFIG.bones.spinRadiansPerSecond;
    icon.position.y = progress * CONFIG.bones.collectRise;
    const popRatio = CONFIG.bones.collectPopSecondsRatio;
    const boneScale = !collected
      ? 1
      : progress < popRatio
        ? 1 + (CONFIG.bones.collectPopScale - 1) * progress / popRatio
        : CONFIG.bones.collectPopScale * (1 - (progress - popRatio) / (1 - popRatio));
    icon.scale.setScalar(boneScale);
    view.spark.visible = collected && progress < 1;
    view.spark.position.y = progress * CONFIG.bones.sparkRise;
    view.spark.scale.setScalar(CONFIG.bones.sparkStartScale + progress * CONFIG.bones.sparkScaleGrowth);
    view.spark.material.opacity = collected ? 1 - progress : 0;
  }
}

function createFallbackDog() {
  const visual = CONFIG.dogs.fallbackVisual;
  const group = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: CONFIG.dogs.coatColors.golden, roughness: visual.roughness });
  const lightFur = new THREE.MeshStandardMaterial({ color: visual.muzzleColor, roughness: visual.roughness });
  const dark = new THREE.MeshStandardMaterial({ color: visual.noseColor, roughness: 0.42 });
  const collarMaterial = new THREE.MeshStandardMaterial({ color: visual.collarColor, roughness: 0.58 });
  const sphere = new THREE.SphereGeometry(1, 24, 16);
  const body = new THREE.Mesh(sphere, fur);
  body.scale.set(...visual.bodyScale);
  body.position.set(...visual.bodyPosition);
  group.add(body);
  const neck = new THREE.Mesh(sphere, fur);
  neck.scale.set(...visual.neckScale);
  neck.position.set(...visual.neckPosition);
  group.add(neck);
  const chest = new THREE.Mesh(sphere, lightFur);
  chest.scale.set(...visual.chestScale);
  chest.position.set(...visual.chestPosition);
  group.add(chest);
  const head = new THREE.Mesh(sphere, fur);
  head.scale.set(...visual.headScale);
  head.position.set(...visual.headPosition);
  group.add(head);
  const muzzle = new THREE.Mesh(
    new THREE.CylinderGeometry(
      visual.muzzleTipRadius,
      visual.muzzleBaseRadius,
      visual.muzzleLength,
      visual.muzzleSegments,
    ),
    lightFur,
  );
  muzzle.rotation.x = -Math.PI / 2;
  muzzle.position.set(...visual.muzzlePosition);
  group.add(muzzle);
  const jaw = new THREE.Mesh(sphere, lightFur);
  jaw.scale.set(...visual.jawScale);
  jaw.position.set(...visual.jawPosition);
  group.add(jaw);
  const nose = new THREE.Mesh(sphere, dark);
  nose.scale.setScalar(visual.noseScale);
  nose.position.set(...visual.nosePosition);
  group.add(nose);

  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(sphere, fur);
    ear.scale.set(...visual.earScale);
    ear.position.set(side * Math.abs(visual.earPosition[0]), visual.earPosition[1], visual.earPosition[2]);
    ear.rotation.z = side * 0.16;
    group.add(ear);
    ears.push(ear);

    const eye = new THREE.Mesh(sphere, dark);
    eye.scale.setScalar(visual.spotRadius * 0.52);
    eye.position.set(side * visual.headScale[0] * 0.68, visual.headPosition[1] + visual.headScale[1] * 0.14, visual.headPosition[2] - visual.headScale[2] * 0.82);
    group.add(eye);
  }

  const collar = new THREE.Mesh(new THREE.TorusGeometry(visual.headScale[0] * 0.82, visual.spotRadius * 0.3, 8, 24), collarMaterial);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, visual.chestPosition[1] + visual.chestScale[1] * 0.72, visual.chestPosition[2] + visual.chestScale[2] * 0.68);
  group.add(collar);

  const legPivots = [];
  const upperLegLength = visual.legLength * visual.upperLegLengthRatio;
  const lowerLegLength = visual.legLength * visual.lowerLegLengthRatio;
  const upperLegGeometry = new THREE.CapsuleGeometry(visual.legRadius, upperLegLength - visual.legRadius * 2, 6, 10);
  const lowerLegGeometry = new THREE.CapsuleGeometry(visual.legRadius, lowerLegLength - visual.legRadius * 2, 6, 10);
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * visual.legX, visual.legLength, end * visual.legZ);
      const upperLeg = new THREE.Mesh(upperLegGeometry, fur);
      upperLeg.position.y = -upperLegLength / 2;
      pivot.add(upperLeg);
      const knee = new THREE.Group();
      knee.position.y = -upperLegLength;
      pivot.add(knee);
      const lowerLeg = new THREE.Mesh(lowerLegGeometry, fur);
      lowerLeg.position.y = -lowerLegLength / 2;
      knee.add(lowerLeg);
      const paw = new THREE.Mesh(sphere, fur);
      paw.scale.set(...visual.pawScale);
      paw.position.set(0, -lowerLegLength + visual.pawForwardOffset, -visual.pawForwardOffset);
      knee.add(paw);
      group.add(pivot);
      legPivots.push({ pivot, knee, phase: (side + end === 0 ? Math.PI : 0) });
    }
  }

  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(visual.spotRadius * 0.42, visual.tailLength, 6, 8), fur);
  tail.position.set(...visual.tailPosition);
  tail.rotation.x = visual.tailTiltRadians;
  group.add(tail);

  const spotMaterial = new THREE.MeshStandardMaterial({ color: 0x503927, roughness: visual.roughness });
  const spots = visual.spotPositions.map((position) => {
    const spot = new THREE.Mesh(sphere, spotMaterial);
    spot.scale.setScalar(visual.spotRadius);
    spot.position.set(...position);
    group.add(spot);
    spot.visible = false;
    return spot;
  });

  group.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  return { group, fur, legPivots, tail, spots, ears, jaw, jawBaseScaleY: jaw.scale.y };
}

function loadConfiguredDogModel(pool) {
  const url = CONFIG.dogs.modelUrl;
  if (!url) return;
  Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/utils/SkeletonUtils.js'),
  ]).then(([loaderModule, skeletonUtils]) => {
    pool.cloneModel = skeletonUtils.clone;
    const loader = new loaderModule.GLTFLoader();
    loader.load(url, (gltf) => {
      gltf.scene.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
      });
      pool.asset = { scene: gltf.scene, animations: gltf.animations };
    }, undefined, (error) => {
      pool.failed = true;
      console.warn(`Unable to load dog model at ${url}. Add a compatible GLB asset to enable dog visuals.`, error);
    });
  }).catch((error) => {
    pool.failed = true;
    console.warn('Unable to initialize the GLTF dog loader.', error);
  });
}

function getDogModelInstance(pool, slot, color) {
  if (!pool.asset || !pool.cloneModel) return null;
  if (!slot.instance) {
    const root = pool.cloneModel(pool.asset.scene);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const horizontalSize = Math.max(size.x, size.z);
    const scale = horizontalSize > 0 ? CONFIG.dogs.modelTargetLength / horizontalSize : 1;
    root.scale.setScalar(scale);
    root.rotation.y = CONFIG.dogs.modelForwardRotationY;
    root.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    root.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const materials = sourceMaterials.map((material) => material.clone());
      object.material = Array.isArray(object.material) ? materials : materials[0];
      for (const material of materials) {
        if (material?.color) {
          material.userData.dogBaseColor = material.color.clone();
          material.color.copy(material.userData.dogBaseColor)
            .multiply(new THREE.Color(CONFIG.dogs.coatColors[color] || 0xffffff));
        }
      }
    });
    slot.holder.add(root);
    const mixer = pool.asset.animations.length ? new THREE.AnimationMixer(root) : null;
    const walkClip = pool.asset.animations.find((clip) => /walk|run/i.test(clip.name))
      || pool.asset.animations[0];
    const walkAction = mixer && walkClip ? mixer.clipAction(walkClip) : null;
    slot.instance = { root, mixer, walkAction };
    slot.color = color;
  }
  return slot.instance;
}

function updateCarMeshes(pool, cars, dt) {
  let index = 0;

  for (const car of cars) {
    if (index >= pool.meshes.length) break;
    const slot = pool.meshes[index++];
    if (slot.carId !== car.id) {
      for (const variant of Object.values(slot.variants)) variant.smokeEmitter?.reset();
      slot.carId = car.id;
      slot.wasDamaged = false;
      for (const variant of Object.values(slot.variants)) {
        if (variant.model) variant.model.scale.setScalar(1);
        if (variant.impactBurst) variant.impactBurst.group.visible = false;
      }
    }
    const variant = slot.variants[car.type] || slot.variants.sedan;
    const explosionStarted = Boolean(car.damaged) && !slot.wasDamaged;
    if (explosionStarted) slot.wasDamaged = true;
    for (const other of Object.values(slot.variants)) {
      other.group.visible = other === variant;
      if (other.smokeEmitter) {
        other.smokeEmitter.setEnabled(other === variant && Boolean(car.damaged));
        other.smokeEmitter.update(dt);
      }
    }
    const knockback = car.damaged
      ? car.knockbackX * Math.exp(-car.damageT * CONFIG.crash.obstacleKnockbackDecay)
      : 0;
    variant.group.position.set(worldXOf(car.x + knockback, car.width), 0, worldZOf(car.y));
    if (variant.model) {
      const blastProgress = car.damaged
        ? Math.min(car.damageT / CONFIG.crash.obstacleExplosionSeconds, 1)
        : 0;
      variant.model.scale.setScalar(1 - blastProgress);
    }
    if (variant.impactBurst) updateTrafficImpactBurst(variant.impactBurst, dt, explosionStarted);
    if (variant.bodyMaterial) variant.bodyMaterial.color.set(car.color);
    if (variant.riderMaterial && car.riderColor !== null) variant.riderMaterial.color.set(car.riderColor);
    if (variant.passengerMaterial && car.passengerColor !== null) variant.passengerMaterial.color.set(car.passengerColor);
    if (variant.helmetMaterial && car.helmetColor !== null) variant.helmetMaterial.color.set(car.helmetColor);

    const damage = variant.damageParts;
    if (damage?.hood) {
      damage.hood.visible = Boolean(car.damaged);
      damage.hood.rotation.x = car.damaged ? CONFIG.crash.damageHoodAngle : 0;
      damage.hood.position.y = damage.hoodBaseY + (car.damaged ? CONFIG.crash.damageHoodLift : 0);
    }
    if (damage?.bumper) {
      damage.bumper.position.y = damage.bumperBaseY - (car.damaged ? CONFIG.crash.damageBumperDrop : 0);
    }
    if (damage?.rearImpact) {
      damage.rearImpact.visible = Boolean(car.damaged);
      damage.rearImpact.position.y = damage.rearImpactBaseY
        - (car.damaged ? CONFIG.crash.damageBumperDrop : 0);
      damage.rearImpact.rotation.x = car.damaged ? CONFIG.crash.damageRearTiltRadians : 0;
    }
    variant.group.rotation.z = car.damaged
      ? Math.sin(car.damageT * CONFIG.crash.tiltRate) * CONFIG.crash.obstacleTiltRadians
      : 0;
    if (car.damaged) car.damageT += dt;

    const spinRadius = car.type === 'bike' ? CONFIG.traffic.bikeWheelRadius : CONFIG.traffic.wheelRadius;
    const spin = (car.travel * PX_TO_WORLD) / spinRadius;
    for (const wheel of variant.wheels) {
      if (variant.wheelSpinAxis === 'x') wheel.rotation.x = spin;
      else wheel.rotation.y = spin;
    }
  }

  for (let i = index; i < pool.meshes.length; i++) {
    for (const variant of Object.values(pool.meshes[i].variants)) {
      variant.group.visible = false;
      if (variant.smokeEmitter) {
        variant.smokeEmitter.setEnabled(false);
        variant.smokeEmitter.update(dt);
      }
    }
  }
}

function buildStopZonePool(gradientMap) {
  const group = new THREE.Group();
  const meshes = [];
  const laneWidthPx = ROAD_WIDTH_PX / CONFIG.lanes.count;
  const zoneWidth = laneWidthPx * PX_TO_WORLD * CONFIG.stops.laneWidthRatio;
  const zoneLength = CONFIG.stops.zoneLengthMeters * CONFIG.distance.pixelsPerMeter * PX_TO_WORLD;
  const stripMaterial = toonMaterial(CONFIG.palette.stopZone, gradientMap);
  const shelterStripMaterial = toonMaterial(CONFIG.shelter.shelterStopColor, gradientMap);
  const zigzagMaterial = toonMaterial(CONFIG.palette.stopZoneEdge, gradientMap);

  for (let index = 0; index < CONFIG.stops.visibleZoneCount; index++) {
    const holder = new THREE.Group();
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(zoneWidth, zoneLength), stripMaterial);
    strip.rotation.x = -Math.PI / 2;
    strip.position.y = CONFIG.stops.paintLift;
    holder.add(strip);

    const stripeWidth = zoneWidth / CONFIG.stops.zigzagCount * CONFIG.stops.zigzagStripeRatio;
    for (let stripeIndex = 0; stripeIndex < CONFIG.stops.zigzagCount; stripeIndex++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(
          stripeWidth,
          CONFIG.stops.zigzagThickness,
          CONFIG.stops.zigzagStripeDepth,
        ),
        zigzagMaterial,
      );
      stripe.position.set(
        -zoneWidth / 2 + zoneWidth * (stripeIndex + 0.5) / CONFIG.stops.zigzagCount,
        CONFIG.stops.zigzagLift,
        zoneLength / 2 - CONFIG.stops.zigzagEndInset
          + (stripeIndex % 2) * CONFIG.stops.zigzagStagger,
      );
      stripe.rotation.y = stripeIndex % 2 === 0
        ? CONFIG.stops.zigzagAngle
        : -CONFIG.stops.zigzagAngle;
      holder.add(stripe);
    }

    holder.visible = false;
    group.add(holder);
    meshes.push(holder);
  }

  return { group, meshes, stripMaterial, shelterStripMaterial };
}

function updateStopZoneMeshes(pool, game) {
  const laneWidthPx = ROAD_WIDTH_PX / CONFIG.lanes.count;
  const visibleAhead = CONFIG.stops.visibleAheadMeters;
  const visibleZones = game.stops.zones.filter((zone) => (
    zone.state !== 'missed'
    && zone.startZ - game.distance <= visibleAhead
    && zone.endZ >= game.distance - (game.isReversing
      ? CONFIG.stops.reverseRecoveryMeters
      : CONFIG.stops.visibleBehindMeters)
  ));

  for (let index = 0; index < pool.meshes.length; index++) {
    const holder = pool.meshes[index];
    const zone = visibleZones[index];
    if (!zone) {
      holder.visible = false;
      continue;
    }

    const laneCenterPx = CONFIG.road.left + laneWidthPx * (zone.lane + 0.5);
    const centerDistanceMeters = (zone.startZ + zone.endZ) / 2 - game.distance;
    const centerY = game.van.y - centerDistanceMeters * CONFIG.distance.pixelsPerMeter;
    holder.position.set(worldXOf(laneCenterPx), 0, worldZOf(centerY));
    holder.children[0].material = zone.isShelter ? pool.shelterStripMaterial : pool.stripMaterial;
    holder.visible = true;
  }
}

function buildDogeShelter(gradientMap) {
  const settings = CONFIG.shelter;
  const group = new THREE.Group();
  const wall = toonMaterial(settings.wallColor, gradientMap);
  const roof = toonMaterial(settings.roofColor, gradientMap);
  const cream = toonMaterial(0xfff0c4, gradientMap);
  const gate = toonMaterial(0x416b5c, gradientMap);
  const dark = toonMaterial(0x17212a, gradientMap);
  const body = new THREE.Mesh(new THREE.BoxGeometry(settings.buildingWidth, settings.buildingHeight, settings.buildingDepth), wall);
  body.position.y = settings.buildingHeight / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const roofCap = new THREE.Mesh(
    new THREE.BoxGeometry(settings.buildingWidth * 1.08, settings.roofThickness, settings.buildingDepth * 1.08),
    roof,
  );
  roofCap.position.y = settings.buildingHeight + settings.roofThickness / 2;
  group.add(roofCap);

  const entrance = new THREE.Mesh(new THREE.BoxGeometry(settings.doorWidth, settings.doorHeight, 0.08), dark);
  entrance.position.set(0, settings.doorHeight / 2, -settings.buildingDepth / 2 - 0.045);
  group.add(entrance);
  for (const side of [-1, 1]) {
    const openDoor = new THREE.Mesh(new THREE.BoxGeometry(settings.doorPanelWidth, settings.doorHeight, 0.07), cream);
    openDoor.position.set(side * (settings.doorWidth / 2 + settings.doorPanelWidth / 2), settings.doorHeight / 2, -settings.buildingDepth / 2 - 0.08);
    openDoor.rotation.y = side * Math.PI / 4;
    group.add(openDoor);
    const gatePost = new THREE.Mesh(new THREE.BoxGeometry(0.16, settings.gateHeight, 0.16), roof);
    gatePost.position.set(side * settings.gateWidth / 2, settings.gateHeight / 2, -settings.buildingDepth / 2 - 0.72);
    group.add(gatePost);
    const openGatePanel = new THREE.Mesh(new THREE.BoxGeometry(settings.gateWidth * 0.48, 0.08, 0.08), gate);
    openGatePanel.position.set(side * settings.gateWidth * 0.42, settings.gateHeight * 0.56, -settings.buildingDepth / 2 - 0.72);
    openGatePanel.rotation.y = side * -Math.PI / 3;
    group.add(openGatePanel);
  }

  const signCanvas = document.createElement('canvas');
  signCanvas.width = settings.signCanvasWidth;
  signCanvas.height = settings.signCanvasHeight;
  const signContext = signCanvas.getContext('2d');
  signContext.fillStyle = `#${settings.signColor.toString(16).padStart(6, '0')}`;
  signContext.fillRect(0, 0, signCanvas.width, signCanvas.height);
  signContext.strokeStyle = '#fff2cc';
  signContext.lineWidth = signCanvas.height * 0.06;
  signContext.strokeRect(signContext.lineWidth, signContext.lineWidth, signCanvas.width - signContext.lineWidth * 2, signCanvas.height - signContext.lineWidth * 2);
  signContext.textAlign = 'center';
  signContext.textBaseline = 'middle';
  signContext.fillStyle = `#${settings.signTextColor.toString(16).padStart(6, '0')}`;
  signContext.font = `900 ${Math.round(signCanvas.height * 0.52)}px Arial, sans-serif`;
  signContext.fillText('DOGE SHELTER', signCanvas.width / 2, signCanvas.height / 2);
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(settings.buildingWidth * settings.signWidthRatio, settings.signHeight),
    new THREE.MeshBasicMaterial({ map: signTexture, side: THREE.DoubleSide, toneMapped: false }),
  );
  sign.position.set(0, settings.buildingHeight * 0.82, -settings.buildingDepth / 2 - 0.09);
  group.add(sign);

  addShelterVolunteer(group, -settings.gateWidth * 0.62, -settings.buildingDepth / 2 - 0.8, 0xc84f45, gradientMap);
  addShelterVolunteer(group, settings.gateWidth * 0.62, -settings.buildingDepth / 2 - 0.8, 0x287ca2, gradientMap);
  group.visible = false;
  return group;
}

function addShelterVolunteer(parent, x, z, shirtColor, gradientMap) {
  const settings = CONFIG.shelter;
  const person = new THREE.Group();
  const shirt = toonMaterial(shirtColor, gradientMap);
  const skin = toonMaterial(0x9a6346, gradientMap);
  const trousers = toonMaterial(0x333c52, gradientMap);
  const hair = toonMaterial(settings.volunteerHairColor, gradientMap);
  const eyes = toonMaterial(settings.volunteerEyeColor, gradientMap);
  const shoes = toonMaterial(settings.volunteerShoeColor, gradientMap);
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(settings.volunteerBodyWidth * 0.38, settings.personBodyHeight * 0.7, 4, 8), shirt,
  );
  torso.scale.z = settings.volunteerBodyDepth / settings.volunteerBodyWidth;
  torso.position.y = settings.volunteerLegLength + settings.personBodyHeight * 0.53;
  person.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(settings.personHeadRadius, 10, 8), skin);
  head.position.y = settings.volunteerLegLength + settings.personBodyHeight + settings.personHeadRadius;
  person.add(head);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(settings.personHeadRadius * 0.94, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.56), hair);
  hairCap.position.set(0, head.position.y + settings.personHeadRadius * 0.18, -settings.personHeadRadius * 0.04);
  person.add(hairCap);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(settings.personHeadRadius * 0.09, 6, 5), eyes);
    eye.position.set(side * settings.personHeadRadius * 0.32, head.position.y + settings.personHeadRadius * 0.03, settings.personHeadRadius * 0.83);
    person.add(eye);
    const legPivot = new THREE.Group();
    legPivot.position.set(side * settings.volunteerBodyWidth * 0.2, settings.volunteerLegLength, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(settings.volunteerLegWidth * 0.42, settings.volunteerLegLength * 0.82, 4, 7), trousers);
    leg.position.y = -settings.volunteerLegLength * 0.45;
    legPivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(settings.volunteerLegWidth * 1.05, settings.volunteerLegWidth * 0.48, settings.volunteerLegWidth * 1.65), shoes);
    shoe.position.set(0, -settings.volunteerLegLength * 0.9, settings.volunteerLegWidth * 0.3);
    legPivot.add(shoe);
    person.add(legPivot);

    const armPivot = new THREE.Group();
    armPivot.position.set(side * settings.volunteerBodyWidth * 0.53, torso.position.y + settings.personBodyHeight * 0.36, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(settings.volunteerLimbRadius, settings.volunteerArmLength * 0.78, 4, 7), shirt);
    arm.position.y = -settings.volunteerArmLength * 0.36;
    armPivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(settings.volunteerLimbRadius * 1.1, 7, 6), skin);
    hand.position.y = -settings.volunteerArmLength * 0.72;
    armPivot.add(hand);
    person.add(armPivot);
    if (side < 0) {
      person.userData.leftLeg = legPivot;
      person.userData.leftArm = armPivot;
    } else {
      person.userData.rightLeg = legPivot;
      person.userData.rightArm = armPivot;
    }
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(settings.personHeadRadius * 0.12, 6, 5), skin);
  nose.position.set(0, head.position.y - settings.personHeadRadius * 0.13, settings.personHeadRadius * 0.95);
  person.add(nose);
  person.position.set(x, 0, z);
  parent.add(person);
  return {
    person,
    leftLeg: person.userData.leftLeg,
    rightLeg: person.userData.rightLeg,
    leftArm: person.userData.leftArm,
    rightArm: person.userData.rightArm,
  };
}

function createVolunteerNameplate(settings) {
  const canvas = document.createElement('canvas');
  canvas.width = settings.volunteerNameplateCanvasWidth;
  canvas.height = settings.volunteerNameplateCanvasHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = '#145b47';
  context.beginPath();
  context.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 28);
  context.fill();
  context.strokeStyle = '#ffe18a';
  context.lineWidth = 8;
  context.stroke();
  context.fillStyle = '#fff4d4';
  context.font = '900 42px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(`${settings.volunteerName.toUpperCase()} · VOLUNTEER`, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const nameplate = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, toneMapped: false }));
  nameplate.scale.set(settings.volunteerNameplateWidth, settings.volunteerNameplateHeight, 1);
  return nameplate;
}

function updateDogeShelter(group, game) {
  const shelterZone = game.stops.zones.find((zone) => (
    zone.isShelter
    && zone.state !== 'missed'
    && zone.startZ - game.distance <= CONFIG.stops.visibleAheadMeters
    && zone.endZ >= game.distance - CONFIG.stops.visibleBehindMeters
  ));
  if (!shelterZone) {
    group.visible = false;
    return;
  }
  const centerDistance = (shelterZone.startZ + shelterZone.endZ) / 2 - game.distance;
  const screenX = CONFIG.road.right + CONFIG.shelter.unloadDoorOffsetPx;
  const screenY = game.van.y - centerDistance * CONFIG.distance.pixelsPerMeter;
  group.position.set(worldXOf(screenX), 0, worldZOf(screenY));
  group.visible = true;
}

function getShelterResidentViews(game) {
  const residents = game.shelteredDogs || [];
  if (residents.length === 0) return [];
  const zone = game.stops.zones.find((candidate) => (
    candidate.isShelter
    && candidate.state !== 'missed'
    && candidate.startZ - game.distance <= CONFIG.stops.visibleAheadMeters
    && candidate.endZ >= game.distance - CONFIG.stops.visibleBehindMeters
  ));
  if (!zone) return [];

  const settings = CONFIG.shelter;
  const columns = Math.ceil(Math.sqrt(residents.length));
  const centerDistance = (zone.startZ + zone.endZ) / 2 - game.distance;
  const baseY = game.van.y - centerDistance * CONFIG.distance.pixelsPerMeter
    + CONFIG.shelter.unloadForwardOffsetPx;
  const baseX = CONFIG.road.right + settings.unloadDoorOffsetPx;
  return residents.map((dog, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      id: `shelter-resident-${index}`,
      color: dog.color,
      name: dog.name,
      x: baseX + (column - (columns - 1) / 2) * settings.residentSpacingX,
      y: baseY + row * settings.residentSpacingY,
      width: CONFIG.dogs.width,
      height: CONFIG.dogs.height,
      rotation: 0,
      state: 'resident',
    };
  });
}

function updateDogMeshes(pool, dogs, time, dt) {
  let index = 0;

  for (const d of dogs) {
    if (d.state === 'aboard' || d.state === 'lost' || d.state === 'sheltered') continue;
    if (index >= pool.meshes.length) break;

    const slot = pool.meshes[index++];
    const mesh = slot.holder;
    const activeModel = getDogModelInstance(pool, slot, d.color);
    mesh.visible = true;
    slot.fallback.group.visible = !activeModel;
    if (activeModel) activeModel.root.visible = true;
    if (mesh.parent !== pool.group) pool.group.add(mesh);
    if (slot.color !== d.color) {
      const tint = new THREE.Color(CONFIG.dogs.coatColors[d.color] || 0xffffff);
      slot.fallback.fur.color.copy(tint);
      for (const spot of slot.fallback.spots) spot.visible = d.color === 'spotted';
      if (activeModel) {
        activeModel.root.traverse((object) => {
          if (!object.isMesh) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            if (material?.color && material.userData.dogBaseColor) {
              material.color.copy(material.userData.dogBaseColor).multiply(tint);
            }
          }
        });
      }
      slot.color = d.color;
    }

    const scale = (d.width * PX_TO_WORLD) / 0.9;
    if (slot.hazardMarker) {
      slot.hazardMarker.visible = d.specialType === 'hazard';
      slot.hazardMarker.position.x = (CONFIG.dogs.specialHazardConeOffsetPx * PX_TO_WORLD) / Math.max(scale, 0.001);
      slot.hazardMarker.position.y = (CONFIG.dogs.specialHazardConeHeight / 2) / Math.max(scale, 0.001);
      slot.hazardMarker.scale.setScalar(1 / Math.max(scale, 0.001));
    }
    const walking = d.state === 'walking' || d.state === 'entering';
    if (activeModel) {
      if (activeModel.walkAction) {
        if (walking && !activeModel.walkAction.isRunning()) activeModel.walkAction.reset().play();
        if (!walking && activeModel.walkAction.isRunning()) activeModel.walkAction.stop();
      }
      activeModel.mixer?.update(dt);
    } else {
      const gait = walking ? time * CONFIG.dogs.walkAnimationSpeed : time * CONFIG.dogs.idleBounceSpeed;
      for (const { pivot, phase } of slot.fallback.legPivots) {
        pivot.rotation.x = walking ? Math.sin(gait + phase) * CONFIG.dogs.fallbackVisual.legSwing : 0;
      }
      slot.fallback.tail.rotation.z = Math.sin(time * CONFIG.dogs.idleBounceSpeed * 1.5) * 0.28;
      for (const [index, ear] of slot.fallback.ears.entries()) {
        ear.rotation.z = (index === 0 ? -1 : 1) * (0.16 + Math.sin(gait * 0.5) * 0.035);
      }
    }

    let hopY = 0;
    if (walking) {
      const x = worldXOf(d.x, d.width);
      const z = worldZOf(d.y);
      const targetX = worldXOf(d.targetX, 0);
      const targetZ = worldZOf(d.targetY);
      mesh.rotation.y = Math.atan2(-(targetX - x), -(targetZ - z));
      if (d.state === 'entering') {
        const progress = CONFIG.dogs.enterSeconds > 0 ? d.enterT / CONFIG.dogs.enterSeconds : 1;
        hopY = Math.sin(progress * Math.PI) * CONFIG.dogs.boardingHopHeight;
      }
    } else {
      mesh.rotation.y = d.rotation || 0;
    }

    let shrink = 1;
    if (d.state === 'entering') {
      const p = CONFIG.dogs.enterSeconds > 0 ? d.enterT / CONFIG.dogs.enterSeconds : 1;
      shrink = p < 0.72 ? 1 : Math.max(0.03, (1 - p) / 0.28);
    }
    mesh.position.set(worldXOf(d.x, d.width), hopY, worldZOf(d.y));
    mesh.scale.setScalar(scale * shrink);
  }

  for (let i = index; i < pool.meshes.length; i++) {
    pool.meshes[i].holder.visible = false;
    // Rescued/unused pooled dogs leave the scene graph and are reattached if reused.
    pool.meshes[i].holder.removeFromParent();
  }
}

function buildVan(vehicle = CONFIG.garage.vans[0]) {
  return createStylizedVan(vehicle.bodyColor, true, {
    vehicleId: vehicle.id,
    width: vehicle.width,
    length: vehicle.length,
    bodyHeight: vehicle.bodyHeight,
    cabinHeight: vehicle.roofHeight,
    roofHeight: vehicle.roofHeight,
    roofLength: vehicle.roofLength,
    accentColor: vehicle.accentColor,
    style: vehicle.style,
  });
}

function createCrashSmokeEmitter(count, color, spawnRate) {
  return new SmokeEmitter({
    count,
    color,
    spawnRate,
    lifeSeconds: CONFIG.crash.smokeLifeSeconds,
    riseSpeed: CONFIG.crash.smokeRiseSpeed,
    spread: CONFIG.crash.smokeSpread,
    startSize: CONFIG.crash.smokeStartSize,
    endSize: CONFIG.crash.smokeEndSize,
    pointScale: CONFIG.crash.smokePointScale,
  });
}

function createNitroEffect(parent, vanWidth, vanLength) {
  const config = CONFIG.nitro;
  const group = new THREE.Group();
  const outerGeometry = new THREE.ConeGeometry(config.exhaustRadius, config.exhaustHeight, config.flameSegments);
  const coreGeometry = new THREE.ConeGeometry(config.coreRadius, config.coreHeight, config.coreSegments);
  const glowGeometry = new THREE.SphereGeometry(
    config.exhaustRadius * config.glowRadiusRatio,
    config.flameSegments,
    config.glowSegments,
  );
  const outerMaterial = new THREE.MeshBasicMaterial({
    color: config.outerFlameColor,
    transparent: true,
    opacity: config.outerOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: config.innerFlameColor,
    transparent: true,
    opacity: config.coreOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: config.outerFlameColor,
    transparent: true,
    opacity: config.glowOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const jets = [];

  for (const side of [-1, 1]) {
    const x = side * vanWidth * config.exhaustWidthRatio;
    const outer = new THREE.Mesh(outerGeometry, outerMaterial);
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(x, config.exhaustY, -vanLength / 2 - config.exhaustHeight / 2 - config.outerBaseZOffset);
    outer.scale.y = config.initialFlameScale;
    group.add(outer);

    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.rotation.x = -Math.PI / 2;
    core.position.set(x, config.exhaustY, -vanLength / 2 - config.coreHeight / 2 - config.coreBaseZOffset);
    core.scale.y = config.initialFlameScale;
    group.add(core);

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(x, config.exhaustY, -vanLength / 2 - config.glowBaseZOffset);
    group.add(glow);
    jets.push({ outer, core, glow, phase: side * config.pulsePhaseOffset });
  }

  group.visible = false;
  parent.add(group);

  return {
    update(time, active) {
      group.visible = active;
      if (!active) return;
      for (const jet of jets) {
        const pulse = config.pulseBase
          + Math.sin(time * config.pulseFrequency + jet.phase) * config.pulseAmplitude;
        jet.outer.scale.y = pulse;
        jet.core.scale.y = pulse * config.corePulseRatio;
        jet.glow.scale.setScalar(config.glowScaleBase + pulse * config.glowScalePulseRatio);
      }
    },
    dispose() {
      group.removeFromParent();
      outerGeometry.dispose();
      coreGeometry.dispose();
      glowGeometry.dispose();
      outerMaterial.dispose();
      coreMaterial.dispose();
      glowMaterial.dispose();
    },
  };
}

function createStylizedVan(bodyColor, isPlayer, dimensions = {}) {
  const visual = CONFIG.vanVisual;
  const vanWidth = dimensions.width ?? VAN_WIDTH_WORLD;
  const vanLength = dimensions.length ?? VAN_LENGTH_WORLD;
  const bodyHeight = dimensions.bodyHeight ?? 0.95;
  const cabinHeight = dimensions.cabinHeight ?? 0.74;
  const danfo = Boolean(dimensions.danfo);
  const group = new THREE.Group();
  const model = new THREE.Group();
  group.add(model);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: visual.bodyRoughness,
    metalness: visual.bodyMetalness,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: visual.wheelArchColor, roughness: 0.22, metalness: 0.25 });
  const chromeMaterial = new THREE.MeshStandardMaterial({ color: visual.chromeColor, roughness: 0.2, metalness: 0.82 });
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x152433, roughness: 0.14, metalness: 0.45 });
  const tyreMaterial = new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.88 });
  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });
  const tailLampMaterial = new THREE.MeshBasicMaterial({ color: visual.tailLampColor });
  const tailSignalMaterial = new THREE.MeshBasicMaterial({ color: visual.tailLampSignalColor });
  const reverseLampMaterial = new THREE.MeshBasicMaterial({ color: visual.tailLampReverseColor });
  const rackMaterial = isPlayer ? new THREE.MeshStandardMaterial({
    color: visual.roofRackColor,
    metalness: visual.roofRackMetalness,
    roughness: visual.roofRackRoughness,
  }) : null;
  const crateMaterial = isPlayer ? new THREE.MeshStandardMaterial({ color: visual.crateColor, roughness: visual.crateRoughness }) : null;
  const crateBarMaterial = isPlayer ? new THREE.MeshStandardMaterial({ color: visual.crateBarColor, metalness: visual.roofRackMetalness, roughness: visual.crateBarRoughness }) : null;
  const rescueGearMaterial = isPlayer ? new THREE.MeshStandardMaterial({ color: visual.rescueGearColor, roughness: visual.rescueGearRoughness }) : null;
  const rearBumperMaterial = isPlayer ? new THREE.MeshStandardMaterial({
    color: visual.chromeColor,
    metalness: visual.rearBumperMetalness,
    roughness: visual.bodyRoughness,
  }) : null;
  const logoMaterial = isPlayer ? new THREE.MeshStandardMaterial({
    map: createVanLogoTexture(),
    roughness: visual.bodyRoughness,
    metalness: visual.bodyMetalness,
    side: THREE.DoubleSide,
  }) : null;
  if (logoMaterial) logoMaterial.map.colorSpace = THREE.SRGBColorSpace;

  const wheelRadius = dimensions.wheelRadius ?? VAN_WHEEL_RADIUS;
  const wheelX = vanWidth * 0.48;
  const wheelZ = vanLength * 0.3;
  const bodyY = wheelRadius + bodyHeight / 2;
  let copilot = null;
  let cabin;
  let roofHeight = cabinHeight;

  if (isPlayer) {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(vanWidth, bodyHeight, vanLength), bodyMaterial);
    chassis.position.y = bodyY;
    model.add(chassis);

    // High roof is flush with the camera-facing rear (-Z) of the chassis.
    roofHeight = dimensions.roofHeight ?? visual.playerRoofHeight;
    const roofLength = dimensions.roofLength ?? visual.playerRoofLength;
    const rearTexture = createVanRearTexture(bodyColor);
    rearTexture.colorSpace = THREE.SRGBColorSpace;
    const rearFaceMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: rearTexture,
      roughness: visual.bodyRoughness,
      metalness: visual.bodyMetalness,
    });
    const roofMaterials = [bodyMaterial, bodyMaterial, bodyMaterial, bodyMaterial, bodyMaterial, rearFaceMaterial];
    const upper = new THREE.Mesh(new THREE.BoxGeometry(vanWidth, roofHeight, roofLength), roofMaterials);
    upper.position.set(0, wheelRadius + bodyHeight + roofHeight / 2, -(vanLength - roofLength) / 2);
    model.add(upper);

    // Slightly raked front windshield and dark front side windows.
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(vanWidth * 0.78, roofHeight * 0.66, 0.06), glassMaterial);
    windshield.position.set(0, wheelRadius + bodyHeight + roofHeight * 0.51, vanLength / 2 - 0.3);
    windshield.rotation.x = -0.16;
    model.add(windshield);
    for (const side of [-1, 1]) {
      const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.055, roofHeight * 0.55, vanLength * 0.18), glassMaterial);
      sideGlass.position.set(side * (vanWidth / 2 + 0.012), wheelRadius + bodyHeight + roofHeight * 0.5, vanLength * 0.27);
      model.add(sideGlass);
    }

    // Split cargo-door seam on the rear surface facing the following camera.
    const doorHeight = bodyHeight + roofHeight;
    const doorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.035, doorHeight, 0.025), trimMaterial);
    doorSeam.position.set(0, wheelRadius + doorHeight / 2, -vanLength / 2 - 0.015);
    model.add(doorSeam);

    const rearRescueTexture = createVanRearRescueTexture();
    rearRescueTexture.colorSpace = THREE.SRGBColorSpace;
    const rearText = new THREE.Mesh(
      new THREE.PlaneGeometry(vanWidth * visual.rearRescueLabelWidthRatio, visual.rearRescueLabelHeight),
      new THREE.MeshBasicMaterial({ map: rearRescueTexture, toneMapped: false, side: THREE.DoubleSide }),
    );
    rearText.rotation.y = Math.PI;
    rearText.position.set(
      0,
      wheelRadius + bodyHeight * visual.rearRescueLabelYOffset,
      -vanLength / 2 - visual.rearRescueLabelDepthOffset,
    );
    model.add(rearText);

    const rearBumper = new THREE.Mesh(
      new THREE.BoxGeometry(vanWidth * 0.94, visual.rearBumperHeight, visual.rearBumperDepth),
      rearBumperMaterial,
    );
    rearBumper.position.set(0, wheelRadius + visual.rearBumperHeight / 2, -vanLength / 2 - visual.rearBumperDepth / 2);
    model.add(rearBumper);
    addVanCargoRack(model, vanWidth, vanLength, wheelRadius + bodyHeight + roofHeight, visual, rackMaterial, crateMaterial, crateBarMaterial, rescueGearMaterial);
    addOpenBoardingDoor(model, vanWidth, vanLength, bodyY, bodyHeight, bodyColor, dimensions.accentColor || bodyColor);
    addVehicleStyle(model, dimensions, vanWidth, vanLength, wheelRadius, bodyY, bodyHeight, roofHeight);
    copilot = createKabosuCoPilot(model, vanLength, wheelRadius + bodyHeight + roofHeight * CONFIG.companion.headYOffset);
  } else {
    addRoundedBox(model, vanWidth, bodyHeight, vanLength, 0.16, bodyMaterial).position.y = bodyY;
    cabin = addRoundedBox(model, vanWidth * 0.84, cabinHeight, vanLength * 0.38, 0.16, bodyMaterial);
    cabin.position.set(0, bodyY + bodyHeight * 0.5 + cabinHeight * 0.47, -vanLength * 0.13);
    const roof = addRoundedBox(model, vanWidth * 0.78, 0.15, vanLength * 0.34, 0.07, bodyMaterial);
    roof.position.set(0, cabin.position.y + 0.42, cabin.position.z + 0.015);
    const windshield = addRoundedBox(model, vanWidth * 0.68, cabinHeight * 0.65, 0.055, 0.045, glassMaterial);
    windshield.position.set(0, cabin.position.y + 0.015, cabin.position.z - vanLength * 0.195);
    const rearGlass = addRoundedBox(model, vanWidth * 0.62, cabinHeight * 0.49, 0.05, 0.035, glassMaterial);
    rearGlass.position.set(0, cabin.position.y + 0.015, cabin.position.z + vanLength * 0.195);
  }

  // Silver front grille and bumper sit at the forward (+Z) end.
  const grille = addRoundedBox(model, vanWidth * 0.42, 0.3, 0.07, 0.045, chromeMaterial);
  grille.position.set(0, bodyY + 0.02, vanLength / 2 + 0.025);
  const bumper = addRoundedBox(model, vanWidth * 0.94, 0.14, 0.13, 0.06, chromeMaterial);
  bumper.position.set(0, wheelRadius + 0.12, vanLength / 2 + 0.045);
  const damageHood = new THREE.Mesh(
    new THREE.BoxGeometry(
      vanWidth * CONFIG.crash.damageHoodWidthRatio,
      CONFIG.crash.damageHoodHeight,
      vanLength * CONFIG.crash.damageHoodDepthRatio,
    ),
      new THREE.MeshStandardMaterial({ color: CONFIG.crash.damageHoodColor, roughness: CONFIG.crash.damageMaterialRoughness }),
    );
  damageHood.position.set(0, wheelRadius + bodyHeight + CONFIG.crash.damageHoodBaseLift, vanLength * CONFIG.crash.damageHoodForwardRatio);
  damageHood.visible = false;
  model.add(damageHood);
  bumper.userData.baseY = bumper.position.y;
  damageHood.userData.baseY = damageHood.position.y;
  const rearImpact = new THREE.Mesh(
    new THREE.BoxGeometry(
      vanWidth * CONFIG.crash.damageRearWidthRatio,
      CONFIG.crash.damageRearHeight,
      CONFIG.crash.damageRearDepth,
    ),
    new THREE.MeshStandardMaterial({ color: CONFIG.crash.damageRearColor, roughness: CONFIG.crash.damageMaterialRoughness }),
  );
  rearImpact.position.set(0, wheelRadius + CONFIG.crash.damageRearYOffset, -vanLength / 2 - CONFIG.crash.damageRearDepth * CONFIG.crash.damageRearZOffsetRatio);
  rearImpact.visible = false;
  model.add(rearImpact);
  rearImpact.userData.baseY = rearImpact.position.y;

  for (const side of [-1, 1]) {
    const lamp = addRoundedBox(model, 0.28, 0.17, 0.08, 0.05, lampMaterial);
    lamp.position.set(side * vanWidth * 0.34, bodyY + 0.2, vanLength / 2 + 0.035);
    const tailHousing = addRoundedBox(model, ...visual.tailLampHousingSize, 0.045, trimMaterial);
    tailHousing.position.set(side * vanWidth * 0.42, bodyY + 0.02, -vanLength / 2 - visual.tailLampHousingSize[2] * 0.35);
    const tail = addRoundedBox(model, ...visual.tailLampLensSize, 0.025, tailLampMaterial);
    tail.position.set(side * vanWidth * 0.42, bodyY + 0.13, -vanLength / 2 - visual.tailLampHousingSize[2]);
    const indicator = addRoundedBox(model, ...visual.tailLampSignalSize, 0.02, tailSignalMaterial);
    indicator.position.set(side * vanWidth * 0.42, bodyY - 0.105, -vanLength / 2 - visual.tailLampHousingSize[2]);
    const reverseLamp = addRoundedBox(model, ...visual.tailLampReverseSize, 0.02, reverseLampMaterial);
    reverseLamp.position.set(side * vanWidth * 0.42, bodyY - 0.205, -vanLength / 2 - visual.tailLampHousingSize[2]);

    // Glossy wheel-arch flares sit above each tyre.
    for (const end of [-1, 1]) {
      const arch = addRoundedBox(model, 0.16, 0.28, 0.88, 0.075, trimMaterial);
      arch.position.set(side * (wheelX + 0.03), wheelRadius + 0.28, end * wheelZ);
    }

    // Unbranded traffic gets clear windows and optional Danfo side stripes.
    if (isPlayer) {
      const logo = new THREE.Mesh(
        new THREE.PlaneGeometry(vanLength * visual.sideLogoWidthRatio, visual.sideLogoHeight),
        logoMaterial,
      );
      logo.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      logo.position.set(side * (vanWidth * 0.5 + 0.012), bodyY + 0.02, -vanLength * 0.18);
      model.add(logo);
    } else {
      const sideWindow = addRoundedBox(model, 0.045, cabinHeight * 0.47, vanLength * 0.3, 0.035, glassMaterial);
      sideWindow.position.set(side * (vanWidth * 0.42), cabin.position.y + 0.015, cabin.position.z);
      if (danfo) {
        const stripe = addRoundedBox(model, 0.045, bodyHeight * 0.18, vanLength * 0.78, 0.018, trimMaterial);
        stripe.position.set(side * (vanWidth * 0.5 + 0.015), bodyY + 0.04, 0);
      }
    }
  }

  const wheels = [];
  const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.28, 24);
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * wheelX, wheelRadius, end * wheelZ);
      pivot.rotation.z = Math.PI / 2;
      const wheel = new THREE.Mesh(wheelGeometry, tyreMaterial);
      pivot.add(wheel);
      model.add(pivot);
      wheels.push(wheel);
    }
  }

  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  const nitroEffect = isPlayer ? createNitroEffect(group, vanWidth, vanLength) : null;
  return {
    group,
    model,
    nitroEffect,
    copilot,
    vehicleId: dimensions.vehicleId || null,
    wheels,
    bodyMaterial,
    damageParts: {
      hood: damageHood,
      hoodBaseY: damageHood.userData.baseY,
      bumper,
      bumperBaseY: bumper.userData.baseY,
      rearImpact,
      rearImpactBaseY: rearImpact.userData.baseY,
    },
    worldX: 0,
    animationTime: 0,
    visualScale: new THREE.Vector3(1, 1, 1),
  };
}

function createKabosuCoPilot(parent, vanLength, headY) {
  const settings = CONFIG.companion;
  const group = new THREE.Group();
  const sphere = new THREE.SphereGeometry(1, ...settings.sphereSegments);
  const fur = new THREE.MeshStandardMaterial({ color: settings.faceColor, roughness: settings.furRoughness });
  const earFur = new THREE.MeshStandardMaterial({ color: settings.earColor, roughness: settings.earRoughness });
  const cream = new THREE.MeshStandardMaterial({ color: settings.muzzleColor, roughness: settings.muzzleRoughness });
  const dark = new THREE.MeshStandardMaterial({ color: settings.noseColor, roughness: settings.noseRoughness });
  const collarMaterial = new THREE.MeshStandardMaterial({ color: settings.collarColor, roughness: settings.collarRoughness });

  const lowerFace = new THREE.Mesh(sphere, fur);
  lowerFace.scale.set(
    settings.headScale[0] * settings.lowerFaceScale[0],
    settings.headScale[1] * settings.lowerFaceScale[1],
    settings.headScale[2] * settings.lowerFaceScale[2],
  );
  lowerFace.position.y = -settings.headScale[1] * settings.lowerFaceYOffsetRatio;
  group.add(lowerFace);
  const head = new THREE.Mesh(sphere, fur);
  head.scale.set(...settings.headScale);
  group.add(head);

  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(settings.earScale[0], settings.earScale[1], settings.coneSegments), earFur);
    ear.scale.z = settings.earScale[2] / settings.earScale[0];
    ear.position.set(side * settings.headScale[0] * settings.earPositionRatios[0], settings.headScale[1] * settings.earPositionRatios[1], 0);
    ear.rotation.z = side * settings.earLeanRadians;
    group.add(ear);
    ears.push({ mesh: ear, side });

    const eye = new THREE.Mesh(sphere, dark);
    eye.scale.set(...settings.eyeScale);
    eye.position.set(
      side * settings.headScale[0] * settings.eyePositionRatios[0],
      settings.headScale[1] * settings.eyePositionRatios[1],
      -settings.headScale[2] * settings.eyePositionRatios[2],
    );
    group.add(eye);
  }

  const muzzle = new THREE.Mesh(sphere, cream);
  muzzle.scale.set(...settings.muzzleScale);
  muzzle.position.set(0, settings.headScale[1] * settings.muzzlePositionRatios[0], settings.headScale[2] * settings.muzzlePositionRatios[1]);
  group.add(muzzle);
  const nose = new THREE.Mesh(sphere, dark);
  nose.scale.set(...settings.noseScale);
  nose.position.set(0, settings.headScale[1] * settings.nosePositionRatios[0], settings.headScale[2] * settings.nosePositionRatios[1]);
  group.add(nose);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(settings.collarSize[0], settings.collarSize[1], ...settings.collarSegments), collarMaterial);
  collar.scale.z = settings.collarSize[2] / settings.collarSize[0];
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -settings.headScale[1] * settings.collarYOffsetRatio;
  group.add(collar);

  group.position.set(0, headY, -vanLength / 2 - settings.rearFaceOffset);
  parent.add(group);
  return { group, ears, baseY: headY };
}

function addRoundedBox(parent, width, height, depth, radius, material) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: r * 0.12,
    bevelThickness: r * 0.12,
    curveSegments: 4,
  });
  geometry.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  return mesh;
}

function addVanCargoRack(parent, vanWidth, vanLength, roofTopY, visual, rackMaterial, crateMaterial, barMaterial, gearMaterial) {
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const rack = new THREE.Group();
  const addBox = (material, position, size) => {
    const mesh = new THREE.Mesh(boxGeometry, material);
    mesh.position.set(...position);
    mesh.scale.set(...size);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rack.add(mesh);
    return mesh;
  };

  const [railWidth, railHeight, railLength] = visual.roofRackRailSize;
  const rackTopY = roofTopY + visual.roofRackHeight;
  for (const side of [-1, 1]) {
    addBox(rackMaterial, [side * visual.roofRackRailOffsetX, rackTopY, 0], [railWidth, railHeight, Math.min(railLength, vanLength * 0.8)]);
    for (const z of visual.roofRackCrossbarOffsetsZ) {
      addBox(rackMaterial, [side * visual.roofRackRailOffsetX, roofTopY + visual.roofRackHeight / 2, z], visual.roofRackFootSize);
    }
  }
  for (const z of visual.roofRackCrossbarOffsetsZ) {
    addBox(rackMaterial, [0, rackTopY, z], visual.roofRackCrossbarSize);
  }

  const [crateWidth, crateHeight, crateDepth] = visual.crateSize;
  const bar = visual.crateBarThickness;
  const crateCenterY = rackTopY + crateHeight / 2;
  for (const x of visual.crateXOffsets) {
    const z = visual.crateZOffset;
    addBox(crateMaterial, [x, rackTopY + bar / 2, z], [crateWidth, bar, crateDepth]);
    for (const xSide of [-1, 1]) {
      for (const zSide of [-1, 1]) {
        addBox(barMaterial,
          [x + xSide * (crateWidth / 2 - bar / 2), crateCenterY, z + zSide * (crateDepth / 2 - bar / 2)],
          [bar, crateHeight, bar]);
      }
    }
    for (const zSide of [-1, 1]) {
      addBox(barMaterial,
        [x, crateCenterY - crateHeight * 0.18, z + zSide * (crateDepth / 2 - bar / 2)],
        [crateWidth, bar, bar]);
    }
    for (const ySign of [-1, 1]) {
      addBox(barMaterial, [x, crateCenterY + ySign * (crateHeight / 2 - bar / 2), z], [crateWidth, bar, bar]);
      addBox(barMaterial, [x, crateCenterY + ySign * (crateHeight / 2 - bar / 2), z], [bar, bar, crateDepth]);
    }
  }

  const barrelGeometry = new THREE.CylinderGeometry(visual.barrelRadius, visual.barrelRadius, visual.barrelHeight, visual.barrelSegments);
  const barrel = new THREE.Mesh(barrelGeometry, crateMaterial);
  barrel.position.set(
    visual.barrelOffset[0],
    rackTopY + visual.barrelHeight / 2,
    visual.barrelOffset[1],
  );
  barrel.castShadow = true;
  rack.add(barrel);
  addBox(gearMaterial,
    [visual.rescueGearOffset[0], rackTopY + visual.crateBarThickness + visual.rescueGearSize[1] / 2, visual.rescueGearOffset[1]],
    visual.rescueGearSize);
  parent.add(rack);
}

function createVanRearRescueTexture() {
  const visual = CONFIG.vanVisual;
  const canvas = document.createElement('canvas');
  canvas.width = visual.rearRescueCanvasWidth;
  canvas.height = visual.rearRescueCanvasHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = `#${visual.bodyColor.toString(16).padStart(6, '0')}`;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = `#${visual.rearTextOutlineColor.toString(16).padStart(6, '0')}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `900 ${Math.round(canvas.height * visual.rearTextFontRatio)}px Impact, "Arial Black", Arial, sans-serif`;
  context.lineJoin = 'round';
  context.lineWidth = canvas.height * visual.rearTextOutlineRatio;
  context.strokeStyle = `#${visual.rearTextOutlineColor.toString(16).padStart(6, '0')}`;
  context.strokeText('DOGE RESCUE', canvas.width / 2, canvas.height / 2);
  context.fillStyle = `#${visual.rearTextColor.toString(16).padStart(6, '0')}`;
  context.fillText('DOGE RESCUE', canvas.width / 2, canvas.height / 2);
  return new THREE.CanvasTexture(canvas);
}

function addOpenBoardingDoor(parent, vanWidth, vanLength, bodyY, bodyHeight, bodyColor, accentColor) {
  const door = CONFIG.garage.boardingDoor;
  // World X is mirrored in the chase camera: model -X is screen-right, where dogs approach.
  const side = -1;
  const doorDepth = vanLength * door.depthRatio;
  const openingHeight = bodyHeight * door.openingHeightRatio;
  const openingY = bodyY - bodyHeight * door.openingBodyYOffsetRatio;
  const openingZ = vanLength * door.openingZRatio;
  const interior = new THREE.MeshStandardMaterial({ color: 0x171c26, roughness: 0.92 });
  const opening = new THREE.Mesh(new THREE.BoxGeometry(door.panelThickness, openingHeight, doorDepth), interior);
  opening.position.set(side * (vanWidth / 2 + door.openingSideOffset), openingY, openingZ);
  parent.add(opening);

  const panelSide = side * (vanWidth / 2 + door.slidingPanelSideOffset);
  const panelZ = openingZ - doorDepth * door.slidingTravelRatio;
  const panelMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.42, metalness: 0.12 });
  const slidingPanel = new THREE.Mesh(new THREE.BoxGeometry(door.panelThickness, openingHeight, doorDepth), panelMaterial);
  slidingPanel.position.set(panelSide, openingY, panelZ);
  parent.add(slidingPanel);

  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x20394c, roughness: 0.2, metalness: 0.32 });
  const window = new THREE.Mesh(
    new THREE.BoxGeometry(door.panelThickness * 1.16, openingHeight * door.windowHeightRatio, doorDepth * 0.78),
    windowMaterial,
  );
  window.position.set(panelSide + side * door.panelThickness * 0.1, openingY + openingHeight * door.windowYOffsetRatio, panelZ);
  parent.add(window);

  const accentMaterial = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.42, metalness: 0.38 });
  const accent = new THREE.Mesh(new THREE.BoxGeometry(door.panelThickness * 1.2, door.trimThickness, doorDepth * 0.76), accentMaterial);
  accent.position.set(panelSide + side * door.panelThickness * 0.12, openingY - openingHeight * 0.28, panelZ);
  parent.add(accent);

  const trackMaterial = new THREE.MeshStandardMaterial({ color: 0xb5c4ce, roughness: 0.28, metalness: 0.8 });
  for (const vertical of [-1, 1]) {
    const track = new THREE.Mesh(new THREE.BoxGeometry(door.panelThickness, door.trackThickness, doorDepth * 1.9), trackMaterial);
    track.position.set(
      side * (vanWidth / 2 + door.trackSideOffset),
      openingY + vertical * openingHeight * 0.52,
      openingZ - doorDepth * door.slidingTravelRatio * 0.48,
    );
    parent.add(track);
  }
}

function addVehicleStyle(parent, vehicle, vanWidth, vanLength, wheelRadius, bodyY, bodyHeight, roofHeight) {
  const design = CONFIG.garage.design;
  const accent = new THREE.MeshStandardMaterial({
    color: vehicle.accentColor || 0xffdc79,
    roughness: 0.38,
    metalness: vehicle.style === 'luxury' || vehicle.style === 'elite' ? 0.58 : 0.22,
  });
  if (vehicle.style !== 'rescue') {
    for (const side of [-1, 1]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(design.stripeThickness, design.stripeHeight, vanLength * design.stripeLengthRatio), accent);
      stripe.position.set(side * (vanWidth / 2 + design.stripeThickness * 0.55), bodyY + bodyHeight * design.stripeBodyYOffsetRatio, vanLength * design.stripeZOffsetRatio);
      parent.add(stripe);
    }
  }
  if (vehicle.style === 'expedition') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(vanWidth * design.expeditionBarWidthRatio, design.expeditionBarHeight, design.expeditionBarDepth), accent);
    bar.position.set(0, wheelRadius + design.expeditionBarYOffset, vanLength / 2 + design.expeditionBarZOffset);
    parent.add(bar);
    for (const side of [-1, 1]) {
      const guard = new THREE.Mesh(new THREE.BoxGeometry(design.expeditionGuardWidth, design.expeditionGuardHeight, design.expeditionGuardWidth), accent);
      guard.position.set(side * vanWidth * design.expeditionGuardXRatio, wheelRadius + design.expeditionBarYOffset, vanLength / 2 + design.expeditionBarZOffset);
      parent.add(guard);
    }
  } else if (vehicle.style === 'rally') {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(vanWidth * design.rallyWingWidthRatio, design.rallyWingHeight, design.rallyWingDepth), accent);
    wing.position.set(0, wheelRadius + bodyHeight + roofHeight + design.rallyWingHeightOffset, -vanLength * design.rallyWingZRatio);
    parent.add(wing);
    for (const side of [-1, 1]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(design.rallySupportWidth, design.rallySupportHeight, design.rallySupportWidth), accent);
      support.position.set(side * vanWidth * design.rallySupportXRatio, wheelRadius + bodyHeight + roofHeight + design.rallyWingHeightOffset * 0.51, -vanLength * design.rallyWingZRatio);
      parent.add(support);
    }
  } else if (vehicle.style === 'luxury') {
    const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(vanWidth * design.luxuryRoofWidthRatio, design.luxuryRoofThickness, vanLength * design.luxuryRoofDepthRatio), accent);
    roofPanel.position.set(0, wheelRadius + bodyHeight + roofHeight + design.luxuryRoofHeightOffset, -vanLength * design.luxuryRoofZRatio);
    parent.add(roofPanel);
  } else if (vehicle.style === 'elite') {
    const lightbar = new THREE.Mesh(new THREE.BoxGeometry(vanWidth * design.eliteLightbarWidthRatio, design.eliteLightbarHeight, design.eliteLightbarDepth), accent);
    lightbar.position.set(0, wheelRadius + bodyHeight + roofHeight + design.eliteLightbarHeightOffset, vanLength * design.eliteLightbarZRatio);
    parent.add(lightbar);
    for (const side of [-1, 1]) {
      const flare = new THREE.Mesh(new THREE.BoxGeometry(design.eliteFlareWidth, design.eliteFlareHeight, vanLength * design.eliteFlareDepthRatio), accent);
      flare.position.set(side * (vanWidth / 2 + design.eliteFlareSideOffset), wheelRadius + design.eliteFlareHeightOffset, 0);
      parent.add(flare);
    }
  }
}

function createVanLogoTexture() {
  const { logoCanvasWidth: width, logoCanvasHeight: height } = CONFIG.vanVisual;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#E8B86D';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#14171c';
  ctx.fillRect(0, height * 0.09, width, height * 0.12);
  ctx.fillRect(0, height * 0.79, width, height * 0.12);
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, height * 0.22, width, height * 0.055);
  ctx.fillRect(0, height * 0.725, width, height * 0.055);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(height * 0.43)}px Arial, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = height * 0.055;
  ctx.strokeStyle = '#fffaf0';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = height * 0.035;
  ctx.shadowOffsetX = height * 0.02;
  ctx.shadowOffsetY = height * 0.025;
  ctx.strokeText('DOGE VAN', width / 2, height / 2);
  ctx.fillStyle = '#101216';
  ctx.fillText('DOGE VAN', width / 2, height / 2);
  return new THREE.CanvasTexture(canvas);
}

function createVanRearTexture(bodyColor = CONFIG.vanVisual.bodyColor) {
  const { rearCanvasWidth: width, rearCanvasHeight: height } = CONFIG.vanVisual;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const hexColor = `#${bodyColor.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `900 ${Math.round(height * 0.2)}px Impact, "Arial Black", Arial, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.round(height * 0.025);
  ctx.strokeStyle = '#17191d';
  ctx.fillStyle = '#fffdf5';
  ctx.strokeText('DOGE VAN', width / 2, height * 0.055);
  ctx.fillText('DOGE VAN', width / 2, height * 0.055);
  return new THREE.CanvasTexture(canvas);
}

function updateVan(van, game, dt) {
  van.worldX = clamp(
    worldXOf(game.van.x, game.van.width),
    -ROAD_HALF_WORLD + VAN_WIDTH_WORLD / 2,
    ROAD_HALF_WORLD - VAN_WIDTH_WORLD / 2,
  );
  van.group.position.x = van.worldX;
  van.animationTime += dt;

  const damageStage = game.van.damageStage || 0;
  van.damageParts.hood.visible = damageStage >= 2;
  van.damageParts.hood.rotation.x = damageStage >= 2 ? CONFIG.crash.damageHoodAngle : 0;
  van.damageParts.hood.position.y = van.damageParts.hoodBaseY
    + (damageStage >= 2 ? CONFIG.crash.damageHoodLift : 0);
  van.damageParts.bumper.position.y = van.damageParts.bumperBaseY
    - (damageStage === 1
      ? CONFIG.crash.damageBumperDrop * CONFIG.crash.firstHitBumperDamageRatio
      : damageStage >= 2 ? CONFIG.crash.damageBumperDrop : 0);
  const crashed = game.crashState === 'stopping' || game.crashState === 'halted';
  van.group.rotation.y = crashed
    ? Math.min(game.crashElapsed * CONFIG.crash.spinRate, CONFIG.crash.damageHoodAngle)
    : 0;
  van.group.rotation.z = crashed
    ? Math.sin(game.crashElapsed * CONFIG.crash.tiltRate) * CONFIG.crash.obstacleTiltRadians
    : 0;

  const visual = CONFIG.vanVisual;
  const braking = Boolean(game.isBraking);
  const boosting = Boolean(game.isBoosting) && !braking;
  const targetZ = braking ? visual.brakeSquashZ : boosting ? visual.accelerateStretchZ : 1;
  const targetY = braking ? visual.brakeStretchY : boosting ? visual.accelerateSquashY : 1;
  const blend = 1 - Math.exp(-visual.squashStretchRate * dt);
  van.visualScale.z += (targetZ - van.visualScale.z) * blend;
  van.visualScale.y += (targetY - van.visualScale.y) * blend;
  van.model.scale.copy(van.visualScale);

  const speedRatio = Math.min(1, Math.max(0, game.vanSpeed / CONFIG.speed.max));
  van.group.position.y = Math.sin(van.animationTime * visual.bounceFrequency) * visual.bounceAmplitude * speedRatio
    + (game.jumpHeight || 0);
  if (van.copilot) {
    const settings = CONFIG.companion;
    const reaction = game.companionTimer > 0 ? 1 : 0;
    van.copilot.group.position.y = van.copilot.baseY
      + Math.sin(van.animationTime * settings.idleBobFrequency) * settings.idleBobAmplitude
      + reaction * settings.idleBobAmplitude;
    van.copilot.group.rotation.z = Math.sin(van.animationTime * settings.idleBobFrequency) * settings.reactionTilt * reaction;
    for (const { mesh, side } of van.copilot.ears) {
      mesh.rotation.z = side * (settings.earLeanRadians
        + Math.sin(van.animationTime * settings.idleBobFrequency * settings.earWiggleFrequencyRatio)
          * settings.earWiggle * reaction);
    }
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function makeRng(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Scenery ---

function buildScenery(gradientMap) {
  const group = new THREE.Group();
  const materials = buildSceneryMaterials(gradientMap);
  const geometries = buildSceneryGeometries();
  const streetLights = [];
  const birdFlocks = [];
  const marketGroup = new THREE.Group();
  marketGroup.userData.isManagedMarketGroup = true;
  const marketStalls = [];
  const marketConfig = CONFIG.scenery;
  const marketRng = makeRng(marketConfig.environmentSeed);
  const marketCount = Math.ceil(SCENERY_WRAP_DISTANCE / marketConfig.marketStandSpacing);
  const marketWrapDistance = marketCount * marketConfig.marketStandSpacing;

  for (let index = 0; index < marketCount; index++) {
    const theme = marketConfig.marketThemes[index % marketConfig.marketThemes.length];
    const marketSide = marketConfig.posVendorSide;
    const stall = buildSceneryVariation(9, materials, geometries, marketSide, theme);
    const placement = {
      x: marketSide * CITY.sidewalkCenterX + (marketRng() - 0.5) * marketConfig.marketStandJitterX,
      z: SCENERY_RECYCLE_Z + marketConfig.poolStartOffset + index * marketConfig.marketStandSpacing
        + (marketRng() - 0.5) * marketConfig.marketStandJitterZ,
      rotationY: (marketRng() * 2 - 1) * marketConfig.marketStandRotation,
      scale: marketConfig.marketStandScale,
    };
    stall.scale.setScalar(placement.scale);
    stall.position.set(placement.x, 0, placement.z);
    stall.rotation.y = placement.rotationY;

    if (index % marketConfig.marketVendorEvery === 0) {
      const vendor = createMarketVendor(materials, geometries, index % 2 === 0, marketRng);
      vendor.position.x = marketSide * marketConfig.marketVendorOffsetX;
      stall.add(vendor);
    }
    if (index % marketConfig.marketKioskEvery === 0) {
      const kiosk = createMarketKiosk(materials, geometries, marketConfig, marketSide);
      kiosk.position.x = marketSide * marketConfig.marketKioskOffsetX;
      stall.add(kiosk);
    }
    if (index % marketConfig.woodenStallEvery === marketConfig.woodenStallPhase) {
      const woodenStall = createWoodenMarketStall(materials, geometries, marketConfig);
      woodenStall.position.x = marketSide * marketConfig.marketKioskOffsetX;
      stall.add(woodenStall);
    }

    marketGroup.add(stall);
    marketStalls.push(placement);
  }
  const marketBatches = batchMarketStalls(marketGroup, marketStalls);
  group.add(marketGroup);

  const utilityCorridor = buildUtilityCorridor(materials);
  group.add(utilityCorridor.group);

  for (let i = 0; i < SCENERY_POOL_SIZE; i++) {
    const type = randomSceneryType();
    const side = type === 9 ? CONFIG.scenery.posVendorSide : (Math.random() < 0.5 ? -1 : 1);
    const holder = buildSceneryVariation(type, materials, geometries, side);
    holder.userData.streetlightSide = side;
    holder.position.x = sceneryXFor(type, side);
    holder.position.z = SCENERY_RECYCLE_Z + CONFIG.scenery.poolStartOffset + i * SCENERY_SPACING;
    if (holder.userData.streetLight) streetLights.push(holder.userData.streetLight);
    group.add(holder);
  }

  // Separate sky props keep the sidewalk scenery dense while birds glide overhead.
  for (let index = 0; index < CONFIG.scenery.birdFlockCount; index++) {
    const flock = createBirdFlock(materials, geometries);
    const side = index % 2 === 0 ? -1 : 1;
    const flightRange = CONFIG.scenery.birdFlightXRange;
    const flightX = flightRange[0] + Math.random() * (flightRange[1] - flightRange[0]);
    flock.position.set(
      side * flightX,
      CONFIG.scenery.birdFlightHeight,
      SCENERY_RECYCLE_Z + CONFIG.scenery.poolStartOffset
        + ((index + 0.5) / CONFIG.scenery.birdFlockCount) * SCENERY_WRAP_DISTANCE,
    );
    group.add(flock);
    birdFlocks.push(flock);
  }

  return {
    group,
    materials,
    geometries,
    streetLights,
    birdFlocks,
    marketGroup,
    marketStalls,
    marketInstancesByStand: marketBatches.instancesByStand,
    marketBatches,
    marketWrapDistance,
    utilitySegments: utilityCorridor.segments,
    utilityWrapDistance: utilityCorridor.wrapDistance,
    setNightFactor(nightFactor) {
      const lightConfig = CONFIG.scenery;
      for (const light of streetLights) {
        light.intensity = lightConfig.streetlightDayIntensity
          + (lightConfig.streetlightNightIntensity - lightConfig.streetlightDayIntensity) * nightFactor;
      }
    },
    setMarketActive(active) {
      marketGroup.visible = active;
    },
  };
}

function buildWorldScenery(gradientMap) {
  const root = new THREE.Group();
  const settings = CONFIG.worldScenery;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const sphere = new THREE.SphereGeometry(1, 10, 8);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  const cone = new THREE.ConeGeometry(1, 1, 8);
  const themes = {};

  for (const worldId of ['japan', 'usa']) {
    const group = new THREE.Group();
    const japan = worldId === 'japan';
    const bodyColors = japan ? settings.buildingColorsJapan : settings.buildingColorsUSA;
    const bodyMaterials = bodyColors.map((color) => toonMaterial(color, gradientMap));
    const skyscraperMaterials = japan
      ? []
      : settings.usaSkyscraperColors.map((color) => toonMaterial(color, gradientMap));
    const roofMaterial = toonMaterial(japan ? settings.roofColorJapan : settings.roofColorUSA, gradientMap);
    const windowMaterial = toonMaterial(japan ? 0x93c9d5 : settings.usaGlass, gradientMap);
    const trimMaterial = toonMaterial(japan ? 0x794c3b : settings.usaAccent, gradientMap);
    const pavementMaterial = japan
      ? toonMaterial(0xb9aaa0, gradientMap)
      : createHollywoodWalkMaterial(settings, gradientMap);
    const worldGroundMaterial = japan
      ? createSakuraPaverMaterial(settings, gradientMap)
      : createHollywoodBoulevardMaterial(settings, gradientMap);
    const curbMaterials = [toonMaterial(0xf4f0e6, gradientMap), toonMaterial(0x292d34, gradientMap)];
    const themedMaterials = {
      trunk: toonMaterial(settings.trunkColorJapan, gradientMap),
      blossoms: settings.blossomColors.map((color) => toonMaterial(color, gradientMap)),
      torii: toonMaterial(settings.toriiColor, gradientMap),
      statue: toonMaterial(settings.statueColor, gradientMap),
      statueMuzzle: toonMaterial(0xe8d2a2, gradientMap),
      statueDark: toonMaterial(0x49372b, gradientMap),
      station: toonMaterial(settings.stationColor, gradientMap),
      stationAccent: toonMaterial(settings.stationAccentJapan, gradientMap),
      stationRoof: toonMaterial(settings.roofColorJapan, gradientMap),
      statuePedestal: toonMaterial(0x696c70, gradientMap),
      timber: toonMaterial(settings.japanTimber, gradientMap),
      paper: toonMaterial(settings.japanPaper, gradientMap),
      garden: toonMaterial(settings.japanGarden, gradientMap),
      stone: toonMaterial(0x77746d, gradientMap),
      japanHouseSign: makeWorldSignMaterial(['和風の家', 'SAKURA HOME'], 0x704735, 0xfff1d6),
      japanShopSigns: [
        makeWorldSignMaterial(['さくら商店', 'SAKURA MARKET'], 0xb83f3a, 0xfff0c8),
        makeWorldSignMaterial(['ラーメン', 'SAKURA RAMEN'], 0x315b7a, 0xffffff),
      ],
      japanShopAwning: [toonMaterial(0xc95048, gradientMap), toonMaterial(0xf4d98b, gradientMap)],
      japanPeople: [toonMaterial(0x355f91, gradientMap), toonMaterial(0xd65a4a, gradientMap), toonMaterial(0x5b8664, gradientMap)],
      japanSkin: toonMaterial(0xe3b58c, gradientMap),
      japanDog: toonMaterial(0xc68d52, gradientMap),
      japanDogMuzzle: toonMaterial(0xf0dfc7, gradientMap),
      signPost: toonMaterial(0x454b54, gradientMap),
      dogeSign: makeWorldSignMaterial(['DOGE', 'SAKURA CITY'], 0x5d492e, 0xffe6a8),
      stationSign: makeWorldSignMaterial(['さくら駅', 'SAKURA CITY STATION'], 0x2879a8, 0xffffff),
      japanStreetSigns: [
        makeWorldSignMaterial(['桜通り', 'SAKURA-DORI'], 0x2879a8, 0xffffff),
        makeWorldSignMaterial(['花見通り', 'HANAMI STREET'], 0x2879a8, 0xffffff),
      ],
      usaRoadSign: makeWorldSignMaterial(['ROUTE 66', 'DOGE HIGHWAY'], settings.usaSignColor, settings.roofColorUSA),
      usaDinerSign: makeWorldSignMaterial(['DOGE DINER', 'BURGERS • SHAKES'], settings.usaAccent, 0xfff3c2),
      usaHollywoodSign: makeWorldSignMaterial(['HOLLYWOOD', 'SUNSET BOULEVARD'], settings.usaAccent, 0xfff3c2),
      usaDinerCream: toonMaterial(0xffe2bd, gradientMap),
      usaDinerRed: toonMaterial(settings.usaAccent, gradientMap),
      usaPeople: settings.usaPeopleColors.map((color) => toonMaterial(color, gradientMap)),
      usaSkin: settings.usaSkinColors.map((color) => toonMaterial(color, gradientMap)),
      usaHair: settings.usaHairColors.map((color) => toonMaterial(color, gradientMap)),
      usaDogs: settings.usaDogColors.map((color) => toonMaterial(color, gradientMap)),
      usaFireHydrant: toonMaterial(settings.usaFireHydrantColor, gradientMap),
      usaBench: toonMaterial(settings.usaBenchColor, gradientMap),
      usaTrashCan: toonMaterial(settings.usaTrashCanColor, gradientMap),
      usaPalmTrunk: toonMaterial(settings.usaPalmTrunkColor, gradientMap),
      usaPalmLeaf: toonMaterial(settings.usaPalmLeafColor, gradientMap),
      usaStreetlight: toonMaterial(settings.usaStreetlightColor, gradientMap),
      usaStreetlightPole: toonMaterial(settings.usaStreetlightPoleColor, gradientMap),
    };
    const blockSpacing = japan ? settings.slotSpacing : settings.usaSlotSpacing;
    const slotCount = Math.ceil(SCENERY_WRAP_DISTANCE / blockSpacing);
    const curbCount = Math.ceil(SCENERY_WRAP_DISTANCE / settings.curbBlockLength);

    for (const side of [-1, 1]) {
      const sidewalkX = side * (ROAD_HALF_WORLD + DOG_SIDE_CLEARANCE + settings.sidewalkWidth / 2);
      const sidewalk = new THREE.Mesh(box, pavementMaterial);
      sidewalk.scale.set(settings.sidewalkWidth, 0.1, SCENERY_WRAP_DISTANCE);
      sidewalk.position.set(sidewalkX, settings.themedSidewalkY, SCENERY_RECYCLE_Z + SCENERY_WRAP_DISTANCE / 2);
      group.add(sidewalk);

      const groundWidth = settings.roadsideGroundWidth;
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(groundWidth, SCENERY_WRAP_DISTANCE),
        worldGroundMaterial,
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(
        side * (ROAD_HALF_WORLD + groundWidth / 2 + 0.04),
        -0.012,
        SCENERY_RECYCLE_Z + SCENERY_WRAP_DISTANCE / 2,
      );
      ground.receiveShadow = true;
      group.add(ground);

      const curbGeometry = new THREE.BoxGeometry(0.24, 0.18, settings.curbBlockLength);
      const curbs = new THREE.InstancedMesh(curbGeometry, curbMaterials[0], curbCount);
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3(1, 1, 1);
      for (let index = 0; index < curbCount; index++) {
        position.set(
          side * (ROAD_HALF_WORLD + DOG_SIDE_CLEARANCE * 0.5),
          0.02,
          SCENERY_RECYCLE_Z + settings.curbBlockLength * (index + 0.5),
        );
        matrix.compose(position, quaternion, scale);
        curbs.setMatrixAt(index, matrix);
        curbs.setColorAt(index, curbMaterials[index % curbMaterials.length].color);
      }
      curbs.instanceMatrix.needsUpdate = true;
      group.add(curbs);

      if (japan) addSakuraPetalScatter(group, sphere, themedMaterials.blossoms[0], settings, side);

      for (let index = 0; index < slotCount; index++) {
        const z = SCENERY_RECYCLE_Z + settings.wrapStartOffset + index * blockSpacing;
        const structure = new THREE.Group();
        const usaVariant = index % settings.usaBoulevardBuildingWidths.length;
        const width = japan ? 4.2 : settings.usaBoulevardBuildingWidths[usaVariant];
        const height = japan ? 3.1 + (index % 3) * 0.35 : settings.usaBoulevardBuildingHeights[usaVariant];
        const depth = japan ? 4.4 : settings.usaBoulevardBuildingDepths[usaVariant];
        if (japan) {
          addJapaneseHouse(structure, box, bodyMaterials[index % bodyMaterials.length], roofMaterial, windowMaterial, trimMaterial, themedMaterials, width, height, depth, index);
        } else {
          addAmericanBuilding(structure, box, bodyMaterials[index % bodyMaterials.length], roofMaterial, windowMaterial, trimMaterial, width, height, depth, index);
        }
        structure.position.set(side * (Math.abs(sidewalkX) + settings.sidewalkWidth / 2 + width / 2 + 0.9), 0, z);
        group.add(structure);

        if (!japan) {
          const tower = new THREE.Group();
          const towerIndex = ((index + side) % settings.usaSkyscraperWidths.length + settings.usaSkyscraperWidths.length) % settings.usaSkyscraperWidths.length;
          const towerWidth = settings.usaSkyscraperWidths[towerIndex];
          const towerHeight = settings.usaSkyscraperHeights[towerIndex];
          const towerDepth = settings.usaSkyscraperDepths[towerIndex];
          const towerFacade = skyscraperMaterials[towerIndex % skyscraperMaterials.length];
          addAmericanSkyscraper(tower, box, towerFacade, roofMaterial, windowMaterial, trimMaterial, towerWidth, towerHeight, towerDepth, settings);
          tower.position.set(
            side * (Math.abs(structure.position.x) + settings.usaSkyscraperRowOffset + towerWidth / 2),
            0,
            z + (index % 2 === 0 ? settings.usaSkyscraperZStagger : -settings.usaSkyscraperZStagger),
          );
          group.add(tower);

          if (side === 1 && index === settings.landmarkEvery) {
            addHollywoodSign(group, box, themedMaterials, side, z + blockSpacing * 1.5, sidewalkX, settings);
          }
        }

        if (japan && index % settings.japanSecondRowEvery === 0) {
          const secondRow = new THREE.Group();
          addJapaneseBackHouse(secondRow, box, bodyMaterials[(index + 1) % bodyMaterials.length], roofMaterial, windowMaterial, themedMaterials, width * 0.82, height * 0.78, depth * 0.78);
          secondRow.scale.setScalar(0.92);
          secondRow.position.set(
            side * (Math.abs(structure.position.x) + width * 0.82 + 2.2),
            0,
            z + blockSpacing * 0.36,
          );
          group.add(secondRow);
        }

        if (japan && index % settings.japanThirdRowEvery === 2) {
          const backHome = new THREE.Group();
          addJapaneseBackHouse(backHome, box, bodyMaterials[(index + 2) % bodyMaterials.length], roofMaterial, windowMaterial, themedMaterials, width * 0.62, height * 0.66, depth * 0.62);
          backHome.scale.setScalar(0.86);
          backHome.position.set(
            side * (Math.abs(structure.position.x) + width * 2.72 + 2.5),
            0,
            z - blockSpacing * 0.24,
          );
          group.add(backHome);
        }

        if (japan && index % settings.japanCrowdEvery === 0) {
          const crowdZ = z + blockSpacing * 0.28;
          for (let personIndex = 0; personIndex < 2; personIndex++) {
            const person = createJapanPedestrian(box, sphere, cylinder, themedMaterials, personIndex);
            person.position.set(
              side * (Math.abs(sidewalkX) + settings.sidewalkWidth * (0.48 + personIndex * 0.22)),
              0,
              crowdZ + (personIndex - 0.5) * 1.8,
            );
            group.add(person);
          }
        }

        if (japan && index % settings.japanStreetDogEvery === 1) {
          const dog = createJapanStreetDog(sphere, cylinder, themedMaterials);
          dog.position.set(side * (Math.abs(sidewalkX) + settings.sidewalkWidth * 0.82), 0, z - blockSpacing * 0.18);
          group.add(dog);
        }

        if (japan && index % settings.blossomTreeEvery === 0) {
          addSakuraTree(group, box, sphere, cylinder, themedMaterials, side, z + blockSpacing * 0.48, sidewalkX);
        }
        if (japan && index % settings.toriiEvery === 0) {
          addToriiGate(group, box, cylinder, themedMaterials, side, z + blockSpacing * 0.4, sidewalkX);
        }
        if (japan && index % 4 === 1) {
          const signMaterial = themedMaterials.japanStreetSigns[Math.floor(index / 4) % themedMaterials.japanStreetSigns.length];
          addWorldStreetSign(group, box, side * (Math.abs(sidewalkX) + 2.2), z + blockSpacing * 0.48, signMaterial, 2.5, 0.9, themedMaterials.signPost);
        }
        if (!japan && index % settings.toriiEvery === 0) {
          addAmericanRoadSign(group, box, themedMaterials, side, z + blockSpacing * 0.48, sidewalkX);
        }
        if (japan && side === 1 && index === settings.landmarkEvery) {
          addSakuraStation(group, box, themedMaterials, side, z + blockSpacing * 1.4, sidewalkX);
        }
        if (japan && side === -1 && index === settings.landmarkEvery * 2) {
          addDogeStatue(group, box, sphere, cone, themedMaterials, side, z + blockSpacing * 1.4, sidewalkX);
        }
        if (!japan && side === 1 && index === settings.landmarkEvery) {
          addAmericanDiner(group, box, themedMaterials, side, z + blockSpacing * 1.4, sidewalkX);
        }
        if (!japan) {
          addUSASidewalkLife(group, box, sphere, cylinder, themedMaterials, settings, side, z, index);
        }
      }
    }
    group.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    group.visible = false;
    root.add(group);
    themes[worldId] = group;
  }

  let activeWorld = 'lagos';
  return {
    group: root,
    setWorld(worldId) {
      const nextWorld = themes[worldId] ? worldId : 'lagos';
      if (nextWorld === activeWorld) return;
      activeWorld = nextWorld;
      for (const [id, theme] of Object.entries(themes)) theme.visible = id === activeWorld;
    },
    update(travelled) {
      const wrapDistance = SCENERY_WRAP_DISTANCE;
      for (const theme of Object.values(themes)) {
        theme.position.z -= travelled;
        while (theme.position.z < -wrapDistance) theme.position.z += wrapDistance;
        while (theme.position.z > wrapDistance) theme.position.z -= wrapDistance;
      }
    },
  };
}

function createHollywoodBoulevardMaterial(settings, gradientMap) {
  return createHollywoodPaverMaterial(settings, gradientMap, false);
}

function createHollywoodWalkMaterial(settings, gradientMap) {
  return createHollywoodPaverMaterial(settings, gradientMap, true);
}

function createHollywoodPaverMaterial(settings, gradientMap, walkOfFame) {
  const canvas = document.createElement('canvas');
  const size = settings.usaPaverTextureSize;
  const tiles = settings.usaPaverTilesPerAxis;
  const tileSize = size / tiles;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const colorHex = (color) => `#${color.toString(16).padStart(6, '0')}`;
  const baseColor = walkOfFame ? settings.usaSidewalkBase : settings.usaGroundBase;
  const alternateColor = walkOfFame ? settings.usaSidewalkTile : settings.usaGroundTile;
  const groutColor = walkOfFame ? settings.usaSidewalkGrout : settings.usaGroundGrout;
  context.fillStyle = colorHex(groutColor);
  context.fillRect(0, 0, size, size);
  for (let row = 0; row < tiles; row++) {
    for (let column = 0; column < tiles; column++) {
      const x = column * tileSize + 3;
      const y = row * tileSize + 3;
      const tileWidth = tileSize - 6;
      const tileHeight = tileSize - 6;
      context.fillStyle = (row + column) % 3 === 0 ? colorHex(alternateColor) : colorHex(baseColor);
      context.fillRect(x, y, tileWidth, tileHeight);
      if (walkOfFame) {
        const centerX = x + tileWidth / 2;
        const centerY = y + tileHeight / 2;
        const outerRadius = tileSize * 0.29;
        const innerRadius = outerRadius * 0.44;
        context.beginPath();
        for (let point = 0; point < 10; point++) {
          const radius = point % 2 === 0 ? outerRadius : innerRadius;
          const angle = -Math.PI / 2 + point * Math.PI / 5;
          const px = centerX + Math.cos(angle) * radius;
          const py = centerY + Math.sin(angle) * radius;
          if (point === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.closePath();
        context.fillStyle = colorHex(settings.usaWalkOfFameStar);
        context.fill();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  const repeatWidth = walkOfFame ? settings.sidewalkWidth : settings.roadsideGroundWidth;
  texture.repeat.set(repeatWidth / settings.usaPaverRepeatWorldSize, SCENERY_WRAP_DISTANCE / settings.usaPaverRepeatWorldSize);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = ROAD_SURFACE.textureAnisotropy;
  return new THREE.MeshToonMaterial({ color: 0xffffff, map: texture, gradientMap });
}

function createSakuraPaverMaterial(settings, gradientMap) {
  const canvas = document.createElement('canvas');
  const size = settings.japanPaverTextureSize;
  const tiles = settings.japanPaverTilesPerAxis;
  const tileSize = size / tiles;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const colorHex = (color) => `#${color.toString(16).padStart(6, '0')}`;
  context.fillStyle = colorHex(settings.japanPaverGrout);
  context.fillRect(0, 0, size, size);
  for (let row = 0; row < tiles; row++) {
    for (let column = 0; column < tiles; column++) {
      const variation = (row + column) % 3 === 0;
      context.fillStyle = colorHex(variation ? settings.japanPaverAlternate : settings.japanPaverBase);
      context.fillRect(column * tileSize + 2, row * tileSize + 2, tileSize - 4, tileSize - 4);
      context.strokeStyle = 'rgba(255,255,255,0.12)';
      context.lineWidth = 1;
      context.strokeRect(column * tileSize + 4, row * tileSize + 4, tileSize - 8, tileSize - 8);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(settings.roadsideGroundWidth / 8, SCENERY_WRAP_DISTANCE / 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = ROAD_SURFACE.textureAnisotropy;
  return new THREE.MeshToonMaterial({ color: 0xffffff, map: texture, gradientMap });
}

function addSakuraPetalScatter(parent, sphere, material, settings, side) {
  const count = settings.japanPetalCountPerSide;
  const petals = new THREE.InstancedMesh(sphere, material, count);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3(0.075, 0.018, 0.045);
  for (let index = 0; index < count; index++) {
    const column = (index * 37) % 101;
    const row = (index * 61) % count;
    position.set(
      side * (ROAD_HALF_WORLD + 0.3 + (column / 101) * settings.roadsideGroundWidth),
      0.015,
      SCENERY_RECYCLE_Z + settings.wrapStartOffset + (row / count) * SCENERY_WRAP_DISTANCE,
    );
    euler.set(0, (index % 9) * 0.7, 0);
    rotation.setFromEuler(euler);
    matrix.compose(position, rotation, scale);
    petals.setMatrixAt(index, matrix);
  }
  petals.instanceMatrix.needsUpdate = true;
  parent.add(petals);
}

function addJapaneseBackHouse(parent, box, facadeMaterial, roofMaterial, windowMaterial, materials, width, height, depth) {
  const body = new THREE.Mesh(box, facadeMaterial);
  body.scale.set(width, height, depth);
  body.position.y = height / 2;
  parent.add(body);
  for (const end of [-1, 1]) {
    const roof = new THREE.Mesh(box, roofMaterial);
    roof.scale.set(width + 0.55, 0.16, depth * 0.62);
    roof.position.set(0, height + 0.28, end * depth * 0.2);
    roof.rotation.x = end < 0 ? -0.28 : 0.28;
    parent.add(roof);
  }
  const door = new THREE.Mesh(box, materials.paper);
  door.scale.set(0.62, height * 0.56, 0.08);
  door.position.set(0, height * 0.28, -depth / 2 - 0.05);
  parent.add(door);
  for (const x of [-width * 0.3, width * 0.3]) {
    const window = new THREE.Mesh(box, windowMaterial);
    window.scale.set(0.52, 0.5, 0.07);
    window.position.set(x, height * 0.62, -depth / 2 - 0.05);
    parent.add(window);
  }
}

function createJapanPedestrian(box, sphere, cylinder, materials, personIndex) {
  const person = new THREE.Group();
  const outfit = materials.japanPeople[personIndex % materials.japanPeople.length];
  const torso = new THREE.Mesh(box, outfit);
  torso.scale.set(0.42, 0.78, 0.3);
  torso.position.y = 0.98;
  person.add(torso);
  const head = new THREE.Mesh(sphere, materials.japanSkin);
  head.scale.set(0.25, 0.29, 0.25);
  head.position.y = 1.55;
  person.add(head);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(cylinder, materials.japanSkin);
    arm.scale.set(0.075, 0.36, 0.075);
    arm.position.set(side * 0.27, 1.02, 0);
    arm.rotation.z = side * -0.18;
    person.add(arm);
    const leg = new THREE.Mesh(cylinder, materials.japanShopAwning[1]);
    leg.scale.set(0.09, 0.42, 0.09);
    leg.position.set(side * 0.12, 0.34, 0);
    person.add(leg);
  }
  return person;
}

function createJapanStreetDog(sphere, cylinder, materials) {
  const dog = new THREE.Group();
  const body = new THREE.Mesh(sphere, materials.japanDog);
  body.scale.set(0.38, 0.28, 0.62);
  body.position.y = 0.42;
  dog.add(body);
  const head = new THREE.Mesh(sphere, materials.japanDog);
  head.scale.set(0.3, 0.31, 0.3);
  head.position.set(0, 0.62, -0.47);
  dog.add(head);
  const muzzle = new THREE.Mesh(sphere, materials.japanDogMuzzle);
  muzzle.scale.set(0.2, 0.12, 0.22);
  muzzle.position.set(0, 0.52, -0.7);
  dog.add(muzzle);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(sphere, materials.japanDog);
    ear.scale.set(0.1, 0.23, 0.11);
    ear.position.set(side * 0.22, 0.83, -0.45);
    dog.add(ear);
    for (const z of [-0.35, 0.35]) {
      const leg = new THREE.Mesh(cylinder, materials.japanDog);
      leg.scale.set(0.07, 0.27, 0.07);
      leg.position.set(side * 0.2, 0.17, z);
      dog.add(leg);
    }
  }
  const tail = new THREE.Mesh(cylinder, materials.japanDog);
  tail.scale.set(0.06, 0.34, 0.06);
  tail.position.set(0, 0.63, 0.59);
  tail.rotation.x = -0.7;
  dog.add(tail);
  return dog;
}

function addJapaneseHouse(parent, box, facadeMaterial, roofMaterial, windowMaterial, trimMaterial, materials, width, height, depth, variant) {
  const foundation = new THREE.Mesh(box, materials.stone);
  foundation.scale.set(width + 0.18, 0.34, depth + 0.2);
  foundation.position.y = 0.17;
  parent.add(foundation);

  const facade = new THREE.Mesh(box, facadeMaterial);
  facade.scale.set(width, height, depth);
  facade.position.y = height / 2 + 0.28;
  parent.add(facade);

  const frontZ = -depth / 2 - 0.07;
  const timberBeam = (x, y, beamWidth, beamHeight, z = frontZ) => {
    const beam = new THREE.Mesh(box, materials.timber);
    beam.scale.set(beamWidth, beamHeight, 0.13);
    beam.position.set(x, y, z);
    parent.add(beam);
  };
  timberBeam(0, height + 0.19, width + 0.3, 0.16);
  timberBeam(-width * 0.47, height * 0.52, 0.14, height * 0.96);
  timberBeam(width * 0.47, height * 0.52, 0.14, height * 0.96);

  const roofPanelLength = depth * 0.64;
  for (const end of [-1, 1]) {
    const roofPanel = new THREE.Mesh(box, roofMaterial);
    roofPanel.scale.set(width + 0.9, 0.18, roofPanelLength);
    roofPanel.position.set(0, height + 0.62, end * depth * 0.22);
    roofPanel.rotation.x = end < 0 ? -0.32 : 0.32;
    parent.add(roofPanel);
  }
  const ridge = new THREE.Mesh(box, materials.timber);
  ridge.scale.set(width + 0.72, 0.16, 0.32);
  ridge.position.y = height + 0.82;
  parent.add(ridge);
  const eave = new THREE.Mesh(box, materials.timber);
  eave.scale.set(width + 1.05, 0.12, 0.18);
  eave.position.set(0, height + 0.37, frontZ - 0.14);
  parent.add(eave);

  const door = new THREE.Mesh(box, materials.paper);
  door.scale.set(1.05, 1.72, 0.1);
  door.position.set(0, 1.14, frontZ - 0.08);
  parent.add(door);
  for (const x of [-0.54, 0.54]) timberBeam(x, 1.13, 0.1, 1.86, frontZ - 0.15);
  timberBeam(0, 1.13, 0.08, 1.68, frontZ - 0.16);
  for (const y of [0.63, 1.2, 1.72]) timberBeam(0, y, 1.12, 0.07, frontZ - 0.16);

  for (const x of [-width * 0.28, width * 0.28]) {
    const pane = new THREE.Mesh(box, windowMaterial);
    pane.scale.set(0.72, 0.82, 0.08);
    pane.position.set(x, 1.65, frontZ - 0.04);
    parent.add(pane);
    for (const barX of [-0.38, 0, 0.38]) timberBeam(x + barX, 1.65, 0.045, 0.9, frontZ - 0.12);
    for (const barY of [1.25, 1.65, 2.05]) timberBeam(x, barY, 0.8, 0.045, frontZ - 0.13);
  }

  const garden = new THREE.Mesh(box, materials.garden);
  garden.scale.set(width * 0.9, 0.06, 0.85);
  garden.position.set(0, 0.04, -depth / 2 - 0.63);
  parent.add(garden);
  for (let stoneIndex = 0; stoneIndex < 3; stoneIndex++) {
    const stone = new THREE.Mesh(box, materials.stone);
    stone.scale.set(0.34, 0.08, 0.38);
    stone.position.set((stoneIndex - 1) * 0.46, 0.09, -depth / 2 - 0.62);
    parent.add(stone);
  }
  const shopSign = new THREE.Mesh(box, trimMaterial);
  shopSign.scale.set(1.8, 0.4, 0.12);
  shopSign.position.set(0, height - 0.38, frontZ - 0.18);
  parent.add(shopSign);
  const isShop = variant % 3 === 0;
  const signMaterial = isShop
    ? materials.japanShopSigns[Math.floor(variant / 3) % materials.japanShopSigns.length]
    : materials.japanHouseSign;
  const shopLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 0.34), signMaterial);
  shopLabel.position.set(0, height - 0.38, frontZ - 0.25);
  shopLabel.rotation.y = Math.PI;
  parent.add(shopLabel);
  if (variant % 2 === 0) {
    const awning = new THREE.Mesh(box, isShop ? materials.japanShopAwning[0] : materials.timber);
    awning.scale.set(width + 0.35, 0.18, 0.7);
    awning.position.set(0, height - 0.8, frontZ - 0.48);
    parent.add(awning);
    if (isShop) {
      const stripeCount = 5;
      for (let stripe = 0; stripe < stripeCount; stripe++) {
        const panel = new THREE.Mesh(box, materials.japanShopAwning[stripe % 2]);
        panel.scale.set((width + 0.35) / stripeCount, 0.17, 0.72);
        panel.position.set(-width * 0.42 + stripe * ((width + 0.35) / stripeCount), height - 0.8, frontZ - 0.49);
        parent.add(panel);
      }
      for (const lanternX of [-width * 0.34, width * 0.34]) {
        const lantern = new THREE.Mesh(box, materials.japanPaper);
        lantern.scale.set(0.3, 0.42, 0.28);
        lantern.position.set(lanternX, height - 1.35, frontZ - 0.45);
        parent.add(lantern);
      }
    }
  }
}

function addUSASidewalkLife(parent, box, sphere, cylinder, materials, settings, side, z, index) {
  const sidewalkInner = ROAD_HALF_WORLD + DOG_SIDE_CLEARANCE;
  const blockSpacing = settings.usaSlotSpacing;
  if (index % settings.usaPeopleEvery === 0) {
    for (let personIndex = 0; personIndex < 2; personIndex++) {
      const person = createUSAPedestrian(box, sphere, cylinder, materials, settings, index + personIndex);
      person.position.set(
        side * (sidewalkInner + settings.sidewalkWidth * (personIndex === 0 ? 0.28 : 0.68)),
        0,
        z + blockSpacing * (personIndex === 0 ? 0.12 : 0.32),
      );
      parent.add(person);
    }
  }

  if (index % settings.usaStreetDogEvery === 1) {
    const dog = createUSAStreetDog(sphere, cylinder, materials.usaDogs[index % materials.usaDogs.length], materials.usaHair[0], settings);
    dog.position.set(side * (sidewalkInner + settings.sidewalkWidth * 0.3), 0, z + blockSpacing * 0.62);
    parent.add(dog);
  }

  if (index % settings.usaPalmEvery === 1) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(cylinder, materials.usaPalmTrunk);
    trunk.scale.set(0.22, settings.usaPalmHeight / 2, 0.22);
    trunk.position.y = settings.usaPalmHeight / 2;
    palm.add(trunk);
    for (let frondIndex = 0; frondIndex < settings.usaPalmFrondCount; frondIndex++) {
      const frond = new THREE.Mesh(sphere, materials.usaPalmLeaf);
      frond.scale.set(...settings.usaPalmFrondScale);
      frond.rotation.y = (frondIndex / settings.usaPalmFrondCount) * Math.PI * 2;
      frond.rotation.x = Math.PI * 0.24;
      frond.position.y = settings.usaPalmHeight;
      palm.add(frond);
    }
    palm.position.set(side * (sidewalkInner + settings.sidewalkWidth * 0.9), 0, z + blockSpacing * 0.5);
    parent.add(palm);
  }

  if (index % settings.usaStreetFurnitureEvery === 0) {
    const hydrant = new THREE.Group();
    const hydrantBody = new THREE.Mesh(cylinder, materials.usaFireHydrant);
    hydrantBody.scale.set(0.2, settings.usaFireHydrantHeight * 0.4, 0.2);
    hydrantBody.position.y = settings.usaFireHydrantHeight * 0.4;
    hydrant.add(hydrantBody);
    const hydrantCap = new THREE.Mesh(cylinder, materials.usaFireHydrant);
    hydrantCap.scale.set(0.3, settings.usaFireHydrantHeight * 0.12, 0.3);
    hydrantCap.position.y = settings.usaFireHydrantHeight * 0.86;
    hydrant.add(hydrantCap);
    const hydrantNozzle = new THREE.Mesh(cylinder, materials.usaFireHydrant);
    hydrantNozzle.rotation.z = Math.PI / 2;
    hydrantNozzle.scale.set(0.12, 0.34, 0.12);
    hydrantNozzle.position.set(side * 0.27, settings.usaFireHydrantHeight * 0.57, 0);
    hydrant.add(hydrantNozzle);
    hydrant.position.set(side * (sidewalkInner + settings.sidewalkWidth * 0.24), 0, z + blockSpacing * 0.46);
    parent.add(hydrant);

    const bench = new THREE.Group();
    const seat = new THREE.Mesh(box, materials.usaBench);
    seat.scale.set(...settings.usaBenchSize);
    seat.position.y = 0.52;
    bench.add(seat);
    const back = new THREE.Mesh(box, materials.usaBench);
    back.scale.set(settings.usaBenchSize[0], 0.58, 0.12);
    back.position.set(0, 0.9, 0.16);
    bench.add(back);
    for (const legSide of [-1, 1]) {
      const leg = new THREE.Mesh(box, materials.usaBench);
      leg.scale.set(0.12, 0.52, 0.16);
      leg.position.set(legSide * 0.58, 0.26, 0);
      bench.add(leg);
    }
    bench.position.set(side * (sidewalkInner + settings.sidewalkWidth * 0.76), 0, z + blockSpacing * 0.78);
    parent.add(bench);

    const bin = new THREE.Mesh(cylinder, materials.usaTrashCan);
    bin.scale.set(settings.usaTrashCanSize[0], settings.usaTrashCanSize[1] / 2, settings.usaTrashCanSize[0]);
    bin.position.set(side * (sidewalkInner + settings.sidewalkWidth * 0.42), settings.usaTrashCanSize[1] / 2, z + blockSpacing * 0.9);
    parent.add(bin);
  }

  if (index % settings.usaStreetlightEvery === 0) {
    const pole = new THREE.Mesh(cylinder, materials.usaStreetlightPole);
    pole.scale.set(0.12, settings.usaStreetlightHeight / 2, 0.12);
    pole.position.set(side * (sidewalkInner + settings.sidewalkWidth * 0.91), settings.usaStreetlightHeight / 2, z + blockSpacing * 0.08);
    parent.add(pole);
    const arm = new THREE.Mesh(box, materials.usaStreetlightPole);
    arm.scale.set(0.68, 0.12, 0.12);
    arm.position.set(pole.position.x - side * 0.28, settings.usaStreetlightHeight - 0.16, pole.position.z);
    parent.add(arm);
    const lamp = new THREE.Mesh(sphere, materials.usaStreetlight);
    lamp.scale.setScalar(0.22);
    lamp.position.set(pole.position.x - side * 0.58, settings.usaStreetlightHeight - 0.2, pole.position.z);
    parent.add(lamp);
  }
}

function createUSAPedestrian(box, sphere, cylinder, materials, settings, index) {
  const scale = settings.usaPedestrianScale;
  const person = new THREE.Group();
  const bodySize = settings.usaPedestrianBodySize;
  const shirt = new THREE.Mesh(box, materials.usaPeople[index % materials.usaPeople.length]);
  shirt.scale.set(bodySize[0] * scale, bodySize[1] * scale, bodySize[2] * scale);
  shirt.position.y = bodySize[1] * scale * 0.66;
  person.add(shirt);
  const skin = materials.usaSkin[index % materials.usaSkin.length];
  const head = new THREE.Mesh(sphere, skin);
  head.scale.setScalar(settings.usaPedestrianHeadRadius * scale);
  head.position.set(0, bodySize[1] * scale * 1.38, -0.015);
  person.add(head);
  const hair = new THREE.Mesh(sphere, materials.usaHair[index % materials.usaHair.length]);
  hair.scale.set(settings.usaPedestrianHeadRadius * scale, settings.usaPedestrianHeadRadius * scale * 0.48, settings.usaPedestrianHeadRadius * scale);
  hair.position.set(0, head.position.y + settings.usaPedestrianHeadRadius * scale * 0.62, -0.015);
  person.add(hair);
  for (const limbSide of [-1, 1]) {
    const arm = new THREE.Mesh(cylinder, skin);
    arm.scale.set(settings.usaPedestrianLimbRadius * scale, bodySize[1] * scale * 0.43, settings.usaPedestrianLimbRadius * scale);
    arm.rotation.z = limbSide * -0.14;
    arm.position.set(limbSide * bodySize[0] * scale * 0.58, bodySize[1] * scale * 0.67, 0);
    person.add(arm);
    const leg = new THREE.Mesh(cylinder, materials.usaHair[(index + 1) % materials.usaHair.length]);
    leg.scale.set(settings.usaPedestrianLimbRadius * scale, bodySize[1] * scale * 0.45, settings.usaPedestrianLimbRadius * scale);
    leg.position.set(limbSide * bodySize[0] * scale * 0.22, bodySize[1] * scale * 0.23, 0);
    person.add(leg);
  }
  return person;
}

function createUSAStreetDog(sphere, cylinder, coat, noseMaterial, settings) {
  const scale = settings.usaStreetDogScale;
  const dog = new THREE.Group();
  const body = new THREE.Mesh(sphere, coat);
  body.scale.set(...settings.usaStreetDogBodyScale.map((dimension) => dimension * scale));
  body.position.set(0, 0.42 * scale, 0.08 * scale);
  dog.add(body);
  const head = new THREE.Mesh(sphere, coat);
  head.scale.set(...settings.usaStreetDogHeadScale.map((dimension) => dimension * scale));
  head.position.set(0, 0.58 * scale, -0.48 * scale);
  dog.add(head);
  const muzzle = new THREE.Mesh(sphere, noseMaterial);
  muzzle.scale.set(0.17 * scale, 0.12 * scale, 0.2 * scale);
  muzzle.position.set(0, 0.5 * scale, -0.69 * scale);
  dog.add(muzzle);
  for (const legX of [-0.25, 0.25]) {
    for (const legZ of [-0.3, 0.42]) {
      const leg = new THREE.Mesh(cylinder, coat);
      leg.scale.set(settings.usaStreetDogLegRadius * scale, 0.26 * scale, settings.usaStreetDogLegRadius * scale);
      leg.position.set(legX * scale, 0.17 * scale, legZ * scale);
      dog.add(leg);
    }
  }
  const tail = new THREE.Mesh(cylinder, coat);
  tail.scale.set(0.08 * scale, 0.28 * scale, 0.08 * scale);
  tail.position.set(0, 0.55 * scale, 0.68 * scale);
  tail.rotation.x = -0.65;
  dog.add(tail);
  return dog;
}

function addAmericanBuilding(parent, box, facadeMaterial, roofMaterial, windowMaterial, trimMaterial, width, height, depth, variant) {
  const facade = new THREE.Mesh(box, facadeMaterial);
  facade.scale.set(width, height, depth);
  facade.position.y = height / 2;
  parent.add(facade);
  const roof = new THREE.Mesh(box, roofMaterial);
  roof.scale.set(width + 0.2, 0.32, depth + 0.25);
  roof.position.y = height + 0.16;
  parent.add(roof);
  const rows = Math.min(4, Math.floor(height / 1.25));
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < 3; column++) {
      const window = new THREE.Mesh(box, windowMaterial);
      window.scale.set(0.7, 0.78, 0.08);
      window.position.set((column - 1) * (width * 0.3), 0.8 + row * (height - 1) / rows, -depth / 2 - 0.06);
      parent.add(window);
    }
  }
  if (variant % 4 === 0) {
    const awning = new THREE.Mesh(box, trimMaterial);
    awning.scale.set(width + 0.3, 0.32, 0.8);
    awning.position.set(0, 1.45, -depth / 2 - 0.3);
    parent.add(awning);
  }
}

function addAmericanSkyscraper(parent, box, facadeMaterial, roofMaterial, windowMaterial, trimMaterial, width, height, depth, settings) {
  const facade = new THREE.Mesh(box, facadeMaterial);
  facade.scale.set(width, height, depth);
  facade.position.y = height / 2;
  parent.add(facade);

  const roof = new THREE.Mesh(box, roofMaterial);
  roof.scale.set(width + 0.35, 0.3, depth + 0.35);
  roof.position.y = height + 0.15;
  parent.add(roof);

  const windowWidth = width * settings.usaSkyscraperWindowWidthRatio;
  const windowHeight = (height / settings.usaSkyscraperWindowRows) * settings.usaSkyscraperWindowHeightRatio;
  const windows = new THREE.InstancedMesh(
    box,
    windowMaterial,
    settings.usaSkyscraperWindowRows * settings.usaSkyscraperWindowColumns,
  );
  const windowTransform = new THREE.Object3D();
  let windowIndex = 0;
  for (let row = 0; row < settings.usaSkyscraperWindowRows; row++) {
    const y = (row + 0.5) * height / settings.usaSkyscraperWindowRows;
    for (let column = 0; column < settings.usaSkyscraperWindowColumns; column++) {
      const x = ((column + 0.5) / settings.usaSkyscraperWindowColumns - 0.5) * width * 0.84;
      windowTransform.scale.set(windowWidth, windowHeight, 0.08);
      windowTransform.position.set(x, y, -depth / 2 - 0.055);
      windowTransform.updateMatrix();
      windows.setMatrixAt(windowIndex++, windowTransform.matrix);
    }
  }
  windows.instanceMatrix.needsUpdate = true;
  parent.add(windows);

  for (const side of [-1, 1]) {
    const cornerTrim = new THREE.Mesh(box, trimMaterial);
    cornerTrim.scale.set(0.16, height, 0.12);
    cornerTrim.position.set(side * (width / 2 - 0.12), height / 2, -depth / 2 - 0.08);
    parent.add(cornerTrim);
  }
  const rooftop = new THREE.Mesh(box, roofMaterial);
  rooftop.scale.set(width * 0.3, 1.1, depth * 0.25);
  rooftop.position.set(0, height + 0.85, 0);
  parent.add(rooftop);
}

function addSakuraTree(parent, box, sphere, cylinder, materials, side, z, sidewalkX) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(cylinder, materials.trunk);
  trunk.scale.set(0.24, 2.25, 0.24);
  trunk.position.y = 1.12;
  tree.add(trunk);
  for (let index = 0; index < 5; index++) {
    const bloom = new THREE.Mesh(sphere, materials.blossoms[index % materials.blossoms.length]);
    bloom.scale.set(0.95 + (index % 2) * 0.2, 0.7 + (index % 3) * 0.1, 0.85);
    bloom.position.set(((index % 3) - 1) * 0.62, 2.15 + Math.floor(index / 3) * 0.38, (index % 2) * 0.32);
    tree.add(bloom);
  }
  tree.position.set(side * (Math.abs(sidewalkX) - 0.35), 0, z);
  parent.add(tree);
}

function addToriiGate(parent, box, cylinder, materials, side, z, sidewalkX) {
  const gate = new THREE.Group();
  const red = materials.torii;
  const dark = materials.stationAccent;
  for (const x of [-1.45, 1.45]) {
    const post = new THREE.Mesh(cylinder, red);
    post.scale.set(0.2, 3.5, 0.2);
    post.position.set(x, 1.75, 0);
    gate.add(post);
  }
  const crossbeam = new THREE.Mesh(box, red);
  crossbeam.scale.set(3.8, 0.34, 0.42);
  crossbeam.position.y = 3.1;
  gate.add(crossbeam);
  const cap = new THREE.Mesh(box, dark);
  cap.scale.set(4.35, 0.24, 0.72);
  cap.position.y = 3.42;
  gate.add(cap);
  gate.position.set(side * (Math.abs(sidewalkX) + 1.6), 0, z);
  parent.add(gate);
}

function makeWorldSignMaterial(lines, background, foreground) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const context = canvas.getContext('2d');
  context.fillStyle = `#${background.toString(16).padStart(6, '0')}`;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#f5eddf';
  context.lineWidth = 12;
  context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
  context.fillStyle = `#${foreground.toString(16).padStart(6, '0')}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 58px sans-serif';
  context.fillText(lines[0], canvas.width / 2, 70);
  context.font = 'bold 30px sans-serif';
  context.fillText(lines[1], canvas.width / 2, 142);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false });
}

function addWorldStreetSign(parent, box, x, z, material, width = 2.5, height = 0.9, postMaterial) {
  const sign = new THREE.Group();
  const post = new THREE.Mesh(box, postMaterial);
  post.scale.set(0.12, 2.7, 0.12);
  post.position.y = 1.35;
  sign.add(post);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  panel.position.set(0, 2.3, -0.08);
  panel.rotation.y = Math.PI;
  sign.add(panel);
  sign.position.set(x, 0, z);
  parent.add(sign);
}

function addSakuraStation(parent, box, materials, side, z, sidewalkX) {
  const station = new THREE.Group();
  const cream = materials.station;
  const blue = materials.stationAccent;
  const roof = materials.stationRoof;
  const base = new THREE.Mesh(box, cream);
  base.scale.set(7, 2.5, 8);
  base.position.y = 1.25;
  station.add(base);
  const canopy = new THREE.Mesh(box, roof);
  canopy.scale.set(8, 0.3, 9);
  canopy.position.y = 2.7;
  station.add(canopy);
  const platform = new THREE.Mesh(box, blue);
  platform.scale.set(10, 0.25, 13);
  platform.position.y = 0.18;
  station.add(platform);
  const train = new THREE.Mesh(box, materials.station);
  train.scale.set(2.7, 2.1, 8.5);
  train.position.set(5.1, 1.25, 0);
  station.add(train);
  const trainStripe = new THREE.Mesh(box, blue);
  trainStripe.scale.set(0.08, 0.38, 8.45);
  trainStripe.position.set(3.72, 1.05, 0);
  station.add(trainStripe);
  for (let index = 0; index < 4; index++) {
    const window = new THREE.Mesh(box, materials.stationAccent);
    window.scale.set(0.08, 0.68, 1.15);
    window.position.set(3.72, 1.65, -2.8 + index * 1.8);
    station.add(window);
  }
  addWorldStreetSign(station, box, -3.8, -4.2, materials.stationSign, 3.7, 1.2, materials.signPost);
  station.position.set(side * (Math.abs(sidewalkX) + 3), 0, z);
  parent.add(station);
}

function addDogeStatue(parent, box, sphere, cone, materials, side, z, sidewalkX) {
  const statue = new THREE.Group();
  const gold = materials.statue;
  const dark = materials.statueDark;
  const pedestal = new THREE.Mesh(box, materials.statuePedestal);
  pedestal.scale.set(3.5, 1.1, 3.2);
  pedestal.position.y = 0.55;
  statue.add(pedestal);
  const body = new THREE.Mesh(sphere, gold);
  body.scale.set(1.05, 1.15, 0.85);
  body.position.set(0, 1.8, 0);
  statue.add(body);
  const head = new THREE.Mesh(sphere, gold);
  head.scale.set(0.88, 0.82, 0.75);
  head.position.set(0, 2.9, -0.12);
  statue.add(head);
  for (const x of [-0.57, 0.57]) {
    const ear = new THREE.Mesh(cone, gold);
    ear.scale.set(0.28, 0.72, 0.28);
    ear.position.set(x, 3.55, -0.08);
    statue.add(ear);
    const eye = new THREE.Mesh(sphere, dark);
    eye.scale.set(0.1, 0.13, 0.08);
    eye.position.set(x * 0.45, 2.98, -0.8);
    statue.add(eye);
  }
  const muzzle = new THREE.Mesh(sphere, materials.statueMuzzle);
  muzzle.scale.set(0.4, 0.28, 0.23);
  muzzle.position.set(0, 2.65, -0.78);
  statue.add(muzzle);
  const nose = new THREE.Mesh(sphere, dark);
  nose.scale.set(0.11, 0.09, 0.08);
  nose.position.set(0, 2.76, -0.98);
  statue.add(nose);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.65), materials.dogeSign);
  plaque.position.set(0, 0.62, -1.63);
  statue.add(plaque);
  statue.position.set(side * (Math.abs(sidewalkX) + 2.8), 0, z);
  parent.add(statue);
}

function addAmericanRoadSign(parent, box, materials, side, z, sidewalkX) {
  addWorldStreetSign(parent, box, side * (Math.abs(sidewalkX) + 2.2), z, materials.usaRoadSign, 2.6, 0.95, materials.signPost);
}

function addHollywoodSign(parent, box, materials, side, z, sidewalkX, settings) {
  const sign = new THREE.Group();
  const [width, height] = settings.usaHollywoodSignSize;
  const postHeight = settings.usaHollywoodSignHeight;
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x75634f, roughness: 0.82 });
  for (const postX of [-width * 0.36, width * 0.36]) {
    const post = new THREE.Mesh(box, postMaterial);
    post.scale.set(0.28, postHeight, 0.28);
    post.position.set(postX, postHeight / 2, 0);
    sign.add(post);
  }
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), materials.usaHollywoodSign);
  panel.position.set(0, postHeight + height / 2, -0.12);
  panel.rotation.y = Math.PI;
  sign.add(panel);
  sign.position.set(
    side * (Math.abs(sidewalkX) + settings.sidewalkWidth / 2 + width / 2 + settings.usaSkyscraperRowOffset),
    0,
    z,
  );
  parent.add(sign);
}

function addAmericanDiner(parent, box, materials, side, z, sidewalkX) {
  const diner = new THREE.Group();
  const cream = materials.usaDinerCream;
  const red = materials.usaDinerRed;
  const body = new THREE.Mesh(box, cream);
  body.scale.set(7.2, 2.8, 5.5);
  body.position.y = 1.4;
  diner.add(body);
  const roof = new THREE.Mesh(box, red);
  roof.scale.set(7.6, 0.3, 5.8);
  roof.position.y = 2.9;
  diner.add(roof);
  for (let index = 0; index < 5; index++) {
    const stripe = new THREE.Mesh(box, index % 2 === 0 ? red : cream);
    stripe.scale.set(1.45, 0.3, 0.12);
    stripe.position.set(-2.9 + index * 1.45, 2.52, -2.84);
    diner.add(stripe);
  }
  addWorldStreetSign(diner, box, 0, -3, materials.usaDinerSign, 4.2, 1.05, materials.signPost);
  diner.position.set(side * (Math.abs(sidewalkX) + 4), 0, z);
  parent.add(diner);
}

function buildSceneryMaterials(gradientMap) {
  return {
    houseBodies: CONFIG.scenery.houseColors.map(c => toonMaterial(c, gradientMap)),
    fence: toonMaterial(CONFIG.scenery.fenceColor, gradientMap),
    door: toonMaterial(CONFIG.scenery.doorColor, gradientMap),
    window: toonMaterial(CONFIG.scenery.windowColor, gradientMap),
    roof: toonMaterial(CONFIG.scenery.fenceColor, gradientMap),
    lampPole: toonMaterial(CONFIG.scenery.lampPoleColor, gradientMap),
    lampGlass: toonMaterial(CONFIG.scenery.lampGlass, gradientMap),
    palmTrunk: toonMaterial(CONFIG.scenery.palmTrunkColor, gradientMap),
    palmLeaf: toonMaterial(CONFIG.scenery.palmLeafColor, gradientMap),
    awning: toonMaterial(CONFIG.scenery.awningColor, gradientMap),
    shopSign: toonMaterial(CONFIG.scenery.shopSignColor, gradientMap),
    posVendorRed: toonMaterial(CONFIG.scenery.posVendorRed, gradientMap),
    posVendorBlue: toonMaterial(CONFIG.scenery.posVendorBlue, gradientMap),
    posVendorGreen: toonMaterial(CONFIG.scenery.posVendorGreen, gradientMap),
    posVendorYellow: toonMaterial(CONFIG.scenery.posVendorYellow, gradientMap),
    posVendorWood: toonMaterial(CONFIG.scenery.posVendorWood, gradientMap),
    posVendorWoodLight: toonMaterial(CONFIG.scenery.posVendorWoodLight, gradientMap),
    posVendorMachine: toonMaterial(CONFIG.scenery.posVendorMachine, gradientMap),
    posVendorScreen: toonMaterial(CONFIG.scenery.posVendorScreen, gradientMap),
    posVendorStool: toonMaterial(CONFIG.scenery.posVendorStool, gradientMap),
    marketKioskWall: toonMaterial(CONFIG.scenery.marketKioskWallColor, gradientMap),
    marketKioskRoof: toonMaterial(CONFIG.scenery.marketKioskRoofColor, gradientMap),
    marketKioskSign: toonMaterial(CONFIG.scenery.marketKioskSignColor, gradientMap),
    marketWood: toonMaterial(CONFIG.scenery.marketWoodColor, gradientMap),
    marketWoodLight: toonMaterial(CONFIG.scenery.marketWoodLightColor, gradientMap),
    woodenStallAwning: toonMaterial(CONFIG.scenery.woodenStallAwningColor, gradientMap),
    marketVendorSkin: toonMaterial(CONFIG.scenery.marketVendorSkinColor, gradientMap),
    marketVendorClothes: CONFIG.scenery.marketVendorClothes.map(color => toonMaterial(color, gradientMap)),
    utilityPole: toonMaterial(CONFIG.scenery.utilityPoleColor, gradientMap),
    utilityMetal: toonMaterial(CONFIG.scenery.utilityMetalColor, gradientMap),
    utilityInsulator: toonMaterial(CONFIG.scenery.utilityInsulatorColor, gradientMap),
    streetDogCoats: CONFIG.scenery.streetDogCoatColors.map(color => toonMaterial(color, gradientMap)),
    streetDogCream: toonMaterial(CONFIG.scenery.streetDogCreamColor, gradientMap),
    streetDogNose: toonMaterial(CONFIG.scenery.streetDogNoseColor, gradientMap),
    streetDogEye: toonMaterial(CONFIG.scenery.streetDogEyeColor, gradientMap),
    streetDogCollar: toonMaterial(CONFIG.scenery.streetDogCollarColor, gradientMap),
    bird: toonMaterial(CONFIG.scenery.birdColor, gradientMap),
    birdBeak: toonMaterial(CONFIG.scenery.birdBeakColor, gradientMap),
    pedestrianSkin: toonMaterial(CONFIG.palette.dogFurBrown, gradientMap),
    pedestrianClothes: CONFIG.scenery.pedestrianColors.map(color => toonMaterial(color, gradientMap)),
  };
}

function buildSceneryGeometries() {
  const vendor = CONFIG.scenery.posVendor;
  const bird = CONFIG.scenery;
  const birdWing = new THREE.BufferGeometry();
  const wingLength = bird.birdWingLength;
  const wingDepth = bird.birdWingDepth;
  birdWing.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0,
    wingLength, wingDepth, 0,
    wingLength * bird.birdWingLowerXRatio, -wingDepth * bird.birdWingDropRatio, 0,
  ], 3));
  birdWing.computeVertexNormals();
  return {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(0.3, 0.4, 2, 8),
    vendorCylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
    dogSphere: new THREE.SphereGeometry(1, bird.streetDogGeometryWidthSegments, bird.streetDogGeometryHeightSegments),
    dogEar: new THREE.ConeGeometry(bird.streetDogEarRadius, bird.streetDogEarHeight, bird.streetDogEarSegments),
    birdWing,
    birdBody: new THREE.SphereGeometry(1, bird.birdGeometryWidthSegments, bird.birdGeometryHeightSegments),
    birdBeak: new THREE.ConeGeometry(bird.birdBeakRadius, bird.birdBeakHeight, bird.birdBeakSegments),
    cone: new THREE.ConeGeometry(0.8, 1.2, 8),
    sphere: new THREE.SphereGeometry(CONFIG.scenery.simpleSphereRadius, CONFIG.scenery.simpleSphereSegments, CONFIG.scenery.simpleSphereSegments),
    umbrella: new THREE.ConeGeometry(0.62, 0.24, 12),
    umbrellaShaft: new THREE.CylinderGeometry(0.025, 0.025, 0.85, 6),
    posParasolPanels: Array.from({ length: vendor.parasolSegments }, (_, index) => new THREE.CylinderGeometry(
      0.06,
      vendor.parasolRadius,
      vendor.parasolHeight,
      1,
      1,
      false,
      (index / vendor.parasolSegments) * Math.PI * 2,
      (Math.PI * 2) / vendor.parasolSegments,
    )),
  };
}

function randomSceneryType() {
  const chance = Math.random();
  if (chance < CONFIG.scenery.pedestrianChance) return 7;
  if (chance < CONFIG.scenery.pedestrianChance + CONFIG.scenery.pedestrianShopChance) return 8;
  if (chance < CONFIG.scenery.pedestrianChance + CONFIG.scenery.pedestrianShopChance + CONFIG.scenery.posVendorChance) return 9;
  return Math.floor(Math.random() * 7);
}

function randomSceneryX() {
  if (Math.random() < 0.5) {
    return LEFT_SCENERY_X + (Math.random() - 0.5) * 1.2;
  }
  return RIGHT_SCENERY_X + (Math.random() - 0.5) * 1.2;
}

function sceneryXFor(type, side) {
  if (type === 4) return side * CONFIG.scenery.streetlightOffsetX;
  if (type === 7 || type === 8 || type === 9) {
    return side * CITY.sidewalkCenterX + (Math.random() - 0.5) * CONFIG.scenery.sidewalkCrowdSpread;
  }
  return randomSceneryX();
}

function createStreetDog(materials, geometries, side) {
  const dog = new THREE.Group();
  const shape = CONFIG.scenery.streetDog;
  const fur = materials.streetDogCoats[Math.floor(Math.random() * materials.streetDogCoats.length)];
  const addSphere = (material, position, scale) => {
    const mesh = new THREE.Mesh(geometries.dogSphere, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    dog.add(mesh);
    return mesh;
  };

  // Layered torso, chest, head, muzzle, eyes, ears, and collar give the sidewalk dogs a clear silhouette.
  addSphere(fur, shape.bodyPosition, shape.bodyScale);
  addSphere(materials.streetDogCream, shape.chestPosition, shape.chestScale);
  addSphere(fur, shape.headPosition, shape.headScale);
  addSphere(materials.streetDogCream, shape.muzzlePosition, shape.muzzleScale);
  addSphere(materials.streetDogNose, shape.nosePosition, shape.noseScale);
  for (const eyeSide of [-1, 1]) {
    addSphere(materials.streetDogEye, [shape.eyeX, shape.eyeY, eyeSide * shape.eyeZ], CONFIG.scenery.streetDogEyeScale);
    const ear = new THREE.Mesh(geometries.dogEar, fur);
    ear.position.set(shape.earX, shape.earY, eyeSide * shape.earZ);
    ear.rotation.z = CONFIG.scenery.streetDogEarRotation * eyeSide;
    ear.castShadow = true;
    dog.add(ear);
  }

  const collar = new THREE.Mesh(geometries.box, materials.streetDogCollar);
  collar.position.set(...shape.collarPosition);
  collar.scale.set(...shape.collarScale);
  collar.castShadow = true;
  dog.add(collar);

  for (const x of shape.legX) {
    for (const z of shape.legZ) {
      const leg = new THREE.Mesh(geometries.vendorCylinder, fur);
      leg.position.set(x, shape.legY, z);
      leg.scale.set(shape.legRadius, shape.legHeight, shape.legRadius);
      leg.castShadow = true;
      dog.add(leg);
      addSphere(materials.streetDogCream, [x + CONFIG.scenery.streetDogFootOffsetX, shape.footY, z], shape.footScale);
    }
  }

  const tail = new THREE.Mesh(geometries.vendorCylinder, fur);
  tail.position.set(...shape.tailPosition);
  tail.scale.set(shape.tailRadius, shape.tailLength, shape.tailRadius);
  tail.rotation.z = CONFIG.scenery.streetDogTailAngle;
  tail.castShadow = true;
  dog.add(tail);

  // Face toward the road on either verge.
  dog.rotation.y = side > 0 ? Math.PI : 0;
  return dog;
}

function createBirdFlock(materials, geometries) {
  const flock = new THREE.Group();
  flock.userData.isBirdFlock = true;
  flock.userData.birdPhase = Math.random() * Math.PI * 2;
  flock.userData.flightDistance = 0;
  flock.userData.birds = [];

  for (let index = 0; index < CONFIG.scenery.birdCountPerFlock; index++) {
    const bird = new THREE.Group();
    const baseX = (index - (CONFIG.scenery.birdCountPerFlock - 1) / 2) * CONFIG.scenery.birdSpacingX;
    const baseY = (Math.random() - 0.5) * CONFIG.scenery.birdVerticalSpread;
    const baseZ = (index - (CONFIG.scenery.birdCountPerFlock - 1) / 2) * CONFIG.scenery.birdSpacingZ;

    const body = new THREE.Mesh(geometries.birdBody, materials.bird);
    body.scale.set(...CONFIG.scenery.birdBodyScale);
    bird.add(body);
    const head = new THREE.Mesh(geometries.birdBody, materials.bird);
    head.position.set(...CONFIG.scenery.birdHeadPosition);
    head.scale.set(...CONFIG.scenery.birdHeadScale);
    bird.add(head);
    const beak = new THREE.Mesh(geometries.birdBeak, materials.birdBeak);
    beak.position.set(...CONFIG.scenery.birdBeakPosition);
    beak.rotation.x = CONFIG.scenery.birdBeakRotationX;
    bird.add(beak);

    const wings = [];
    for (const wingSide of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.x = wingSide * CONFIG.scenery.birdWingRootOffset;
      const wing = new THREE.Mesh(geometries.birdWing, materials.bird);
      wing.scale.x = wingSide;
      wing.castShadow = true;
      pivot.add(wing);
      bird.add(pivot);
      wings.push({ pivot, side: wingSide });
    }

    bird.position.set(baseX, baseY, baseZ);
    flock.add(bird);
    flock.userData.birds.push({ bird, wings, baseX, baseY, phase: Math.random() * Math.PI * 2 });
  }

  return flock;
}

function updateBirdFlock(flock, travelled) {
  flock.userData.flightDistance += travelled;
  const flightDistance = flock.userData.flightDistance;
  for (const birdData of flock.userData.birds) {
    const phase = flightDistance * CONFIG.scenery.birdFlapRate + birdData.phase + flock.userData.birdPhase;
    birdData.bird.position.x = birdData.baseX
      + Math.sin(flightDistance * CONFIG.scenery.birdDriftRate + birdData.phase) * CONFIG.scenery.birdDriftX;
    birdData.bird.position.y = birdData.baseY + Math.sin(phase) * CONFIG.scenery.birdBobY;
    for (const wing of birdData.wings) {
      wing.pivot.rotation.z = wing.side * Math.sin(phase) * CONFIG.scenery.birdFlapAngle;
    }
  }
}

function createMarketVendor(materials, geometries, sitting, rng) {
  const vendor = new THREE.Group();
  const config = CONFIG.scenery;
  const box = geometries.box;
  const cylinder = geometries.vendorCylinder;
  const headScale = config.marketVendorHeadRadius / config.simpleSphereRadius;
  const clothes = materials.marketVendorClothes[Math.floor(rng() * materials.marketVendorClothes.length)];
  const torsoY = sitting ? config.marketVendorSittingTorsoY : config.marketVendorStandingTorsoY;
  const torso = new THREE.Mesh(box, clothes);
  torso.scale.set(...config.marketVendorTorsoSize);
  torso.position.y = torsoY;
  torso.castShadow = true;
  vendor.add(torso);

  const head = new THREE.Mesh(geometries.sphere, materials.marketVendorSkin);
  head.scale.set(headScale, headScale * config.marketVendorHeadStretchY, headScale);
  head.position.y = torsoY + config.marketVendorHeadHeight;
  head.castShadow = true;
  vendor.add(head);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(cylinder, materials.marketVendorClothes[0]);
    leg.scale.set(
      config.marketVendorLegRadius,
      sitting ? config.marketVendorLegLength * config.marketVendorSittingLegScale : config.marketVendorLegLength,
      config.marketVendorLegRadius,
    );
    leg.position.set(
      side * config.marketVendorLegOffsetX,
      sitting ? config.marketVendorSittingLegY : config.marketVendorLegLength / 2,
      sitting ? config.marketVendorSittingLegZ : 0,
    );
    if (sitting) leg.rotation.x = Math.PI / 2;
    leg.castShadow = true;
    vendor.add(leg);

    const arm = new THREE.Mesh(cylinder, materials.marketVendorSkin);
    arm.scale.set(config.marketVendorArmRadius, config.marketVendorArmLength, config.marketVendorArmRadius);
    arm.position.set(
      side * config.marketVendorArmOffsetX,
      torsoY + config.marketVendorArmOffsetY,
      config.marketVendorArmOffsetZ,
    );
    arm.rotation.z = side * -config.marketVendorArmAngle;
    arm.castShadow = true;
    vendor.add(arm);
  }

  if (sitting) {
    const seat = new THREE.Mesh(box, materials.posVendorStool);
    seat.scale.set(...config.marketVendorSeatSize);
    seat.position.set(...config.marketVendorSeatPosition);
    vendor.add(seat);
  }
  return vendor;
}

function createMarketKiosk(materials, geometries, config, side) {
  const kiosk = new THREE.Group();
  const [width, height, depth] = config.marketKioskSize;
  const addBox = (material, position, size) => {
    const mesh = new THREE.Mesh(geometries.box, material);
    mesh.position.set(...position);
    mesh.scale.set(...size);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    kiosk.add(mesh);
    return mesh;
  };

  addBox(materials.marketKioskWall, [0, height / 2, 0], [width, height, config.marketKioskWallThickness]);
  addBox(materials.marketKioskWall, [-width / 2, height / 2, 0], [config.marketKioskWallThickness, height, depth]);
  addBox(materials.marketKioskWall, [width / 2, height / 2, 0], [config.marketKioskWallThickness, height, depth]);
  addBox(materials.marketKioskRoof, [0, height + config.marketKioskRoofThickness / 2, 0], [
    width + config.marketKioskRoofOverhang,
    config.marketKioskRoofThickness,
    depth + config.marketKioskRoofOverhang,
  ]);
  addBox(materials.marketKioskSign,
    [-side * (width / 2 + config.marketKioskSignOffset), height * config.marketKioskSignHeightRatio, 0],
    [config.marketKioskWallThickness * config.marketKioskSignThicknessRatio, config.marketKioskSignHeight, depth * config.marketKioskSignWidthRatio]);
  for (let index = 0; index < config.marketKioskRibCount; index++) {
    const ribZ = -depth / 2 + (index + 0.5) * depth / config.marketKioskRibCount;
    addBox(materials.utilityMetal,
      [-side * (width / 2 + config.marketKioskRibOffset), height / 2, ribZ],
      [config.marketKioskRibThickness, height * config.marketKioskRibHeightRatio, config.marketKioskRibDepth]);
  }
  return kiosk;
}

function createWoodenMarketStall(materials, geometries, config) {
  const stall = new THREE.Group();
  const [width, height, depth] = config.woodenStallSize;
  const [postWidth, postHeight, postDepth] = config.woodenStallPostSize;
  const addPart = (material, position, size) => {
    const mesh = new THREE.Mesh(geometries.box, material);
    mesh.position.set(...position);
    mesh.scale.set(...size);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    stall.add(mesh);
  };

  addPart(materials.marketWood, [0, config.woodenStallCounterHeight / 2, depth / 2],
    [width, config.woodenStallCounterHeight, 0.1]);
  addPart(materials.marketWoodLight, [0, config.woodenStallCounterHeight, -depth / 4], config.woodenStallCounterSize);
  for (const xSide of [-1, 1]) {
    for (const zSide of [-1, 1]) {
      addPart(materials.marketWood, [xSide * (width / 2 - postWidth / 2), postHeight / 2, zSide * (depth / 2 - postDepth / 2)],
        [postWidth, postHeight, postDepth]);
    }
  }
  addPart(materials.woodenStallAwning, [0, config.woodenStallRoofHeight, 0], config.woodenStallRoofSize);
  return stall;
}

function buildUtilityCorridor(materials) {
  const config = CONFIG.scenery;
  const group = new THREE.Group();
  group.userData.isManagedUtilityGroup = true;
  const count = Math.ceil(SCENERY_WRAP_DISTANCE / config.utilitySpacing);
  const wrapDistance = count * config.utilitySpacing;
  const poleGeometry = new THREE.CylinderGeometry(1, 1, 1, config.utilityPoleSegments);
  const crossarmGeometry = new THREE.BoxGeometry(1, 1, 1);
  const insulatorGeometry = new THREE.CylinderGeometry(1, 1, 1, config.utilityInsulatorSegments);
  const wireGeometries = config.utilityWireHeights.map((height) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, height, 0),
      new THREE.Vector3(0, height - config.utilityWireSag, config.utilitySpacing / 2),
      new THREE.Vector3(0, height, config.utilitySpacing),
    ]);
    return new THREE.TubeGeometry(
      curve,
      config.utilityWireSegments,
      config.utilityWireRadius,
      config.utilityWireRadialSegments,
      false,
    );
  });
  const segments = [];

  for (let index = 0; index < count; index++) {
    const segment = new THREE.Group();
    segment.position.z = SCENERY_RECYCLE_Z + config.poolStartOffset + index * config.utilitySpacing;
    for (const side of [-1, 1]) {
      const poleRow = new THREE.Group();
      poleRow.position.x = side * config.utilityPoleOffsetX;
      const pole = new THREE.Mesh(poleGeometry, materials.utilityPole);
      pole.scale.set(config.utilityPoleRadius, config.utilityPoleHeight, config.utilityPoleRadius);
      pole.position.y = config.utilityPoleHeight / 2;
      pole.castShadow = true;
      poleRow.add(pole);

      const crossarm = new THREE.Mesh(crossarmGeometry, materials.utilityMetal);
      crossarm.scale.set(config.utilityCrossarmWidth, config.utilityCrossarmHeight, config.utilityCrossarmHeight);
      crossarm.position.y = config.utilityPoleHeight - config.utilityCrossarmHeight;
      poleRow.add(crossarm);

      for (let wireIndex = 0; wireIndex < config.utilityWireHeights.length; wireIndex++) {
        const insulator = new THREE.Mesh(insulatorGeometry, materials.utilityInsulator);
        insulator.scale.set(...config.utilityInsulatorScale);
        insulator.position.set(
          (wireIndex - (config.utilityWireHeights.length - 1) / 2) * config.utilityCrossarmWidth * config.utilityWireLateralSpacingRatio,
          config.utilityWireHeights[wireIndex] + config.utilityInsulatorOffsetY,
          0,
        );
        poleRow.add(insulator);

        const wire = new THREE.Mesh(wireGeometries[wireIndex], materials.utilityMetal);
        wire.position.x = insulator.position.x;
        poleRow.add(wire);
      }
      segment.add(poleRow);
    }
    group.add(segment);
    segments.push(segment);
  }

  return { group, segments, wrapDistance };
}

function batchMarketStalls(group, placements) {
  const batchesByKey = new Map();
  const instancesByStand = placements.map(() => []);
  const inverseStandMatrix = new THREE.Matrix4();
  const initialStandMatrix = new THREE.Matrix4();

  placements.forEach((placement, standIndex) => {
    const stand = group.children[standIndex];
    stand.updateMatrixWorld(true);
    inverseStandMatrix.copy(stand.matrixWorld).invert();
    stand.traverse((object) => {
      if (!object.isMesh || Array.isArray(object.material)) return;
      const key = `${object.geometry.uuid}/${object.material.uuid}`;
      let bucket = batchesByKey.get(key);
      if (!bucket) {
        bucket = { geometry: object.geometry, material: object.material, items: [], castShadow: object.castShadow, receiveShadow: object.receiveShadow };
        batchesByKey.set(key, bucket);
      }
      const localMatrix = inverseStandMatrix.clone().multiply(object.matrixWorld);
      bucket.items.push({ standIndex, localMatrix });
    });
  });

  const batches = [];
  group.clear();
  for (const bucket of batchesByKey.values()) {
    const mesh = new THREE.InstancedMesh(bucket.geometry, bucket.material, bucket.items.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = bucket.castShadow;
    mesh.receiveShadow = bucket.receiveShadow;
    bucket.items.forEach((item, instanceIndex) => {
      const placement = placements[item.standIndex];
      initialStandMatrix.compose(
        new THREE.Vector3(placement.x, 0, placement.z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), placement.rotationY),
        new THREE.Vector3(placement.scale, placement.scale, placement.scale),
      );
      mesh.setMatrixAt(instanceIndex, initialStandMatrix.clone().multiply(item.localMatrix));
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    batches.push({ mesh, items: bucket.items });
    bucket.items.forEach((item, instanceIndex) => {
      instancesByStand[item.standIndex].push({ mesh, instanceIndex });
    });
  }

  return { batches, instancesByStand };
}

function shiftMarketStandInstances(pool, standIndex, zShift) {
  for (const instance of pool.marketInstancesByStand[standIndex]) {
    instance.mesh.getMatrixAt(instance.instanceIndex, marketInstanceMatrix);
    marketInstanceMatrix.elements[14] += zShift;
    instance.mesh.setMatrixAt(instance.instanceIndex, marketInstanceMatrix);
    instance.mesh.instanceMatrix.needsUpdate = true;
  }
}

const marketInstanceMatrix = new THREE.Matrix4();

function buildSceneryVariation(type, materials, geometries, side = 1, marketTheme = null) {
  const holder = new THREE.Group();
  const { box, cylinder, vendorCylinder, cone, sphere, umbrella, umbrellaShaft, posParasolPanels } = geometries;
  const bodyMat = materials.houseBodies[Math.floor(Math.random() * materials.houseBodies.length)];

  switch (type) {
    case 0: { // Flat-roof house: door, two windows, optional water tank
      const w = 1.8 + Math.random() * 0.8;
      const h = 2 + Math.random();
      const d = 2.5 + Math.random() * 0.8;
      const body = new THREE.Mesh(box, bodyMat);
      body.scale.set(w, h, d);
      body.position.y = h / 2;
      holder.add(body);

      const door = new THREE.Mesh(box, materials.door);
      door.scale.set(0.5, 0.8, 0.08);
      door.position.set(0, 0.7, -d / 2 - 0.05);
      holder.add(door);

      const winZ = -d / 2 - 0.05;
      const winY = h * 0.6;
      const win1 = new THREE.Mesh(box, materials.window);
      win1.scale.set(0.45, 0.5, 0.08);
      win1.position.set(-w * 0.3, winY, winZ);
      holder.add(win1);

      const win2 = win1.clone();
      win2.position.set(w * 0.3, winY, winZ);
      holder.add(win2);

      if (Math.random() < 0.3) {
        const tank = new THREE.Mesh(cylinder, bodyMat);
        tank.scale.set(0.8, 0.8, 0.6);
        tank.position.y = h + 0.4;
        holder.add(tank);
      }
      break;
    }

    case 1: { // House with front fence
      const w = 1.4, h = 2, d = 2;
      const body = new THREE.Mesh(box, bodyMat);
      body.scale.set(w, h, d);
      body.position.y = h / 2;
      holder.add(body);
      const roof = new THREE.Mesh(box, materials.roof);
      roof.scale.set(w + 0.16, 0.12, d + 0.16);
      roof.position.y = h + 0.06;
      holder.add(roof);

      const door = new THREE.Mesh(box, materials.door);
      door.scale.set(0.4, 0.7, 0.08);
      door.position.set(0, 0.6, -d / 2 - 0.05);
      holder.add(door);

      for (let i = 0; i < 5; i++) {
        const picket = new THREE.Mesh(box, materials.fence);
        picket.scale.set(0.15, 0.6, 0.05);
        picket.position.set(-w / 2 - 0.6 + i * 0.3, 0.3, -d / 2 - 0.2);
        holder.add(picket);
      }
      break;
    }

    case 2: { // House with front wall
      const w = 2, h = 2.5, d = 2.5;
      const body = new THREE.Mesh(box, bodyMat);
      body.scale.set(w, h, d);
      body.position.y = h / 2;
      holder.add(body);
      const roof = new THREE.Mesh(box, materials.roof);
      roof.scale.set(w + 0.18, 0.14, d + 0.18);
      roof.position.y = h + 0.07;
      holder.add(roof);

      const door = new THREE.Mesh(box, materials.door);
      door.scale.set(0.5, 0.8, 0.08);
      door.position.set(-0.4, 0.7, -d / 2 - 0.05);
      holder.add(door);

      const wall = new THREE.Mesh(box, materials.fence);
      wall.scale.set(3, 0.5, 0.3);
      wall.position.set(0, 0.25, -d / 2 - 0.15);
      holder.add(wall);
      break;
    }

    case 3: { // Palm tree
      const trunkH = 2 + Math.random() * 0.8;
      const trunk = new THREE.Mesh(cylinder, materials.palmTrunk);
      trunk.scale.set(0.25, trunkH / 2, 0.25);
      trunk.position.y = trunkH / 2;
      holder.add(trunk);

      const leafH = 1.2 * 1.3;
      for (let i = 0; i < 3; i++) {
        const leaf = new THREE.Mesh(cone, materials.palmLeaf);
        leaf.scale.set(0.9, 1.3, 0.9);
        leaf.position.y = trunkH + leafH / 2;
        leaf.rotation.z = -Math.PI / 2;
        leaf.rotation.y = (i * Math.PI * 2) / 3;
        holder.add(leaf);
      }
      break;
    }

    case 4: { // Street lamp
      const poleH = 3 + Math.random() * 0.5;
      const pole = new THREE.Mesh(cylinder, materials.lampPole);
      pole.scale.set(0.15, poleH / 2, 0.15);
      pole.position.y = poleH / 2;
      holder.add(pole);

      const arm = new THREE.Mesh(box, materials.lampPole);
      arm.scale.set(0.8, 0.15, 0.15);
      arm.position.set(-side * 0.4, poleH - 0.3, 0);
      holder.add(arm);

      const lamp = new THREE.Mesh(sphere, materials.lampGlass);
      lamp.scale.set(0.4, 0.4, 0.4);
      lamp.position.set(-side * 1.0, poleH - 0.3, 0);
      const pointLight = new THREE.PointLight(
        CONFIG.scenery.streetlightColor,
        CONFIG.scenery.streetlightDayIntensity,
        CONFIG.scenery.streetlightDistance,
        CONFIG.scenery.streetlightDecay,
      );
      // Keep the real light directly under its lamp head so pooling removes it with the prop.
      pointLight.position.y = CONFIG.scenery.streetlightHeadOffsetY;
      lamp.add(pointLight);
      holder.add(lamp);
      holder.userData.streetLight = pointLight;
      break;
    }

    case 5: { // Shop stall with awning
      const w = 1.4, h = 1.8, d = 1.4;
      const body = new THREE.Mesh(box, bodyMat);
      body.scale.set(w, h, d);
      body.position.y = h / 2;
      holder.add(body);
      const roof = new THREE.Mesh(box, materials.roof);
      roof.scale.set(w + 0.14, 0.12, d + 0.14);
      roof.position.y = h + 0.06;
      holder.add(roof);

      const awning = new THREE.Mesh(box, materials.awning);
      awning.scale.set(w + 0.4, 0.2, d + 0.4);
      awning.position.y = h + 0.1;
      holder.add(awning);
      break;
    }

    case 6: { // Compact house: single door, single window
      const w = 1.2, h = 1.8, d = 1.5;
      const body = new THREE.Mesh(box, bodyMat);
      body.scale.set(w, h, d);
      body.position.y = h / 2;
      holder.add(body);

      const door = new THREE.Mesh(box, materials.door);
      door.scale.set(0.4, 0.6, 0.08);
      door.position.set(-0.25, 0.5, -d / 2 - 0.05);
      holder.add(door);

      const win = new THREE.Mesh(box, materials.window);
      win.scale.set(0.4, 0.4, 0.08);
      win.position.set(0.35, h * 0.6, -d / 2 - 0.05);
      holder.add(win);
      break;
    }

    case 7: { // Small groups of residents and shop workers on the pavement
      const count = 1 + Math.floor(Math.random() * CONFIG.scenery.pedestrianGroupMax);
      const groupSpacing = CONFIG.scenery.pedestrianGroupSpacing;
      const dogOwner = Math.random() < CONFIG.scenery.pedestrianDogChance
        ? Math.floor(Math.random() * count)
        : -1;
      for (let index = 0; index < count; index++) {
        const person = new THREE.Group();
        person.position.x = (index - (count - 1) / 2) * groupSpacing;
        holder.add(person);

        const shirtMaterial = materials.pedestrianClothes[Math.floor(Math.random() * materials.pedestrianClothes.length)];
        const shirt = new THREE.Mesh(box, shirtMaterial);
        shirt.scale.set(0.42, 0.62, 0.28);
        shirt.position.y = 1.05;
        person.add(shirt);

        const head = new THREE.Mesh(sphere, materials.pedestrianSkin);
        head.scale.set(1.35, 1.55, 1.25);
        head.position.y = 1.62;
        person.add(head);
        const hair = new THREE.Mesh(sphere, materials.door);
        hair.scale.set(1.32, 0.48, 1.25);
        hair.position.set(0, 1.82, 0.015);
        person.add(hair);

        for (const sideOfBody of [-1, 1]) {
          const leg = new THREE.Mesh(box, materials.door);
          leg.scale.set(0.13, 0.5, 0.16);
          leg.position.set(sideOfBody * 0.12, 0.31, sideOfBody * 0.04);
          person.add(leg);

          const arm = new THREE.Mesh(box, materials.pedestrianSkin);
          arm.scale.set(0.12, 0.52, 0.14);
          arm.position.set(sideOfBody * 0.29, 1.04, 0);
          arm.rotation.z = -sideOfBody * 0.12;
          person.add(arm);
        }

        if (Math.random() < CONFIG.scenery.umbrellaChance) {
          const canopy = new THREE.Mesh(umbrella, shirtMaterial);
          canopy.position.set(0.12, 2.48, 0.04);
          person.add(canopy);
          const shaft = new THREE.Mesh(umbrellaShaft, materials.lampPole);
          shaft.position.set(0.12, 2.02, 0.04);
          person.add(shaft);
          person.userData.hasUmbrella = true;
        }

        if (index === dogOwner) {
          const dog = createStreetDog(materials, geometries, side);
          dog.position.set(
            side > 0 ? -CONFIG.scenery.streetDog.companionOffsetX : CONFIG.scenery.streetDog.companionOffsetX,
            0,
            CONFIG.scenery.streetDog.companionOffsetZ,
          );
          person.add(dog);
        }
      }
      break;
    }

    case 8: { // A corner shop with a bright sign and awning
      const w = 2.1, h = 2.2, d = 2;
      const body = new THREE.Mesh(box, bodyMat);
      body.scale.set(w, h, d);
      body.position.y = h / 2;
      holder.add(body);
      const shopFront = new THREE.Mesh(box, materials.window);
      shopFront.scale.set(1.35, 0.8, 0.08);
      shopFront.position.set(0, 1.2, -d / 2 - 0.05);
      holder.add(shopFront);
      const sign = new THREE.Mesh(box, materials.shopSign);
      sign.scale.set(1.6, 0.38, 0.12);
      sign.position.set(0, h - 0.28, -d / 2 - 0.08);
      holder.add(sign);
      const awning = new THREE.Mesh(box, materials.awning);
      awning.scale.set(w + 0.4, 0.22, 0.75);
      awning.position.set(0, h - 0.65, -d / 2 - 0.3);
      holder.add(awning);
      break;
    }

    case 9: { // Roadside POS recharge-card vendor stand
      const vendor = CONFIG.scenery.posVendor;
      const addPart = (geometry, material, position, scale = null) => {
        const part = new THREE.Mesh(geometry, material);
        part.position.set(...position);
        if (scale) part.scale.set(...scale);
        part.castShadow = true;
        part.receiveShadow = true;
        holder.add(part);
        return part;
      };

      const tableTopY = vendor.tableTopY;
      const legHeight = tableTopY - vendor.tableThickness / 2;
      addPart(box, materials.posVendorWoodLight, [0, tableTopY, 0], [vendor.tableWidth, vendor.tableThickness, vendor.tableDepth]);
      for (const xSign of [-1, 1]) {
        for (const zSign of [-1, 1]) {
          addPart(box, materials.posVendorWood, [xSign * vendor.tableLegX, legHeight / 2, zSign * vendor.tableLegZ],
            [vendor.tableLegSize, legHeight, vendor.tableLegSize]);
        }
      }
      addPart(box, materials.posVendorWood, [0, vendor.tableBraceY, vendor.tableLegZ], [vendor.tableBraceWidth, vendor.tableThickness * 0.8, vendor.tableThickness * 0.8]);

      // Thin center pole and alternating red/yellow low-poly canopy wedges.
      const pole = addPart(vendorCylinder, materials.posVendorWood, [0, tableTopY + vendor.poleHeight / 2, 0]);
      pole.scale.set(vendor.poleRadius, vendor.poleHeight, vendor.poleRadius);
      const canopyY = tableTopY + vendor.poleHeight;
      const themeMaterials = marketTheme
        ? marketTheme.map((color) => color === CONFIG.scenery.posVendorYellow
          ? materials.posVendorYellow
          : color === CONFIG.scenery.posVendorBlue
            ? materials.posVendorBlue
            : color === CONFIG.scenery.posVendorGreen
              ? materials.posVendorGreen
              : materials.posVendorRed)
        : [materials.posVendorRed, materials.posVendorYellow];
      posParasolPanels.forEach((geometry, index) => {
        addPart(geometry, themeMaterials[index % themeMaterials.length], [0, canopyY, 0]);
      });

      // Compact terminal, screen, keypad, and a small stack of recharge cards.
      const machine = vendor.machinePosition;
      addPart(box, materials.posVendorMachine, [machine[0], tableTopY + machine[1], machine[2]], vendor.machineSize);
      addPart(box, materials.posVendorScreen,
        [machine[0] + vendor.screenOffset[0], tableTopY + machine[1] + vendor.screenOffset[1], machine[2] + vendor.screenOffset[2]], vendor.screenSize);
      addPart(box, materials.posVendorWoodLight,
        [machine[0] + vendor.keypadOffset[0], tableTopY + machine[1] + vendor.keypadOffset[1], machine[2] + vendor.keypadOffset[2]], vendor.keypadSize);
      for (let card = 0; card < vendor.cardCount; card++) {
        addPart(box, card % 2 ? materials.posVendorYellow : materials.shopSign,
          [vendor.cardPosition[0], tableTopY + vendor.cardPosition[1] + card * vendor.cardStepY, vendor.cardPosition[2]], vendor.cardSize);
      }

      // Bright plastic stool beside the table.
      const stoolX = vendor.stoolOffsetX;
      addPart(vendorCylinder, materials.posVendorStool, [stoolX, vendor.stoolSeatY, 0], vendor.stoolSeatSize);
      for (const xOffset of vendor.stoolLegOffsets) {
        for (const zOffset of vendor.stoolLegOffsets) {
          addPart(box, materials.posVendorStool, [stoolX + xOffset, vendor.stoolLegY, zOffset], vendor.stoolLegSize);
        }
      }
      break;
    }
  }

  return holder;
}

function updateScenery(pool, travelled) {
  for (const child of pool.group.children) {
    if (child.userData.isManagedMarketGroup || child.userData.isManagedUtilityGroup) continue;
    child.position.z -= travelled;

    if (child.userData.isBirdFlock) {
      updateBirdFlock(child, travelled);
      wrapZ(child, SCENERY_RECYCLE_Z, SCENERY_WRAP_DISTANCE);
      continue;
    }

    if (child.position.z < SCENERY_RECYCLE_Z
      || child.position.z > SCENERY_RECYCLE_Z + SCENERY_WRAP_DISTANCE) {
      wrapZ(child, SCENERY_RECYCLE_Z, SCENERY_WRAP_DISTANCE);
    }
  }

  pool.marketGroup.position.z -= travelled;
  for (let index = 0; index < pool.marketStalls.length; index++) {
    const stall = pool.marketStalls[index];
    stall.z -= travelled;
    let zShift = 0;
    while (stall.z < SCENERY_RECYCLE_Z) {
      stall.z += pool.marketWrapDistance;
      zShift += pool.marketWrapDistance;
    }
    while (stall.z > SCENERY_RECYCLE_Z + pool.marketWrapDistance) {
      stall.z -= pool.marketWrapDistance;
      zShift -= pool.marketWrapDistance;
    }
    if (zShift !== 0) shiftMarketStandInstances(pool, index, zShift);
  }
  for (const segment of pool.utilitySegments) {
    segment.position.z -= travelled;
    wrapZ(segment, SCENERY_RECYCLE_Z, pool.utilityWrapDistance);
  }
}
