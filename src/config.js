// UNDECIDED entries are placeholders, not spec. See docs/concept.md,
// section "UNDECIDED - awaiting user answer". Rename/revalue once answered.
export const DEBUG = false; // Set to true to enable debug mode (spawn test bay, show debug info)

export const CONFIG = {
  logicalWidth: 480,
  logicalHeight: 800,
  render: {
    maxPixelRatio: 1.5, // RESOLVED — cap high-DPI rendering cost on common laptops and phones
  },

  van: {
    width: 64,
    height: 104,
    screenY: 600,
  },

  // RESOLVED: visual response for the player van; values are world-scale ratios.
  vanVisual: {
    bodyColor: 0xe8b86d,
    playerBodyWidth: 2.3, // RESOLVED — commercial van lower chassis width in world units
    playerBodyHeight: 1.6, // RESOLVED — commercial van lower chassis height in world units
    playerBodyLength: 5.0, // RESOLVED — commercial van lower chassis length in world units
    playerRoofHeight: 0.9, // RESOLVED — high-roof extension height in world units
    playerRoofLength: 4.6, // RESOLVED — high-roof extension length in world units
    rearCanvasWidth: 1024, // RESOLVED — rear label canvas resolution
    rearCanvasHeight: 512, // RESOLVED — rear label canvas resolution
    rearRescueCanvasWidth: 1024, // RESOLVED — rear rescue text canvas resolution
    rearRescueCanvasHeight: 256, // RESOLVED — rear rescue text canvas resolution
    rearRescueLabelWidthRatio: 0.78, // RESOLVED — rear rescue decal width
    rearRescueLabelHeight: 0.42, // RESOLVED — rear rescue decal height
    rearRescueLabelYOffset: 0.18, // RESOLVED — rear rescue decal position above bumper
    rearRescueLabelDepthOffset: 0.075, // RESOLVED — rear decal offset beyond the cargo doors
    rearBumperHeight: 0.14, // RESOLVED — rear bumper height
    rearBumperDepth: 0.13, // RESOLVED — rear bumper depth
    rearTextColor: 0x11151a, // RESOLVED — high-contrast rear rescue lettering
    rearTextOutlineColor: 0xfff8e9, // RESOLVED — light rear-letter outline
    rearTextFontRatio: 0.46, // RESOLVED — rear rescue lettering size relative to canvas
    rearTextOutlineRatio: 0.06, // RESOLVED — rear rescue lettering stroke width
    roofRackRailSize: [0.09, 0.1, 3.6], // RESOLVED — roof rack side rail dimensions
    roofRackRailOffsetX: 0.82, // RESOLVED — roof rack rail half-spacing
    roofRackHeight: 0.18, // RESOLVED — rack rise above the roof
    roofRackCrossbarSize: [1.85, 0.09, 0.12], // RESOLVED — roof rack crossbar dimensions
    roofRackCrossbarOffsetsZ: [-1.5, 1.5], // RESOLVED — crossbar positions along the roof
    roofRackFootSize: [0.1, 0.18, 0.12], // RESOLVED — roof rack foot dimensions
    roofRackColor: 0x262c31, // RESOLVED — dark rack finish
    crateSize: [0.58, 0.46, 0.62], // RESOLVED — rooftop dog crate dimensions
    crateXOffsets: [-0.42, 0.42], // RESOLVED — paired crate positions
    crateZOffset: -0.12, // RESOLVED — cargo position near the rear of the rack
    crateColor: 0xd8d3c7, // RESOLVED — pale rescue crate panels
    crateBarColor: 0x34383a, // RESOLVED — crate frame color
    crateBarThickness: 0.035, // RESOLVED — crate frame thickness
    barrelRadius: 0.19, // RESOLVED — rooftop rescue barrel radius
    barrelHeight: 0.42, // RESOLVED — rooftop rescue barrel height
    barrelSegments: 8, // RESOLVED — low-poly barrel geometry resolution
    barrelOffset: [0.78, -0.12], // RESOLVED — barrel X and Z placement
    rescueGearSize: [0.36, 0.22, 0.44], // RESOLVED — rescue equipment bag dimensions
    rescueGearOffset: [-0.78, 0.3], // RESOLVED — rescue equipment X and Z placement
    rescueGearColor: 0xd94b3d, // RESOLVED — high-visibility rescue gear
    roofRackMetalness: 0.68, // RESOLVED — rack metallic finish
    roofRackRoughness: 0.34, // RESOLVED — rack surface roughness
    crateRoughness: 0.72, // RESOLVED — matte crate panels
    crateBarRoughness: 0.48, // RESOLVED — crate frame finish
    rescueGearRoughness: 0.7, // RESOLVED — rescue bag finish
    rearBumperMetalness: 0.72, // RESOLVED — rear bumper metallic finish
    tailLampHousingSize: [0.23, 0.56, 0.09], // RESOLVED — dark taillight housing dimensions
    tailLampLensSize: [0.16, 0.31, 0.035], // RESOLVED — red brake-light lens dimensions
    tailLampSignalSize: [0.16, 0.105, 0.035], // RESOLVED — amber indicator lens dimensions
    tailLampReverseSize: [0.16, 0.075, 0.035], // RESOLVED — reverse-light lens dimensions
    tailLampColor: 0xff263d, // RESOLVED — red brake light
    tailLampSignalColor: 0xffa42f, // RESOLVED — amber turn indicator
    tailLampReverseColor: 0xf4eee0, // RESOLVED — pale reverse light
    bodyRoughness: 0.3,
    bodyMetalness: 0.2,
    wheelArchColor: 0x111419,
    chromeColor: 0xd8e0e5,
    logoCanvasWidth: 1024,
    logoCanvasHeight: 384,
    sideLogoWidthRatio: 0.72, // RESOLVED — DOGE VAN branding spans most of each side panel
    sideLogoHeight: 0.62, // RESOLVED — side branding remains prominent and legible
    squashStretchRate: 8,
    accelerateStretchZ: 1.035,
    accelerateSquashY: 0.985,
    brakeSquashZ: 0.965,
    brakeStretchY: 1.04,
    bounceAmplitude: 0.035,
    bounceFrequency: 27,
  },

  // RESOLVED #9 speed ramp: quadratic ease-in, reaches max at rampSeconds.
  // speed (game.speed) is the ramp target; game.vanSpeed is the effective speed
  // after applying SPEED button boost and BRAKE button deceleration.
  speed: {
    start: 400,
    max: 1000,
    rampSeconds: 90,
    // SPEED button: hold to boost above the ramp speed.
    boostMultiplier: 1.8,   // RESOLVED — hold → ramp speed × 1.8 for a strong boost
    maxBoost: 1800,         // RESOLVED — absolute cap on vanSpeed while boosted
    boostAccel: 1700,       // RESOLVED — quick, noticeable acceleration while boosting
    // BRAKE button: hold to slow down, can stop fully.
    brakeStrength: 1450,    // RESOLVED — sharp braking response
    reverseMax: 260,        // RESOLVED — controlled reverse speed outside an active yellow bay
    reverseAccel: 520,      // RESOLVED — reverse begins after braking through zero
    cruiseRecoveryRate: 5, // RESOLVED — exponential speed recovery after BRAKE is released
  },

  jump: {
    durationSeconds: 0.82, // RESOLVED — quick arcade hop over small road hazards
    maxHeight: 1.45, // RESOLVED — enough clearance for low cones, crates, and tyres
    cooldownSeconds: 0.18, // RESOLVED — prevent rapid repeated hops
    obstacleClearanceHeight: 0.68, // RESOLVED — jump height needed to clear a hazard
  },

  obstacles: {
    seedSalt: 0xc2b2ae35, // RESOLVED — keeps obstacle patterns independent from traffic and dog spawning
    waveSeedMultiplier: 65537, // RESOLVED — deterministic per-wave obstacle layout
    spawnChance: 0.56, // RESOLVED — occasional small hazards keep the road readable
    yOffset: -80, // RESOLVED — leave warning room before each traffic wave
    poolSize: 24, // RESOLVED — pooled meshes for visible hazards
    width: 48, // RESOLVED — compact obstacle footprint inside one lane
    depth: 42, // RESOLVED — low obstacle collision depth
    bumpSpeedLoss: 210, // RESOLVED — small speed penalty when a hazard is not cleared
    minimumBumpSpeed: 180, // RESOLVED — preserve control after a minor bump
    hitShake: 0.1, // RESOLVED — brief light camera response to a road bump
    shieldImpactShakeRatio: 0.6, // RESOLVED — shielded impacts remain a softer jolt
    coneRadius: 0.22, // RESOLVED — small roadside safety-cone radius
    coneHeight: 0.48, // RESOLVED — low cone that the van can hop over
    coneBaseHeight: 0.055, // RESOLVED — cone base thickness
    crateSize: [0.42, 0.32, 0.38], // RESOLVED — compact wooden road crate
    crateColor: 0x98683d, // RESOLVED — warm wooden crate color
    coneColor: 0xf28c28, // RESOLVED — bright orange cone color
    coneBaseColor: 0x353b40, // RESOLVED — dark rubber cone base
    tireRadius: 0.2, // RESOLVED — small road tyre obstacle
    tireTubeRadius: 0.065, // RESOLVED — tyre ring thickness
    tireColor: 0x24282b, // RESOLVED — dark rubber tyre color
    segments: 10, // RESOLVED — low-poly hazard geometry detail
    crateRoughness: 0.84, // RESOLVED — matte wooden crate finish
  },

  progression: {
    levelCount: 4, // RESOLVED — each selectable region has four rescue routes
    levelSpeedBonus: 18, // RESOLVED — later routes add a modest speed challenge
  },

  coins: {
    spawnChance: 0.32, // RESOLVED — coins are occasional bonus pickups alongside bones
    trailMin: 4, // RESOLVED — minimum coins in a road trail
    trailMax: 7, // RESOLVED — maximum coins in a road trail
    spacingPx: 48, // RESOLVED — readable coin trail spacing
    radius: 0.22, // RESOLVED — visible 3D coin radius
    depth: 0.07, // RESOLVED — compact coin thickness
    widthPx: 30, // RESOLVED — horizontal pickup collision size
    heightPx: 30, // RESOLVED — vertical pickup collision size
    yOffset: 180, // RESOLVED — offset coin trails from the bone stream
    poolSize: 64, // RESOLVED — pooled meshes for visible coins
    value: 1, // RESOLVED — base coin bank value
    recycleMarginPx: 120, // RESOLVED — cull coins outside the active view
    seedSalt: 0x7f4a7c15, // RESOLVED — separate deterministic coin patterns
    waveSeedMultiplier: 104729, // RESOLVED — stable per-wave coin patterns
    color: 0xf2b84b, // RESOLVED — warm gold coin finish
  },

  powerups: {
    spawnChance: 0.12, // RESOLVED — shield and magnet appear as occasional bonuses
    shieldDurationSeconds: 8, // RESOLVED — shield protects against one vehicle or road hit
    magnetDurationSeconds: 8, // RESOLVED — magnet draws bones and coins toward the van
    durationUpgradeSeconds: 2, // RESOLVED — added duration per garage upgrade
    startingShieldSeconds: 5, // RESOLVED — optional short shield from the garage upgrade
    magnetRangePx: 150, // RESOLVED — pickup attraction range
    magnetPullPxPerSecond: 420, // RESOLVED — smooth attraction without instant snapping
    poolSize: 12, // RESOLVED — pooled shield and magnet pickups
    widthPx: 38, // RESOLVED — pickup collision width
    heightPx: 38, // RESOLVED — pickup collision height
    yOffset: 250, // RESOLVED — keep power-ups spaced ahead of regular collectibles
    seedSalt: 0x165667b1, // RESOLVED — separate deterministic power-up patterns
    waveSeedMultiplier: 32452843, // RESOLVED — stable per-wave power-up patterns
    shieldColor: 0x38b6ff, // RESOLVED — bright cyan shield indicator
    magnetColor: 0xdd4339, // RESOLVED — red magnet pickup
    shieldBubbleScale: [1.45, 1.28, 2.65], // RESOLVED — translucent shell surrounds the van while protected
    shieldBubbleHeight: 1.35, // RESOLVED — center shield shell around the van body
    shieldBubbleOpacity: 0.18, // RESOLVED — keep the van clearly visible through the shield
  },

  garage: {
    upgradeCosts: {
      shieldDuration: [150, 300, 600], // RESOLVED — rising cost for longer shields
      magnetDuration: [150, 300, 600], // RESOLVED — rising cost for longer magnets
      startingShield: [250], // RESOLVED — one-time run-start shield upgrade
      coinValue: [300, 800], // RESOLVED — two tiers for bonus coin value
    },
    maxUpgradeLevel: 3, // RESOLVED — cap duration upgrades at three tiers
  },

  audio: {
    engineIdleHz: 48, // RESOLVED — low synthesized idle engine tone
    engineTopSpeedHz: 112, // RESOLVED — engine pitch at normal top speed
    engineHarmonicRatio: 1.5, // RESOLVED — higher engine layer adds a fuller motor tone
    engineFilterHz: 260, // RESOLVED — soften the synthesized engine buzz
    hornLowHz: 392, // RESOLVED — lower note in the dual-tone van horn
    hornHighHz: 494, // RESOLVED — upper note in the dual-tone van horn
    hornGain: 0.055, // RESOLVED — audible honk without overpowering driving sounds
    engineBoostPitchHz: 26, // RESOLVED — extra rev pitch while GAS is held
    engineIdleGain: 0.012, // RESOLVED — quiet running motor bed
    engineGasGain: 0.036, // RESOLVED — audible engine tone during acceleration
    brakeHissGain: 0.022, // RESOLVED — soft friction sound while BRAKE is held
    brakeMinSpeed: 18, // RESOLVED — brake hiss fades out near a full stop
    brakeFilterHz: 1150, // RESOLVED — warm tire and brake hiss tone
    brakeFilterQ: 0.8, // RESOLVED — smooth friction sound band
    audioSmoothingSeconds: 0.07, // RESOLVED — soften control sound transitions
    audioUpdateInterval: 0.04, // RESOLVED — limit audio parameter updates
    noiseBufferSeconds: 1, // RESOLVED — reusable looped brake-noise buffer
  },

  // RESOLVED: two traffic impacts trigger a visible halt before game over.
  crash: {
    vanHealth: 2, // RESOLVED — two hits per run
    firstHitShake: 0.16, // RESOLVED — small shake that does not interrupt driving
    secondHitShake: 0.34, // RESOLVED — stronger shake on the fatal impact
    shakeDecayPerSecond: 2.8, // RESOLVED — short camera shake decay
    stopDeceleration: 1900, // RESOLVED — visible but controlled fatal-hit braking
    spinRate: 0.72, // RESOLVED — gentle spin-out yaw
    tiltRate: 2.4, // RESOLVED — brief chassis roll during the stop
    obstacleKnockbackPx: 14, // RESOLVED — small side displacement for a struck vehicle
    obstacleKnockbackDecay: 3.6, // RESOLVED — struck vehicle settles back into its lane
    obstacleTiltRadians: 0.11, // RESOLVED — visible off-axis damage lean
    damageBumperDrop: 0.22, // RESOLVED — visibly crumpled front bumper
    damageHoodAngle: 0.48, // RESOLVED — hood pops open after impact
    damageHoodColor: 0x8c3b2e, // RESOLVED — exposed damaged engine-bay color
    damageRearColor: 0x453d3a, // RESOLVED — dark exposed rear impact panel
    damageHoodLift: 0.08, // RESOLVED — lift the hood above the engine bay
    damageHoodDepthRatio: 0.28, // RESOLVED — damaged hood panel depth ratio
    damageHoodWidthRatio: 0.72, // RESOLVED — damaged hood panel width ratio
    damageHoodHeight: 0.14, // RESOLVED — hood panel thickness
    damageRearWidthRatio: 0.82, // RESOLVED — rear crumple panel spans most of the obstacle width
    damageRearHeight: 0.16, // RESOLVED — rear impact panel height
    damageRearDepth: 0.13, // RESOLVED — rear impact panel depth
    damageRearTiltRadians: 0.24, // RESOLVED — rear bumper visibly folds downward after impact
    damageHoodForwardRatio: 0.31, // RESOLVED — hood panel sits over the engine bay
    damageMaterialRoughness: 0.76, // RESOLVED — matte crumpled hood finish
    firstHitBumperDamageRatio: 0.22, // RESOLVED — keep van damage minor after the first collision
    bumperCollisionDepthPx: 18, // RESOLVED — collision triggers at the front bumper plane
    obstacleSmokeCount: 18, // RESOLVED — light smoke from the first-hit obstacle
    vanSmokeCount: 42, // RESOLVED — dense smoke after the second hit
    fireParticleCount: 16, // RESOLVED — visible warm engine-bay sparks after the second hit
    smokeLifeSeconds: 2.4, // RESOLVED — particle fade duration
    smokeSpawnPerSecond: 14, // RESOLVED — obstacle smoke rate
    vanSmokeSpawnPerSecond: 32, // RESOLVED — fatal van smoke rate
    smokeRiseSpeed: 0.72, // RESOLVED — smoke rises away from engine bays
    smokeSpread: 0.32, // RESOLVED — smoke expands outward
    smokeStartSize: 0.12, // RESOLVED — engine smoke starting size
    smokeEndSize: 0.48, // RESOLVED — engine smoke final size
    smokeColor: 0x55575b, // RESOLVED — translucent gray obstacle smoke
    vanSmokeColor: 0x25262a, // RESOLVED — dense dark van smoke
    fireColor: 0xf26c32, // RESOLVED — warm engine fire and sparks
    smokeOriginY: 0.95, // RESOLVED — emitter sits above the damaged vehicle
    smokeOriginZRatio: 0.28, // RESOLVED — smoke emitter sits over the front engine area
    smokePointScale: 210, // RESOLVED — point particle screen-size scale
    smokeLifetimeMinRatio: 0.72, // RESOLVED — minimum randomized smoke lifetime
    smokeLifetimeRangeRatio: 0.56, // RESOLVED — smoke lifetime variation
    smokeSpawnSpreadRatio: 0.35, // RESOLVED — tight smoke plume at the engine source
    smokeRiseSpeedMinRatio: 0.72, // RESOLVED — minimum upward particle speed
    smokeRiseSpeedRangeRatio: 0.56, // RESOLVED — upward speed variation
    smokeAlpha: 0.58, // RESOLVED — translucent smoke opacity
    cameraShakeFrequencyX: 43, // RESOLVED — horizontal impact shake frequency
    cameraShakeFrequencyY: 37, // RESOLVED — vertical impact shake frequency
    cameraShakeVerticalRatio: 0.45, // RESOLVED — keep vertical shake subtle
    smokeOriginBikeHeightRatio: 0.48, // RESOLVED — motorcycle smoke begins at its engine
    smokeOriginVehicleYRatio: 0.055, // RESOLVED — hood floats just above the body
    damageHoodBaseLift: 0.055, // RESOLVED — hood rests just above the engine bay
    damageRearYOffset: 0.12, // RESOLVED — align rear crumple panel with the bumper
    damageRearZOffsetRatio: 0.35, // RESOLVED — seat rear impact panel on the rear fascia
    smokeMinimumViewDepth: 1, // RESOLVED — stable smoke particle size at the camera plane
    smokeFeatherInnerRadius: 0.15, // RESOLVED — soft smoke particle edge
  },

  // UNDECIDED #5/#8: distance unit and pixels-per-metre are placeholders.
  distance: {
    pixelsPerMeter: 10,
    unit: 'm',
  },

  road: {
    left: 44,
    right: 436,
  },

  // RESOLVED: third-person camera tuned for a daylight road-runner view.
  camera3D: {
    offsetX: 0, // RESOLVED — center the chase camera behind the van
    heightOffset: 12, // RESOLVED — raise the chase camera for a clear boarding view
    rearOffset: 18, // RESOLVED — keep the van closer and larger in the chase view
    lookHeightOffset: -5, // RESOLVED — frame the van near center, above the lower-right controls
    lookAheadDistance: 22, // RESOLVED — keep the road ahead visible while framing the van above the controls
    fieldOfView: 48, // RESOLVED — clean third-person field of view
    followRate: 0.14, // RESOLVED — smooth lane-change camera follow
  },

  // RESOLVED: bright warm Lagos daylight and dusty horizon haze.
  daylight: {
    backgroundColor: 0xd0bfa8, // RESOLVED — warm dusty Lagos daylight sky
    fogColor: 0xd0bfa8, // RESOLVED — dusty ground-toned horizon haze
    fogDensity: 0.007, // RESOLVED — clear near road with readable distant haze
    sunColor: 0xffd59e, // RESOLVED — warm directional sunlight
    sunIntensity: 2.5, // RESOLVED — bright daylight illumination
    sunPosition: [25, 45, 20], // RESOLVED — requested high sun position
    hemisphereSkyColor: 0x87ceeb, // RESOLVED — sky-blue environment fill
    hemisphereGroundColor: 0x7c6040, // RESOLVED — dusty ground fill
    hemisphereIntensity: 1.0, // RESOLVED — readable fill in shadowed areas
    shadowMapSize: 1024, // RESOLVED — lower shadow cost while keeping crisp street shadows
    shadowCameraNear: 1, // RESOLVED — directional shadow near range
    shadowCameraFar: 150, // RESOLVED — directional shadow far range
    shadowCameraBounds: 48, // RESOLVED — shadow coverage around the road
    shadowBias: -0.0002, // RESOLVED — reduce shadow acne on roadside props
  },

  // RESOLVED: road-specific BRT, bus-stop, and overhead sign scenery.
  roadVisual: {
    brtBarrierColor: 0x0879bd, // RESOLVED — Lagos BRT blue concrete finish
    brtBarrierStripeColor: 0xf4f0df, // RESOLVED — reflective barrier markings
    brtBarrierHeight: 0.76, // RESOLVED — barrier height
    brtBarrierWidth: 0.48, // RESOLVED — barrier thickness across the lane
    brtBarrierSegmentLength: 4.7, // RESOLVED — repeated barrier section length
    brtBarrierGap: 0.3, // RESOLVED — expansion gap between concrete sections
    brtBarrierStripeHeight: 0.13, // RESOLVED — reflective stripe height
    brtBarrierStripeWidth: 0.54, // RESOLVED — reflective stripe width
    busStopColor: 0xffd21c, // RESOLVED — yellow road paint
    busStopLength: 15, // RESOLVED — bus stop hatch zone length
    busStopEdgeMargin: 0.3, // RESOLVED — hatch inset from the lane edge
    busStopLineWidth: 0.13, // RESOLVED — painted border and hatch line width
    busStopStripeLength: 2.4, // RESOLVED — diagonal hatch stroke length
    busStopStripeSpacing: 1.75, // RESOLVED — spacing between diagonal strokes
    busStopStripeAngle: 0.62, // RESOLVED — diagonal hatch angle
    busStopPaintHeight: 0.045, // RESOLVED — lift paint just above the asphalt
    busStopRepeatCount: 2, // RESOLVED — marked stops visible ahead at once
    busStopRepeatSpacing: 105, // RESOLVED — distance between bus stop markings
    busStopFirstOffset: 34, // RESOLVED — first bus-stop marking position ahead
    busStopLabelWidth: 2.9, // RESOLVED — asphalt label width
    busStopLabelLength: 2.0, // RESOLVED — asphalt label length
    busStopLabelLift: 0.006, // RESOLVED — prevent z-fighting on the painted label
    busStopFontSize: 104, // RESOLVED — BUS STOP decal lettering size
    busStopTextWidthRatio: 0.92, // RESOLVED — keep decal lettering inside its canvas
    busStopLabelCanvasWidth: 512, // RESOLVED — generated BUS STOP decal canvas width
    busStopLabelCanvasHeight: 256, // RESOLVED — generated BUS STOP decal canvas height
    gantryStartZ: 145, // RESOLVED — initial position down the road
    gantryHeight: 8.5, // RESOLVED — overhead clearance and beam height
    gantryPostWidth: 0.34, // RESOLVED — metal support width
    gantryBeamHeight: 0.36, // RESOLVED — crossbeam height
    gantryBeamDepth: 0.34, // RESOLVED — crossbeam depth
    gantrySignWidth: 3.8, // RESOLVED — overhead sign panel width
    gantrySignHeight: 1.4, // RESOLVED — overhead sign panel height
    gantrySignDepth: 0.18, // RESOLVED — sign panel depth
    gantryPostOffset: 1.1, // RESOLVED — keep gantry supports beyond the road edge
    gantrySignY: 7.55, // RESOLVED — sign face position below the crossbeam
    gantryFaceWidthRatio: 0.92, // RESOLVED — inset sign face from its metal backing
    gantryFaceHeightRatio: 0.84, // RESOLVED — inset sign face from its metal backing
    gantryFaceOffset: 0.012, // RESOLVED — lift sign texture above its backing
    gantryMetalColor: 0x505b63, // RESOLVED — galvanized gantry finish
    gantrySignColor: 0x075b73, // RESOLVED — Lagos teal highway sign panels
    gantryTextColor: 0xf8f3e7, // RESOLVED — sign lettering color
    gantryBorderWidth: 10, // RESOLVED — sign border thickness in canvas pixels
    gantryBorderInset: 12, // RESOLVED — sign border inset in canvas pixels
    gantryFontSize: 54, // RESOLVED — highway sign lettering size
    gantryTextWidthRatio: 0.9, // RESOLVED — keep sign lettering inside its canvas
    gantryLabelCanvasWidth: 512, // RESOLVED — generated sign canvas width
    gantryLabelCanvasHeight: 192, // RESOLVED — generated sign canvas height
  },

  // RESOLVED: procedural surface maps for asphalt and the concrete walkways.
  roadSurface: {
    seed: 76139, // RESOLVED — repeatable road and paver surface grain
    canvasSize: 256, // RESOLVED — generated texture dimensions
    asphaltBaseColor: '#56595c', // RESOLVED — charcoal asphalt base
    asphaltSpeckleCount: 1800, // RESOLVED — fine aggregate fleck density
    asphaltRepeatX: 8, // RESOLVED — asphalt texture repeats across the road width
    asphaltRepeatZ: 72, // RESOLVED — asphalt texture repeats along the road
    asphaltRoughness: 0.96, // RESOLVED — matte road surface
    asphaltBumpScale: 0.045, // RESOLVED — subtle aggregate relief
    asphaltRoughnessBase: 210, // RESOLVED — grayscale roughness base
    asphaltBumpBase: 128, // RESOLVED — neutral grayscale bump base
    asphaltSpeckleSizeMin: 1, // RESOLVED — smallest aggregate detail in canvas pixels
    asphaltSpeckleSizeRange: 3, // RESOLVED — random aggregate size range
    asphaltNoiseSpread: 38, // RESOLVED — grayscale noise spread
    asphaltSpeckleColorBase: 110, // RESOLVED — asphalt aggregate color center
    asphaltAlphaMin: 0.12, // RESOLVED — minimum color fleck opacity
    asphaltAlphaRange: 0.22, // RESOLVED — color fleck opacity variation
    asphaltBumpContrast: 2, // RESOLVED — bump map contrast relative to color grain
    textureAnisotropy: 4, // RESOLVED — retain texture detail at shallow road angles
    paverBaseColor: '#85827b', // RESOLVED — warm gray concrete base
    paverSpeckleCount: 900, // RESOLVED — concrete aggregate fleck density
    paverRepeatX: 4, // RESOLVED — paver map repeats across the sidewalk
    paverRepeatZ: 144, // RESOLVED — paver map repeats along sidewalk segments
    paverRoughness: 0.93, // RESOLVED — matte walkway surface
    paverBumpScale: 0.025, // RESOLVED — subtle concrete grain
    paverGroutWidth: 8, // RESOLVED — visible grout edge in the paver tile canvas
    paverGroutColor: '#5b5852', // RESOLVED — warm dark grout between paver slabs
    paverRoughnessBase: 205, // RESOLVED — concrete roughness-map base value
    paverGrainBase: 135, // RESOLVED — concrete grain color center
    paverGrainSpread: 36, // RESOLVED — concrete grain color variation
    paverAlphaMin: 0.08, // RESOLVED — minimum concrete fleck opacity
    paverAlphaRange: 0.2, // RESOLVED — concrete fleck opacity variation
    paverRoughnessSpread: 50, // RESOLVED — concrete roughness variation
    paverBumpBase: 128, // RESOLVED — neutral concrete bump base value
    paverBumpSpread: 46, // RESOLVED — concrete bump variation
  },

  // RESOLVED: 3 discrete lanes. One swipe or key press moves exactly one lane.
  lanes: {
    count: 3,
    swipeThresholdPx: 24,
    slideSeconds: 0.17,
  },

  // RESOLVED: chunky low-poly traffic cars. They travel in the same direction as
  // the van, slower than it, never change lane, and always leave one lane open,
  // so the player only ever meets them from behind.
  traffic: {
    speedRatio: 0.78, // RESOLVED — traffic stays slower and approaches visibly without becoming too fast
    carWidth: 92,
    carDepth: 100,
    danfoWidth: 108, // RESOLVED — yellow Danfo logical width
    danfoDepth: 145, // RESOLVED — yellow Danfo logical length
    danfoColor: 0xffc928, // RESOLVED — Danfo yellow body color
    vehicleTypeWeights: { danfo: 0.2, sedan: 0.23, bike: 0.23, tanker: 0.1, van: 0.14, truck: 0.1 }, // RESOLVED — mixed Lagos traffic with regular motorcycles
    bikeWidth: 48, // RESOLVED — motorcycle with rider and rear passenger fits inside a lane
    bikeDepth: 88, // RESOLVED — motorcycle footprint including both passengers
    bikeWheelRadius: 0.19, // RESOLVED — motorcycle wheel size
    bikeFrameColor: 0x242a2e, // RESOLVED — dark motorcycle frame
    bikeSeatColor: 0x46362c, // RESOLVED — motorcycle seat
    bikeRiderColors: [0x247b53, 0x2e5c9a, 0x9b3d32, 0xc78b28], // RESOLVED — rider clothing palette
    bikeHelmetColors: [0x20252a, 0xd74731, 0xf0c83d], // RESOLVED — rider helmet palette
    passengerShirtColors: [0xd7e4d5, 0xd8b6a0, 0x7bc2b5], // RESOLVED — rear passenger clothing palette
    tankerWidth: 120, // RESOLVED — tanker stays within a non-rescue lane
    tankerDepth: 190, // RESOLVED — long tanker footprint for readable spacing
    tankerColor: 0xd7d5c8, // RESOLVED — light tanker body color
    tankerCabColor: 0x345f7b, // RESOLVED — contrasting tanker cab
    tankerRadius: 0.52, // RESOLVED — rounded tank body radius
    vanWidth: 108, // RESOLVED — delivery van width fits inside a lane
    vanDepth: 132, // RESOLVED — delivery van length
    vanColors: [0x3e8a6a, 0x536a9e, 0xc56a3b], // RESOLVED — varied van paint
    truckWidth: 122, // RESOLVED — box truck width fits inside a lane
    truckDepth: 170, // RESOLVED — box truck length
    truckColors: [0x3e6e9f, 0xd0a53e, 0x8c6253], // RESOLVED — varied truck paint
    cargoColors: [0xe9e0ce, 0xd8c4a8, 0x829b87], // RESOLVED — truck cargo box palette
    utilityWheelRadius: 0.31, // RESOLVED — larger van, tanker, and truck wheels
    bikePassengerScale: 0.82, // RESOLVED — rear passenger seated compactly behind rider
    bikeRiderHeight: 0.68, // RESOLVED — motorcycle rider proportions
    bikePassengerHeight: 0.58, // RESOLVED — rear passenger proportions
    bikeRiderOffset: [0, 0.57, -0.03], // RESOLVED — driver sits over motorcycle seat
    bikePassengerOffset: [0, 0.52, -0.36], // RESOLVED — passenger sits at motorcycle rear
    bikeWheelZOffsets: [-0.31, 0.31], // RESOLVED — front and rear motorcycle wheel positions
    cargoHeight: 1.15, // RESOLVED — box truck cargo height
    cargoOffsetZRatio: 0.22, // RESOLVED — place box cargo behind the cab
    bikeSkinColor: 0x80583f, // RESOLVED — neutral rider and passenger skin tone
    bikeVisual: {
      fairingScale: [0.2, 0.2, 0.27], // RESOLVED — compact front engine cover
      fairingPosition: [0, 0.43, 0.1], // RESOLVED — front engine cover position
      seatSize: [0.24, 0.08, 0.54], // RESOLVED — two-person motorcycle seat
      seatPosition: [0, 0.49, -0.12], // RESOLVED — seat position between the wheels
      handleLength: 0.42, // RESOLVED — handlebar width
      handleHeight: 0.66, // RESOLVED — handlebar height
      handleZ: 0.32, // RESOLVED — handlebar forward position
      wheelThicknessRatio: 0.16, // RESOLVED — motorcycle tyre width relative to its footprint
      hubRadiusRatio: 0.2, // RESOLVED — metal hub radius relative to tyre radius
      hubThicknessRatio: 0.18, // RESOLVED — hub width relative to motorcycle footprint
      spokeSegments: 16, // RESOLVED — smooth motorcycle wheels
      smallRoundSegments: 14, // RESOLVED — rider head and helmet geometry detail
      capsuleRadialSegments: 10, // RESOLVED — rider clothing geometry detail
      riderTorsoRadius: 0.15, // RESOLVED — driver torso width
      riderTorsoLength: 0.28, // RESOLVED — driver torso height
      riderHeadRadius: 0.12, // RESOLVED — head size
      helmetRadius: 0.13, // RESOLVED — helmet size
      helmetHeightRatio: 0.76, // RESOLVED — helmet vertical proportions
      helmetOffsetY: 0.045, // RESOLVED — helmet sits above each rider's head
      riderLeanRadians: 0.22, // RESOLVED — slight forward riding posture
      rimRoughness: 0.38, // RESOLVED — tanker ring finish
      rimMetalness: 0.62, // RESOLVED — tanker ring metallic finish
      tankerRoughness: 0.42, // RESOLVED — matte tanker finish
      tankerMetalness: 0.28, // RESOLVED — tanker metal finish
      truckCargoRoughness: 0.72, // RESOLVED — matte painted cargo box
      tankerWidthRatio: 0.34, // RESOLVED — keep tank radius inside the vehicle body
      tankerLengthRatio: 0.68, // RESOLVED — tank shell length
      tankerPositionZRatio: 0.06, // RESOLVED — center the tank over the chassis
      tankerPositionYRadiusRatio: 0.92, // RESOLVED — tank rides above the chassis
      tankerRimColor: 0x59636a, // RESOLVED — dark metal tanker bands
      tankerRimOffsets: [-0.38, 0, 0.38], // RESOLVED — tank reinforcement band spacing
      tankerRimRadiusRatio: 0.98, // RESOLVED — reinforcement band radius
      tankerRimTubeRatio: 0.045, // RESOLVED — reinforcement band thickness
      tankerRimRadialSegments: 8, // RESOLVED — band cross-section detail
      tankerRimTubularSegments: 24, // RESOLVED — smooth band circumference
      truckCargoLengthRatio: 0.42, // RESOLVED — box cargo length
      truckCargoWidthRatio: 0.84, // RESOLVED — inset cargo width
      bikeFairingWidthSegments: 16, // RESOLVED — fairing geometry detail
      bikeFairingHeightSegments: 12, // RESOLVED — fairing geometry detail
      bikeFrameRoughness: 0.48, // RESOLVED — painted motorcycle frame
      bikeFrameMetalness: 0.32, // RESOLVED — motorcycle frame metal finish
      bikeTireColor: 0x191b1e, // RESOLVED — motorcycle rubber color
      bikeTireRoughness: 0.9, // RESOLVED — matte tire finish
      bikeMetalColor: 0x9ca6a8, // RESOLVED — motorcycle chrome detail
      bikeMetalRoughness: 0.34, // RESOLVED — motorcycle chrome roughness
      bikeMetalness: 0.68, // RESOLVED — motorcycle chrome metalness
      bikeSeatRoughness: 0.8, // RESOLVED — matte motorcycle seat
      bikeHandleRadiusRatio: 0.13, // RESOLVED — handlebar thickness relative to the wheel
      bikeHandleSegments: 8, // RESOLVED — handlebar geometry detail
      bikeClothingRoughness: 0.86, // RESOLVED — matte rider clothes
      bikeHelmetRoughness: 0.38, // RESOLVED — helmet finish
      bikeHelmetMetalness: 0.12, // RESOLVED — helmet surface metalness
      bikeSkinRoughness: 0.92, // RESOLVED — matte skin finish
      bikeCapsuleCapSegments: 5, // RESOLVED — rider body capsule detail
      bikeHeadSegments: 10, // RESOLVED — rider head geometry detail
      bikeHeadHeightRatio: 0.52, // RESOLVED — head position above the torso
      bikeHeadForwardOffset: 0.015, // RESOLVED — align head with torso
      bikeRiderScale: 1, // RESOLVED — driver scale
      bikeHelmetWidthSegments: 14, // RESOLVED — helmet geometry detail
      bikeHelmetHeightSegments: 10, // RESOLVED — helmet geometry detail
      cargoCabHeight: 1.05, // RESOLVED — box truck cab height used for cargo placement
    },
    sedanColors: [0xbec4ca, 0x202329, 0xf3f3ed], // RESOLVED — corporate sedan body colors
    sedanBodyHeight: 0.72, // RESOLVED — sedan body height in world units
    sedanCabinHeight: 0.47, // RESOLVED — sedan cabin height in world units
    danfoBodyHeight: 1.05, // RESOLVED — Danfo body height in world units
    danfoCabinHeight: 0.78, // RESOLVED — Danfo cabin height in world units
    wheelRadius: 0.28, // RESOLVED — traffic wheel radius in world units
    wheelWidth: 0.22, // RESOLVED — traffic wheel width in world units
    wheelSegments: 10, // RESOLVED — low-poly wheel detail
    bodyWidthRatio: 0.9, // RESOLVED — vehicle body width ratio
    sedanCabinWidthRatio: 0.76, // RESOLVED — sedan cabin width ratio
    sedanCabinLengthRatio: 0.46, // RESOLVED — sedan cabin length ratio
    danfoCabinWidthRatio: 0.82, // RESOLVED — Danfo cabin width ratio
    danfoCabinLengthRatio: 0.72, // RESOLVED — Danfo cabin length ratio
    sideWindowHeightRatio: 0.5, // RESOLVED — vehicle side window height ratio
    sideWindowLengthRatio: 0.62, // RESOLVED — vehicle side window length ratio
    stripeHeightRatio: 0.1, // RESOLVED — black Danfo side stripe height ratio
    stripeLengthRatio: 0.92, // RESOLVED — black Danfo side stripe length ratio
    stripeThickness: 0.06, // RESOLVED — black Danfo stripe depth
    windowThickness: 0.045, // RESOLVED — traffic window panel depth
    wheelLengthOffsetRatio: 0.34, // RESOLVED — wheel placement along vehicle length
    wheelSideOffsetRatio: 0.48, // RESOLVED — wheel placement across vehicle width
    windowColor: 0x26323c, // RESOLVED — dark traffic vehicle glazing
    trimColor: 0x171a1f, // RESOLVED — traffic vehicle trim and tires
    busStripeColor: 0x1d2025, // RESOLVED — Danfo side stripe color
    glassRoughness: 0.32, // RESOLVED — traffic glazing roughness
    bodyRoughness: 0.48, // RESOLVED — traffic body material roughness
    gapSeconds: 2.5, // RESOLVED — early gap keeps new runs easy to read and avoid
    gapSecondsAtFullDifficulty: 2.0, // RESOLVED — capped late-run wave spacing adds traffic gradually
    difficultyStartMeters: 800, // RESOLVED — early stretch remains forgiving
    difficultyFullMeters: 12000, // RESOLVED — traffic density reaches its cap gradually
    extraLaneChanceAtFullDifficulty: 0.4, // RESOLVED — some late waves add one more car while preserving an open lane
    spawnLeadPx: 460, // RESOLVED — keep each incoming wave inside the visible road ahead
    firstWaveLeadPx: 420, // RESOLVED — first car appears early enough to read and react to
    minSameLaneSpacing: 260, // RESOLVED — preserve room for long tankers and trucks in one lane
    blockedLanesMin: 1,
    blockedLanesMax: 2, // RESOLVED — later waves may use two lanes while keeping one open
    bayClearBeforeMeters: 180, // RESOLVED — traffic starts clearing the rescue lane before a yellow bay
    bayClearAfterMeters: 22, // RESOLVED — keep vehicles out until they pass the marked bay
    laneChangeSeconds: 0.72, // RESOLVED — smooth lane changes complete before the bay entrance
    laneChangeSafeGapPx: 245, // RESOLVED — only merge when the destination lane has room
    laneChangeVehicleGapRatio: 0.5, // RESOLVED — add half the combined vehicle lengths to the merge gap
    hornResponseDistancePx: 680, // RESOLVED — traffic reacts while the van still has braking room
    hornPassClearancePxPerSecond: 90, // RESOLVED — horned traffic accelerates enough to pass
    hornManeuverTimeoutSeconds: 7, // RESOLVED — abandon a pass if a safe merge never opens
  },

  // RESOLVED #1: bones, placed in the guaranteed gap of each traffic wave.
  bones: {
    length: 20,
    thickness: 9,
    yOffset: 12,
    patternCountMin: 5, // RESOLVED — minimum bones in a pickup pattern
    patternCountMax: 10, // RESOLVED — maximum bones in a pickup pattern
    patternsPerWave: 3, // RESOLVED — keep pickup trails visible across each traffic gap
    patternSpacingPx: 44, // RESOLVED — readable spacing along the road
    patternGapPx: 48, // RESOLVED — separate each recognizable pickup trail
    height: 1.2, // RESOLVED — bones float above the asphalt
    hoverHeight: 0.2, // RESOLVED — gentle floating animation range
    spinRadiansPerSecond: 1.8, // RESOLVED — visible but calm bone rotation
    bobFrequency: 4, // RESOLVED — floating animation speed
    arcHeight: 1.25, // RESOLVED — floating arc height over the road
    collectSeconds: 0.32, // RESOLVED — quick scale-up and float pickup
    collectPopSecondsRatio: 0.18, // RESOLVED — brief scale-up at the start of collection
    collectPopScale: 1.25, // RESOLVED — pickup scale pulse before the bone fades
    collectRise: 1.6, // RESOLVED — collected bones float upward before fading
    sparkRise: 0.25, // RESOLVED — spark burst lifts slightly during pickup
    sparkStartScale: 0.3, // RESOLVED — initial spark burst size
    sparkScaleGrowth: 1.4, // RESOLVED — spark burst expansion during pickup
    sparkCount: 14, // RESOLVED — points in each pooled pickup burst
    sparkVerticalSpread: 0.65, // RESOLVED — three-dimensional spark burst shape
    sparkSize: 0.12, // RESOLVED — visible pickup sparkle point size
    stemRadius: 0.055, // RESOLVED — bone shaft thickness
    stemLength: 0.42, // RESOLVED — bone shaft length
    tipRadius: 0.09, // RESOLVED — round bone end size
    tipOffset: 0.22, // RESOLVED — bone end spacing along the shaft
    tipPairOffset: 0.055, // RESOLVED — paired lobes at each bone end
    radialSegments: 14, // RESOLVED — smooth bone shaft geometry
    sphereWidthSegments: 14, // RESOLVED — smooth rounded bone ends
    sphereHeightSegments: 10, // RESOLVED — smooth rounded bone ends
    poolSize: 120, // RESOLVED — prebuilt meshes for the longest visible run
    recycleMarginPx: 120, // RESOLVED — cull pickups beyond either end of view
  },

  // UNDECIDED: original MVP scope said "5 rescuable dogs", but the run should let
// you save as many as possible, so this is currently unlimited. Set a number to
// cap it.
  dogs: {
    width: 34,
    height: 30,
    sidewalkOffsetPx: 2, // RESOLVED — dogs wait visibly beside the rightmost rescue lane
    yOffset: 46,
    enterSeconds: 1.0, // RESOLVED — one-second walk-in before a dog is counted as rescued
    maxPerRun: null,
    visibleInVan: 5,
    spawnLeadMeters: 160, // RESOLVED — dogs appear beside each stop before the van reaches it
    colors: ['black', 'golden', 'brown', 'spotted'],
    perStopMin: 1,  // RESOLVED — each stop has at least one rescue dog
    perStopMax: 3,  // RESOLVED — cap rescue dogs at three per stop
    spacingMinPx: 34, // RESOLVED — closest sidewalk spacing between dogs
    spacingMaxPx: 66, // RESOLVED — widest randomized sidewalk spacing
    sidewalkJitterPx: 16, // RESOLVED — small curb-side placement variation
    idleRotationRadians: 0.18, // RESOLVED — slight randomized idle facing
    boardingHopHeight: 0.42, // RESOLVED — visible jump as the dog reaches the van
    doorOffsetRatio: 1.08, // RESOLVED — side door target just outside the van body
    doorOffsetY: -8, // RESOLVED — boarding target aligns with the side door near the van
    doorArrivalDistancePx: 16, // RESOLVED — start hop animation within one dog length of the door
    lineSpacingPx: 46, // RESOLVED — keep each waiting dog visible along the curb
    boardDelay: 0.25,
    walkSpeed: 200,
    idleBounceSpeed: 4,   // RESOLVED: speed of idle bounce animation (rad/s)
    idleBounceHeight: 0.08, // RESOLVED: height of idle bounce (world units)
    walkAnimationSpeed: 12, // RESOLVED — leg swing and hop speed while boarding
    walkLegSwing: 0.32, // RESOLVED — subtle alternating leg swing while boarding
    walkHopHeight: 0.045, // RESOLVED — small hop during boarding
    furEmissiveIntensity: 0.14, // RESOLVED — preserve readable coat colors under night lighting
    modelUrl: null, // RESOLVED — use the built-in procedural dog; this project ships no GLB assets
    modelTargetLength: 1.5, // RESOLVED — normalized length for loaded dog models
    modelForwardRotationY: 3.141592653589793, // RESOLVED — align common GLTF +Z facing to the game model
    coatColors: {
      black: 0x292522, // RESOLVED — black-coat material tint
      golden: 0xd99b38, // RESOLVED — golden-coat material tint
      brown: 0x70452e, // RESOLVED — brown-coat material tint
      spotted: 0xd6c7a6, // RESOLVED — light base for a spotted-coat texture
    },
    fallbackVisual: {
      bodyScale: [0.3, 0.34, 0.56], // RESOLVED — temporary smooth dog body proportions
      bodyPosition: [0, 0.39, 0], // RESOLVED — temporary body center above the ground
      chestScale: [0.23, 0.29, 0.3], // RESOLVED — chest and shoulder shape
      chestPosition: [0, 0.38, -0.31], // RESOLVED — chest placement at the front of the body
      headScale: [0.25, 0.24, 0.28], // RESOLVED — head proportions
      headPosition: [0, 0.68, -0.43], // RESOLVED — head placement above the shoulders
      muzzleScale: [0.15, 0.12, 0.23], // RESOLVED — tapered muzzle proportions
      muzzlePosition: [0, 0.59, -0.64], // RESOLVED — muzzle placement
      earScale: [0.09, 0.2, 0.11], // RESOLVED — natural drop-ear proportions
      earPosition: [-0.2, 0.63, -0.39], // RESOLVED — left ear offset; mirrored for right
      legRadius: 0.085, // RESOLVED — leg thickness
      legLength: 0.29, // RESOLVED — ground-reaching leg length
      legX: 0.19, // RESOLVED — spacing between left and right legs
      legZ: 0.36, // RESOLVED — spacing between front and rear legs
      legSwing: 0.34, // RESOLVED — fallback walk cycle stride
      tailPosition: [0, 0.53, 0.52], // RESOLVED — tail root at the rear of the body
      tailLength: 0.38, // RESOLVED — tail length
      roughness: 0.68, // RESOLVED — matte fur appearance
      spotRadius: 0.065, // RESOLVED — spotted coat marking size
      spotPositions: [[-0.17, 0.53, -0.02], [0.18, 0.51, 0.14], [-0.16, 0.36, 0.27]], // RESOLVED — visible coat patches
      muzzleColor: 0xd9c7a8, // RESOLVED — natural lighter muzzle and chest accents
      noseColor: 0x211b19, // RESOLVED — dark nose
      collarColor: 0xb83c35, // RESOLVED — rescue collar accent
      eyeColor: 0x211b19, // RESOLVED — dark eyes
    },
  },

  // RESOLVED: task system - random color-based rescue missions
  tasks: {
    minCount: 2,        // RESOLVED — minimum dogs in a run mission
    maxCount: 5,        // RESOLVED — maximum dogs in a run mission
    celebrationDuration: 1.5, // RESOLVED: seconds to show celebration message
    scorePerTask: 1000, // RESOLVED: bonus score for completing a task
  },

  // RESOLVED #5: score is distance + bones + dogs, weighted so rescuing dominates.
  score: {
    metersPerPoint: 10,
    perBone: 10,
    perDog: 500,
  },

  missions: [
    { id: 'dogs', label: 'Rescue 10 dogs', metric: 'dogs', target: 10 },
    { id: 'bones', label: 'Collect 50 bones', metric: 'bones', target: 50 },
    { id: 'distance', label: 'Reach 3 km', metric: 'distance', target: 3000 },
  ],

  steer: {
    speed: 340,
  },

   city: {
    // Buildings scroll slower than the road (parallax).
    parallax: 0.35,
    minHeight: 90,
    maxHeight: 260,
    laneGapMin: 26,
    laneGapMax: 60,
    leftSideX: -18, // RESOLVED — left roadside building center beyond the sidewalk edge
    rightSideX: 18, // RESOLVED — right roadside building center beyond the sidewalk edge
    spawnAheadDistance: 300, // RESOLVED — keep city geometry loaded ahead of the van
    buildingSpacing: 24, // RESOLVED — spacing between roadside buildings
    recycleBehindDistance: 35, // RESOLVED — remove buildings after they pass the camera
    sidewalkWidth: 10, // RESOLVED — concrete walkway width
    sidewalkLength: 360, // RESOLVED — recycled sidewalk segment length
    sidewalkCenterX: 12, // RESOLVED — sidewalk strip center from the road center
    sidewalkLift: 0.012, // RESOLVED — lift sidewalks/buildings above the ground plane
    sidewalkPaverWidth: 1.82, // RESOLVED — visible walkway slab width
    sidewalkPaverLength: 2.8, // RESOLVED — visible walkway slab length
    sidewalkPaverGap: 0.08, // RESOLVED — dark joints between paving slabs
    sidewalkPaverLift: 0.018, // RESOLVED — keep paving just above the gray base
    sidewalkPaverColors: [0x777c80, 0x85898b, 0x6c7277, 0x92928c], // RESOLVED — varied concrete paver tones
    sidewalkPaverRoughness: 0.94, // RESOLVED — matte concrete paving
    sidewalkCurbWidth: 0.28, // RESOLVED — curb width at each walkway edge
    sidewalkCurbHeight: 0.18, // RESOLVED — raised walkway edge
    sidewalkCurbColor: 0xb8b8b1, // RESOLVED — pale concrete curb
    sidewalkCurbBlockLength: 1.5, // RESOLVED — length of each alternating curb block
    sidewalkCurbBlackColor: 0x202124, // RESOLVED — dark curb stripe
    sidewalkCurbWhiteColor: 0xf3f0e6, // RESOLVED — light curb stripe
    treeSpacing: 48, // RESOLVED — interval between walkway trees
    treeSegmentStartOffset: 12, // RESOLVED — global tree pattern phase between building fronts
    treeSideXOffset: 3.8, // RESOLVED — locate planters toward the outer walkway edge
    treePlanterSize: [1.45, 0.42, 1.45], // RESOLVED — raised square tree planter
    treePlanterColor: 0x77736b, // RESOLVED — stone planter finish
    treeSoilColor: 0x493b2e, // RESOLVED — visible soil surface
    treeSoilInset: 0.84, // RESOLVED — soil inset inside the planter rim
    treeSoilThickness: 0.06, // RESOLVED — visible soil layer depth
    treeTrunkHeight: 3.0, // RESOLVED — low-poly shade-tree trunk height
    treeTrunkTopRadius: 0.17, // RESOLVED — trunk upper radius
    treeTrunkBottomRadius: 0.26, // RESOLVED — trunk base radius
    treeTrunkSegments: 7, // RESOLVED — low-poly trunk resolution
    treeBranchSegments: 5, // RESOLVED — low-poly branch resolution
    treeLeafWidthSegments: 8, // RESOLVED — low-poly leaf crown resolution
    treeLeafHeightSegments: 6, // RESOLVED — low-poly leaf crown resolution
    treeBranchLength: 1.15, // RESOLVED — canopy support branch length
    treeBranchRadius: 0.105, // RESOLVED — branch thickness
    treeBranchStartY: 2.35, // RESOLVED — branch attachment height on the trunk
    treeBranchAngle: 0.7, // RESOLVED — upward branch angle
    treeTrunkColor: 0x765239, // RESOLVED — natural bark color
    treeMaterialRoughness: 0.92, // RESOLVED — matte natural materials
    treeCanopyColors: [0x397246, 0x4e8a4b, 0x609657], // RESOLVED — layered leafy canopy colors
    treeCanopyClusters: [
      { position: [-0.55, 3.28, 0.1], scale: [0.78, 0.68, 0.78] },
      { position: [0.5, 3.32, -0.12], scale: [0.82, 0.72, 0.8] },
      { position: [-0.08, 3.82, 0.06], scale: [0.95, 0.83, 0.94] },
      { position: [0.12, 4.28, -0.04], scale: [0.72, 0.64, 0.74] },
    ], // RESOLVED — overlapping foliage clusters form a full tree crown
    lightDuplexChance: 0.5, // RESOLVED — share of white duplex exteriors
    towerChance: 0.56, // RESOLVED — glass tower share of generated buildings
    towerMinWidth: 6, // RESOLVED — minimum tower width
    towerMaxWidth: 9, // RESOLVED — maximum tower width
    towerMinDepth: 6, // RESOLVED — minimum tower depth
    towerMaxDepth: 10, // RESOLVED — maximum tower depth
    towerMinHeight: 18, // RESOLVED — minimum tower height
    towerMaxHeight: 38, // RESOLVED — maximum tower height
    towerFloorHeight: 3.2, // RESOLVED — approximate floor height for tower facades
    towerWindowWidth: 1.6, // RESOLVED — approximate tower window width
    towerMinLevels: 4, // RESOLVED — minimum window rows on a tower
    towerMinColumns: 2, // RESOLVED — minimum window columns on a tower
    towerWindowRatio: 0.64, // RESOLVED — window size relative to each facade cell
    towerWindowVerticalOffsetRatio: 0.1, // RESOLVED — align windows within facade cells
    towerFrameRatio: 1.03, // RESOLVED — thin horizontal tower floor bands
    frameThickness: 0.12, // RESOLVED — facade frame thickness
    facadeOffset: 0.06, // RESOLVED — offset to prevent facade z-fighting
    facadeThickness: 0.08, // RESOLVED — window panel depth
    crownWidthRatio: 0.65, // RESOLVED — tower crown width ratio
    crownDepthRatio: 0.65, // RESOLVED — tower crown depth ratio
    crownHeight: 0.6, // RESOLVED — tower crown height
    crownRotationRadians: 0.08, // RESOLVED — subtle crown variation
    duplexMinWidth: 9, // RESOLVED — minimum modern duplex width
    duplexMaxWidth: 10, // RESOLVED — maximum modern duplex width
    duplexMinDepth: 8, // RESOLVED — minimum modern duplex depth
    duplexMaxDepth: 12, // RESOLVED — maximum modern duplex depth
    duplexMinHeight: 5, // RESOLVED — minimum duplex height
    duplexMaxHeight: 9, // RESOLVED — maximum duplex height
    roofOverhang: 0.8, // RESOLVED — duplex flat roof overhang
    roofThickness: 0.35, // RESOLVED — duplex flat roof thickness
    duplexAccentRatio: 0.56, // RESOLVED — contrasting duplex facade section width
    duplexAccentDepthRatio: 0.78, // RESOLVED — contrasting duplex facade section depth
    duplexWindowYRatio: 0.34, // RESOLVED — lower floor window height ratio
    duplexWindowRatio: 0.24, // RESOLVED — window width ratio on duplex facade
    duplexWindowHeightRatio: 0.19, // RESOLVED — window height ratio on duplex facade
    duplexWindowDepthMultiplier: 1.5, // RESOLVED — window placement offset multiplier
    duplexGarageRatio: 0.3, // RESOLVED — garage door width ratio
    duplexGarageHeightRatio: 0.34, // RESOLVED — garage door height ratio
    duplexGarageXRatio: 0.24, // RESOLVED — garage door horizontal placement ratio
    duplexGarageYRatio: 0.18, // RESOLVED — garage door vertical placement ratio
    duplexGarageDepthMultiplier: 2, // RESOLVED — garage placement offset multiplier
    duplexUpperAccentHeightRatio: 0.52, // RESOLVED — duplex upper facade accent height ratio
    duplexUpperAccentXRatio: 0.2, // RESOLVED — upper accent horizontal placement ratio
    duplexUpperAccentYRatio: 0.74, // RESOLVED — upper accent vertical placement ratio
    duplexBandHeightRatio: 0.18, // RESOLVED — duplex facade band height ratio
    duplexBandXRatio: 0.18, // RESOLVED — duplex band horizontal placement ratio
    duplexBandYRatio: 0.43, // RESOLVED — duplex band vertical placement ratio
    duplexWindowLeftXRatio: 0.17, // RESOLVED — first window horizontal placement ratio
    duplexWindowRightXRatio: 0.25, // RESOLVED — second window horizontal placement ratio
    roofShift: 0.25, // RESOLVED — slight roof offset variation
    glassColor: 0x326c86, // RESOLVED — reflective modern tower glass
    glassTintColor: 0x8bd0e8, // RESOLVED — tower window tint
    frameColor: 0x29343e, // RESOLVED — dark metallic tower frames
    whiteColor: 0xf2f0e8, // RESOLVED — modern duplex white finish
    charcoalColor: 0x343a40, // RESOLVED — modern duplex charcoal finish
    accentColor: 0xd4a35b, // RESOLVED — warm Lagos facade accent
    windowColor: 0x84cbe8, // RESOLVED — duplex glazing
    sidewalkColor: 0x454a50, // RESOLVED — dark concrete sidewalks
    glassMetalness: 0.82, // RESOLVED — reflective tower glass metalness
    glassRoughness: 0.16, // RESOLVED — reflective tower glass roughness
    tintMetalness: 0.72, // RESOLVED — tower window tint metalness
    tintRoughness: 0.2, // RESOLVED — tower window tint roughness
    frameMetalness: 0.65, // RESOLVED — tower frame metalness
    frameRoughness: 0.28, // RESOLVED — tower frame roughness
    exteriorRoughness: 0.82, // RESOLVED — duplex painted-wall roughness
    accentRoughness: 0.65, // RESOLVED — duplex accent roughness
    windowMetalness: 0.35, // RESOLVED — duplex window metalness
    windowRoughness: 0.24, // RESOLVED — duplex window roughness
    sidewalkRoughness: 0.95, // RESOLVED — sidewalk concrete roughness
    billboardSpacing: 150, // RESOLVED — roadside billboard interval along Z
    billboardSideChance: 0.5, // RESOLVED — chance to place each sign on the left
    billboardOffsetX: 24, // RESOLVED — keep the billboard frame's inner edge beyond the sidewalk
    billboardPoleWidth: 0.28, // RESOLVED — billboard support pole width
    billboardPoleHeight: 7, // RESOLVED — billboard support pole height
    billboardPoleDepth: 0.28, // RESOLVED — billboard support pole depth
    billboardWidth: 8, // RESOLVED — billboard frame width
    billboardHeight: 3.6, // RESOLVED — billboard frame height
    billboardDepth: 0.32, // RESOLVED — billboard frame depth
    billboardCanvasWidthRatio: 0.9, // RESOLVED — canvas width within frame
    billboardCanvasHeightRatio: 0.86, // RESOLVED — canvas height within frame
    billboardCanvasOffset: 0.02, // RESOLVED — canvas offset in front of frame
    billboardFrameColor: 0x212831, // RESOLVED — dark billboard frame
    billboardPoleColor: 0x3a424c, // RESOLVED — metallic billboard pole
    billboardColors: [0x00d5ff, 0xffe600, 0xff38c8], // RESOLVED — neon sign canvas colors
    billboardFrameRoughness: 0.58, // RESOLVED — billboard frame roughness
    billboardPoleMetalness: 0.72, // RESOLVED — billboard pole metalness
    billboardPoleRoughness: 0.34, // RESOLVED — billboard pole roughness
    billboardDayLightIntensity: 0.04, // RESOLVED — subtle billboard spill in daytime
    billboardNightLightIntensity: 240, // RESOLVED — strong night spill visible on the road and nearby scenery
    billboardLightDistance: 80, // RESOLVED — billboard light reaches from roadside signs to the road
    billboardLightDecay: 2, // RESOLVED — billboard light decay
    billboardLightOffset: 0.3, // RESOLVED — point light offset from canvas face
    billboardLightInwardOffset: 15, // RESOLVED — place spill source near the outer sidewalk edge
    dayNightCycleSeconds: 120, // RESOLVED — duration of one full day/night cycle
    daySunIntensity: 1, // RESOLVED — directional sunlight at daytime
    nightSunIntensity: 0.1, // RESOLVED — dim blue directional sunlight at night
    dayFillIntensity: 0.55, // RESOLVED — secondary daylight fill
    nightFillIntensity: 1.2, // RESOLVED — broad blue fill keeps the road clearly playable at night
    dayAmbientIntensity: 0.75, // RESOLVED — ambient light at daytime
    nightAmbientIntensity: 0.15, // RESOLVED — nonzero dark-blue ambient night floor
    daySunColor: 0xffffff, // RESOLVED — white daytime sunlight
    nightSunColor: 0x39466f, // RESOLVED — blue night sunlight
    dayFillColor: 0xbfe4ff, // RESOLVED — blue daylight fill
    nightFillColor: 0x829bd6, // RESOLVED — readable blue night fill
    dayAmbientColor: 0x9ecbff, // RESOLVED — blue ambient daylight
    nightAmbientColor: 0x0a0a23, // RESOLVED — dark-blue ambient night floor
    daySkyColor: 0x7fd4f5, // RESOLVED — daytime sky and fog color
    nightSkyColor: 0x0b1024, // RESOLVED — nighttime sky and fog color
  },

  // RESOLVED: roadside scenery — low-poly cartoon environment for Doge City.
  // All objects are primitives, pooled and recycled in render3d.js.
  scenery: {
    // RESOLVED: keep scenery clear of dogs waiting beside the right road edge.
    dogSideClearanceWorld: 0.5,
    // RESOLVED: sidewalk strip width on each side of the road (world units).
    sidewalkWidth: 2.0,
    // RESOLVED: spacing between scenery objects along the road (world units).
    spacing: 8,
    // RESOLVED: total scenery objects in the pool.
    poolSize: 72,
    // RESOLVED: distance behind camera at which objects are recycled.
    recycleBehindZ: 50,
    poolStartOffset: 60, // RESOLVED — forward offset for the first scenery object
    // RESOLVED: keep streetlight poles outside the sidewalk while their lights reach the road.
    streetlightOffsetX: 18,
    streetlightColor: 0xffaa44,
    streetlightDayIntensity: 0.05,
    streetlightNightIntensity: 5.0,
    streetlightDistance: 40,
    streetlightDecay: 2,
    streetlightHeadOffsetY: -0.8,
    // RESOLVED: dense recycled market row and utility corridor.
    environmentSeed: 20261009, // RESOLVED — repeatable roadside market layout seed
    marketStandSpacing: 8, // RESOLVED — POS umbrella stand interval on the right sidewalk
    marketStandJitterX: 0.32, // RESOLVED — small across-sidewalk placement variation
    marketStandJitterZ: 0.38, // RESOLVED — small along-street placement variation
    marketStandRotation: 0.2618, // RESOLVED — maximum stand yaw variation in radians
    marketStandScale: 0.82, // RESOLVED — keep stalls inside the sidewalk width
    marketThemes: [
      [0xd92f36, 0xffd23f], // RESOLVED — red and yellow market umbrella
      [0x1877b8, 0xffd23f], // RESOLVED — blue and yellow market umbrella
      [0x23823f, 0xffd23f], // RESOLVED — green and yellow market umbrella
    ],
    marketVendorEvery: 3, // RESOLVED — one low-poly vendor behind every third table
    marketVendorOffsetX: 1.95, // RESOLVED — vendor stands behind the table toward the buildings
    marketVendorSkinColor: 0x8c573b, // RESOLVED — market vendor skin tone
    marketVendorClothes: [0x1f5482, 0xb74635, 0x367247, 0xe5a92e], // RESOLVED — vendor clothing colors
    marketVendorHeadRadius: 0.2, // RESOLVED — vendor head size
    marketVendorHeadHeight: 0.37, // RESOLVED — vendor head height
    marketVendorHeadStretchY: 1.15, // RESOLVED — stylized low-poly head proportions
    marketVendorTorsoSize: [0.38, 0.58, 0.28], // RESOLVED — vendor torso proportions
    marketVendorStandingTorsoY: 1.02, // RESOLVED — standing vendor torso center
    marketVendorSittingTorsoY: 0.82, // RESOLVED — seated vendor torso center
    marketVendorLegLength: 0.48, // RESOLVED — vendor leg length
    marketVendorLegRadius: 0.11, // RESOLVED — vendor leg thickness
    marketVendorLegOffsetX: 0.12, // RESOLVED — spacing between legs
    marketVendorSittingLegScale: 0.7, // RESOLVED — shorten legs for the seated pose
    marketVendorSittingLegY: 0.26, // RESOLVED — seated leg height
    marketVendorSittingLegZ: -0.18, // RESOLVED — seated legs extend toward the table
    marketVendorArmLength: 0.46, // RESOLVED — vendor arm length
    marketVendorArmRadius: 0.075, // RESOLVED — vendor arm thickness
    marketVendorArmOffsetX: 0.27, // RESOLVED — arm shoulder spacing
    marketVendorArmOffsetY: -0.06, // RESOLVED — arm position relative to torso
    marketVendorArmOffsetZ: -0.12, // RESOLVED — arms reach toward the table
    marketVendorArmAngle: 0.12, // RESOLVED — slight relaxed arm angle
    marketVendorSeatSize: [0.42, 0.12, 0.38], // RESOLVED — small vendor seat proportions
    marketVendorSeatPosition: [0, 0.47, 0.08], // RESOLVED — seated vendor seat placement
    marketKioskEvery: 4, // RESOLVED — small kiosk appears every fourth market stand
    woodenStallEvery: 4, // RESOLVED — wooden market booth appears between metal kiosks
    woodenStallPhase: 2, // RESOLVED — stagger wooden booths between the kiosks
    woodenStallSize: [1.65, 1.55, 1.35], // RESOLVED — compact wooden market booth proportions
    woodenStallCounterHeight: 0.82, // RESOLVED — wooden stall counter height
    woodenStallPostSize: [0.09, 1.5, 0.09], // RESOLVED — wooden awning support post dimensions
    woodenStallRoofHeight: 1.58, // RESOLVED — wooden market stall canopy height
    woodenStallRoofSize: [1.78, 0.12, 1.48], // RESOLVED — wooden stall canopy dimensions
    woodenStallCounterSize: [1.65, 0.15, 0.46], // RESOLVED — wooden stall service counter
    woodenStallAwningColor: 0xd45b38, // RESOLVED — warm cloth stall awning
    marketKioskOffsetX: 3.65, // RESOLVED — set kiosks against the building side of the walk
    marketKioskSize: [1.35, 1.65, 1.5], // RESOLVED — compact corrugated kiosk dimensions
    marketKioskWallColor: 0x8b8d8b, // RESOLVED — galvanized kiosk wall color
    marketKioskRoofColor: 0x45494b, // RESOLVED — dark corrugated kiosk roof
    marketKioskRibCount: 7, // RESOLVED — visible vertical corrugation count
    marketKioskSignColor: 0xf2bf36, // RESOLVED — bright kiosk sign panel
    marketWoodColor: 0x87522f, // RESOLVED — timber booth structure color
    marketWoodLightColor: 0xb87943, // RESOLVED — lighter counter and trim color
    marketKioskWallThickness: 0.1, // RESOLVED — kiosk wall thickness
    marketKioskRoofOverhang: 0.2, // RESOLVED — kiosk roof overhang
    marketKioskRoofThickness: 0.16, // RESOLVED — kiosk roof slab thickness
    marketKioskSignOffset: 0.06, // RESOLVED — sign separation from the front wall
    marketKioskSignHeightRatio: 0.72, // RESOLVED — sign height on the kiosk wall
    marketKioskSignHeight: 0.25, // RESOLVED — kiosk sign panel height
    marketKioskSignWidthRatio: 0.7, // RESOLVED — sign width relative to kiosk depth
    marketKioskSignThicknessRatio: 0.55, // RESOLVED — sign panel thickness relative to kiosk walls
    marketKioskRibOffset: 0.07, // RESOLVED — corrugation offset from kiosk wall
    marketKioskRibThickness: 0.025, // RESOLVED — corrugation rib width
    marketKioskRibDepth: 0.035, // RESOLVED — corrugation rib depth
    marketKioskRibHeightRatio: 0.92, // RESOLVED — corrugation rib height
    utilitySpacing: 20, // RESOLVED — utility pole interval along both curbs
    utilityPoleOffsetX: 16.4, // RESOLVED — keep utility poles on outer sidewalk edge
    utilityPoleHeight: 7.4, // RESOLVED — pole height above the road
    utilityPoleRadius: 0.19, // RESOLVED — low-poly pole thickness
    utilityCrossarmWidth: 1.35, // RESOLVED — crossarm span
    utilityCrossarmHeight: 0.16, // RESOLVED — crossarm thickness
    utilityWireHeights: [6.2, 6.55, 6.9], // RESOLVED — separated overhead wire levels
    utilityWireSag: 0.42, // RESOLVED — visible wire sag between poles
    utilityWireRadius: 0.012, // RESOLVED — thin insulated power wire thickness
    utilityWireSegments: 10, // RESOLVED — smooth wire curve resolution
    utilityWireRadialSegments: 4, // RESOLVED — low-cost wire tube resolution
    utilityPoleSegments: 7, // RESOLVED — low-poly utility pole geometry
    utilityInsulatorSegments: 6, // RESOLVED — low-poly ceramic insulator geometry
    utilityInsulatorScale: [0.07, 0.2, 0.07], // RESOLVED — insulator proportions
    utilityInsulatorOffsetY: 0.08, // RESOLVED — wire seat above each insulator
    utilityWireLateralSpacingRatio: 0.72, // RESOLVED — spread wires across the crossarm
    utilityPoleColor: 0x71675b, // RESOLVED — weathered concrete pole color
    utilityMetalColor: 0x464b4e, // RESOLVED — dark utility crossarm and wire color
    utilityInsulatorColor: 0xd9d0bb, // RESOLVED — ceramic insulator color
    // RESOLVED: increase sidewalk foot traffic and shade a share of passers-by.
    pedestrianChance: 0.42, // RESOLVED — moderately denser sidewalk crowds
    pedestrianShopChance: 0.12,
    posVendorChance: 0.16, // RESOLVED — visible frequency of roadside POS recharge kiosks
    posVendorSide: -1, // RESOLVED — POS kiosks stay on screen-right sidewalk (negative X faces right)
    pedestrianGroupMax: 3, // RESOLVED — maximum pedestrians in each roadside group
    pedestrianGroupSpacing: 0.78, // RESOLVED — spacing between residents in a group
    sidewalkCrowdSpread: 1.8, // RESOLVED — people and stalls spread across the wider building-side sidewalk
    pedestrianDogChance: 0.52, // RESOLVED — share of groups accompanied by a street dog
    umbrellaChance: 0.5, // RESOLVED — share of residents sheltered by an umbrella
    birdFlockCount: 6, // RESOLVED — flocks distributed through the recycled scenery distance
    birdCountPerFlock: 3, // RESOLVED — birds in each overhead flock
    birdFlightHeight: 7.5, // RESOLVED — height above the street
    birdFlightXRange: [3.8, 8.2], // RESOLVED — spread of birds across the road and rooftops
    birdSpacingX: 0.72, // RESOLVED — bird spacing within a flock
    birdSpacingZ: 1.2, // RESOLVED — flock depth spread
    birdVerticalSpread: 0.45, // RESOLVED — slight height variation inside each flock
    birdWingRootOffset: 0.035, // RESOLVED — wing pivot spacing on the body
    birdHeadPosition: [0, 0.015, -0.12], // RESOLVED — bird head position
    birdBeakPosition: [0, 0, -0.18], // RESOLVED — bird beak position
    birdBeakRotationX: -1.5708, // RESOLVED — beak points forward along the street
    birdFlapAngle: 0.62, // RESOLVED — wing flap angle in radians
    birdFlapRate: 2.1, // RESOLVED — wing flap phase per world unit travelled
    birdDriftX: 0.45, // RESOLVED — gentle lateral flock drift
    birdDriftRate: 0.035, // RESOLVED — lateral drift phase per world unit travelled
    birdBobY: 0.18, // RESOLVED — gentle bird flight bob height
    birdWingLength: 0.44, // RESOLVED — visible wing span per side
    birdWingDepth: 0.13, // RESOLVED — wing silhouette depth
    birdWingLowerXRatio: 0.78, // RESOLVED — rear tip placement for the stylized bird silhouette
    birdWingDropRatio: 0.65, // RESOLVED — lower edge of each wing
    birdBodyScale: [0.11, 0.065, 0.16], // RESOLVED — low-poly bird body proportions
    birdHeadScale: [0.055, 0.05, 0.06], // RESOLVED — bird head proportions
    birdColor: 0x35343c, // RESOLVED — dark bird silhouette color
    birdBeakColor: 0xd99a3d, // RESOLVED — beak color
    birdGeometryWidthSegments: 7, // RESOLVED — low-poly bird body resolution
    birdGeometryHeightSegments: 5, // RESOLVED — low-poly bird body resolution
    birdBeakRadius: 0.035, // RESOLVED — bird beak base radius
    birdBeakHeight: 0.08, // RESOLVED — bird beak length
    birdBeakSegments: 4, // RESOLVED — low-poly beak resolution
    streetDogCoatColors: [0xb47743, 0x5c4033, 0xf0e8d8, 0x252324], // RESOLVED — tan, brown, cream, and black coats
    streetDogCreamColor: 0xdac9ad, // RESOLVED — muzzle and chest markings
    streetDogNoseColor: 0x211b19, // RESOLVED — nose color
    streetDogEyeColor: 0x171414, // RESOLVED — eye color
    streetDogCollarColor: 0xd9363e, // RESOLVED — collar color
    streetDogEarRadius: 0.095, // RESOLVED — pointed ear size
    streetDogEarHeight: 0.22, // RESOLVED — pointed ear size
    streetDogEarSegments: 5, // RESOLVED — low-poly ear resolution
    streetDogGeometryWidthSegments: 10, // RESOLVED — low-poly coat mesh resolution
    streetDogGeometryHeightSegments: 8, // RESOLVED — low-poly coat mesh resolution
    streetDogEyeScale: [0.035, 0.035, 0.035], // RESOLVED — visible dark eye detail
    streetDogEarRotation: 0.18, // RESOLVED — slight outward ear angle
    streetDogFootOffsetX: 0.025, // RESOLVED — paws sit slightly ahead of each leg
    streetDogTailAngle: 1.1, // RESOLVED — tail angle rising behind the body
    streetDog: {
      bodyPosition: [-0.02, 0.31, 0], // RESOLVED — torso center
      bodyScale: [0.42, 0.23, 0.25], // RESOLVED — torso proportions
      headPosition: [0.39, 0.48, 0], // RESOLVED — head center
      headScale: [0.2, 0.2, 0.19], // RESOLVED — head proportions
      muzzlePosition: [0.53, 0.42, 0], // RESOLVED — muzzle center
      muzzleScale: [0.13, 0.09, 0.12], // RESOLVED — muzzle proportions
      nosePosition: [0.65, 0.44, 0], // RESOLVED — nose position
      noseScale: [0.045, 0.04, 0.055], // RESOLVED — nose proportions
      chestPosition: [0.22, 0.29, 0], // RESOLVED — chest marking center
      chestScale: [0.2, 0.2, 0.21], // RESOLVED — chest marking proportions
      collarPosition: [0.3, 0.39, 0], // RESOLVED — collar center
      collarScale: [0.08, 0.07, 0.27], // RESOLVED — collar proportions
      eyeX: 0.49, // RESOLVED — eye position on X
      eyeY: 0.54, // RESOLVED — eye height
      eyeZ: 0.125, // RESOLVED — eye spacing on Z
      earX: 0.31, // RESOLVED — ear position on X
      earY: 0.64, // RESOLVED — ear height
      earZ: 0.12, // RESOLVED — ear spacing on Z
      legX: [-0.25, 0.23], // RESOLVED — front/rear leg positions
      legZ: [-0.16, 0.16], // RESOLVED — left/right leg positions
      legY: 0.13, // RESOLVED — leg center height
      legHeight: 0.24, // RESOLVED — leg length
      legRadius: 0.055, // RESOLVED — leg thickness
      footScale: [0.075, 0.045, 0.065], // RESOLVED — paw proportions
      footY: 0.035, // RESOLVED — paw height
      tailPosition: [-0.39, 0.39, 0], // RESOLVED — tail root
      tailLength: 0.28, // RESOLVED — tail length
      tailRadius: 0.045, // RESOLVED — tail thickness
      companionOffsetX: 0.85, // RESOLVED — dog spacing beside its person
      companionOffsetZ: 0.28, // RESOLVED — dog offset along the sidewalk
    },
    // RESOLVED: bright painted wall colors for houses and stalls.
    houseColors: [0xffce4d, 0xf7a96b, 0x6bc1f7, 0xa8e667, 0xffd8a8],
    fenceColor: 0x8d6e62,
    doorColor: 0x8d5a3d,
    windowColor: 0x90caf9,
    lampPoleColor: 0x4a4a58,
    lampGlass: 0xffff91,
    palmTrunkColor: 0x8d6e62,
    palmLeafColor: 0x388e3c,
    awningColor: 0xff6b6b,
    shopSignColor: 0x173b67,
    posVendorRed: 0xd92f36, // RESOLVED — alternating parasol stripe
    posVendorBlue: 0x1877b8, // RESOLVED — blue parasol stripe theme
    posVendorGreen: 0x23823f, // RESOLVED — green parasol stripe theme
    posVendorYellow: 0xffd23f, // RESOLVED — alternating parasol stripe
    posVendorWood: 0x9a633b, // RESOLVED — wooden POS table and pole
    posVendorWoodLight: 0xbd8050, // RESOLVED — table surface highlight
    posVendorMachine: 0x262a2d, // RESOLVED — POS terminal casing
    posVendorScreen: 0x8bc8bd, // RESOLVED — POS terminal screen
    posVendorStool: 0x16878a, // RESOLVED — plastic stool
    posVendor: {
      parasolSegments: 8, // RESOLVED — alternating low-poly canopy panels
      parasolRadius: 1.05, // RESOLVED — canopy radius
      parasolHeight: 0.3, // RESOLVED — shallow canopy depth
      poleHeight: 2.15, // RESOLVED — table-to-canopy pole height
      tableWidth: 1.9, // RESOLVED — tabletop width
      tableDepth: 0.82, // RESOLVED — tabletop depth
      tableTopY: 1.08, // RESOLVED — tabletop center height
      stoolOffsetX: 1.45, // RESOLVED — stool placement beside table
      tableThickness: 0.12, // RESOLVED — tabletop thickness
      tableLegX: 0.72, // RESOLVED — table leg half spacing on X
      tableLegZ: 0.28, // RESOLVED — table leg half spacing on Z
      tableLegSize: 0.12, // RESOLVED — square table leg width/depth
      tableBraceY: 0.42, // RESOLVED — lower table brace height
      tableBraceWidth: 1.45, // RESOLVED — lower table brace width
      poleRadius: 0.035, // RESOLVED — parasol support pole radius
      machinePosition: [0.38, 0.22, 0.12], // RESOLVED — terminal position relative to tabletop
      machineSize: [0.3, 0.32, 0.24], // RESOLVED — terminal casing dimensions
      screenOffset: [0, 0.05, 0.125], // RESOLVED — screen offset from terminal
      screenSize: [0.21, 0.1, 0.015], // RESOLVED — terminal screen dimensions
      keypadOffset: [0, -0.09, 0.125], // RESOLVED — keypad offset from terminal
      keypadSize: [0.18, 0.035, 0.015], // RESOLVED — keypad dimensions
      cardCount: 3, // RESOLVED — number of recharge cards in the stack
      cardPosition: [-0.34, 0.09, 0.14], // RESOLVED — first recharge-card position relative to tabletop
      cardStepY: 0.035, // RESOLVED — card stack vertical spacing
      cardSize: [0.42, 0.035, 0.3], // RESOLVED — recharge-card dimensions
      stoolSeatY: 0.48, // RESOLVED — stool seat center height
      stoolSeatSize: [0.34, 0.14, 0.34], // RESOLVED — stool seat dimensions
      stoolLegOffsets: [-0.2, 0.2], // RESOLVED — stool leg corner offsets
      stoolLegY: 0.24, // RESOLVED — stool leg center height
      stoolLegSize: [0.08, 0.48, 0.08], // RESOLVED — stool leg dimensions
    },
    waterTankChance: 0.78, // RESOLVED — most low-rise roofs have black water tanks
    waterTankColor: 0x171a1b, // RESOLVED — black plastic rooftop tank
    waterTankRadius: 0.48, // RESOLVED — rooftop tank radius
    waterTankHeight: 0.92, // RESOLVED — rooftop tank height
    waterTankSegments: 9, // RESOLVED — low-poly rooftop tank geometry
    waterTankRimHeight: 0.09, // RESOLVED — raised tank lid rim
    waterTankRoofClearanceRatio: 2.5, // RESOLVED — keep water tanks clear of roof edges
    waterTankLidScale: 1.08, // RESOLVED — lid lip extends past the tank body
    simpleSphereRadius: 0.15, // RESOLVED — shared small character sphere radius
    simpleSphereSegments: 8, // RESOLVED — shared low-poly character sphere resolution
    pedestrianColors: [0x2b6cb0, 0xe85d3f, 0x5b8c3a, 0xf2c14e],
    cameraHeight: 5.1, // RESOLVED — angled down enough to show the neighbourhood
    cameraLookHeight: 0.7, // RESOLVED
    cameraLookAhead: 14, // RESOLVED
  },

  // RESOLVED: the van must nearly stop in the marked right-lane zone for dogs to board.
  parking: {
    stopSpeed: 8,       // RESOLVED — near-stationary threshold for dog boarding
    parkDuration: 1.5,  // RESOLVED — aligns dog boarding with the stop dwell
  },

  // RESOLVED — roadside driving-game stop zones. Distances use the game's
  // distance unit (metres); stop artwork is generated from primitive meshes.
  stops: {
    goal: 14, // RESOLVED — stops shown in the HUD goal
    firstStopMeters: 140, // RESOLVED — first dog rescue stop appears early
    intervalMeters: 900, // RESOLVED — rescue stops stay occasional
    zoneLengthMeters: 72, // RESOLVED — doubled stop strip length for easier braking and boarding
    dwellSeconds: 1.5, // RESOLVED — continuous brake hold duration
    speedThresholdKph: 3, // RESOLVED — maximum speed allowed while boarding
    warningMeters: 50, // RESOLVED — minimum warning distance
    extraBrakingWarningMeters: 20, // RESOLVED — early warning buffer at higher speeds
    visibleAheadMeters: 220, // RESOLVED — show the next bay well before arrival
    visibleBehindMeters: 5, // RESOLVED — keep the strip briefly visible after passing
    visibleZoneCount: 3, // RESOLVED — number of future zone records
    laneWidthRatio: 0.82, // RESOLVED — yellow stop strip width inside the right lane
    zigzagCount: 8, // RESOLVED — end-of-zone zigzag marks
    zigzagStripeRatio: 1.25, // RESOLVED — stripe width relative to its zigzag segment
    zigzagStripeDepth: 0.16, // RESOLVED — stripe depth in world units
    zigzagThickness: 0.035, // RESOLVED — stripe height in world units
    zigzagEndInset: 0.28, // RESOLVED — inset from strip end in world units
    zigzagStagger: 0.08, // RESOLVED — alternating zigzag offset in world units
    zigzagAngle: 0.58, // RESOLVED — stripe angle in radians
    paintLift: 0.045, // RESOLVED — painted strip height above road
    zigzagLift: 0.06, // RESOLVED — zigzag mark height above road
    names: ['Barracks', 'Palm Grove', 'Market Road', 'Waterfront', 'New Town'], // RESOLVED — stop names
    rewardPoints: 250, // RESOLVED — base points for a completed stop
    earlyStopBonus: 150, // RESOLVED — maximum bonus for stopping near zone start
    perfectStopSeconds: 1.25, // RESOLVED — time window for the perfect-stop bonus
    perfectTimeBonus: 100, // RESOLVED — bonus points for a timely stop
    comboBonusPoints: 50, // RESOLVED — points added for each consecutive stop
    feedbackSeconds: 2.4, // RESOLVED — stop success message duration
  },

  palette: {
    skyTop: '#2b3a67',
    skyBottom: '#f2994a',
    road: '#2a2a34',
    roadEdge: '#f2f2f2',
    laneMark: '#f2f2f2',
     building: '#1d2440',
    buildingLit: '#ffd166',
    stopZone: '#ffeb3b',
    stopZoneEdge: '#fff6b0',
    stopSuccess: '#6de39b',
    sidewalk: '#c3b19b',
    roadside: '#454a50',
    vanBody: '#f2f2f2',
    vanAccent: '#e8b931',
    vanGlass: '#4a90d9',
    hudText: '#f2f2f2',
    hudShadow: '#0b0d17',
    carBody: ['#ff4d4d', '#ffc93c', '#3ddc97', '#4d96ff', '#c77dff'],
    carCabin: '#f3f6ff',
    carGlass: '#9fd8ff',
    carLight: '#ff5252',
    carTyre: '#22252e',
    bone: '#f5f0e1',
    boneShade: '#cfc4a6',
     dogFur: '#d4a24c',
    dogFurDark: '#a97a2e',
    dogFurBlack: '#2a2a34',
    dogFurBrown: '#8d5a3d',
    dogFurGolden: '#ffd166',
    dogFurSpotted: '#d6c7a6',
    dogMuzzle: '#f5efe0',
    dogNose: '#141821',
    vanWindow: '#2f4a63',
    vanHatch: '#1a1d26',
    vanTrim: '#292c35',
    vanTailLamp: '#d94343',
  },
};
