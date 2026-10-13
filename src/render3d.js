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

  const gradientMap = makeToonGradient();
  const road = buildRoad(gradientMap);
  const van = buildVan();
  const shieldBubble = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 14),
    new THREE.MeshStandardMaterial({
      color: CONFIG.powerups.shieldColor,
      emissive: CONFIG.powerups.shieldColor,
      emissiveIntensity: 0.28,
      transparent: true,
      opacity: CONFIG.powerups.shieldBubbleOpacity,
      roughness: 0.2,
      metalness: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
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
  const scenery = buildScenery(gradientMap);
  const buildings = createBuildingSpawner(scene);
  scene.add(road.group, van.group, carPool.group, dogPool.group, bonePool.group, coinPool.group, powerupPool.group, obstaclePool.group, stopZones.group, scenery.group);

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

  return {
    resize(cssWidth, cssHeight, dpr) {
      try {
        renderer.setPixelRatio(Math.min(dpr, CONFIG.render.maxPixelRatio));
        renderer.setSize(cssWidth, cssHeight, false);
        camera.aspect = cssWidth / cssHeight;
        camera.updateProjectionMatrix();
      } catch (e) {
        console.error('resize error:', e);
      }
    },

    render(game, dt, field, dogs, time, pickups = null, obstacles = null) {
      try {
        const travelled = game.vanSpeed * dt * PX_TO_WORLD;

        updateRoad(road, travelled);
        updateVan(van, game, dt);
        shieldBubble.visible = game.shieldTimer > 0;
        if (shieldBubble.visible) {
          shieldBubble.material.opacity = CONFIG.powerups.shieldBubbleOpacity
            * (0.88 + Math.sin(time * CONFIG.bones.bobFrequency) * 0.12);
        }
        van.smokeEmitter.setEnabled(game.van.damageStage >= 2);
        van.fireEmitter.setEnabled(game.van.damageStage >= 2);
        van.smokeEmitter.update(dt);
        van.fireEmitter.update(dt);

        if (field) updateCarMeshes(carPool, field.cars, dt);
        if (dogs) updateDogMeshes(dogPool, dogs.dogs, time, dt);
        if (pickups) {
          updateBoneMeshes(bonePool, pickups.bones, time);
          updateCoinMeshes(coinPool, pickups.coins, time);
          updatePowerupMeshes(powerupPool, pickups.powerups, time);
        }
        if (obstacles) updateObstacleMeshes(obstaclePool, obstacles.obstacles);
        updateStopZoneMeshes(stopZones, game);
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
          van.group.position.z + CAMERA.lookAheadDistance,
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

  return { group, lanes, brtBarriers, busStopHatches, gantry };
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

  const labels = ['LAGOS', 'BRT LANE', 'MAINLAND'];
  const laneWidth = ROAD_WIDTH_PX * PX_TO_WORLD / LANE_COUNT;
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const laneCenterX = -ROAD_HALF_WORLD + laneWidth * (lane + 0.5);
    const sign = new THREE.Group();
    const backing = new THREE.Mesh(frameGeometry, metal);
    backing.scale.set(paint.gantrySignWidth, paint.gantrySignHeight, paint.gantrySignDepth);
    backing.position.y = paint.gantrySignY;
    backing.castShadow = true;
    sign.add(backing);

    const texture = createSignTexture(labels[lane]);
    const faceMaterial = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
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
  return { group };
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

function createSignTexture(text) {
  const paint = ROAD_VISUAL;
  const canvas = document.createElement('canvas');
  canvas.width = paint.gantryLabelCanvasWidth;
  canvas.height = paint.gantryLabelCanvasHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = `#${paint.gantrySignColor.toString(16).padStart(6, '0')}`;
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
const DOG_POOL_SIZE = CONFIG.stops.visibleZoneCount * CONFIG.dogs.perStopMax;

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
  stylized.group.userData.type = type;
  return stylized;
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

  const rimMaterial = new THREE.MeshStandardMaterial({ color: visual.tankerRimColor, metalness: visual.rimMetalness, roughness: visual.rimRoughness });
  for (const offset of visual.tankerRimOffsets) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * visual.tankerRimRadiusRatio, radius * visual.tankerRimTubeRatio, visual.tankerRimRadialSegments, visual.tankerRimTubularSegments), rimMaterial);
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
  for (let i = 0; i < DOG_POOL_SIZE; i++) {
    const holder = new THREE.Group();
    const fallback = createFallbackDog();
    holder.add(fallback.group);
    holder.visible = false;
    group.add(holder);
    meshes.push({ holder, fallback, instance: null, color: null });
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

    const sparkMaterial = new THREE.PointsMaterial({
      color: 0xffdf72,
      size: config.sparkSize,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const spark = new THREE.Points(sparkGeometry, sparkMaterial);
    spark.visible = false;
    holder.add(bone, spark);
    holder.visible = false;
    group.add(holder);
    views.push({ holder, bone, spark, id: null });
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
  const geometry = new THREE.CylinderGeometry(settings.radius, settings.radius, settings.depth, 20);
  const material = new THREE.MeshStandardMaterial({ color: settings.color, roughness: 0.3, metalness: 0.55 });
  for (let index = 0; index < settings.poolSize; index++) {
    const holder = new THREE.Group();
    const coin = new THREE.Mesh(geometry, material);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    coin.receiveShadow = true;
    holder.add(coin);
    holder.visible = false;
    group.add(holder);
    views.push({ id: null, holder, coin });
  }
  return { group, views, byId: new Map() };
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
    view.holder.position.set(worldXOf(coin.x, coin.width), 1.18 + Math.sin(time * CONFIG.bones.bobFrequency + coin.id) * CONFIG.bones.hoverHeight, worldZOf(coin.y));
    view.coin.rotation.y = time * CONFIG.bones.spinRadiansPerSecond;
    view.holder.scale.setScalar(collected ? 1 - progress : 1);
  }
}

function buildPowerupPool() {
  const group = new THREE.Group();
  const views = [];
  const settings = CONFIG.powerups;
  const shieldMaterial = new THREE.MeshStandardMaterial({ color: settings.shieldColor, emissive: settings.shieldColor, emissiveIntensity: 0.35, transparent: true, opacity: 0.82, roughness: 0.22, metalness: 0.12 });
  const magnetMaterial = new THREE.MeshToonMaterial({ color: settings.magnetColor });
  const iconMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const shieldGeometry = new THREE.SphereGeometry(0.34, 14, 10);
  const plusGeometry = new THREE.BoxGeometry(0.1, 0.48, 0.08);
  const crossGeometry = new THREE.BoxGeometry(0.34, 0.1, 0.08);
  const magnetPole = new THREE.BoxGeometry(0.13, 0.52, 0.16);
  const magnetBridge = new THREE.BoxGeometry(0.36, 0.14, 0.16);
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
    left.position.x = -0.12; right.position.x = 0.12; bridge.position.y = -0.2;
    variants.magnet.add(left, right, bridge);
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
    view.holder.position.set(worldXOf(pickup.x, pickup.width), 1.35 + Math.sin(time * CONFIG.bones.bobFrequency + pickup.id) * CONFIG.bones.hoverHeight, worldZOf(pickup.y));
    view.holder.rotation.y = time * CONFIG.bones.spinRadiansPerSecond;
    view.holder.scale.setScalar(pickup.taken ? 1 - progress : 1);
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
    view.holder.visible = true;
    view.holder.position.set(
      worldXOf(bone.x, bone.width),
      bone.baseHeight + bob,
      worldZOf(bone.y),
    );
    view.bone.rotation.y = time * CONFIG.bones.spinRadiansPerSecond;
    view.bone.position.y = progress * CONFIG.bones.collectRise;
    const popRatio = CONFIG.bones.collectPopSecondsRatio;
    const boneScale = !collected
      ? 1
      : progress < popRatio
        ? 1 + (CONFIG.bones.collectPopScale - 1) * progress / popRatio
        : CONFIG.bones.collectPopScale * (1 - (progress - popRatio) / (1 - popRatio));
    view.bone.scale.setScalar(boneScale);
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
  const chest = new THREE.Mesh(sphere, lightFur);
  chest.scale.set(...visual.chestScale);
  chest.position.set(...visual.chestPosition);
  group.add(chest);
  const head = new THREE.Mesh(sphere, fur);
  head.scale.set(...visual.headScale);
  head.position.set(...visual.headPosition);
  group.add(head);
  const muzzle = new THREE.Mesh(sphere, lightFur);
  muzzle.scale.set(...visual.muzzleScale);
  muzzle.position.set(...visual.muzzlePosition);
  group.add(muzzle);
  const nose = new THREE.Mesh(sphere, dark);
  nose.scale.setScalar(visual.spotRadius * 0.72);
  nose.position.set(0, visual.muzzlePosition[1] + visual.muzzleScale[1] * 0.1, visual.muzzlePosition[2] - visual.muzzleScale[2] * 0.82);
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
  const legGeometry = new THREE.CapsuleGeometry(visual.legRadius, visual.legLength - visual.legRadius * 2, 6, 10);
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * visual.legX, visual.legLength * 0.54, end * visual.legZ);
      const leg = new THREE.Mesh(legGeometry, fur);
      pivot.add(leg);
      group.add(pivot);
      legPivots.push({ pivot, phase: (side + end === 0 ? Math.PI : 0) });
    }
  }

  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(visual.spotRadius * 0.42, visual.tailLength, 6, 8), fur);
  tail.position.set(...visual.tailPosition);
  tail.rotation.x = -0.72;
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
  return { group, fur, legPivots, tail, spots, ears };
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
    }
    const variant = slot.variants[car.type] || slot.variants.sedan;
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

  return { group, meshes };
}

function updateStopZoneMeshes(pool, game) {
  const laneWidthPx = ROAD_WIDTH_PX / CONFIG.lanes.count;
  const visibleAhead = CONFIG.stops.visibleAheadMeters;
  const visibleZones = game.stops.zones.filter((zone) => (
    zone.state !== 'missed'
    && zone.startZ - game.distance <= visibleAhead
    && zone.endZ >= game.distance - CONFIG.stops.visibleBehindMeters
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
    holder.visible = true;
  }
}

function updateDogMeshes(pool, dogs, time, dt) {
  let index = 0;

  for (const d of dogs) {
    if (d.state === 'aboard' || d.state === 'lost') continue;
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

function buildVan() {
  const visual = CONFIG.vanVisual;
  return createStylizedVan(visual.bodyColor, true, {
    width: visual.playerBodyWidth,
    length: visual.playerBodyLength,
    bodyHeight: visual.playerBodyHeight,
    cabinHeight: visual.playerRoofHeight,
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
  let cabin;
  let roofHeight = cabinHeight;

  if (isPlayer) {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(vanWidth, bodyHeight, vanLength), bodyMaterial);
    chassis.position.y = bodyY;
    model.add(chassis);

    // High roof is flush with the camera-facing rear (-Z) of the chassis.
    roofHeight = visual.playerRoofHeight;
    const rearTexture = createVanRearTexture();
    rearTexture.colorSpace = THREE.SRGBColorSpace;
    const rearFaceMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: rearTexture,
      roughness: visual.bodyRoughness,
      metalness: visual.bodyMetalness,
    });
    const roofMaterials = [bodyMaterial, bodyMaterial, bodyMaterial, bodyMaterial, bodyMaterial, rearFaceMaterial];
    const upper = new THREE.Mesh(new THREE.BoxGeometry(vanWidth, roofHeight, visual.playerRoofLength), roofMaterials);
    upper.position.set(0, wheelRadius + bodyHeight + roofHeight / 2, -(vanLength - visual.playerRoofLength) / 2);
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
  return {
    group,
    model,
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

function createVanRearTexture() {
  const { rearCanvasWidth: width, rearCanvasHeight: height, bodyColor } = CONFIG.vanVisual;
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
    marketStalls,
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
  };
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
  }

  return batches;
}

function updateMarketBatches(pool) {
  const translation = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0);
  const standMatrix = new THREE.Matrix4();
  for (const batch of pool.marketBatches) {
    batch.items.forEach((item, instanceIndex) => {
      const placement = pool.marketStalls[item.standIndex];
      translation.set(placement.x, 0, placement.z);
      rotation.setFromAxisAngle(upAxis, placement.rotationY);
      scale.setScalar(placement.scale);
      standMatrix.compose(translation, rotation, scale).multiply(item.localMatrix);
      batch.mesh.setMatrixAt(instanceIndex, standMatrix);
    });
    batch.mesh.instanceMatrix.needsUpdate = true;
  }
}

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
      const type = randomSceneryType();
      wrapZ(child, SCENERY_RECYCLE_Z, SCENERY_WRAP_DISTANCE);
      const side = type === 9 ? CONFIG.scenery.posVendorSide : (Math.random() < 0.5 ? -1 : 1);
      const oldLight = child.userData.streetLight;
      if (oldLight) {
        oldLight.parent?.remove(oldLight);
        const oldIndex = pool.streetLights.indexOf(oldLight);
        if (oldIndex !== -1) pool.streetLights.splice(oldIndex, 1);
      }
      child.userData.streetLight = null;
      child.userData.streetlightSide = side;
      child.position.x = sceneryXFor(type, side);

      while (child.children.length > 0) child.remove(child.children[0]);
      const variation = buildSceneryVariation(type, pool.materials, pool.geometries, side);
      child.userData.streetLight = variation.userData.streetLight || null;
      if (child.userData.streetLight) pool.streetLights.push(child.userData.streetLight);
      while (variation.children.length > 0) child.add(variation.children[0]);
    }
  }

  for (const stall of pool.marketStalls) {
    stall.z -= travelled;
    while (stall.z < SCENERY_RECYCLE_Z) stall.z += pool.marketWrapDistance;
    while (stall.z > SCENERY_RECYCLE_Z + pool.marketWrapDistance) stall.z -= pool.marketWrapDistance;
  }
  for (const segment of pool.utilitySegments) {
    segment.position.z -= travelled;
    wrapZ(segment, SCENERY_RECYCLE_Z, pool.utilityWrapDistance);
  }
  updateMarketBatches(pool);
}
