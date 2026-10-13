import * as THREE from 'three';
import { CONFIG } from './config.js';

const CITY = CONFIG.city;

export function createBuildingSpawner(scene) {
  const group = new THREE.Group();
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const paverTextures = createPaverTextures();
  const materials = createMaterials(paverTextures);
  const waterTankGeometry = new THREE.CylinderGeometry(1, 1, 1, CONFIG.scenery.waterTankSegments);
  const sidewalkPaverGeometry = createSidewalkPaverGeometry();
  const sidewalkGroundGeometry = new THREE.PlaneGeometry(CITY.sidewalkWidth, CITY.sidewalkLength);
  const treeGeometries = {
    trunk: new THREE.CylinderGeometry(CITY.treeTrunkTopRadius, CITY.treeTrunkBottomRadius, 1, CITY.treeTrunkSegments),
    branch: new THREE.CylinderGeometry(1, 1, 1, CITY.treeBranchSegments),
    leaves: new THREE.SphereGeometry(1, CITY.treeLeafWidthSegments, CITY.treeLeafHeightSegments),
  };
  const activeBuildings = [];
  const activeBillboards = [];
  let furthestZ = 0;
  let furthestBillboardZ = 0;
  let previousPlayerZ = null;
  const sidewalks = [-1, 1].flatMap((side) => [-1, 1].map((segment) => {
    const walkway = createWalkwaySegment(side, segment, boxGeometry, sidewalkGroundGeometry, sidewalkPaverGeometry, treeGeometries, materials);
    group.add(walkway);
    return walkway;
  }));

  scene.add(group);

  function spawnBuilding(z, side) {
    const building = createModernBuilding({ boxGeometry, materials, waterTankGeometry });
    building.position.set(side < 0 ? CITY.leftSideX : CITY.rightSideX, CITY.sidewalkLift, z);
    group.add(building);
    activeBuildings.push(building);
  }

  // Prime both verges so the city is already visible when the run begins.
  function fillAhead() {
    while (furthestZ < CITY.spawnAheadDistance) {
      furthestZ += CITY.buildingSpacing;
      spawnBuilding(furthestZ, -1);
      spawnBuilding(furthestZ, 1);
    }
  }

  function fillBillboards() {
    while (furthestBillboardZ < CITY.spawnAheadDistance) {
      furthestBillboardZ += CITY.billboardSpacing;
      const side = Math.random() < CITY.billboardSideChance ? -1 : 1;
      const billboard = spawnBillboard(side, furthestBillboardZ);
      group.add(billboard);
      activeBillboards.push(billboard);
    }
  }

  fillAhead();
  fillBillboards();

  return {
    update(playerZ) {
      let delta = previousPlayerZ === null ? 0 : playerZ - previousPlayerZ;
      previousPlayerZ = playerZ;

      for (let index = activeBuildings.length - 1; index >= 0; index--) {
        const building = activeBuildings[index];
        building.position.z -= delta;
        if (building.position.z < -CITY.recycleBehindDistance) {
          group.remove(building);
          activeBuildings.splice(index, 1);
        }
      }

      for (let index = activeBillboards.length - 1; index >= 0; index--) {
        const billboard = activeBillboards[index];
        billboard.position.z -= delta;
        if (billboard.position.z < -CITY.recycleBehindDistance) {
          group.remove(billboard);
          disposeBillboard(billboard);
          activeBillboards.splice(index, 1);
        }
      }

      for (const sidewalk of sidewalks) {
        sidewalk.position.z -= delta;
        while (sidewalk.position.z < -CITY.sidewalkLength / 2) {
          sidewalk.position.z += CITY.sidewalkLength * 2;
        }
        while (sidewalk.position.z > CITY.sidewalkLength / 2) {
          sidewalk.position.z -= CITY.sidewalkLength * 2;
        }
      }

      furthestZ -= delta;
      fillAhead();
      furthestBillboardZ -= delta;
      fillBillboards();
    },
    activeBuildings,
    activeBillboards,
    setNightFactor(nightFactor) {
      for (const billboard of activeBillboards) {
        billboard.userData.light.intensity = CITY.billboardDayLightIntensity
          + (CITY.billboardNightLightIntensity - CITY.billboardDayLightIntensity) * nightFactor;
      }
    },
  };
}

export function spawnBillboard(side, zPosition) {
  const billboard = new THREE.Group();
  const color = CITY.billboardColors[Math.floor(Math.random() * CITY.billboardColors.length)];
  const frameMaterial = new THREE.MeshStandardMaterial({ color: CITY.billboardFrameColor, roughness: CITY.billboardFrameRoughness });
  const poleMaterial = new THREE.MeshStandardMaterial({ color: CITY.billboardPoleColor, metalness: CITY.billboardPoleMetalness, roughness: CITY.billboardPoleRoughness });
  const canvasMaterial = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const poleGeometry = new THREE.BoxGeometry(CITY.billboardPoleWidth, CITY.billboardPoleHeight, CITY.billboardPoleDepth);
  const frameGeometry = new THREE.BoxGeometry(CITY.billboardWidth, CITY.billboardHeight, CITY.billboardDepth);
  const canvasGeometry = new THREE.PlaneGeometry(
    CITY.billboardWidth * CITY.billboardCanvasWidthRatio,
    CITY.billboardHeight * CITY.billboardCanvasHeightRatio,
  );

  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.y = CITY.billboardPoleHeight / 2;
  billboard.add(pole);

  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.y = CITY.billboardPoleHeight + CITY.billboardHeight / 2;
  billboard.add(frame);

  const canvas = new THREE.Mesh(canvasGeometry, canvasMaterial);
  canvas.position.set(
    0,
    frame.position.y,
    -CITY.billboardDepth / 2 - CITY.billboardCanvasOffset,
  );
  canvas.rotation.y = Math.PI;
  billboard.add(canvas);

  const light = new THREE.PointLight(color, CITY.billboardDayLightIntensity, CITY.billboardLightDistance, CITY.billboardLightDecay);
  // Bring the spill light toward the road; the sign itself stays on the sidewalk edge.
  light.position.set(
    -side * CITY.billboardLightInwardOffset,
    frame.position.y,
    canvas.position.z - CITY.billboardLightOffset,
  );
  billboard.add(light);

  billboard.position.set(side * CITY.billboardOffsetX, 0, zPosition);
  billboard.userData.light = light;
  billboard.userData.disposableGeometries = [poleGeometry, frameGeometry, canvasGeometry];
  billboard.userData.disposableMaterials = [poleMaterial, frameMaterial, canvasMaterial];
  return billboard;
}

function disposeBillboard(billboard) {
  for (const geometry of billboard.userData.disposableGeometries) geometry.dispose();
  for (const material of billboard.userData.disposableMaterials) material.dispose();
}

function createWalkwaySegment(side, segment, boxGeometry, groundGeometry, paverGeometry, treeGeometries, materials) {
  const walkway = new THREE.Group();
  walkway.position.set(side * CITY.sidewalkCenterX, CITY.sidewalkLift, segment * CITY.sidewalkLength / 2);
  walkway.userData.segment = segment;

  const base = new THREE.Mesh(
    groundGeometry,
    materials.sidewalk,
  );
  base.rotation.x = -Math.PI / 2;
  base.receiveShadow = true;
  walkway.add(base);

  const pavers = new THREE.Mesh(paverGeometry, materials.sidewalkPavers);
  pavers.receiveShadow = true;
  walkway.add(pavers);

  const curbBlocks = Math.ceil(CITY.sidewalkLength / CITY.sidewalkCurbBlockLength);
  for (const curbSide of [-1, 1]) {
    const curb = new THREE.InstancedMesh(boxGeometry, materials.sidewalkCurb, curbBlocks);
    const transform = new THREE.Object3D();
    for (let block = 0; block < curbBlocks; block++) {
      transform.position.set(
        curbSide * (CITY.sidewalkWidth / 2 - CITY.sidewalkCurbWidth / 2),
        CITY.sidewalkCurbHeight / 2,
        -CITY.sidewalkLength / 2 + (block + 0.5) * CITY.sidewalkCurbBlockLength,
      );
      transform.scale.set(CITY.sidewalkCurbWidth, CITY.sidewalkCurbHeight, CITY.sidewalkCurbBlockLength);
      transform.updateMatrix();
      curb.setMatrixAt(block, transform.matrix);
      curb.setColorAt(block, new THREE.Color(block % 2 === 0 ? CITY.sidewalkCurbWhiteColor : CITY.sidewalkCurbBlackColor));
    }
    curb.instanceMatrix.needsUpdate = true;
    if (curb.instanceColor) curb.instanceColor.needsUpdate = true;
    curb.castShadow = true;
    curb.receiveShadow = true;
    walkway.add(curb);
  }

  const segmentCenterZ = segment * CITY.sidewalkLength / 2;
  const segmentStartZ = segmentCenterZ - CITY.sidewalkLength / 2;
  const segmentEndZ = segmentCenterZ + CITY.sidewalkLength / 2;
  const firstTreeZ = Math.ceil((segmentStartZ - CITY.treeSegmentStartOffset) / CITY.treeSpacing)
    * CITY.treeSpacing + CITY.treeSegmentStartOffset;
  let treeIndex = 0;
  for (let treeZ = firstTreeZ; treeZ < segmentEndZ; treeZ += CITY.treeSpacing, treeIndex++) {
    const tree = createStreetTree(treeIndex, boxGeometry, treeGeometries, materials);
    tree.position.set(
      side * CITY.treeSideXOffset,
      CITY.sidewalkPaverLift,
      treeZ - segmentCenterZ,
    );
    walkway.add(tree);
  }

  return walkway;
}

function createPaverTextures() {
  const settings = CONFIG.roadSurface;
  const colorCanvas = document.createElement('canvas');
  const roughnessCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  for (const canvas of [colorCanvas, roughnessCanvas, bumpCanvas]) {
    canvas.width = settings.canvasSize;
    canvas.height = settings.canvasSize;
  }
  const colorContext = colorCanvas.getContext('2d');
  const roughnessContext = roughnessCanvas.getContext('2d');
  const bumpContext = bumpCanvas.getContext('2d');
  colorContext.fillStyle = settings.paverBaseColor;
  colorContext.fillRect(0, 0, settings.canvasSize, settings.canvasSize);
  roughnessContext.fillStyle = `rgb(${settings.paverRoughnessBase},${settings.paverRoughnessBase},${settings.paverRoughnessBase})`;
  roughnessContext.fillRect(0, 0, settings.canvasSize, settings.canvasSize);
  bumpContext.fillStyle = `rgb(${settings.paverBumpBase},${settings.paverBumpBase},${settings.paverBumpBase})`;
  bumpContext.fillRect(0, 0, settings.canvasSize, settings.canvasSize);

  const rng = makeRng(settings.seed + 1);
  for (let index = 0; index < settings.paverSpeckleCount; index++) {
    const x = rng() * settings.canvasSize;
    const y = rng() * settings.canvasSize;
    const grey = Math.round(settings.paverGrainBase + (rng() - 0.5) * settings.paverGrainSpread);
    colorContext.fillStyle = `rgba(${grey},${grey},${grey},${settings.paverAlphaMin + rng() * settings.paverAlphaRange})`;
    colorContext.fillRect(x, y, settings.asphaltSpeckleSizeMin + rng() * settings.asphaltSpeckleSizeRange, settings.asphaltSpeckleSizeMin + rng() * settings.asphaltSpeckleSizeRange);
    const roughness = Math.round(settings.paverRoughnessBase - settings.paverRoughnessSpread / 2 + rng() * settings.paverRoughnessSpread);
    roughnessContext.fillStyle = `rgb(${roughness},${roughness},${roughness})`;
    roughnessContext.fillRect(x, y, settings.asphaltSpeckleSizeMin, settings.asphaltSpeckleSizeMin);
    const bump = Math.round(settings.paverBumpBase - settings.paverBumpSpread / 2 + rng() * settings.paverBumpSpread);
    bumpContext.fillStyle = `rgb(${bump},${bump},${bump})`;
    bumpContext.fillRect(x, y, settings.asphaltSpeckleSizeMin, settings.asphaltSpeckleSizeMin);
  }
  colorContext.strokeStyle = settings.paverGroutColor;
  colorContext.lineWidth = settings.paverGroutWidth;
  colorContext.strokeRect(
    settings.paverGroutWidth / 2,
    settings.paverGroutWidth / 2,
    settings.canvasSize - settings.paverGroutWidth,
    settings.canvasSize - settings.paverGroutWidth,
  );

  const createMap = (canvas, repeatX, repeatZ, isColor = false) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatZ);
    texture.anisotropy = settings.textureAnisotropy;
    if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  return {
    tileMap: createMap(colorCanvas, 1, 1, true),
    tileRoughnessMap: createMap(roughnessCanvas, 1, 1),
    tileBumpMap: createMap(bumpCanvas, 1, 1),
    groundMap: createMap(colorCanvas, settings.paverRepeatX, settings.paverRepeatZ, true),
    groundRoughnessMap: createMap(roughnessCanvas, settings.paverRepeatX, settings.paverRepeatZ),
    groundBumpMap: createMap(bumpCanvas, settings.paverRepeatX, settings.paverRepeatZ),
  };
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

function createSidewalkPaverGeometry() {
  const positions = [];
  const colors = [];
  const uvs = [];
  const pitchX = CITY.sidewalkPaverWidth + CITY.sidewalkPaverGap;
  const pitchZ = CITY.sidewalkPaverLength + CITY.sidewalkPaverGap;
  const columns = Math.ceil(CITY.sidewalkWidth / pitchX);
  const rows = Math.ceil(CITY.sidewalkLength / pitchZ);
  const triangles = [0, 1, 2, 0, 2, 3];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = -CITY.sidewalkWidth / 2 + CITY.sidewalkPaverGap / 2 + column * pitchX;
      const z = -CITY.sidewalkLength / 2 + CITY.sidewalkPaverGap / 2 + row * pitchZ;
      const xEnd = Math.min(x + CITY.sidewalkPaverWidth, CITY.sidewalkWidth / 2 - CITY.sidewalkPaverGap / 2);
      const zEnd = Math.min(z + CITY.sidewalkPaverLength, CITY.sidewalkLength / 2 - CITY.sidewalkPaverGap / 2);
      if (x >= xEnd || z >= zEnd) continue;
      const corners = [
        [x, CITY.sidewalkPaverLift, z],
        [x, CITY.sidewalkPaverLift, zEnd],
        [xEnd, CITY.sidewalkPaverLift, zEnd],
        [xEnd, CITY.sidewalkPaverLift, z],
      ];
      const cornerUVs = [[0, 0], [0, 1], [1, 1], [1, 0]];
      const color = new THREE.Color(CITY.sidewalkPaverColors[(row * 3 + column) % CITY.sidewalkPaverColors.length]);
      for (const cornerIndex of triangles) {
        positions.push(...corners[cornerIndex]);
        colors.push(color.r, color.g, color.b);
        uvs.push(...cornerUVs[cornerIndex]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function createStreetTree(treeIndex, boxGeometry, geometries, materials) {
  const tree = new THREE.Group();
  const [planterWidth, planterHeight, planterDepth] = CITY.treePlanterSize;
  const planter = new THREE.Mesh(boxGeometry, materials.treePlanter);
  planter.scale.set(planterWidth, planterHeight, planterDepth);
  planter.position.y = planterHeight / 2;
  planter.castShadow = true;
  planter.receiveShadow = true;
  tree.add(planter);

  const soil = new THREE.Mesh(boxGeometry, materials.treeSoil);
  soil.scale.set(planterWidth * CITY.treeSoilInset, CITY.treeSoilThickness, planterDepth * CITY.treeSoilInset);
  soil.position.y = planterHeight + CITY.treeSoilThickness / 2;
  tree.add(soil);

  const trunk = new THREE.Mesh(geometries.trunk, materials.treeTrunk);
  trunk.scale.y = CITY.treeTrunkHeight;
  trunk.position.y = planterHeight + CITY.treeTrunkHeight / 2;
  trunk.castShadow = true;
  tree.add(trunk);

  for (const direction of [-1, 1]) {
    const branch = new THREE.Mesh(geometries.branch, materials.treeTrunk);
    branch.scale.set(CITY.treeBranchRadius, CITY.treeBranchLength, CITY.treeBranchRadius);
    branch.position.set(0, planterHeight + CITY.treeBranchStartY, 0);
    branch.rotation.z = -direction * CITY.treeBranchAngle;
    branch.castShadow = true;
    tree.add(branch);
  }

  const canopyLift = planterHeight;
  CITY.treeCanopyClusters.forEach((cluster, clusterIndex) => {
    const canopy = new THREE.Mesh(
      geometries.leaves,
      materials.treeLeaves[(treeIndex + clusterIndex) % materials.treeLeaves.length],
    );
    canopy.position.set(cluster.position[0], canopyLift + cluster.position[1], cluster.position[2]);
    canopy.scale.set(...cluster.scale);
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    tree.add(canopy);
  });

  return tree;
}

export function createModernBuilding({ boxGeometry, materials, waterTankGeometry }) {
  const building = new THREE.Group();
  const tower = Math.random() < CITY.towerChance;
  const width = tower
    ? CITY.towerMinWidth + Math.random() * (CITY.towerMaxWidth - CITY.towerMinWidth)
    : CITY.duplexMinWidth + Math.random() * (CITY.duplexMaxWidth - CITY.duplexMinWidth);
  const depth = tower
    ? CITY.towerMinDepth + Math.random() * (CITY.towerMaxDepth - CITY.towerMinDepth)
    : CITY.duplexMinDepth + Math.random() * (CITY.duplexMaxDepth - CITY.duplexMinDepth);
  const height = tower
    ? CITY.towerMinHeight + Math.random() * (CITY.towerMaxHeight - CITY.towerMinHeight)
    : CITY.duplexMinHeight + Math.random() * (CITY.duplexMaxHeight - CITY.duplexMinHeight);

  const exterior = tower ? materials.glass : (Math.random() < CITY.lightDuplexChance ? materials.white : materials.charcoal);
  addBox(building, boxGeometry, exterior, width, height, depth, 0, height / 2, 0);

  if (tower) {
    addTowerFacade(building, boxGeometry, materials, width, height, depth);
  } else {
    addDuplexFacade(building, boxGeometry, materials, width, height, depth);
    if (Math.random() < CONFIG.scenery.waterTankChance) {
      const tank = new THREE.Mesh(waterTankGeometry, materials.waterTank);
      const tankX = (Math.random() - 0.5) * Math.max(0, width - CONFIG.scenery.waterTankRadius * CONFIG.scenery.waterTankRoofClearanceRatio);
      const tankZ = (Math.random() - 0.5) * Math.max(0, depth - CONFIG.scenery.waterTankRadius * CONFIG.scenery.waterTankRoofClearanceRatio);
      tank.scale.set(CONFIG.scenery.waterTankRadius, CONFIG.scenery.waterTankHeight, CONFIG.scenery.waterTankRadius);
      tank.position.set(tankX, height + CONFIG.scenery.waterTankHeight / 2, tankZ);
      tank.castShadow = true;
      tank.receiveShadow = true;
      building.add(tank);

      const lid = new THREE.Mesh(waterTankGeometry, materials.waterTank);
      lid.scale.set(
        CONFIG.scenery.waterTankRadius * CONFIG.scenery.waterTankLidScale,
        CONFIG.scenery.waterTankRimHeight,
        CONFIG.scenery.waterTankRadius * CONFIG.scenery.waterTankLidScale,
      );
      lid.position.set(tankX, height + CONFIG.scenery.waterTankHeight + CONFIG.scenery.waterTankRimHeight / 2, tankZ);
      building.add(lid);
    }
  }

  return building;
}

function createMaterials(paverTextures) {
  const surface = CONFIG.roadSurface;
  return {
    glass: new THREE.MeshStandardMaterial({ color: CITY.glassColor, metalness: CITY.glassMetalness, roughness: CITY.glassRoughness }),
    glassTint: new THREE.MeshStandardMaterial({ color: CITY.glassTintColor, metalness: CITY.tintMetalness, roughness: CITY.tintRoughness }),
    frame: new THREE.MeshStandardMaterial({ color: CITY.frameColor, metalness: CITY.frameMetalness, roughness: CITY.frameRoughness }),
    white: new THREE.MeshStandardMaterial({ color: CITY.whiteColor, roughness: CITY.exteriorRoughness }),
    charcoal: new THREE.MeshStandardMaterial({ color: CITY.charcoalColor, roughness: CITY.exteriorRoughness }),
    accent: new THREE.MeshStandardMaterial({ color: CITY.accentColor, roughness: CITY.accentRoughness }),
    window: new THREE.MeshStandardMaterial({ color: CITY.windowColor, metalness: CITY.windowMetalness, roughness: CITY.windowRoughness }),
    sidewalk: new THREE.MeshStandardMaterial({
      color: CITY.sidewalkColor,
      map: paverTextures.groundMap,
      roughnessMap: paverTextures.groundRoughnessMap,
      bumpMap: paverTextures.groundBumpMap,
      roughness: surface.paverRoughness,
      bumpScale: surface.paverBumpScale,
    }),
    sidewalkPavers: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: paverTextures.tileMap,
      roughnessMap: paverTextures.tileRoughnessMap,
      bumpMap: paverTextures.tileBumpMap,
      vertexColors: true,
      roughness: surface.paverRoughness,
      bumpScale: surface.paverBumpScale,
    }),
    sidewalkCurb: new THREE.MeshStandardMaterial({ color: CITY.sidewalkCurbColor, roughness: CITY.sidewalkPaverRoughness }),
    waterTank: new THREE.MeshToonMaterial({ color: CONFIG.scenery.waterTankColor }),
    treePlanter: new THREE.MeshStandardMaterial({ color: CITY.treePlanterColor, roughness: CITY.treeMaterialRoughness }),
    treeSoil: new THREE.MeshStandardMaterial({ color: CITY.treeSoilColor, roughness: CITY.treeMaterialRoughness }),
    treeTrunk: new THREE.MeshStandardMaterial({ color: CITY.treeTrunkColor, roughness: CITY.treeMaterialRoughness }),
    treeLeaves: CITY.treeCanopyColors.map(color => new THREE.MeshStandardMaterial({ color, roughness: CITY.treeMaterialRoughness })),
  };
}

function addTowerFacade(group, box, materials, width, height, depth) {
  const levels = Math.max(CITY.towerMinLevels, Math.floor(height / CITY.towerFloorHeight));
  const columns = Math.max(CITY.towerMinColumns, Math.floor(width / CITY.towerWindowWidth));
  const windowWidth = width / (columns + 1) * CITY.towerWindowRatio;
  const windowHeight = height / (levels + 1) * CITY.towerWindowRatio;
  const frontZ = -depth / 2 - CITY.facadeOffset;

  for (let row = 0; row < levels; row++) {
    const y = (row + 1) * height / (levels + 1);
    addBox(group, box, materials.frame, width * CITY.towerFrameRatio, CITY.frameThickness, depth * CITY.towerFrameRatio, 0, y, frontZ);
    for (let column = 0; column < columns; column++) {
      const x = (column - (columns - 1) / 2) * width / columns;
      addBox(group, box, materials.glassTint, windowWidth, windowHeight, CITY.facadeThickness, x, y + windowHeight * CITY.towerWindowVerticalOffsetRatio, frontZ - CITY.facadeThickness);
    }
  }

  const crown = addBox(group, box, materials.frame, width * CITY.crownWidthRatio, CITY.crownHeight, depth * CITY.crownDepthRatio, 0, height + CITY.crownHeight / 2, 0);
  crown.rotation.y = Math.random() * CITY.crownRotationRadians;
}

function addDuplexFacade(group, box, materials, width, height, depth) {
  const frontZ = -depth / 2 - CITY.facadeOffset;
  const firstFloorY = height * CITY.duplexWindowYRatio;
  const secondFloorY = height * (1 - CITY.duplexWindowYRatio);
  const roof = addBox(group, box, materials.charcoal, width + CITY.roofOverhang, CITY.roofThickness, depth + CITY.roofOverhang, 0, height + CITY.roofThickness / 2, 0);
  addBox(group, box, materials.white, width * CITY.duplexAccentRatio, height * CITY.duplexUpperAccentHeightRatio, depth * CITY.duplexAccentDepthRatio, -width * CITY.duplexUpperAccentXRatio, height * CITY.duplexUpperAccentYRatio, frontZ);
  addBox(group, box, materials.charcoal, width * CITY.duplexAccentRatio, height * CITY.duplexBandHeightRatio, CITY.facadeThickness, width * CITY.duplexBandXRatio, height * CITY.duplexBandYRatio, frontZ - CITY.facadeThickness);
  addBox(group, box, materials.window, width * CITY.duplexWindowRatio, height * CITY.duplexWindowHeightRatio, CITY.facadeThickness, -width * CITY.duplexWindowLeftXRatio, firstFloorY, frontZ - CITY.facadeThickness * CITY.duplexWindowDepthMultiplier);
  addBox(group, box, materials.window, width * CITY.duplexWindowRatio, height * CITY.duplexWindowHeightRatio, CITY.facadeThickness, width * CITY.duplexWindowRightXRatio, secondFloorY, frontZ - CITY.facadeThickness * CITY.duplexWindowDepthMultiplier);
  addBox(group, box, materials.accent, width * CITY.duplexGarageRatio, height * CITY.duplexGarageHeightRatio, CITY.facadeThickness, width * CITY.duplexGarageXRatio, height * CITY.duplexGarageYRatio, frontZ - CITY.facadeThickness * CITY.duplexGarageDepthMultiplier);
  roof.position.x += Math.random() * CITY.roofShift;
}

function addBox(group, geometry, material, width, height, depth, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(width, height, depth);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}
