// UNDECIDED entries are placeholders, not spec. See docs/concept.md,
// section "UNDECIDED - awaiting user answer". Rename/revalue once answered.
export const DEBUG = false; // Set to true to enable debug mode (spawn test bay, show debug info)

export const CONFIG = {
  logicalWidth: 480,
  logicalHeight: 800,
  render: {
    maxPixelRatio: 1.75, // Render finer vehicle and road edges on desktop and high-DPI displays
    lowPowerPixelRatio: 1.15, // Keep mobile rendering crisp while capping GPU cost
    lowPowerThreadCount: 2, // RESOLVED — reserve reduced resolution for very limited CPUs
    lowPowerMemoryGb: 2, // RESOLVED — reserve reduced resolution for very limited memory
    lowPowerShadows: true, // RESOLVED — preserve depth and shape detail on phones
    lowPowerAntialias: true, // RESOLVED — keep edges smooth on every device profile
  },

  hud: {
    topBarLeftX: 10, // RESOLVED — inset the left status cards from the screen edge
    topBarRightX: 340, // RESOLVED — align resources and onboard dog count at the right
    topBarY: 12, // RESOLVED — keep the HUD tight to the top edge
    topBarLeftWidth: 130, // RESOLVED — leave clear space for the centered objective
    distanceCardHeight: 54, // RESOLVED — fit distance and an adjacent pause control
    distanceLabelX: 20, // RESOLVED — align the distance label inside its card
    distanceLabelY: 26, // RESOLVED — place the distance label in the upper card row
    distanceValueY: 48, // RESOLVED — place the distance value below its label
    distanceValueMaxWidth: 78, // RESOLVED — keep the value clear of the pause control
    speedCardY: 76, // RESOLVED — place van speed directly below distance
    speedCardHeight: 42, // RESOLVED — keep the speed card compact
    resourceCardHeight: 56, // RESOLVED — fit paired bone and coin counters
    resourceLabelOffsetX: [34, 96], // RESOLVED — center the two resource labels in their card
    resourceLabelY: 28, // RESOLVED — position resource labels above their totals
    resourceValueY: 51, // RESOLVED — align resource totals on one row
    dogsCardY: 76, // RESOLVED — place onboard dog count below resource counters
    dogsCardHeight: 42, // RESOLVED — keep onboard count compact
    taskCardWidth: 184, // RESOLVED — fit the objective between side cards
    taskCardHeight: 62, // RESOLVED — fit task text and progress bar in the top bar
    taskTextY: 31, // RESOLVED — align objective text above its progress bar
    taskBarWidth: 152, // RESOLVED — fit the progress bar within the objective card
    taskBarHeight: 12, // RESOLVED — make progress easy to see at game scale
    taskBarY: 48, // RESOLVED — position progress below the objective text
    taskCardRadius: 14, // RESOLVED — use rounded corners for the objective panel
    taskStrokeWidth: 2, // RESOLVED — keep the colored objective outline crisp
    taskTextMaxWidthInset: 14, // RESOLVED — keep task copy inside the objective panel
    taskBarRadius: 5, // RESOLVED — round the objective progress bar ends
    stopWarningX: 32, // RESOLVED — inset the temporary stop prompt from the road edges
    stopWarningHeight: 42, // RESOLVED — keep the temporary stop prompt compact
    stopWarningTextYInset: 21, // RESOLVED — center stop prompt text in its panel
    stopWarningTextWidthInset: 84, // RESOLVED — preserve padding around stop prompt text
    rescueStatusY: 124, // RESOLVED — reserve a slim row for active rescue status
    rescueStatusHeight: 38, // RESOLVED — keep active stop status compact
    hitCountY: 84, // RESOLVED — keep the impact counter beneath the objective card
    stopWarningY: 170, // RESOLVED — show braking prompts below the top HUD
    boardingCardY: 220, // RESOLVED — show boarding progress only during a stop
    boardingLabelY: 237, // RESOLVED — center the boarding label in its card
    boardingBarY: 253, // RESOLVED — place boarding progress beneath its label
    boardingCardX: 76, // RESOLVED — center boarding progress within the road view
    boardingCardHeight: 54, // RESOLVED — fit boarding label and progress bar
    boardingBarX: 102, // RESOLVED — inset the boarding progress bar from its panel
    boardingBarWidthInset: 204, // RESOLVED — keep the boarding progress bar inside its panel
    boardingBarHeight: 9, // RESOLVED — keep boarding progress clear but unobtrusive
    pauseLeftPercent: 21, // RESOLVED — place pause within the distance card
    pauseTopPercent: 2, // RESOLVED — align pause with the top edge of the distance card
    pauseSizePercent: 8, // RESOLVED — size pause to fit comfortably inside the distance card
    scoreCardWidth: 80, // RESOLVED — center the score under the rescue task and clear the top-right pause area
    scoreCardY: 78, // RESOLVED — keep the score close to the rescue task without covering the pickup or speed cards
    onboardCardRightOffset: 136, // RESOLVED — leave a clear gap between the compact dog count and the pause button
    onboardCardY: 12, // RESOLVED — align the dog count with the top dashboard cards
    onboardCardWidth: 72, // RESOLVED — fit the dog count in the open space beside pause
    onboardCardHeight: 44, // RESOLVED — keep the count legible in a compact pill
    environmentCardX: 12, // RESOLVED — place the active city condition below the route cards
    environmentCardY: 232, // RESOLVED — keep the event label clear of the stop warning
    environmentCardWidth: 202, // RESOLVED — fit short event labels on phones
    environmentCardHeight: 34, // RESOLVED — compact city condition indicator
  },

  nitro: {
    cameraLeadWorld: 2.6, // RESOLVED — nudge the van forward in view while GAS is held
    cameraBlendRate: 5, // RESOLVED — ease the nitro camera nudge in and out smoothly
    outerFlameColor: 0x27cfff, // RESOLVED — bright blue outer nitro plume
    innerFlameColor: 0xd6fbff, // RESOLVED — hot pale-blue core for the plume
    exhaustWidthRatio: 0.29, // RESOLVED — separate twin jets beneath the rear bumper
    exhaustHeight: 0.88, // RESOLVED — compact exhaust length that stays readable behind the van
    exhaustRadius: 0.25, // RESOLVED — visible outer flame width
    coreHeight: 0.68, // RESOLVED — shorter, brighter core inside each plume
    coreRadius: 0.13, // RESOLVED — narrow hot center of each plume
    exhaustY: 0.34, // RESOLVED — place jets low near the rear wheels
    pulseFrequency: 18, // RESOLVED — quick flame flicker while boosting
    pulsePhaseOffset: 0.8, // RESOLVED — stagger the twin exhaust flicker
    pulseBase: 0.76, // RESOLVED — keep flames extended throughout a boost
    pulseAmplitude: 0.2, // RESOLVED — make the flame length visibly fluctuate
    corePulseRatio: 0.84, // RESOLVED — keep the bright core shorter than the outer flame
    glowScaleBase: 0.72, // RESOLVED — minimum size of the exhaust glow
    glowScalePulseRatio: 0.18, // RESOLVED — let the glow swell with each flame pulse
    glowRadiusRatio: 0.72, // RESOLVED — size the glow around each exhaust outlet
    initialFlameScale: 0.2, // RESOLVED — hide the flame length before the first boost frame
    outerBaseZOffset: 0.04, // RESOLVED — tuck the outer flame base under the rear bumper
    coreBaseZOffset: 0.06, // RESOLVED — place the hot core just behind the outer flame base
    glowBaseZOffset: 0.08, // RESOLVED — align the glow with the exhaust outlet
    outerOpacity: 0.82, // RESOLVED — bright translucent outer flame
    coreOpacity: 0.92, // RESOLVED — nearly solid bright flame center
    glowOpacity: 0.52, // RESOLVED — soft blue light at each exhaust outlet
    flameSegments: 12, // RESOLVED — keep the plume smooth without adding much geometry
    coreSegments: 10, // RESOLVED — smooth narrow flame core
    glowSegments: 8, // RESOLVED — low-cost rounded exhaust glow
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
    start: 500, // RESOLVED — start at a brisker arcade pace
    max: 1250, // RESOLVED — raise the normal cruising speed for faster runs
    rampSeconds: 75, // RESOLVED — reach top cruising speed sooner
    distanceBonusMax: 180, // RESOLVED — add a modest speed increase over a long run
    distanceBonusFullMeters: 12000, // RESOLVED — reach the full distance speed bonus alongside late-run traffic difficulty
    // SPEED button: hold to boost above the ramp speed.
    boostMultiplier: 1.9,   // RESOLVED — hold → ramp speed × 1.9 for a stronger boost
    maxBoost: 2300,         // RESOLVED — allow a higher boosted speed cap
    boostAccel: 2000,       // RESOLVED — reach the faster boost speed promptly
    // BRAKE button: hold to slow down, can stop fully.
    brakeStrength: 1450,    // RESOLVED — restore the original sharp braking response
    reverseMax: 260,        // RESOLVED — controlled reverse speed outside an active yellow bay
    reverseAccel: 520,      // RESOLVED — reverse begins after braking through zero
    cruiseRecoveryRate: 5, // RESOLVED — exponential speed recovery after BRAKE is released
  },

  jump: {
    durationSeconds: 1.35, // RESOLVED — give the van time to pass a vehicle before landing
    maxHeight: 2.8, // RESOLVED — lift the van clearly above cars and their roofs
    cooldownSeconds: 0.18, // RESOLVED — prevent rapid repeated hops
    obstacleClearanceHeight: 0.68, // RESOLVED — jump height needed to clear a hazard
    vehicleClearanceHeight: 2.1, // RESOLVED — van must rise above traffic to clear a vehicle
  },

  obstacles: {
    seedSalt: 0xc2b2ae35, // RESOLVED — keeps obstacle patterns independent from traffic and dog spawning
    waveSeedMultiplier: 65537, // RESOLVED — deterministic per-wave obstacle layout
    spawnChance: 0.56, // RESOLVED — occasional small hazards keep the road readable
    spawnChanceAtFullDifficulty: 0.9, // Later runs get hazards on most waves with an open escape lane
    spawnLeadPx: 1100, // Show hazards at the far road entrance and leave time to react
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
    oilSlickWidth: 72, // Readable while staying within one lane
    oilSlickDepth: 84, // Elongated patch gives the player time to react
    oilSlickSeconds: 4.5, // Steering stays loose briefly after driving through oil
    oilSlideMultiplier: 3.2, // Lane changes are clearly slower while traction is low
    oilImpactSeconds: 1.8, // Hold the impact shake long enough to register
    oilDriftSeconds: 0.9, // Brief sideways skid that remains within steering control
    oilDriftDistance: 30, // Move toward the neighboring lane without forcing a full lane change
    oilHitShake: 0.34, // Strong camera jolt on direct oil contact
    oilSlickColor: 0x17232c, // Glossy blue-black oil stands out on asphalt
    oilHighlightColor: 0x9bc4ce, // Pale reflections make the oil readable
    potholeWidth: 72, // Avoidable single-lane pothole footprint
    potholeDepth: 72,
    potholeSlowSeconds: 1.6, // Keep the van slowed after a direct pothole hit
    potholeSpeedMultiplier: 0.62, // Restrict speed while recovering, including with gas held
    potholeSpeedLoss: 320, // Immediate speed drop makes the hit noticeable
    potholeHitShake: 0.2, // Give pothole impacts a clear visual jolt
    potholeRimColor: 0x756957, // Broken asphalt edge around the depression
    potholeInnerColor: 0x111416, // Dark center makes the pothole read clearly
    segments: 10, // RESOLVED — low-poly hazard geometry detail
    crateRoughness: 0.84, // RESOLVED — matte wooden crate finish
  },

  progression: {
    levelCount: 4, // RESOLVED — each selectable region has four rescue routes
    levelSpeedBonus: 18, // RESOLVED — later routes add a modest speed challenge
  },

  cityConditions: {
    firstEventMeters: 850, // RESOLVED — let each run establish its city before the first special stretch
    segmentMeters: 1800, // RESOLVED — space changing city events along the route
    activeMeters: 1050, // RESOLVED — keep each city event noticeable without making it constant
    eventChance: 0.82, // RESOLVED — leave occasional calm stretches between events
    seedSalt: 0x3c6ef372, // RESOLVED — keep city event choices stable for a run seed
    segmentSeedMultiplier: 0x9e3779b1, // RESOLVED — generate a distinct repeatable event choice for each segment
    eventWeights: { rain: 24, sunset: 18, roadworks: 24, market: 34 }, // RESOLVED — make busy market stretches most common
    rainCount: 150, // RESOLVED — lightweight rainfall streak count
    rainColor: 0xc7e6ff, // RESOLVED — bright streaks remain visible against the road
    rainOpacity: 0.64, // RESOLVED — rain stays noticeable without obscuring the road
    petalOpacity: 0.94, // RESOLVED — blossoms remain bright while showing the scenery behind them
    roadworkGeometrySegments: 7, // RESOLVED — low-poly cone resolution for roadside props
    roadworkSignTextWidth: 2.5, // RESOLVED — keep the warning legible on the work-zone sign
    rainFallSpeed: 24, // RESOLVED — steady rain drift across the camera view
    rainWidth: 38, // RESOLVED — cover the full road and roadside view
    rainHeight: 25, // RESOLVED — distribute rain above and below the camera center
    rainDepth: 58, // RESOLVED — layer rain across the visible street depth
    rainStreakLength: 0.72, // RESOLVED — short angled streaks read as rain at driving speed
    rainDrift: 1.8, // RESOLVED — slight sideways wind during rain
    rainSkyColor: 0x70879a, // RESOLVED — cloudy sky during rain events
    rainFogColor: 0x788995, // RESOLVED — cool rainy haze
    rainSunIntensity: 0.56, // RESOLVED — soften daylight during rain
    rainHemisphereIntensity: 0.68, // RESOLVED — lower ambient light during rain
    wetRoadTint: 0x7f929d, // RESOLVED — cool the asphalt during rainy stretches
    wetRoadRoughness: 0.3, // RESOLVED — make rain-darkened asphalt slightly reflective
    wetRoadMetalness: 0.14, // RESOLVED — give wet road a restrained sheen
    sunsetSkyColor: 0xf4a177, // RESOLVED — warm orange-pink sky for sunset events
    sunsetFogColor: 0xd78a70, // RESOLVED — warm haze below the sunset horizon
    sunsetSunIntensity: 0.82, // RESOLVED — warm late-day lighting without hiding road detail
    sunsetHemisphereIntensity: 0.9, // RESOLVED — retain readable shaded surfaces at sunset
    petalCount: 36, // RESOLVED — lighter animated blossom stream for smoother Sakura City play
    petalColor: 0xffb7cf, // RESOLVED — soft cherry blossom pink
    petalFallSpeed: 2.7, // RESOLVED — gentle drifting petals
    petalWindSpeed: 1.2, // RESOLVED — soft sideways breeze for blossom petals
    petalAreaWidth: 20, // RESOLVED — spread petals across the phone camera view
    petalAreaHeight: 16, // RESOLVED — keep petals visible from the horizon to the van
    petalMinimumDepth: 12, // RESOLVED — keep petals in front of the camera near plane
    petalAreaDepth: 32, // RESOLVED — layer petals through the visible Sakura street
    petalSize: [0.18, 0.035, 0.12], // RESOLVED — clear flat petal silhouettes at phone scale
    petalResetHeight: 9, // RESOLVED — respawn petals above the camera view
    petalSegments: [8, 6], // RESOLVED — low-poly petals keep the weather effect light
    petalWobble: 0.62, // RESOLVED — sway petals gently in the breeze
    petalWobbleFrequency: 1.8, // RESOLVED — set the pace of the petal sway
    roadworkConeCount: 7, // RESOLVED — cones line a short roadside work area
    roadworkConeColor: 0xff7b2f, // RESOLVED — visible traffic-safety orange
    roadworkBarrierColor: 0xf3d448, // RESOLVED — bright striped work barriers
    roadworkSignColor: 0x26313a, // RESOLVED — dark work-zone sign backing
    roadworkPropSpacing: 3.2, // RESOLVED — safe spacing between roadside cones
    roadworkDepth: 36, // RESOLVED — length of a visible roadside work zone
    minimumPropViewDistance: 10, // RESOLVED — recycle roadside props before they pass under the camera
    roadworkConeSize: [0.32, 0.7, 0.32], // RESOLVED — compact roadside safety cones
    roadworkBarrierSize: [3.4, 0.72, 0.18], // RESOLVED — striped roadside work barrier
    roadworkSignSize: [2.8, 1.35, 0.14], // RESOLVED — readable roadside work warning sign
    roadworkSignPoleHeight: 1.75, // RESOLVED — raise the work sign above its barrier
    roadworkSignTextSize: [2.45, 0.84], // RESOLVED — inset sign text inside its backing
    roadworkSignCanvasSize: [512, 256], // RESOLVED — crisp work-zone lettering texture
    roadworkSignTextColor: 0xfff3c4, // RESOLVED — high-contrast warning lettering
    roadworkSignBackgroundColor: 0x9a3e2e, // RESOLVED — work-zone red sign backing
    roadworkTrafficDifficulty: 0.72, // RESOLVED — add a moderate traffic challenge through work zones
    marketBaseColor: 0x6b4936, // RESOLVED — dark wood for roadside market counters
    marketStallSpacingZ: 6.4, // RESOLVED — stagger the market stalls into the distance
    marketCounterHeightRatio: 0.44, // RESOLVED — keep merchandise counter below the canopy
    marketCounterDepthRatio: 0.7, // RESOLVED — make the counter shallower than the stall awning
    marketCanopyWidthRatio: 1.12, // RESOLVED — let the awning overhang the counter
    marketCanopyHeightRatio: 0.16, // RESOLVED — slim striped canopy profile
    marketCanopyYOffsetRatio: 0.78, // RESOLVED — lift the canopy above the counter
    marketPostSize: 0.12, // RESOLVED — narrow canopy support posts
    marketPostHeightRatio: 0.68, // RESOLVED — posts span most of the stall height
    marketPostXRatio: 0.44, // RESOLVED — place posts near the canopy edges
    marketPostYOffsetRatio: 0.42, // RESOLVED — center posts between counter and canopy
    roadworkViewDistance: 31, // RESOLVED — place warning props in front of the van
    roadworkViewHeight: -5, // RESOLVED — keep props low in the chase-camera view
    roadworkSignXRatio: 1.38, // Keep the warning sign beyond the road edge
    roadworkRoadEdgeRatio: 1.38, // Keep work barriers and cones fully off the drivable road
    marketViewDistance: 34, // RESOLVED — stage market stalls farther ahead than the van
    marketRepeatDepth: 42, // RESOLVED — repeat stalls through the busy market stretch
    marketRoadEdgeRatio: 0.92, // RESOLVED — keep market canopies visible while favoring the road edge
    marketViewHeight: -4.2, // RESOLVED — align vendor stalls with the roadside in view
    marketStallWidth: 2.2, // RESOLVED — compact roadside market stall width
    marketStallHeight: 1.9, // RESOLVED — readable vendor canopy height
    marketStallDepth: 1.6, // RESOLVED — small market stall depth
    marketStallColor: 0xc84d42, // RESOLVED — warm market awning color
    marketTrimColor: 0xf3d78c, // RESOLVED — bright market canopy trim
  },

  companion: {
    reactionSeconds: 2.6, // RESOLVED — keep Kabosu reactions readable during play
    idleMessage: 'READY TO RESCUE', // RESOLVED — friendly idle co-pilot prompt
    rescueMessage: 'WOOF! SAFE!', // RESOLVED — celebrate every rescued dog
    collisionMessage: 'WATCH OUT!', // RESOLVED — warn after a traffic impact
    shieldMessage: 'NICE SAVE!', // RESOLVED — celebrate a shielded collision
    oilSlickMessage: 'SLIPPERY ROAD!', // Warn when oil reduces steering grip
    jumpMessage: 'WHEE!', // RESOLVED — react to a successful jump
    hornMessage: 'KABOSU SAYS WOOF!', // RESOLVED — acknowledge the horn
    marketMessage: 'BUSY MARKET!', // RESOLVED — announce a lively market stretch
    rainMessage: 'RAINY ROAD!', // RESOLVED — announce wet weather
    sunsetMessage: 'GOLDEN HOUR!', // RESOLVED — announce sunset lighting
    roadworksMessage: 'ROADWORKS AHEAD!', // RESOLVED — announce a work zone
    faceColor: 0xd99b55, // RESOLVED — warm Shiba-like Kabosu coat
    muzzleColor: 0xf3dfbd, // RESOLVED — pale cream muzzle
    earColor: 0x9d542f, // RESOLVED — darker warm ears
    collarColor: 0x35a878, // RESOLVED — rescue-green collar
    noseColor: 0x211b19, // RESOLVED — dark nose
    headScale: [0.33, 0.3, 0.24], // RESOLVED — compact Shiba-like co-pilot head
    muzzleScale: [0.17, 0.105, 0.14], // RESOLVED — soft cream muzzle
    earScale: [0.12, 0.23, 0.09], // RESOLVED — upright Shiba ears
    eyeScale: [0.045, 0.055, 0.035], // RESOLVED — dark expressive eyes
    noseScale: [0.07, 0.05, 0.045], // RESOLVED — small centered nose
    collarSize: [0.25, 0.045, 0.2], // RESOLVED — green rescue collar around the neck
    rearFaceOffset: 0.12, // RESOLVED — bring Kabosu forward of the rear cage for visibility
    headYOffset: 0.54, // RESOLVED — place Kabosu at the upper rear window
    earWiggle: 0.16, // RESOLVED — animate the co-pilot's ears during reactions
    idleBobAmplitude: 0.045, // RESOLVED — subtle co-pilot idle motion
    idleBobFrequency: 3.4, // RESOLVED — relaxed co-pilot idle pace
    reactionTilt: 0.2, // RESOLVED — make reactions visible without obscuring the van
    sphereSegments: [16, 12], // RESOLVED — smooth low-poly co-pilot face geometry
    coneSegments: 7, // RESOLVED — low-poly upright ears
    earLeanRadians: 0.18, // RESOLVED — tip the ears outward slightly
    lowerFaceScale: [0.84, 0.8, 0.86], // RESOLVED — round lower cheek shape
    lowerFaceYOffsetRatio: 0.56, // RESOLVED — overlap the muzzle with the head
    earPositionRatios: [0.68, 0.82], // RESOLVED — place ears above the cheeks
    eyePositionRatios: [0.39, 0.1, 0.88], // RESOLVED — eye spacing and rear-facing placement
    muzzlePositionRatios: [-0.22, -0.98], // RESOLVED — muzzle sits below and forward of the face
    nosePositionRatios: [-0.11, -1.42], // RESOLVED — nose reaches the tip of the muzzle
    collarYOffsetRatio: 0.92, // RESOLVED — place the collar below the head
    collarSegments: [8, 20], // RESOLVED — simple low-cost collar ring
    earWiggleFrequencyRatio: 1.6, // RESOLVED — keep the ear flutter quicker than the head bob
    iconEarWidthRatio: 0.42, // RESOLVED — size Kabosu's upright icon ears
    iconEarHeightRatio: 0.62, // RESOLVED — keep the Shiba ears distinct in the HUD
    iconEarOffsetRatio: 0.5, // RESOLVED — space the ears around the head
    iconEyeOffsetRatio: 0.34, // RESOLVED — set the face's eye spacing
    iconEyeYOffsetRatio: 0.08, // RESOLVED — place eyes above the muzzle
    iconMuzzleWidthRatio: 0.62, // RESOLVED — cream muzzle width
    iconMuzzleHeightRatio: 0.42, // RESOLVED — cream muzzle height
    iconNoseRadiusRatio: 0.12, // RESOLVED — dark nose size
    iconFaceRadiusRatio: 0.78, // RESOLVED — face circle fills most of its icon radius
    iconEarLowerYOffsetRatio: 0.45, // RESOLVED — locate ears at the upper face edge
    iconEarInnerXRatio: 0.25, // RESOLVED — taper the inside edge of the ears
    iconMuzzleYOffsetRatio: 0.24, // RESOLVED — lower the cream muzzle on the face
    iconNoseYOffsetRatio: 0.16, // RESOLVED — nose sits near the muzzle top
    iconNoseHeightRatio: 0.72, // RESOLVED — flatten the nose ellipse
    furRoughness: 0.78, // RESOLVED — matte golden co-pilot fur
    earRoughness: 0.82, // RESOLVED — soft darker ear finish
    muzzleRoughness: 0.88, // RESOLVED — matte cream muzzle finish
    noseRoughness: 0.42, // RESOLVED — subtle nose sheen
    collarRoughness: 0.58, // RESOLVED — soft fabric rescue collar
  },

  coins: {
    spawnIntervalSeconds: 1.35, // RESOLVED — a new coin line arrives steadily, between traffic waves
    spawnLeadPx: 420, // RESOLVED — put the head of each trail visibly ahead of the van
    trailMin: 9, // RESOLVED — minimum coins in each Subway-style trail
    trailMax: 13, // RESOLVED — maximum coins in each Subway-style trail
    laneSwitchChance: 0.55, // RESOLVED — some trails move between lanes
    laneChangeEvery: 2, // RESOLVED — change lanes every few coins for readable diagonals
    spacingPx: 32, // RESOLVED — close spacing creates a generous collectible stream
    radius: 0.48, // RESOLVED — large coin face reads clearly from the chase camera
    depth: 0.14, // RESOLVED — thick golden coin edge catches daylight
    radialSegments: 32, // RESOLVED — smooth, crisp coin circumference
    rimRadiusRatio: 0.88, // RESOLVED — embossed ring inset from the coin edge
    rimTubeRadius: 0.025, // RESOLVED — raised coin rim thickness
    rimFaceOffsetRatio: 0.2, // RESOLVED — lift the raised rim just clear of the face
    rimSegments: 8, // RESOLVED — smooth raised ring geometry
    widthPx: 48, // RESOLVED — pickup radius matches the more visible mesh
    heightPx: 48, // RESOLVED — pickup radius matches the more visible mesh
    poolSize: 128, // RESOLVED — enough pooled meshes for several dense visible waves
    value: 1, // RESOLVED — base coin bank value
    recycleMarginPx: 900, // RESOLVED — keep a trail beyond the screen edge until it scrolls into view
    seedSalt: 0x7f4a7c15, // RESOLVED — separate deterministic coin patterns
    waveSeedMultiplier: 104729, // RESOLVED — stable per-wave coin patterns
    color: 0xffc928, // RESOLVED — bright gold coin face for strong road contrast
    edgeColor: 0xb86a16, // RESOLVED — deeper gold makes the coin thickness readable
    rimColor: 0xffe681, // RESOLVED — bright raised edge highlight
    faceCanvasSize: 256, // RESOLVED — crisp procedural stamp texture
    faceRimRatio: 0.08, // RESOLVED — inset border on the stamped coin face
    gradientCenterXRatio: 0.68, // RESOLVED — top-left highlight position
    gradientCenterYRatio: 0.62, // RESOLVED — top-left highlight position
    gradientInnerRadiusRatio: 0.08, // RESOLVED — radial highlight size
    gradientMidpointRatio: 0.56, // RESOLVED — gold tone transition point
    pawPadYOffsetRatio: 0.07, // RESOLVED — center the paw stamp
    pawPadRadiusRatio: 0.105, // RESOLVED — size of the central paw pad
    pawPadHeightRatio: 0.82, // RESOLVED — oval proportions of the paw pad
    pawToeRadiusRatio: 0.065, // RESOLVED — size of the four toe marks
    pawToeHeightRatio: 1.28, // RESOLVED — oval proportions of each toe mark
    pawToeMarks: [
      [-0.17, -0.075, -0.38], [-0.06, -0.17, -0.12], [0.07, -0.17, 0.12], [0.18, -0.075, 0.38],
    ], // RESOLVED — balanced four-toe paw stamp layout
    pawMarkColor: 0x8f4d10, // RESOLVED — dark paw stamp contrasts clearly with the gold face
    edgeRoughness: 0.28, // RESOLVED — reflective gold edge finish
    edgeMetalness: 0.72, // RESOLVED — metallic gold edge
    faceRoughness: 0.26, // RESOLVED — polished stamped face finish
    faceMetalness: 0.58, // RESOLVED — metallic gold face
    rimRoughness: 0.22, // RESOLVED — bright rim finish
    rimMetalness: 0.7, // RESOLVED — metallic raised rim
    rimEmissiveIntensity: 0.08, // RESOLVED — subtle daylight sparkle
    textureAnisotropy: 4, // RESOLVED — keep the paw face crisp at a distance
    floatHeight: 1.18, // RESOLVED — raised above the road for a clean silhouette
    bobAmplitude: 0.2, // RESOLVED — gentle floating motion
    bobFrequency: 4, // RESOLVED — steady coin bob rhythm
    spinRadiansPerSecond: 1.2, // RESOLVED — show the coin face longer during the spin
  },

  powerups: {
    spawnIntervalSeconds: 10, // RESOLVED — power-ups return regularly during a run
    openingPairCount: 2, // RESOLVED — put one shield and one magnet ahead at the start of play
    openingPairSpacingPx: 150, // RESOLVED — keep the opening pickups visibly separated on the road
    magnetEveryNth: 2, // RESOLVED — guarantee a magnet on the first spawn and every other pickup
    spawnLeadPx: 330, // RESOLVED — place pickups below the horizon and HUD for a clear view
    shieldDurationSeconds: 8, // RESOLVED — shield protects against one vehicle or road hit
    magnetDurationSeconds: 12, // RESOLVED — magnet stays active long enough to sweep up a coin trail
    durationUpgradeSeconds: 2, // RESOLVED — added duration per garage upgrade
    magnetRangePx: 320, // RESOLVED — magnet pulls nearby coin trails from every lane
    magnetPullPxPerSecond: 700, // RESOLVED — coins curve quickly toward the van
    magnetTargetYOffsetPx: 14, // RESOLVED — pull pickups to the van's front bumper so they never snap to its rear
    poolSize: 12, // RESOLVED — pooled shield and magnet pickups
    widthPx: 38, // RESOLVED — pickup collision width
    heightPx: 38, // RESOLVED — pickup collision height
    visualScale: 1.45, // RESOLVED — visible pickup size from the chase camera
    floatHeight: 1.55, // RESOLVED — keep pickup clear above the road
    bobAmplitude: 0.2, // RESOLVED — readable floating animation
    bobFrequency: 4, // RESOLVED — gentle pickup hover rhythm
    spinRadiansPerSecond: 1.6, // RESOLVED — visible power-up rotation
    magnetPoleSize: [0.18, 0.68, 0.18], // RESOLVED — large red U shape for the magnet icon
    magnetPoleOffsetX: 0.17, // RESOLVED — spacing between U magnet arms
    magnetBridgeSize: [0.52, 0.18, 0.18], // RESOLVED — lower bridge joining the magnet arms
    magnetBridgeYOffset: -0.25, // RESOLVED — position of the U magnet base
    magnetTipSize: [0.18, 0.13, 0.19], // RESOLVED — white pole ends make the magnet instantly recognizable
    magnetTipYOffset: 0.31, // RESOLVED — white magnet tips sit at the arm ends
    magnetTipColor: 0xfff4dc, // RESOLVED — warm white magnet ends
    magnetGlowIntensity: 0.22, // RESOLVED — subtle glow so the red magnet stands out
    seedSalt: 0x165667b1, // RESOLVED — separate deterministic power-up patterns
    waveSeedMultiplier: 32452843, // RESOLVED — stable per-wave power-up patterns
    shieldColor: 0x38b6ff, // RESOLVED — bright cyan shield indicator
    magnetColor: 0xdd4339, // RESOLVED — red magnet pickup
    shieldBubbleScale: [1.4, 1.95, 2.95], // RESOLVED — sphere radii cover the van body, rack, and bumpers
    shieldBubbleHeight: 1.8, // RESOLVED — center the shell from the wheels to the rooftop cargo
    shieldBubbleOpacity: 0.3, // RESOLVED — make the full-van shield easy to see while preserving the van
  },

  garage: {
    vans: [
      { id: 'doge', name: 'Doge Van', price: 0, bodyColor: 0xe8b86d, accentColor: 0xffdc79, width: 2.3, length: 5.0, bodyHeight: 1.6, roofHeight: 0.9, roofLength: 4.6, speedMultiplier: 1, coinMultiplier: 1, style: 'rescue', description: 'The original all-round rescue van.' }, // RESOLVED — free starter van
      { id: 'atlas', name: 'Atlas Van', price: 12000, bodyColor: 0x3289b8, accentColor: 0x73e0eb, width: 2.45, length: 5.35, bodyHeight: 1.72, roofHeight: 1.02, roofLength: 4.95, speedMultiplier: 1.04, coinMultiplier: 1, style: 'expedition', description: 'A taller, tougher rescue rig with a small speed boost.' }, // RESOLVED — tier 2 van
      { id: 'khano', name: 'Khano Van', price: 28000, bodyColor: 0xd94f3d, accentColor: 0xffc451, width: 2.5, length: 5.45, bodyHeight: 1.78, roofHeight: 1.08, roofLength: 5.0, speedMultiplier: 1.08, coinMultiplier: 1.08, style: 'rally', description: 'A rally-ready body with faster runs and extra coins.' }, // RESOLVED — tier 3 van
      { id: 'boop', name: 'Boop Van', price: 60000, bodyColor: 0x8057c8, accentColor: 0x56e0c1, width: 2.58, length: 5.65, bodyHeight: 1.85, roofHeight: 1.16, roofLength: 5.18, speedMultiplier: 1.12, coinMultiplier: 1.14, style: 'luxury', description: 'A sleek custom body with a strong speed and coin bonus.' }, // RESOLVED — tier 4 van
      { id: 'smoke', name: 'Smoke Van', price: 110000, bodyColor: 0x292d3c, accentColor: 0xff5d8f, width: 2.65, length: 5.8, bodyHeight: 1.92, roofHeight: 1.22, roofLength: 5.35, speedMultiplier: 1.18, coinMultiplier: 1.2, style: 'elite', description: 'The top-spec rescue van: best speed, coin bonus, and bold finish.' }, // RESOLVED — tier 5 van
    ], // RESOLVED — five garage vehicles with rising coin prices and performance perks
    previewRotateSensitivity: 0.012, // RESOLVED — horizontal drag rotation sensitivity in radians per pixel
    boardingDoor: {
      depthRatio: 0.3, // RESOLVED — boarding opening depth as a share of van length
      openingHeightRatio: 0.66, // RESOLVED — dark side opening height as a share of van body height
      openingSideOffset: 0.024, // RESOLVED — slight outward offset keeps the opening visible over the body
      openingBodyYOffsetRatio: 0.04, // RESOLVED — align the opening with the lower cargo body
      openingZRatio: 0.15, // RESOLVED — place the sliding doorway ahead of its rearward travel space
      panelThickness: 0.035, // RESOLVED — visible dark doorway panel thickness
      slidingTravelRatio: 0.95, // RESOLVED — move the side door back clear of the entry opening
      slidingPanelSideOffset: 0.045, // RESOLVED — float the open door just outside the van body
      trackThickness: 0.045, // RESOLVED — visible upper and lower sliding-door tracks
      trackSideOffset: 0.03, // RESOLVED — keep sliding-door tracks just outside the van body
      windowHeightRatio: 0.3, // RESOLVED — tinted window proportion on the retracted door
      windowYOffsetRatio: 0.16, // RESOLVED — raised position of the sliding-door window
      trimThickness: 0.04, // RESOLVED — accent trim thickness on the retracted door
    }, // RESOLVED — open side doorway with a rear-sliding passenger door
    design: {
      stripeThickness: 0.045, // RESOLVED — accent stripe thickness on premium bodywork
      stripeHeight: 0.11, // RESOLVED — accent stripe height on premium bodywork
      stripeLengthRatio: 0.62, // RESOLVED — accent stripe length relative to van body
      stripeBodyYOffsetRatio: 0.23, // RESOLVED — stripe vertical position on van body
      stripeZOffsetRatio: 0.045, // RESOLVED — stripe shift toward the van front
      expeditionBarWidthRatio: 1.08, // RESOLVED — Atlas front protection bar width
      expeditionBarHeight: 0.12, // RESOLVED — Atlas front protection bar thickness
      expeditionBarDepth: 0.12, // RESOLVED — Atlas front protection bar fore-aft size
      expeditionBarYOffset: 0.44, // RESOLVED — Atlas bar height above the wheel hub
      expeditionBarZOffset: 0.1, // RESOLVED — Atlas bar forward projection
      expeditionGuardWidth: 0.08, // RESOLVED — Atlas bull-bar upright width
      expeditionGuardHeight: 0.66, // RESOLVED — Atlas bull-bar upright height
      expeditionGuardXRatio: 0.45, // RESOLVED — Atlas guard spacing from the centerline
      rallyWingWidthRatio: 1.08, // RESOLVED — Khano rear spoiler overhang
      rallyWingHeight: 0.12, // RESOLVED — Khano spoiler thickness
      rallyWingDepth: 0.42, // RESOLVED — Khano spoiler fore-aft size
      rallyWingHeightOffset: 0.45, // RESOLVED — Khano spoiler rise above roof
      rallyWingZRatio: 0.31, // RESOLVED — Khano spoiler position toward the rear
      rallySupportWidth: 0.08, // RESOLVED — Khano rear spoiler support width
      rallySupportHeight: 0.42, // RESOLVED — Khano rear spoiler support height
      rallySupportXRatio: 0.35, // RESOLVED — Khano spoiler support spacing
      luxuryRoofThickness: 0.07, // RESOLVED — Boop metallic roof panel thickness
      luxuryRoofHeightOffset: 0.06, // RESOLVED — Boop roof panel clearance
      luxuryRoofZRatio: 0.02, // RESOLVED — Boop roof panel fore-aft position
      luxuryRoofWidthRatio: 0.88, // RESOLVED — Boop metallic roof panel width
      luxuryRoofDepthRatio: 0.54, // RESOLVED — Boop metallic roof panel depth
      eliteLightbarWidthRatio: 0.68, // RESOLVED — Smoke roof lightbar width
      eliteLightbarHeight: 0.16, // RESOLVED — Smoke roof lightbar height
      eliteLightbarDepth: 0.22, // RESOLVED — Smoke roof lightbar fore-aft size
      eliteLightbarHeightOffset: 0.24, // RESOLVED — Smoke roof lightbar rise
      eliteLightbarZRatio: 0.24, // RESOLVED — Smoke lightbar forward placement
      eliteFlareWidth: 0.14, // RESOLVED — Smoke side flare width
      eliteFlareHeight: 0.1, // RESOLVED — Smoke side flare height
      eliteFlareDepthRatio: 0.58, // RESOLVED — Smoke side flare body length
      eliteFlareSideOffset: 0.06, // RESOLVED — Smoke side flare projection
      eliteFlareHeightOffset: 0.26, // RESOLVED — Smoke side flare height above wheels
    }, // RESOLVED — body details that distinguish the five rescue vans
    upgradeCosts: {
      shieldDuration: [1000, 3000, 7500], // RESOLVED — expensive final tiers make maximum shield time a long-term upgrade
      magnetDuration: [1000, 3000, 7500], // RESOLVED — expensive final tiers make maximum magnet time a long-term upgrade
      coinValue: [2500, 6000], // RESOLVED — high prices keep the permanent coin bonus valuable to earn
    },
    maxUpgradeLevel: 3, // RESOLVED — cap duration upgrades at three tiers
  },

  radio: {
    apiServers: [
      'https://de1.api.radio-browser.info',
      'https://nl1.api.radio-browser.info',
      'https://at1.api.radio-browser.info',
    ], // RESOLVED — public Radio Browser API mirrors for online station listings
    countryByWorld: { lagos: 'NG', japan: 'JP', usa: 'US' }, // RESOLVED — match the station list to the selected game map
    musicTagsByWorld: {
      lagos: ['music', 'afrobeats', 'afrobeat', 'afropop', 'highlife', 'fuji', 'naija', 'amapiano'],
    }, // RESOLVED — include Nigerian music genres to broaden Lagos radio choices
    stationLimit: 100, // RESOLVED — load a wider set of music stations for each map
    requestTimeoutMs: 7000, // RESOLVED — move to another radio directory mirror if one is slow
    volume: 0.3, // RESOLVED — keep radio audible beside the game's driving effects
  },

  audio: {
    ambientMusicVolume: 0.22, // RESOLVED — keep the looping background track gentle under game ambience
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
    coinPickupHz: 880, // RESOLVED — bright arcade coin pickup pitch
    coinPitchStepHz: 55, // RESOLVED — small pitch lift when multiple coins collect together
    coinPickupGain: 0.09, // RESOLVED — clear chime without masking the engine
    coinPickupSeconds: 0.16, // RESOLVED — short, snappy collectible sound
    coinPickupCooldownSeconds: 0.045, // RESOLVED — keep dense trails from becoming harsh
    coinPitchEndRatio: 1.42, // RESOLVED — upward arcade chime sweep
    coinPitchEndTimeRatio: 0.52, // RESOLVED — finish the sweep early in the sound
    coinAttackTimeRatio: 0.12, // RESOLVED — fast chime attack
    vehicleHitLowHz: 150, // RESOLVED — low impact thump when the van hits traffic
    vehicleHitEndHz: 52, // RESOLVED — descending thump gives the collision weight
    vehicleHitMetalHz: 720, // RESOLVED — short metallic rattle makes the impact recognizable
    vehicleHitGain: 0.16, // RESOLVED — clearly audible collision sound under the engine
    vehicleHitMetalGain: 0.045, // RESOLVED — brief metallic layer without harshness
    vehicleHitSeconds: 0.24, // RESOLVED — keep the collision cue short
  },

  // RESOLVED: two traffic impacts trigger a visible halt before game over.
  crash: {
    vanHealth: 2, // RESOLVED — two hits per run
    hitRecoverySeconds: 15, // RESOLVED — clear accumulated traffic hits after 15 collision-free seconds
    firstHitShake: 0.16, // RESOLVED — small shake that does not interrupt driving
    secondHitShake: 0.34, // RESOLVED — stronger shake on the fatal impact
    shakeDecayPerSecond: 2.8, // RESOLVED — short camera shake decay
    stopDeceleration: 1900, // RESOLVED — visible but controlled fatal-hit braking
    spinRate: 0.72, // RESOLVED — gentle spin-out yaw
    tiltRate: 2.4, // RESOLVED — brief chassis roll during the stop
    obstacleKnockbackPx: 14, // RESOLVED — small side displacement for a struck vehicle
    obstacleExplosionSeconds: 0.52, // RESOLVED — quick visual burst before the damaged vehicle clears
    obstacleExplosionRadius: 1.9, // RESOLVED — visible first-hit flash around traffic
    obstacleExplosionDebrisCount: 7, // RESOLVED — lightweight shards make the impact read as an explosion
    obstacleExplosionDebrisTravel: 1.45, // RESOLVED — debris spreads out from the struck vehicle
    obstacleExplosionShardWidth: 0.18, // RESOLVED — small shard width for the impact burst
    obstacleExplosionShardHeight: 0.12, // RESOLVED — small shard height for the impact burst
    obstacleExplosionShardDepth: 0.24, // RESOLVED — small shard depth for the impact burst
    obstacleExplosionCoreRadius: 0.55, // RESOLVED — bright center size for the impact burst
    obstacleExplosionFlashOpacity: 0.95, // RESOLVED — strong initial flash without hiding the road
    obstacleExplosionShardRiseHigh: 0.75, // RESOLVED — alternating shard launch height
    obstacleExplosionShardRiseLow: 0.3, // RESOLVED — alternating shard launch height
    obstacleExplosionShardSpin: 5, // RESOLVED — fast debris tumble during the burst
    obstacleExplosionCoreScaleRatio: 0.48, // RESOLVED — core stays smaller than the outer flash
    obstacleExplosionFlashFadeRatio: 0.9, // RESOLVED — flash fades fully through its short lifetime
    obstacleExplosionColor: 0xff9b32, // RESOLVED — bright warm impact flash
    obstacleExplosionHotColor: 0xffe7a0, // RESOLVED — hot center of the impact flash
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
    heightOffset: 12, // RESOLVED — keep the main chase camera perspective
    rearOffset: 18, // RESOLVED — keep the van large and clear above the controls
    lookHeightOffset: -2.5, // RESOLVED — use a shallower angle to show more of the van's front and the road ahead
    lookAheadDistance: 16, // RESOLVED — keep the van clear of the lower-right horn button while opening the forward view
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
    shadowMapSize: 512, // RESOLVED — reduce per-frame shadow work while keeping clear road shadows
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
    vehicleTypeWeights: { danfo: 0.14, sedan: 0.11, bike: 0.18, tanker: 0.14, van: 0.1, truck: 0.08, suv: 0.16, hatchback: 0.09 }, // Frequently mix clear compact, family, utility, and commercial traffic silhouettes
    tankerGuaranteedEveryWaves: 4, // RESOLVED — guarantee a tanker in the opening traffic and every fourth wave
    bikeWidth: 64, // Larger motorcycle hitbox and wheels stay aligned with the clearer silhouette
    bikeDepth: 108, // Include the enlarged bike and both riders in traffic spacing
    bikeWheelRadius: 0.23, // Larger wheels improve visibility from the chase camera
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
    tankerLabelCanvasWidth: 512, // RESOLVED — fuel label texture resolution
    tankerLabelCanvasHeight: 160, // RESOLVED — fuel label texture resolution
    tankerLabelWidthRatio: 0.66, // RESOLVED — fuel label width along the tank side
    tankerLabelHeightRatio: 0.54, // RESOLVED — fuel label height on the tank side
    tankerLabelColor: 0xf5efdf, // RESOLVED — readable light fuel label backing
    tankerLabelTextColor: 0xc5322b, // RESOLVED — bold safety-red fuel lettering
    tankerSafetyColor: 0xf0a52f, // RESOLVED — high-visibility tanker safety bands
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
    suvColors: [0x315d72, 0x52634a, 0x9b583b], // Bold colors for taller family SUVs
    hatchbackColors: [0xd7a833, 0x3b7c80, 0x8c526f], // Bright compact-car colors improve road readability
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
    gapSeconds: 2.0, // RESOLVED — tighter early wave spacing keeps more traffic on the road
    gapSecondsAtFullDifficulty: 1.2, // Tighten late traffic spacing as the run progresses
    difficultyStartMeters: 800, // RESOLVED — early stretch remains forgiving
    difficultyFullMeters: 12000, // RESOLVED — traffic density reaches its cap gradually
    extraLaneChanceAtFullDifficulty: 0.9, // Most late waves use two lanes and leave one open
    spawnLeadPx: 6000, // Bring traffic in from just before the far road edge
    firstWaveLeadPx: 6000, // Start the first traffic wave at the far road entrance
    waveDepthSpreadPx: 220, // RESOLVED — stagger cars within a wave so traffic does not pop in as a row
    approachBufferPx: 6500, // Retain distant traffic until it reaches the camera's road horizon
    jumpOvertakeRangePx: 460, // Start the jump pass with enough room to clear the full vehicle
    jumpPassMinimumRelativeSpeedPxPerSecond: 700, // Guarantee a complete pass before the landing frame
    minSameLaneSpacing: 260, // RESOLVED — preserve room for long tankers and trucks in one lane
    blockedLanesMin: 1,
    blockedLanesMax: 2, // RESOLVED — later waves may use two lanes while keeping one open
    bayClearBeforeMeters: 35, // RESOLVED — keep the bay entrance clear while allowing traffic between bays
    bayClearAfterMeters: 8, // RESOLVED — reopen the rescue lane shortly after a marked bay
    laneChangeSeconds: 0.72, // RESOLVED — smooth lane changes complete before the bay entrance
    laneChangeSafeGapPx: 245, // RESOLVED — only merge when the destination lane has room
    laneChangeVehicleGapRatio: 0.5, // RESOLVED — add half the combined vehicle lengths to the merge gap
    hornResponseDistancePx: 680, // RESOLVED — traffic reacts while the van still has braking room
    hornPassClearancePxPerSecond: 90, // RESOLVED — horned traffic accelerates enough to pass
    hornManeuverTimeoutSeconds: 7, // RESOLVED — abandon a pass if a safe merge never opens
  },

  // RESOLVED #1: bones, placed in the guaranteed gap of each traffic wave.
  bones: {
    spawnLeadPx: 420, // RESOLVED — place each treat trail inside the chase camera's visible road
    length: 20,
    thickness: 9,
    yOffset: 12,
    patternCountMin: 5, // RESOLVED — minimum bones in a pickup pattern
    patternCountMax: 10, // RESOLVED — maximum bones in a pickup pattern
    patternsPerWave: 3, // RESOLVED — keep pickup trails visible across each traffic gap
    patternSpacingPx: 44, // RESOLVED — readable spacing along the road
    patternGapPx: 48, // RESOLVED — separate each recognizable pickup trail
    plusEveryWaves: 3, // RESOLVED — place one bonus plus pickup every few traffic waves
    plusBoneValue: 3, // RESOLVED — reward each plus pickup with three bones
    plusAheadPx: 160, // RESOLVED — space the plus pickup ahead of the regular bone trail
    plusWidthPx: 20, // RESOLVED — make the plus easy to collect without filling a lane
    plusHeightPx: 20, // RESOLVED — give the plus a clear collision target
    plusSizeWorld: 1.1, // RESOLVED — make the 3D plus visible from the chase camera
    plusThicknessWorld: 0.28, // RESOLVED — keep the plus shape bold at game scale
    plusDepthWorld: 0.2, // RESOLVED — give the plus visible 3D depth
    plusColor: 0xffc928, // RESOLVED — distinguish bonus plus pickups from white bones
    plusEmissiveColor: 0x8a5400, // RESOLVED — help the plus stand out against the road
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
    names: [
      'Milo', 'Nala', 'Koda', 'Zuri', 'Teddy', 'Luna', 'Biscuit', 'Coco',
      'Simba', 'Pepper', 'Bailey', 'Daisy', 'Bingo', 'Mochi', 'Toto', 'Ruby',
      'Ollie', 'Maple', 'Lucky', 'Poppy', 'Scout', 'Sunny', 'Bobo', 'Maisie',
      'Chisom', 'Fela', 'Sade', 'Amara', 'Tayo', 'Kiki', 'Waffles', 'Mango',
      'Rex', 'Mabel', 'Blue', 'Rosie', 'Jojo', 'Cinnamon', 'BamBam', 'Penny',
    ],
    width: 34,
    height: 30,
    sidewalkOffsetPx: 2, // RESOLVED — dogs wait visibly beside the rightmost rescue lane
    yOffset: 46,
    enterSeconds: 1.0, // RESOLVED — one-second walk-in before a dog is counted as rescued
    maxPerRun: null,
    visibleInVan: 5,
    spawnLeadMeters: 160, // RESOLVED — dogs appear beside each stop before the van reaches it
    colors: ['black', 'golden', 'brown', 'spotted'],
    perStopMin: 2,  // RESOLVED — ordinary rescue stops feel like small waiting groups
    perStopMax: 4,  // RESOLVED — keep groups lively without crowding the sidewalk
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
    nameToastSeconds: 2.4, // RESOLVED — keep each saved dog's name visible in the rescue notice
    walkSpeed: 200,
    specialStopChance: 0.2, // RESOLVED — occasional special rescues keep the route varied
    specialPuppyScale: 0.68, // RESOLVED — puppies read clearly as smaller dogs
    specialRouteDetourPx: 54, // RESOLVED — alternate rescue path bends around the waiting group
    specialHazardConeRadius: 0.22, // RESOLVED — small roadside cone marks a hazard rescue
    specialHazardConeHeight: 0.52, // RESOLVED — hazard marker stays visible beside the dog
    specialHazardConeColor: 0xf28c28, // RESOLVED — high-contrast orange rescue hazard marker
    specialHazardConeOffsetPx: 30, // RESOLVED — place marker beside the dog without blocking its path
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
      bodyScale: [0.27, 0.28, 0.68], // RESOLVED — lean, elongated canine torso instead of a round woolly silhouette
      bodyPosition: [0, 0.37, 0.04], // RESOLVED — lower the torso over the legs
      chestScale: [0.19, 0.23, 0.27], // RESOLVED — narrow chest and shoulders
      chestPosition: [0, 0.37, -0.34], // RESOLVED — define the front of the torso without a round chest ball
      neckScale: [0.18, 0.2, 0.31], // RESOLVED — bridge head and shoulders with a tapered canine neck
      neckPosition: [0, 0.53, -0.32], // RESOLVED — set the neck between the chest and head
      headScale: [0.23, 0.22, 0.24], // RESOLVED — more compact canine head
      headPosition: [0, 0.69, -0.48], // RESOLVED — raise the head at the shoulder line
      muzzleLength: 0.4, // RESOLVED — give the dog a distinct projecting snout
      muzzleBaseRadius: 0.125, // RESOLVED — attach the snout cleanly to the face
      muzzleTipRadius: 0.06, // RESOLVED — taper the snout toward the nose
      muzzleSegments: 10, // RESOLVED — low-poly tapered muzzle geometry
      muzzlePosition: [0, 0.61, -0.67], // RESOLVED — extend the snout ahead of the head
      jawScale: [0.095, 0.065, 0.2], // RESOLVED — define a lower jaw below the muzzle
      jawPosition: [0, 0.53, -0.69], // RESOLVED — place the lower jaw under the snout
      noseScale: 0.055, // RESOLVED — visible nose at the tip of the tapered muzzle
      nosePosition: [0, 0.62, -0.88], // RESOLVED — nose sits at the front of the muzzle
      earScale: [0.075, 0.18, 0.085], // RESOLVED — slim floppy ears rather than round wool-like tufts
      earPosition: [-0.19, 0.63, -0.43], // RESOLVED — set ears on the sides of the head
      legRadius: 0.068, // RESOLVED — slimmer canine legs
      legLength: 0.34, // RESOLVED — longer legs visible beneath the body
      upperLegLengthRatio: 0.52, // RESOLVED — upper segment length for articulated legs
      lowerLegLengthRatio: 0.48, // RESOLVED — lower segment length for articulated legs
      legX: 0.17, // RESOLVED — narrower stance
      legZ: 0.42, // RESOLVED — space front and rear legs along the longer torso
      pawScale: [0.078, 0.052, 0.11], // RESOLVED — add defined feet instead of ending legs in rounded wool-like stumps
      pawForwardOffset: 0.035, // RESOLVED — point paws forward with the dog's muzzle
      legSwing: 0.34, // RESOLVED — fallback walk cycle stride
      tailPosition: [0, 0.5, 0.67], // RESOLVED — attach the tail at the back of the longer torso
      tailLength: 0.3, // RESOLVED — compact visible tail length
      tailTiltRadians: 0.95, // RESOLVED — angle the tail upward and back for a recognizable canine outline
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
    firstStopMeters: 900, // RESOLVED — let the opening run play before the first rescue stop
    intervalMeters: 1800, // RESOLVED — space rescue stops farther apart for longer road stretches
    zoneLengthMeters: 72, // RESOLVED — doubled stop strip length for easier braking and boarding
    dwellSeconds: 1.5, // RESOLVED — continuous brake hold duration
    speedThresholdKph: 3, // RESOLVED — maximum speed allowed while boarding
    warningMeters: 50, // RESOLVED — minimum warning distance
    extraBrakingWarningMeters: 20, // RESOLVED — early warning buffer at higher speeds
    visibleAheadMeters: 220, // RESOLVED — show the next bay well before arrival
    visibleBehindMeters: 5, // RESOLVED — keep the strip briefly visible after passing
    reverseRecoveryMeters: 3600, // RESOLVED — keep missed bays and their dogs available across two stop intervals while reversing
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

  shelter: {
    capacity: 25, // RESOLVED — the van holds twenty-five rescued dogs before a shelter drop-off is required
    residentDisplayCount: 8, // RESOLVED — display a small, readable group of residents outside the shelter
    rosterLimit: 64, // RESOLVED — retain a generous named shelter history
    residentComfortLimit: 12, // RESOLVED — begin faster adoptions before the resident roster feels crowded
    residentMinimum: 3, // RESOLVED — keep a small pack in the shelter so it never looks empty
    adoptionIntervalSeconds: 30, // RESOLVED — keep a steady stream of adoptions while maintaining active residents
    crowdedAdoptionIntervalSeconds: 5, // RESOLVED — quickly ease overcrowding after large rescue arrivals
    adoptionToastSeconds: 2.6, // RESOLVED — show each adoption notice briefly without covering the shelter view
    carePackageBaseCost: 300, // RESOLVED — make the first repeatable shelter supply purchase reachable without long grinding
    carePackageCostStep: 180, // RESOLVED — steadily raise each package price as the shelter ranks grow
    carePackageDisplayLimit: 18, // RESOLVED — cap the physical supply stack so the yard stays readable
    carePackageX: 6.5, // RESOLVED — group delivered supply crates beside the feeding station
    carePackageZ: -4.8, // RESOLVED — keep the care-crate pile clear of the visitor path
    carePackageCrateSize: [0.62, 0.48, 0.54], // RESOLVED — size each low-poly supply crate for a readable yard prop
    carePackageSpacing: 0.7, // RESOLVED — leave visible gaps between stacked supply crates
    carePackageRowLength: 6, // RESOLVED — build a compact three-row supply stack
    carePackageSackRadius: 0.16, // RESOLVED — show a small food sack on each crate
    carePackageSackHeight: 0.28, // RESOLVED — keep the food sack visible above its crate
    rosterVisible: 8, // RESOLVED — show the latest residents without crowding the phone screen
    residentSpacingX: 46, // RESOLVED — keep visible shelter dogs from overlapping
    residentSpacingY: 42, // RESOLVED — arrange shelter residents in short rows
    unloadSpawnSeconds: 0.14, // RESOLVED — send dogs toward the shelter in a steady procession
    unloadWalkSpeed: 118, // RESOLVED — unloading dogs walk briskly from van to shelter in logical pixels per second
    unloadDoorOffsetPx: 270, // RESOLVED — put the shelter entrance among the right-side buildings
    unloadForwardOffsetPx: 35, // RESOLVED — align the walk target with the shelter's camera-facing doorway
    buildingWidth: 7.2, // RESOLVED — make the shelter a large landmark in the neighborhood
    buildingHeight: 6.0, // RESOLVED — give the shelter a tall, substantial public-building profile
    buildingDepth: 6.6, // RESOLVED — deepen the shelter to match its larger facade
    roofThickness: 0.34, // RESOLVED — scale the flat roof trim with the larger shelter
    signWidthRatio: 0.88, // RESOLVED — sign width relative to the shelter facade
    signHeight: 1.05, // RESOLVED — make the DOGE SHELTER sign prominent on the landmark facade
    signCanvasWidth: 768, // RESOLVED — sign texture horizontal resolution
    signCanvasHeight: 192, // RESOLVED — sign texture vertical resolution
    doorWidth: 1.7, // RESOLVED — broad open entrance for dogs entering the landmark shelter
    doorHeight: 3.7, // RESOLVED — tall open entrance suited to the larger building
    doorPanelWidth: 0.34, // RESOLVED — open shelter door panels
    buildingCenterZ: -11, // RESOLVED — align the shelter model and its solid movement boundary
    doorOpeningWidth: 2.4, // RESOLVED — keep a clear player-sized entry once the door swings open
    doorPanelHeight: 2.4, // RESOLVED — door leaf fills the shelter's lower entrance opening
    doorPanelDepth: 0.12, // RESOLVED — visible solid entrance door thickness
    doorOpenRadians: 1.42, // RESOLVED — swing the hinged door clear of the entrance
    doorPassableAngleRatio: 0.92, // RESOLVED — only allow entry once the moving leaf clears the doorway
    doorAnimationSpeed: 5, // RESOLVED — make opening and closing feel responsive
    doorInteractionDistance: 4, // RESOLVED — make the door action forgiving to reach on touch screens
    walkerCollisionRadius: 0.32, // RESOLVED — keep the camera body from clipping through solid objects
    vanCollisionHalfWidth: 0.95, // RESOLVED — approximate the displayed van's scaled width
    vanCollisionHalfDepth: 1.55, // RESOLVED — approximate the displayed van's scaled length
    petInteractionDistance: 4.2, // RESOLVED — keep the pet action easy to reach beside a wandering dog
    petReactionSeconds: 3.2, // RESOLVED — hold the dog's happy response long enough to notice
    petTailWagFrequency: 12, // RESOLVED — speed up tail movement while a dog is being petted
    petTailWagAmplitude: 0.42, // RESOLVED — make the happy tail wag visibly bigger
    petHeartSize: 0.24, // RESOLVED — keep the floating reaction icon readable without obscuring the shelter
    petHeartHeight: 1.35, // RESOLVED — float the heart clear of the dog's back
    petHeartRise: 0.55, // RESOLVED — lift the heart gently as the pet reaction plays
    petHeartFadeStartRatio: 0.68, // RESOLVED — keep the heart bright before it gently fades
    petHeartCanvasSize: 128, // RESOLVED — render a crisp runtime heart icon
    petHeartColor: '#ff5e91', // RESOLVED — use a bright friendly pink for the pet reaction
    petHeartOutlineColor: '#fff2d7', // RESOLVED — give the heart a contrasting outline
    volunteerName: 'Amara', // RESOLVED — give the gate volunteer a friendly, recognizable name
    volunteerShirtColor: 0x287ca2, // RESOLVED — match the volunteer's uniform to the shelter colors
    volunteerX: -1, // RESOLVED — place the volunteer beside the inside of the front gate, within the visitor's view
    volunteerZ: 8.5, // RESOLVED — keep the volunteer visible just inside the gate from the yard entrance
    volunteerPatrolPoints: [[-7.2, 7.5], [-9, 4], [-9, -3], [-7, -7], [7, -7], [9, -3], [9, 4], [7.2, 7.5]], // RESOLVED — patrol the clear yard perimeter without entering the shelter or blocking the gate
    volunteerPatrolSpeed: 1.05, // RESOLVED — move at a calm human walking pace between yard patrol points
    volunteerPatrolArrivalRadius: 0.35, // RESOLVED — turn smoothly at each patrol waypoint
    volunteerWalkCycleFrequency: 7.2, // RESOLVED — set a readable alternating walking cadence
    volunteerLegSwingRadians: 0.48, // RESOLVED — give each leg a natural opposite-phase stride
    volunteerArmSwingRadians: 0.24, // RESOLVED — swing arms gently opposite the legs
    volunteerBodyBobHeight: 0.035, // RESOLVED — add a subtle vertical bounce while walking
    volunteerBodyWidth: 0.4, // RESOLVED — shape a recognizable adult human torso
    volunteerBodyDepth: 0.25, // RESOLVED — give the human torso natural front-to-back volume
    volunteerLegLength: 0.62, // RESOLVED — make two clearly separated full-length walking legs
    volunteerLegWidth: 0.14, // RESOLVED — size the volunteer trousers
    volunteerArmLength: 0.57, // RESOLVED — form visible articulated arms
    volunteerLimbRadius: 0.085, // RESOLVED — soften limb geometry into rounded human forms
    volunteerHairColor: 0x30251e, // RESOLVED — add dark hair for a more recognizable face
    volunteerEyeColor: 0x231b18, // RESOLVED — add small dark eyes facing visitors
    volunteerShoeColor: 0x382b27, // RESOLVED — finish the legs with visible shoes
    volunteerGreeting: 'Hi! I’m Amara, the shelter volunteer. The dogs are ready for some kindness—could you greet three different dogs for today’s task?', // RESOLVED — explain her role and automatically introduce the nearby dog-greeting task
    volunteerInteractionDistance: 3.6, // RESOLVED — make the volunteer action easier to reach on touch screens
    volunteerCollisionRadius: 0.95, // RESOLVED — keep the visitor from walking through or clipping into Amara
    volunteerScale: 0.68, // RESOLVED — size the gate volunteer for a first-person visitor's view
    volunteerNameplateWidth: 1.3, // RESOLVED — make the volunteer's identity readable above the character
    volunteerNameplateHeight: 0.3, // RESOLVED — size the volunteer label to fit a short name and role
    volunteerNameplateY: 1.75, // RESOLVED — place the volunteer label above the head
    volunteerNameplateCanvasWidth: 512, // RESOLVED — render a clean volunteer nameplate texture
    volunteerNameplateCanvasHeight: 128, // RESOLVED — keep the nameplate lettering crisp
    volunteerDialogueSeconds: 12, // RESOLVED — leave updates and task instructions visible long enough to read
    volunteerTaskDogCount: 3, // RESOLVED — ask visitors to greet three different dogs
    gateWidth: 3.0, // RESOLVED — wide front gate for the landmark entrance
    gateHeight: 1.35, // RESOLVED — welcoming gate scaled to the larger shelter
    personBodyHeight: 0.82, // RESOLVED — gate volunteer torso height
    personHeadRadius: 0.17, // RESOLVED — gate volunteer head radius
    personScale: 1.45, // RESOLVED — scale shelter volunteers with the landmark entrance
    wallColor: 0xffcf70, // RESOLVED — warm welcoming shelter paint
    roofColor: 0x3d5367, // RESOLVED — dark flat-roof trim
    signColor: 0x176b50, // RESOLVED — green shelter sign background
    signTextColor: 0xfff2cc, // RESOLVED — high-contrast shelter lettering
    shelterStopColor: 0x52c985, // RESOLVED — green marking for a shelter drop-off bay
    dropOffNoticeSeconds: 4, // RESOLVED — keep the successful delivery message visible
    walkSpeed: 4.2, // RESOLVED — comfortable walking pace in the shelter yard
    yardHalfWidth: 13, // RESOLVED — keep visitors inside the compact shelter grounds
    yardHalfDepth: 15, // RESOLVED — keep visitors inside the compact shelter grounds
    yardGrassWidth: 42, // RESOLVED — green play lawn fills the fenced yard
    yardGrassLength: 50, // RESOLVED — lawn extends across the full shelter grounds
    cameraEyeHeight: 1.65, // RESOLVED — third-person-free first-person eye height
    cameraFieldOfView: 78, // RESOLVED — wide view helps show the yard on a tall phone screen
    cameraLookSensitivity: 0.004, // RESOLVED — horizontal drag-to-look sensitivity
    cameraMoveDamping: 12, // RESOLVED — smooth walking response
    controlsHintSeconds: 6, // RESOLVED — let new shelter visitors read the control hint before it disappears
    dogRoamRadius: 2.2, // RESOLVED — dogs gently wander around their yard spots
    dogRoamSpeed: 0.8, // RESOLVED — give the four-legged walking cycle enough travel to read clearly
    dogWalkLegSwing: 0.72, // RESOLVED — visible alternating fore and hind leg steps
    dogWalkCycleSpeed: 14, // RESOLVED — match paw steps to short purposeful walks
    dogWalkKneeBendRadians: 0.78, // RESOLVED — visibly lift the swinging lower legs
    dogRoamPauseSeconds: 1.8, // RESOLVED — residents pause between short purposeful walks
    dogRoamPauseStagger: 0.31, // RESOLVED — stagger residents' first walk
    dogRoamAngleStep: 2.399, // RESOLVED — spread wandering directions around the yard
    dogRoamRadiusScales: [0.35, 0.47, 0.59, 0.71, 0.83], // RESOLVED — vary each resident's short walking distance
    dogRoamBoundaryInset: 2, // RESOLVED — keep each resident's path clear of the fence
    dogRoamFrontLimitZ: 11, // RESOLVED — keep wandering dogs clear of the gate
    vanArrivalReactionSeconds: 7, // RESOLVED — give the shelter dogs time to notice and gather when the van arrives
    dogGateGatherSpeed: 2, // RESOLVED — let residents trot toward the entrance together
    dogGateGatherInset: 6.5, // RESOLVED — gather the dogs visibly near the gate while keeping a clear visitor path
    dogGateGatherSpacing: 1.1, // RESOLVED — spread the welcome group across the entrance
    dogAmbientDurations: [7, 5, 3.8, 1.5], // RESOLVED — cycle through wandering, napping, chasing, and barking at an easy pace
    dogAmbientModes: ['roam', 'nap', 'chase', 'bark'], // RESOLVED — give residents a varied, repeatable idle routine
    dogNapScaleRatio: 0.72, // RESOLVED — lower a resting dog's body into a curled nap pose
    dogNapLegBendRadians: 0.24, // RESOLVED — tuck the paws slightly while a dog naps
    dogNapSpriteWidth: 0.72, // RESOLVED — make the sleeping cue readable above a resting dog
    dogNapSpriteHeight: 0.4, // RESOLVED — keep the sleeping cue compact
    dogNapSpriteY: 1.5, // RESOLVED — float the sleeping cue above the dog's head
    dogNapCanvasWidth: 256, // RESOLVED — render crisp sleep lettering at any view size
    dogNapCanvasHeight: 144, // RESOLVED — keep the sleep bubble wide and compact
    dogBarkSeconds: 1.2, // RESOLVED — show a short bark reaction
    dogBarkVolume: 0.48, // RESOLVED — keep the supplied puppy bark clear over the shelter ambience
    dogArrivalBarkSeconds: 5.5, // RESOLVED — keep welcome barks visible while the arriving van settles
    dogBarkCooldownSeconds: 8, // RESOLVED — keep bark reactions occasional and natural
    dogBarkMouthOpenRatio: 1.9, // RESOLVED — open the jaw visibly during a bark
    dogBarkSpriteWidth: 0.82, // RESOLVED — keep the WOOF bubble small above a dog's head
    dogBarkSpriteHeight: 0.48, // RESOLVED — size the bark bubble for the short word
    dogBarkSpriteY: 1.65, // RESOLVED — place the bark bubble above the dog
    dogBarkRise: 0.1, // RESOLVED — give each bark bubble a small lively bob
    dogBarkCanvasWidth: 256, // RESOLVED — render clean text in the bark bubble
    dogBarkCanvasHeight: 144, // RESOLVED — preserve the bark bubble's wide shape
    dogArrivalBarkStride: 4, // RESOLVED — let a few dogs bark as the van arrives
    dogChasePairSize: 2, // RESOLVED — organize play chases into pairs
    dogChaseFollowerIndex: 1, // RESOLVED — make the second dog in each pair the playful chaser
    dogAmbientBubbleInset: 8, // RESOLVED — inset the bubble border from its canvas edge
    dogAmbientBubbleCornerRadius: 40, // RESOLVED — round the ambient speech bubbles
    dogAmbientBubbleOutlineWidth: 8, // RESOLVED — give ambient speech bubbles a clear outline
    dogAmbientBubbleFontSize: 64, // RESOLVED — keep bark and sleep lettering easy to read
    dogChaseSpeed: 1.7, // RESOLVED — make short playful chases quicker than normal wandering
    dogChaseFollowDistance: 0.85, // RESOLVED — keep a visible gap between dogs during a chase
    dogChaseCatchupRadius: 2.6, // RESOLVED — end the chase when the dogs have played close together
    dogTailWagFrequency: 5, // RESOLVED — friendly tail-wag animation speed
    dogTailWagAmplitude: 0.18, // RESOLVED — subtle tail movement
    worldDogScale: 0.58, // RESOLVED — keep resident dogs in scale with the shelter yard
    worldDogSpacing: 4.1, // RESOLVED — spread resident dogs around the play yard
    worldDogStartX: -4.1, // RESOLVED — start resident rows on the left side of the yard
    worldDogStartZ: 2, // RESOLVED — keep the first dog row near the play lawn
    worldDogRowSpacing: 3.4, // RESOLVED — leave a clear aisle between resident rows
    worldDogRowOffsetX: 0.4, // RESOLVED — stagger residents so their name tags remain distinct
    worldDogColumns: 3, // RESOLVED — arrange residents in rows across the play yard
    worldVanX: 2.8, // RESOLVED — display the selected van within the first-person view
    worldVanZ: 1, // RESOLVED — keep the van near the entrance path
    worldVanScale: 0.5, // RESOLVED — frame the full van beside the shelter at entry
    toyRadius: 0.13, // RESOLVED — keep play toys in scale with the resident dogs
    toyEdgeX: 7, // RESOLVED — keep play toys on the grass clear of the path
    toyStartZ: -1.5, // RESOLVED — keep play toys in the yard near the resident dogs
    toySpacingZ: 1.4, // RESOLVED — spread toys along the play area
    toyUpgradeX: -9, // RESOLVED — place the play-yard improvement beside the left fence
    foodUpgradeX: 9, // RESOLVED — place the feeding improvement beside the right fence
    stationUpgradeZ: -3, // RESOLVED — keep improvement details behind the main walking path
    shadeUpgradeX: 2.8, // RESOLVED — place the shaded play shelter in the visible right-side dog play lawn
    shadeUpgradeZ: 4, // RESOLVED — frame the play shade beside the parked rescue van without blocking it
    shadeUpgradeWidth: 3.4, // RESOLVED — provide room for several dogs under the play canopy
    shadeUpgradeDepth: 2.6, // RESOLVED — keep the canopy compact within the yard
    shadeUpgradeHeight: 2.35, // RESOLVED — let dogs and the player walk beneath the canopy
    shadePostRadius: 0.075, // RESOLVED — sturdy slim canopy supports
    shadeCanvasColor: 0xf2c66d, // RESOLVED — warm sunny fabric for the new play shade
    shadeTrimColor: 0xe77d62, // RESOLVED — contrasting playful canopy trim
    washUpgradeX: -8, // RESOLVED — place the wash station along the left yard fence
    washUpgradeZ: -1, // RESOLVED — keep the wash station clear of the main entrance path
    washPlatformSize: [2.7, 0.28, 1.55], // RESOLVED — roomy raised platform for a dog wash tub
    washTubSize: [2.35, 0.48, 1.25], // RESOLVED — broad wash basin sized for the resident dogs
    washWaterSize: [2.05, 0.06, 0.96], // RESOLVED — bright visible water surface inside the basin
    washLegHeight: 0.82, // RESOLVED — raise the wash station to a comfortable working height
    washPostRadius: 0.07, // RESOLVED — sturdy wash stand legs
    washTubWallThickness: 0.12, // RESOLVED — leave a clear basin opening for the water surface
    washUpgradeColor: 0x77c9d2, // RESOLVED — clean aqua enamel for the washing tub
    washWaterColor: 0x53c9e8, // RESOLVED — make the basin visibly filled with water
    washMetalColor: 0x8c9a9d, // RESOLVED — simple silver faucet and shower fixtures
    washShowerHeight: 1.8, // RESOLVED — make the second-tier shower tall enough for dogs
    washShowerRadius: 0.07, // RESOLVED — sturdy narrow shower pipe
    washShowerHeadRadius: 0.22, // RESOLVED — readable round shower head
    washShowerDropRadius: 0.035, // RESOLVED — small visible shower droplets
    gardenUpgradeX: 7.5, // RESOLVED — use the open right-side lawn for a garden
    gardenUpgradeZ: 0, // RESOLVED — keep garden beds clear of the shelter walkway
    gardenPlanterSize: [1.2, 0.5, 1.15], // RESOLVED — visible raised beds for flowers and herbs
    gardenPlanterSpacing: 1.45, // RESOLVED — separate the three garden beds
    gardenSoilHeight: 0.12, // RESOLVED — show dark soil inside each planter
    gardenPlantHeight: 0.72, // RESOLVED — size flowers to read clearly from the yard path
    gardenPetalRadius: 0.2, // RESOLVED — low-poly flower head size
    gardenStemRadius: 0.045, // RESOLVED — thin flower stalks in each garden bed
    gardenShrubRadius: 0.34, // RESOLVED — larger leafy plants for the second garden tier
    gardenLeafColor: 0x519253, // RESOLVED — healthy green garden foliage
    gardenFlowerColors: [0xf08a73, 0xffd66b, 0xd996d8], // RESOLVED — cheerful mixed flower colors
    kennelUpgradeX: 7.5, // RESOLVED — attach the kennel wing along the shelter's right side
    kennelUpgradeZ: -8.5, // RESOLVED — align the wing with the rear shelter building
    kennelWingSize: [4.8, 2.5, 4.2], // RESOLVED — create a substantial two-bay kennel extension
    kennelRoofThickness: 0.22, // RESOLVED — sturdy flat kennel roof
    kennelDividerThickness: 0.12, // RESOLVED — separate the kennel bays
    kennelDoorWidth: 1.7, // RESOLVED — roomy kennel openings
    kennelDoorHeight: 1.65, // RESOLVED — dog-height kennel entry openings
    kennelRoofColor: 0x4d6574, // RESOLVED — match the shelter's dark roof trim
    kennelWallColor: 0xf1c574, // RESOLVED — tie the extension to the shelter's warm facade
    kennelBarColor: 0x596c70, // RESOLVED — dark safe-looking kennel rails
    kennelBarRadius: 0.055, // RESOLVED — rounded vertical kennel bars
    kennelBarSpacing: 0.26, // RESOLVED — even spacing between kennel bars
    kennelFrontBarCount: 3, // RESOLVED — keep each kennel entrance visible between its rails
    kennelWallThickness: 0.16, // RESOLVED — solid rear and side kennel walls
    kennelRoofOverhang: 0.3, // RESOLVED — sheltering roof lip around the kennel wing
    kennelRunWidth: 3.6, // RESOLVED — second-tier fenced run width
    kennelRunDepth: 3.2, // RESOLVED — second-tier fenced run depth
    kennelRunHeight: 1.35, // RESOLVED — low open fence around the dog run
    kennelRunPostRadius: 0.07, // RESOLVED — sturdy corner posts for the kennel run
    kennelRunRailThickness: 0.1, // RESOLVED — horizontal rails keep the run enclosed
    upgradeHoopRadius: 0.52, // RESOLVED — agility hoop added by the first toy upgrade
    upgradeHoopTube: 0.09, // RESOLVED — sturdy low-poly agility hoop thickness
    upgradeBarrelRadius: 0.42, // RESOLVED — food storage barrel added by the first food upgrade
    upgradeBarrelHeight: 0.95, // RESOLVED — food storage barrel height
    upgradeExtraBowlX: 1.1, // RESOLVED — place the upgraded food bowl beside the first bowl
    upgradeCosts: {
      toys: [180, 420], // RESOLVED — permanent prices for the play-yard improvements
      food: [160, 380], // RESOLVED — permanent prices for the feeding-area improvements
      shade: [260], // RESOLVED — one-time cost for the shaded play area
      wash: [360, 720], // RESOLVED — two tiers for the wash tub and shower
      garden: [280, 560], // RESOLVED — two tiers for expanded planting beds and flowers
      kennel: [700, 1200], // RESOLVED — two tiers for the kennel wing and fenced dog run
    },
    upgradeCatalog: [
      { id: 'toys', name: 'Toy yard', description: 'Add play equipment and agility toys.' },
      { id: 'food', name: 'Food station', description: 'Add food storage and a larger feeding table.' },
      { id: 'shade', name: 'Shaded play area', description: 'Give the dogs a cool spot to rest.' },
      { id: 'wash', name: 'Wash station', description: 'Build a dog bath, then add a shower.' },
      { id: 'garden', name: 'Shelter garden', description: 'Plant flower beds, then fill them with blooms.' },
      { id: 'kennel', name: 'Kennel wing', description: 'Build extra kennels, then add a fenced dog run.' },
    ], // RESOLVED — show every shelter improvement in the scrollable care shop
    wallHeight: 4.2, // RESOLVED — welcoming single-storey shelter height
    wallWidth: 9, // RESOLVED — shelter facade width
    wallDepth: 6, // RESOLVED — shelter building depth
    roomFloorColor: 0xd8c7a0, // RESOLVED — make the shelter interior feel warm and clean
    roomInnerWallColor: 0xf3e6c9, // RESOLVED — brighten the walls behind the open doorway
    roomFloorInset: 0.16, // RESOLVED — leave the interior floor inside the exterior wall edges
    roomBedFrameColor: 0xb98252, // RESOLVED — use warm wood-toned room furniture
    roomBedMatColor: 0x8fc8d1, // RESOLVED — give the dog beds a soft, readable color
    roomBedPillowColor: 0xffefcf, // RESOLVED — make the pillows stand out from the bedding
    roomBeds: [
      { x: -1.7, z: 0.25, interactionRadius: 1.75, collisionRadius: 0.68 },
      { x: 1.7, z: 0.25, interactionRadius: 1.75, collisionRadius: 0.68 },
    ], // RESOLVED — place two walk-up sleeping spots along the room sides
    roomBedWidth: 1.35, // RESOLVED — fit beds along the room sides and keep a central aisle
    roomBedLength: 1.18, // RESOLVED — leave a clear central aisle through the room
    roomBedFrameHeight: 0.18, // RESOLVED — raise the bedding slightly from the floor
    roomBedMattressHeight: 0.25, // RESOLVED — make the soft mattress visible from the doorway
    roomBedPillowWidth: 0.52, // RESOLVED — add a clear pillow at each bed head
    roomBedPillowHeight: 0.12, // RESOLVED — keep the pillow soft and low
    roomBedPillowDepth: 0.32, // RESOLVED — keep the pillow short enough to fit each bed
    roomBedPillowInsetRatio: 0.36, // RESOLVED — place each pillow near the back of its mattress
    roomBedMattressWidthRatio: 0.9, // RESOLVED — leave a visible wooden edge around each mattress
    roomBedMattressLengthRatio: 0.9, // RESOLVED — keep bedding inside the bed frame
    roomBedNapCueWidth: 0.72, // RESOLVED — make the bed interaction's sleep cue readable
    roomBedNapCueHeight: 0.4, // RESOLVED — keep the sleep cue compact
    roomBedNapCueY: 1.35, // RESOLVED — float the sleep cue above the bed
    roomBedRestSeconds: 3.5, // RESOLVED — show a short Zzz cue when interacting with a bed
    roomToyPosition: { x: -1.5, z: -1.25 }, // RESOLVED — keep the toy basket visible beside the central aisle
    roomToyInteractionRadius: 1.65, // RESOLVED — allow a nearby visitor to play with the toys
    roomToyCollisionRadius: 0.46, // RESOLVED — leave room to walk around the toy basket
    roomToyBasketRadius: 0.42, // RESOLVED — make the toy basket easy to recognize
    roomToyBasketHeight: 0.45, // RESOLVED — keep the basket low and accessible to dogs
    roomToyBaseRatio: 0.78, // RESOLVED — taper the basket toward its base
    roomToySegments: 12, // RESOLVED — keep the basket and toys visibly low-poly
    roomToyBasketColor: 0xc4874b, // RESOLVED — make the toy basket look woven and warm
    roomToyRimColor: 0xe4b879, // RESOLVED — highlight the open basket rim
    roomToyRimTube: 0.045, // RESOLVED — give the basket lip a clear edge
    roomToyTorusSegments: 8, // RESOLVED — retain the shelter's simple low-poly style
    roomToyBallRadius: 0.2, // RESOLVED — show a colorful ball above the basket rim
    roomToyBallSegments: 10, // RESOLVED — keep the play ball low-poly
    roomToyBallColor: 0xf06f68, // RESOLVED — make the toy ball bright and easy to spot
    roomToyBallOffsetX: 0.08, // RESOLVED — rest the ball just off center in the basket
    roomToyBallOffsetZ: -0.08, // RESOLVED — show the ball above the basket opening
    roomToyBounceHeight: 0.34, // RESOLVED — animate the ball when a visitor starts play
    roomToyBounceFrequency: 11, // RESOLVED — give the tossed ball a lively bounce
    roomCarePosition: { x: 1.55, z: -0.95 }, // RESOLVED — frame the care station beside the toys at the back of the room
    roomCareInteractionRadius: 1.8, // RESOLVED — make the care station easy to reach
    roomCareCollisionRadius: 0.72, // RESOLVED — leave a comfortable path around the care table
    roomCareTableWidth: 1.35, // RESOLVED — fit the care supplies on a compact table
    roomCareTableDepth: 0.72, // RESOLVED — keep the room's central aisle open
    roomCareTableHeight: 0.78, // RESOLVED — place bowls and supplies at a visible height
    roomCareTableTopHeight: 0.12, // RESOLVED — make the care table surface easy to see
    roomCareTableColor: 0x9f744f, // RESOLVED — match the station to the room's warm wood furniture
    roomCareLegWidth: 0.1, // RESOLVED — keep the table legs sturdy at this scale
    roomCareLegDepth: 0.1, // RESOLVED — match the table legs on both axes
    roomCareLegInset: 0.12, // RESOLVED — tuck table legs under the tabletop corners
    roomCareBowlRadius: 0.23, // RESOLVED — add a visible water bowl at the station
    roomCareBowlHeight: 0.12, // RESOLVED — keep the water dish low and dog-friendly
    roomCareBowlTopRatio: 1.12, // RESOLVED — flare the water bowl rim slightly
    roomCareBowlColor: 0x60becb, // RESOLVED — make the water bowl easy to distinguish
    roomCareSegments: 10, // RESOLVED — keep bottles and bowls in the low-poly art style
    roomCareSupplySpacing: 0.36, // RESOLVED — separate the bowl and care bottle on the tabletop
    roomCareBottleRadius: 0.12, // RESOLVED — make the care bottle visible on the table
    roomCareBottleHeight: 0.34, // RESOLVED — distinguish the care bottle from the bowl
    roomCareBottleBaseRatio: 0.9, // RESOLVED — give the care bottle a stable base
    roomCareBottleColor: 0x8cbd7a, // RESOLVED — identify the bottle as a care supply
    roomCareLightRadius: 0.08, // RESOLVED — add a small status light to the station
    roomCareLightY: 0.2, // RESOLVED — position the status light just above the tabletop
    roomCareIdleLightColor: 0xd68b55, // RESOLVED — show the station ready for a check-in
    roomCareReadyLightColor: 0x72e3a0, // RESOLVED — confirm a successful care-station interaction
    roomInteractionSeconds: 4, // RESOLVED — keep interaction feedback visible long enough to read
    roomEntryInset: 0.35, // RESOLVED — only show room actions after the visitor has crossed the doorway
    signWidth: 5.4, // RESOLVED — readable DOGE SHELTER entrance sign
    fenceHeight: 1.05, // RESOLVED — visible low fence around the yard
    fencePostSpacing: 2.2, // RESOLVED — evenly spaced yard fence posts
    streetRoadWidth: 48, // RESOLVED — broad visible neighborhood road outside the shelter gate
    streetRoadDepth: 5.6, // RESOLVED — two-way street outside the shelter grounds
    streetRoadZ: 19, // RESOLVED — place passing traffic directly beyond the front gate
    streetRoadColor: 0x464b50, // RESOLVED — dark street asphalt outside the shelter
    streetLaneMarkLength: 2.4, // RESOLVED — short dashed street center markings
    streetLaneMarkGap: 2.2, // RESOLVED — clear gaps between street lane markings
    streetLaneMarkWidth: 0.09, // RESOLVED — visible center-line paint thickness
    streetLaneMarkColor: 0xf8e7a0, // RESOLVED — warm reflective street markings
    streetCarCount: 4, // RESOLVED — a small steady stream of passing traffic
    streetCarSpeed: 5.4, // RESOLVED — visible steady traffic across the shelter frontage
    streetCarSpacing: 17, // RESOLVED — keep passing vehicles separated
    streetCarLength: 3.2, // RESOLVED — readable toy-like neighborhood cars
    streetCarWidth: 1.55, // RESOLVED — compact cars stay within their street lanes
    streetCarBodyHeight: 0.78, // RESOLVED — low cartoon-car body profile
    streetCarCabinHeight: 0.64, // RESOLVED — compact car cabin height
    streetCarWheelRadius: 0.32, // RESOLVED — readable dark wheels on passing cars
    streetCarWheelDepth: 0.18, // RESOLVED — wheel thickness across the car body
    streetCarWheelSegments: 12, // RESOLVED — low-poly rounded car wheels
    streetCarBodyLift: 0.54, // RESOLVED — keep the car body above the road
    streetCarCabinLift: 1.2, // RESOLVED — raise the car cabin above its body
    streetCarCabinLengthRatio: 0.52, // RESOLVED — cabin length relative to the car body
    streetCarCabinWidthRatio: 0.82, // RESOLVED — cabin width relative to the car body
    streetCarCabinOffsetRatio: 0.08, // RESOLVED — offset cabin toward the back of each car
    streetCarWheelLengthRatio: 0.3, // RESOLVED — wheel position along the body
    streetCarWheelWidthRatio: 0.48, // RESOLVED — wheel position across the body
    streetCarWheelLift: 0.34, // RESOLVED — keep tires planted at road level
    streetCarGlassColor: 0x8cc8d6, // RESOLVED — bright windows on neighborhood traffic
    streetCarTrimColor: 0x292c31, // RESOLVED — dark tire rubber
    streetLaneRatio: 0.24, // RESOLVED — keep each direction in its own road half
    streetCarInitialSpacingOffset: 0.5, // RESOLVED — space the first cars evenly across the street
    streetHouseSpacing: 9.5, // RESOLVED — closely pack tall towers across the street view
    streetHouseWidth: 7.6, // RESOLVED — substantial city tower frontage
    streetHouseHeight: 46, // RESOLVED — raise the skyline into skyscraper height
    streetHouseDepth: 8, // RESOLVED — give each tower a deep city-block footprint
    streetHouseRoofHeight: 0.7, // RESOLVED — substantial flat rooftop cap
    streetHouseRoofOverhang: 0.5, // RESOLVED — clear roof edge around each tower
    streetHouseWindowWidth: 1.15, // RESOLVED — bright vertical tower windows
    streetHouseWindowHeight: 1.6, // RESOLVED — tall modern office windows
    streetHouseWindowLiftRatio: 0.58, // RESOLVED — position windows across each floor
    streetHouseDoorWidth: 0.9, // RESOLVED — clear tower lobby entrance
    streetHouseDoorHeight: 3.4, // RESOLVED — tall ground-floor lobby doors
    streetHouseSetback: 4.5, // RESOLVED — leave a forecourt beyond the traffic lane
    streetHouseDoorColor: 0x704a37, // RESOLVED — warm lobby entrance accent
    streetHouseCountPadding: 0.5, // RESOLVED — cover the full visible street width with towers
    streetHouseRows: 2, // RESOLVED — add a dense second skyline row behind the street
    streetHouseRearRowSpacing: 11, // RESOLVED — stagger a second row of skyscrapers
    streetHouseRowStaggerRatio: 0.5, // RESOLVED — break up long straight tower rows
    streetHouseColors: [0x99aeb8, 0xb6b5ae, 0x859da9, 0xb6a995, 0x9aa5b2], // RESOLVED — realistic concrete and glass tower palette
    streetHouseRoofColor: 0x45515c, // RESOLVED — dark rooftop caps and mechanical penthouses
    streetHouseWindowColor: 0x9ed9e4, // RESOLVED — bright blue glass across each tower face
    streetTowerFloorHeight: 3.4, // RESOLVED — repeated office levels build the skyscraper facades
    streetTowerWindowColumns: 4, // RESOLVED — dense window grid across each tower
    streetTowerWindowColumnSpacing: 1.55, // RESOLVED — regular vertical window bays
    streetTowerWindowFloorInset: 4.4, // RESOLVED — start the office window grid above the tower lobby
    streetTowerWindowFrontOffset: 0.06, // RESOLVED — set glass just proud of the front facade
    streetTowerWindowSideOffset: 0.06, // RESOLVED — set glass just proud of the side facades
    streetTowerSideWindowSpacing: 1.8, // RESOLVED — repeat narrow windows along the tower sides
    streetTowerLobbyColor: 0x425765, // RESOLVED — darker glazed entrances at street level
    streetTowerSetbackRatio: 0.76, // RESOLVED — rooftop penthouse steps back from the facade
    streetTowerPenthouseHeight: 2.8, // RESOLVED — add visible rooftop equipment rooms
    streetTowerAccentColor: 0xd8b46a, // RESOLVED — restrained warm trim on city towers
    streetCarColors: [0xe85345, 0xf2c84b, 0x3886a8, 0x58a66b], // RESOLVED — colorful passing street traffic
    yardGrassColor: 0x76b76a, // RESOLVED — fresh, clear shelter lawn
    yardPathColor: 0xd9c7a0, // RESOLVED — warm sand-colored entrance path
    yardEdgeColor: 0x8a714d, // RESOLVED — earthy border for the shelter lawn and pavers
    yardFenceInset: 0.55, // RESOLVED — keep the camera fully inside the shelter fence
    yardGateZ: 13, // RESOLVED — align the front gate and player boundary
    yardPathPaverSpacing: 1.55, // RESOLVED — visible seams across the shelter entrance path
    yardPathPaverWidth: 3.8, // RESOLVED — paving follows the broad entry path
    yardPathPaverDepth: 0.075, // RESOLVED — subtly raised path joints
    yardPathPaverColor: 0xbca77d, // RESOLVED — stone seams on the warm entry path
    yardPathWidth: 4.2, // RESOLVED — broad paved entrance walkway
    yardPathLength: 17, // RESOLVED — walkway connects the shelter and yard
    yardPathZ: 0.5, // RESOLVED — center the walkway through the yard
    yardPathPaverLift: -0.022, // RESOLVED — paver seams sit just above the path
    fenceRailThickness: 0.12, // RESOLVED — sturdy low fence rails
    fenceRailDepth: 0.12, // RESOLVED — fence rail thickness across the yard
    fenceRailHeightRatio: 0.58, // RESOLVED — position rails above the fence midpoint
    gatePanelWidth: 2.8, // RESOLVED — sturdy gate leaf width
    gatePanelDepth: 0.16, // RESOLVED — sturdy gate leaf thickness
    gateRailHeightRatio: 0.68, // RESOLVED — place cross rail high on each gate leaf
    gateRailHeight: 0.12, // RESOLVED — gate crossbar thickness
    gateRailDepth: 0.2, // RESOLVED — gate crossbar depth
    gatePanelOffsetX: 3.1, // RESOLVED — leave a narrow center seam between closed leaves
    gatePostExclusionX: 3.5, // RESOLVED — clear the paired gate opening
    gateArchRadius: 4.6, // RESOLVED — broad rounded arch spans both shelter gate leaves
    gateArchTube: 0.2, // RESOLVED — substantial warm stone arch thickness
    gateArchRadialSegments: 8, // RESOLVED — smooth tube around the arch
    gateArchSegments: 32, // RESOLVED — smooth low-poly arch curve
    gateArchColor: 0xe5bd74, // RESOLVED — welcoming gold arch over the shelter entrance
    gatePillarWidth: 0.48, // RESOLVED — stone supports frame the rounded gate
    gatePillarHeight: 2.1, // RESOLVED — supports meet the lower ends of the arch
    gatePillarDepth: 0.48, // RESOLVED — sturdy gate support depth
    streetTowerHeights: [30, 42, 34, 48, 38, 45], // RESOLVED — tall varied city skyline across the road
    streetTowerWidths: [8, 7.2, 8.4, 7.6, 8.2, 7.4], // RESOLVED — tightly packed high-rise facades
    streetTowerDepths: [8.2, 7.6, 8.5, 7.8, 8.4, 7.7], // RESOLVED — deep city blocks behind the road
    streetTowerWindowColor: 0x9ed9e4, // RESOLVED — bright blue glass across each tower face
    shelterSideBlockX: 17.2, // RESOLVED — align left and right buildings just beyond the compound fence
    shelterSideBlockCentersZ: [-8, 1, 10], // RESOLVED — continue the city block along both sides of the shelter yard
    shelterSideBlockWidths: [8.2, 8.8, 8.4], // RESOLVED — substantial side-building frontage
    shelterSideBlockDepths: [8.6, 8.8, 8.4], // RESOLVED — adjoining side buildings form a continuous compound edge
    shelterSideBlockHeights: [17, 21, 18], // RESOLVED — mid-rise buildings tie the shelter into the skyline
    shelterSideBlockRoofHeight: 0.55, // RESOLVED — flat concrete roof cap on side buildings
    shelterSideBlockWindowColumns: 3, // RESOLVED — regular windows face into the shelter compound
    shelterSideBlockWindowSpacing: 2.1, // RESOLVED — evenly spaced windows on side facades
    shelterSideBlockWindowFloorInset: 1.3, // RESOLVED — begin windows above the sidewalk line
    shelterSideBlockWindowOffset: 0.06, // RESOLVED — lift glass slightly off the wall face
    shelterBackFenceZ: -16.2, // RESOLVED — hide the shelter's plain rear facade behind a tall boundary fence
    shelterBackFenceWidth: 48, // RESOLVED — span the full shelter compound and side streets
    shelterBackFenceHeight: 12, // RESOLVED — rise above the shelter roof as a visible rear landmark
    shelterBackFenceDepth: 0.5, // RESOLVED — sturdy opaque base wall beneath the slats
    shelterBackFenceBaseHeight: 2.3, // RESOLVED — hide the rear wall at ground level
    shelterBackFenceSlatWidth: 0.62, // RESOLVED — close-set vertical panels screen the shelter's rear facade
    shelterBackFenceSlatSpacing: 0.72, // RESOLVED — close spacing screens the shelter back
    shelterBackFenceRailHeight: 0.22, // RESOLVED — broad horizontal cap rails
    shelterBackFenceRailDepth: 0.32, // RESOLVED — visible solid top rails
    shelterBackFencePostWidth: 0.42, // RESOLVED — robust structural fence pillars
    shelterBackFencePostSpacing: 4.8, // RESOLVED — evenly spaced reinforced bays
    shelterBackFenceBaseColor: 0x687875, // RESOLVED — muted green-gray rear wall
    shelterBackFenceMetalColor: 0x354e4a, // RESOLVED — dark painted steel slats and posts
    shelterBackSignWidth: 20, // RESOLVED — prominent OWN THE DOGE inscription panel
    shelterBackSignHeight: 3.4, // RESOLVED — readable slogan plaque above the shelter roof
    shelterBackSignY: 8.9, // RESOLVED — keep the plaque visible over the shelter building
    shelterBackSignBorder: 0.22, // RESOLVED — gold frame around the inscription
    shelterBackSignCanvasWidth: 1200, // RESOLVED — crisp inscription lettering texture
    shelterBackSignCanvasHeight: 240, // RESOLVED — wide banner text layout
    shelterBackSignFillColor: '#145b47', // RESOLVED — shelter-green inscription panel
    shelterBackSignTextColor: '#fff0c7', // RESOLVED — bright lettering visible from the yard
    shelterBackSignBorderColor: '#f0c76e', // RESOLVED — warm outline around the slogan
    houseWindowDepth: 0.08, // RESOLVED — shallow exterior house windows
    houseWindowFrontOffset: 0.05, // RESOLVED — windows sit just proud of house walls
    houseWindowXRatio: 0.28, // RESOLVED — spread house windows across the facade
    houseDoorDepth: 0.1, // RESOLVED — shallow wooden house doors
    houseDoorFrontOffset: 0.055, // RESOLVED — doors sit just proud of house walls
    mobilePadOpacity: 0.82, // RESOLVED — readable translucent touch controls
  },

  worldScenery: {
    backgroundJapan: 0xb8d9ed, // RESOLVED — clear spring sky above Sakura City
    fogJapan: 0xc5d5d8, // RESOLVED — cool mist softens the Japanese skyline
    backgroundUSA: 0xf0a17e, // RESOLVED — warm sunset sky above Hollywood boulevard
    fogUSA: 0xe79a83, // RESOLVED — rose-gold sunset haze behind the USA skyline
    neutralRoadTint: 0xffffff, // RESOLVED — preserve the shared Lagos asphalt texture color
    usaSunsetDistance: 150, // RESOLVED — keep the sunset in front of the skyline at the horizon
    usaSunsetScreenX: 0, // RESOLVED — center the sunset over the forward road
    usaSunsetScreenY: 28, // RESOLVED — place the sunset high above the skyline
    usaSunsetGlowSize: 34, // RESOLVED — soft sunset glow fills the upper sky without covering the road
    usaSunsetCoreSize: 11, // RESOLVED — visible orange sun disk
    usaSunsetGlowColor: 0xff9a62, // RESOLVED — peach-orange sunset glow
    usaSunsetCoreColor: 0xff713f, // RESOLVED — saturated sunset sun disk
    slotSpacing: 32, // RESOLVED — keep Sakura buildings evenly spaced for smooth rendering
    wrapStartOffset: 30, // RESOLVED — populate scenery before the camera reaches the visible road
    sidewalkWidth: 4.4, // RESOLVED — continuous themed pavement beyond the rescue bays
    curbBlockLength: 2.2, // RESOLVED — alternating curb paint remains legible from the chase camera
    blossomTreeEvery: 1, // RESOLVED — Japan's roadside is clearly lined with cherry blossoms
    toriiEvery: 4, // RESOLVED — torii gates appear as occasional roadside landmarks
    landmarkEvery: 6, // RESOLVED — station and Doge statue are spaced along Sakura City
    buildingColorsJapan: [0xf1dfc9, 0xe9c8ad, 0xd8e0d2, 0xe6d8ed], // RESOLVED — warm Japanese shopfront palette
    roofColorJapan: 0x35404f, // RESOLVED — dark tiled-style Japanese roofs
    blossomColors: [0xffb7cf, 0xffd6e3, 0xf28fb4], // RESOLVED — layered sakura canopy shades
    trunkColorJapan: 0x694333, // RESOLVED — warm cherry-tree trunks
    toriiColor: 0xc83d36, // RESOLVED — vermilion shrine gates
    statueColor: 0xd5ad5b, // RESOLVED — golden Doge landmark statue
    stationColor: 0xf5f1e7, // RESOLVED — light Sakura City station exterior
    stationAccentJapan: 0x2879a8, // RESOLVED — blue station trim
    roadsideGroundWidth: 40, // RESOLVED — cover the Sakura neighborhood apron behind the shops and houses
    japanPaverTextureSize: 256, // RESOLVED — repeatable stone texture resolution
    japanPaverTilesPerAxis: 8, // RESOLVED — visible stone-block grid on Sakura City pavement
    japanPetalCountPerSide: 40, // RESOLVED — lighter pavement scatter keeps Sakura City rendering smooth
    japanPaverBase: 0xb8b0a4, // RESOLVED — warm gray Sakura City stone paving
    japanPaverAlternate: 0xc8c0b4, // RESOLVED — subtle tile variation across the ground
    japanPaverGrout: 0x8c867e, // RESOLVED — clear seams keep the ground from reading as a plain slab
    japanTimber: 0x604332, // RESOLVED — dark exposed wooden frames on Japanese homes
    japanPaper: 0xf0e7d2, // RESOLVED — warm shoji sliding-door panels
    japanGarden: 0x6a8b57, // RESOLVED — small green house-front garden patches
    japanCrowdEvery: 8, // RESOLVED — smaller pedestrian count keeps Sakura City responsive
    japanStreetDogEvery: 12, // RESOLVED — dogs remain visible at wider intervals
    japanSecondRowEvery: 10, // RESOLVED — reduce background house geometry while keeping depth
    japanThirdRowEvery: 15, // RESOLVED — sparse distant homes preserve the layered skyline
    buildingColorsUSA: [0x9b564a, 0x59748b, 0xd6b47b, 0x555664], // RESOLVED — brick, steel, and desert USA facades
    roofColorUSA: 0x343a46, // RESOLVED — dark urban roofline
    usaSignColor: 0xf2c84b, // RESOLVED — bright American road and diner signage
    usaAccent: 0xb9473f, // RESOLVED — red diner and Route 66 details
    usaGlass: 0x91c8df, // RESOLVED — cool glass separates USA skyline from Japan/Lagos
    usaSidewalkBase: 0x332d35, // RESOLVED — dark polished Walk of Fame sidewalk
    usaSidewalkTile: 0x51424a, // RESOLVED — warm plum tile variation on the Hollywood sidewalk
    usaSidewalkGrout: 0x1d2027, // RESOLVED — dark seams between Hollywood sidewalk tiles
    usaWalkOfFameStar: 0xe4bd75, // RESOLVED — warm brass stars set into Hollywood sidewalk tiles
    usaRoadTint: 0xe9c6a3, // RESOLVED — warm sunset-tinted asphalt makes the USA road distinct from Japan
    japanRoadTint: 0xc3d9e8, // RESOLVED — cool blue-gray asphalt keeps Sakura City distinct from the USA
    usaLaneMarkColor: 0xffd16b, // RESOLVED — golden USA boulevard lane markings
    usaGroundBase: 0xd2b486, // RESOLVED — sunlit sandstone-colored Hollywood boulevard apron
    usaGroundTile: 0xe2c99f, // RESOLVED — lighter paving blocks across the boulevard apron
    usaGroundGrout: 0x9f8667, // RESOLVED — warm paving seams keep the USA ground from reading gray
    usaPaverTextureSize: 512, // RESOLVED — repeatable USA boulevard texture resolution
    usaPaverTilesPerAxis: 4, // RESOLVED — large readable Hollywood paving blocks
    usaBoulevardBuildingWidths: [5.2, 5.8, 4.8, 5.6, 5.0, 5.4], // RESOLVED — denser varied lower USA storefronts
    usaBoulevardBuildingHeights: [9, 12, 10, 13, 8, 11], // RESOLVED — taller boulevard storefronts below the skyline
    usaBoulevardBuildingDepths: [5.2, 5.8, 4.8, 5.6, 5.0, 5.4], // RESOLVED — close-packed lower storefront blocks
    usaSkyscraperWidths: [6.2, 7.4, 5.8, 7.0, 6.4, 5.6], // RESOLVED — varied widths for the dense USA skyline
    usaSkyscraperHeights: [42, 56, 48, 64, 52, 60], // RESOLVED — USA towers rise above Lagos's 38-unit maximum
    usaSkyscraperDepths: [6.4, 7.2, 5.8, 6.8, 6.2, 7.4], // RESOLVED — varied depth for the second skyline row
    usaSkyscraperColors: [0xb4c6ca, 0xcbb99b, 0x9fa9b4, 0xd5c3a8, 0x8ca6ad], // RESOLVED — sunlit glass and stone skyscraper palette
    usaSkyscraperWindowRows: 14, // RESOLVED — dense window rows reinforce the taller USA skyline
    usaSkyscraperWindowColumns: 5, // RESOLVED — dense tower facade window layout
    usaSkyscraperWindowWidthRatio: 0.1, // RESOLVED — windows span a slim portion of each tower facade
    usaSkyscraperWindowHeightRatio: 0.48, // RESOLVED — keep visible wall space around every tower window
    usaSkyscraperRowOffset: 1.6, // RESOLVED — bring high-rises close enough to frame the boulevard
    usaSkyscraperZStagger: 13, // RESOLVED — stagger towers to fill gaps in the USA skyline
    usaSlotSpacing: 24, // RESOLVED — pack USA storefronts and towers more tightly than Sakura City
    usaHollywoodSignSize: [13, 2.5], // RESOLVED — large Hollywood hillside sign proportions
    usaHollywoodSignHeight: 8, // RESOLVED — raise the Hollywood sign above the boulevard buildings
    usaPaverRepeatWorldSize: 8, // RESOLVED — keep the paving texture blocks large and readable
    themedSidewalkY: 0.005, // RESOLVED — lift themed pavement above the roadside ground texture
    usaPeopleEvery: 1, // RESOLVED — populate each USA block with pedestrians
    usaStreetDogEvery: 2, // RESOLVED — add neighborhood dogs throughout the USA sidewalk route
    usaPalmEvery: 3, // RESOLVED — line Hollywood boulevard with regular palm trees
    usaStreetFurnitureEvery: 2, // RESOLVED — repeat benches, bins, and hydrants along both sidewalks
    usaStreetlightEvery: 3, // RESOLVED — evenly light the USA boulevard
    usaPeopleColors: [0x2875a8, 0xc94e47, 0x4e815e, 0xe0a832, 0x66519a], // RESOLVED — bright casual pedestrian clothing palette
    usaSkinColors: [0x80553e, 0xb97e5b, 0xe0b28c], // RESOLVED — varied pedestrian skin tones
    usaHairColors: [0x2b2420, 0x563b2d, 0xc4a267], // RESOLVED — varied pedestrian hair colors
    usaDogColors: [0xb47b4b, 0x39383a, 0xe1d6bf, 0x84604b], // RESOLVED — varied neighborhood dog coats
    usaFireHydrantColor: 0xd63b36, // RESOLVED — bright red roadside fire hydrants
    usaBenchColor: 0x79523a, // RESOLVED — warm wood public benches
    usaTrashCanColor: 0x3a5969, // RESOLVED — blue-green street litter bins
    usaPalmTrunkColor: 0x8c6040, // RESOLVED — warm palm trunks for Hollywood boulevard
    usaPalmLeafColor: 0x348754, // RESOLVED — green palm crowns
    usaStreetlightColor: 0xffe2a0, // RESOLVED — warm globe lights along the boulevard
    usaStreetlightPoleColor: 0x48505a, // RESOLVED — dark metal boulevard light poles
    usaPedestrianScale: 1, // RESOLVED — pedestrian proportions for the USA sidewalk
    usaStreetDogScale: 1, // RESOLVED — neighborhood dog proportions for the USA sidewalk
    usaPalmHeight: 4.3, // RESOLVED — prominent palms spaced along the boulevard
    usaPalmFrondCount: 6, // RESOLVED — broad palm crowns shade the sidewalk
    usaPalmFrondScale: [0.16, 0.12, 1.15], // RESOLVED — long low-poly palm fronds
    usaPedestrianBodySize: [0.48, 0.92, 0.34], // RESOLVED — casual sidewalk character proportions
    usaPedestrianHeadRadius: 0.23, // RESOLVED — pedestrian head size
    usaPedestrianLimbRadius: 0.075, // RESOLVED — pedestrian arm and leg thickness
    usaStreetDogBodyScale: [0.42, 0.3, 0.68], // RESOLVED — friendly neighborhood dog silhouette
    usaStreetDogHeadScale: [0.3, 0.3, 0.3], // RESOLVED — neighborhood dog head proportions
    usaStreetDogLegRadius: 0.075, // RESOLVED — neighborhood dog leg thickness
    usaFireHydrantHeight: 0.72, // RESOLVED — sidewalk fire hydrant height
    usaBenchSize: [1.65, 0.14, 0.42], // RESOLVED — public bench seat proportions
    usaTrashCanSize: [0.42, 0.82], // RESOLVED — public sidewalk litter bin proportions
    usaStreetlightHeight: 4.2, // RESOLVED — boulevard pedestrian streetlight height
    gantrySignColorJapan: 0x9b384b, // RESOLVED — red roadside overhead signs for Sakura City
    gantrySignColorUSA: 0x164d8a, // RESOLVED — blue American interstate signs
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
