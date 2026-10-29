import { CONFIG, DEBUG } from './config.js';
import { scoreOf, missionStatus } from './score.js';
import { nextStopZone } from './stops.js';

const COLOR_LABELS = {
  black: 'Black',
  brown: 'Brown',
  golden: 'Golden',
  spotted: 'Spotted',
};

const COLOR_HEXES = {
  black: CONFIG.palette.dogFurBlack,
  brown: CONFIG.palette.dogFurBrown,
  golden: CONFIG.palette.dogFurGolden,
  spotted: CONFIG.palette.dogFurSpotted,
};

function drawDistanceCard(ctx, game) {
  const { palette: p, hud } = CONFIG;
  drawPanel(ctx, hud.topBarLeftX, hud.topBarY, hud.topBarLeftWidth, hud.distanceCardHeight, 'rgba(11,17,31,0.82)', 'rgba(255,255,255,0.16)');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(242,242,242,0.66)';
  ctx.font = '700 9px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('DISTANCE', hud.distanceLabelX, hud.distanceLabelY);
  ctx.fillStyle = p.hudText;
  ctx.font = '900 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(formatDistance(game.distance), hud.distanceLabelX, hud.distanceValueY, hud.distanceValueMaxWidth);

  const kmh = Math.round(Math.abs(game.vanSpeed) / CONFIG.distance.pixelsPerMeter * 3.6);
  const speedLabel = game.isReversing ? `REV ${kmh}` : `${kmh} km/h`;
  drawInfoCard(ctx, hud.topBarLeftX, hud.speedCardY, hud.topBarLeftWidth, hud.speedCardHeight, 'VAN SPEED', speedLabel, p.vanAccent);
}

function drawResourceCard(ctx, game) {
  const { palette: p, hud } = CONFIG;
  const x = hud.topBarRightX;
  const y = hud.topBarY;
  const width = hud.topBarLeftWidth;
  drawPanel(ctx, x, y, width, hud.resourceCardHeight, 'rgba(11,17,31,0.82)', 'rgba(255,255,255,0.16)');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 8px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(242,242,242,0.66)';
  ctx.fillText('BONES', x + hud.resourceLabelOffsetX[0], hud.resourceLabelY);
  ctx.fillText('COINS', x + hud.resourceLabelOffsetX[1], hud.resourceLabelY);
  ctx.font = '900 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = p.vanAccent;
  ctx.fillText(String(game.collected), x + hud.resourceLabelOffsetX[0], hud.resourceValueY);
  ctx.fillText(String(game.coinsCollected || 0), x + hud.resourceLabelOffsetX[1], hud.resourceValueY);
  ctx.textAlign = 'left';
}

export function drawHud(ctx, game, dogs = null) {
  const { palette: p, logicalWidth } = CONFIG;
  ctx.clearRect(0, 0, CONFIG.logicalWidth, CONFIG.logicalHeight);
  if (game.state === 'ready') {
    drawReadyScreen(ctx, game);
    return;
  }
  if (game.state === 'paused') {
    drawPauseScreen(ctx);
    return;
  }
  if (game.state !== 'running') return;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.textBaseline = 'top';

  drawDistanceCard(ctx, game);
  drawTaskDisplay(ctx, game);
  drawResourceCard(ctx, game);
  drawHazardStatus(ctx, game);
  drawInfoCard(
    ctx,
    CONFIG.hud.topBarRightX,
    CONFIG.hud.dogsCardY,
    CONFIG.hud.topBarLeftWidth,
    CONFIG.hud.dogsCardHeight,
    'RESCUE VAN DOGS',
    `${game.onboardDogs} / ${CONFIG.shelter.capacity}`,
    p.vanAccent,
  );

  const nextZone = nextStopZone(game);
  const shelterStopAhead = Boolean(nextZone?.isShelter);
  const stopLabel = game.shelterUnloading
    ? `DOGS ENTERING SHELTER · ${game.shelterUnloading.dogsRemaining} LEFT`
    : game.onboardDogs >= CONFIG.shelter.capacity
      ? 'VAN FULL · PARK AT THE DOGE SHELTER'
    : shelterStopAhead && game.parking.state === 'parked'
      ? 'DOGE SHELTER DROP-OFF'
      : game.parking.state === 'parked'
        ? 'DOGS BOARDING'
        : game.parking.state === 'in-stop-zone-moving'
          ? 'HOLD BRAKE HERE'
          : 'DOGS AT NEXT STOP';
  if (game.onboardDogs >= CONFIG.shelter.capacity || game.parking.state === 'parked' || game.parking.state === 'in-stop-zone-moving' || game.shelterUnloading) {
    drawInfoCard(ctx, CONFIG.hud.topBarLeftX, CONFIG.hud.rescueStatusY, logicalWidth - CONFIG.hud.topBarLeftX * 2, CONFIG.hud.rescueStatusHeight, 'RESCUE STOP', stopLabel, p.vanAccent);
  }
  if (game.crashCount > 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = p.vanAccent;
    ctx.fillText(`HITS ${game.crashCount}/${CONFIG.crash.vanHealth}`, logicalWidth / 2, CONFIG.hud.hitCountY);
  }
  drawStopHud(ctx, game);
  drawRescueNameNotice(ctx, game);

  if (game.parking.state === 'parked') drawBoardingNotice(ctx);

  if (game.celebrationTimer > 0) {
    drawCelebration(ctx, game);
  }

  if (DEBUG) drawDebugInfo(ctx, game, dogs);
  ctx.textAlign = 'left';
}

function drawHazardStatus(ctx, game) {
  if (game.slipperyTimer <= 0 && game.potholeTimer <= 0) return;
  const oilActive = game.slipperyTimer > 0;
  const seconds = Math.ceil(oilActive ? game.slipperyTimer : game.potholeTimer);
  const oilImpacting = game.oilImpactTimer > 0;
  const label = oilActive
    ? oilImpacting ? 'OIL HIT · VAN SLIDING!' : `LOW GRIP · ${seconds}s`
    : `POTHOLE HIT · SLOWED ${seconds}s`;
  const width = oilActive ? 190 : 224;
  const x = (CONFIG.logicalWidth - width) / 2;
  const y = 132;
  drawPanel(ctx, x, y, width, 32, 'rgba(11,17,31,0.92)', oilActive ? oilImpacting ? 'rgba(255,120,92,0.95)' : 'rgba(243,185,50,0.9)' : 'rgba(255,120,92,0.9)');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = oilActive && !oilImpacting ? CONFIG.palette.vanAccent : '#ff9a83';
  ctx.font = '900 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(label, CONFIG.logicalWidth / 2, y + 16, width - 14);
  ctx.textAlign = 'left';
}

function drawRescueNameNotice(ctx, game) {
  if (!(game.lastRescueTimer > 0) || !game.lastRescueName) return;
  const width = 270;
  const x = (CONFIG.logicalWidth - width) / 2;
  drawPanel(ctx, x, 454, width, 42, 'rgba(11,17,31,0.92)', 'rgba(243,185,50,0.8)');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CONFIG.palette.vanAccent;
  ctx.font = '900 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`${game.lastRescueName} IS SAFE!`, CONFIG.logicalWidth / 2, 475, width - 18);
  ctx.textAlign = 'left';
}

function drawReadyScreen(ctx, game) {
  const { logicalWidth: w, logicalHeight: h, palette: p } = CONFIG;
  ctx.fillStyle = 'rgba(8, 12, 24, 0.48)';
  ctx.fillRect(0, 0, w, h);
  drawPanel(ctx, 30, 88, w - 60, 556, 'rgba(11, 17, 31, 0.93)', 'rgba(255,255,255,0.16)');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = p.vanAccent;
  ctx.font = '700 14px "Segoe UI", system-ui, sans-serif';
  const routeTitle = game.route?.worldId === 'lagos'
    ? 'DOGE CITY  ·  LAGOS RESCUE ROUTE'
    : game.route
      ? `${game.route.flag} ${game.route.worldName.toUpperCase()}  ·  ${game.route.name.toUpperCase()}`
      : 'DOGE RESCUE ROUTE';
  ctx.fillText(routeTitle, w / 2, 145);

  ctx.fillStyle = p.hudText;
  ctx.font = '900 42px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('DOG RESCUE', w / 2, 199);
  ctx.fillStyle = p.vanAccent;
  ctx.font = '900 32px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('RUN', w / 2, 240);

  ctx.fillStyle = 'rgba(242,242,242,0.78)';
  ctx.font = '500 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Drive the rescue van. Bring every dog aboard.', w / 2, 280);

  drawStatCard(ctx, 58, 318, 160, 66, 'BEST SCORE', String(game.bestScore || 0), p.vanAccent);
  drawStatCard(ctx, 262, 318, 160, 66, 'RESCUE TASK', `${game.task.count} ${COLOR_LABELS[game.task.color].toLowerCase()} dogs`, p.hudText);

  drawPanel(ctx, 56, 410, w - 112, 62, 'rgba(243, 185, 50, 0.98)', 'rgba(255,255,255,0.3)');
  ctx.fillStyle = '#171a22';
  ctx.font = '900 21px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('TAP TO DRIVE', w / 2, 441);

  ctx.fillStyle = p.hudText;
  ctx.font = '700 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('HOW TO RESCUE', w / 2, 510);
  ctx.font = '500 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(242,242,242,0.82)';
  ctx.fillText('Swipe sideways to steer  ·  Hold GAS to speed up', w / 2, 542);
  ctx.fillText('Hold BRAKE in yellow stop zones to earn rewards', w / 2, 565);
  ctx.fillText('Move to the right lane and stop in the yellow strip', w / 2, 588);
  ctx.fillText('Dogs board the rescue van one at a time', w / 2, 611);
  ctx.fillText('Swipe up  ·  SPACE / W / ↑ to jump', w / 2, 632);

  ctx.fillStyle = 'rgba(242,242,242,0.58)';
  ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('ENTER TO START  ·  SPACE TO JUMP', w / 2, h - 112);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawPauseScreen(ctx) {
  const { logicalWidth: w, logicalHeight: h, palette: p } = CONFIG;
  ctx.fillStyle = 'rgba(8, 12, 24, 0.62)';
  ctx.fillRect(0, 0, w, h);
  drawPanel(ctx, 48, 264, w - 96, 260, 'rgba(11,17,31,0.95)', 'rgba(255,255,255,0.18)');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = p.vanAccent;
  ctx.font = '900 38px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PAUSED', w / 2, 326);
  ctx.fillStyle = p.hudText;
  ctx.font = '500 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Take a breather, the dogs are safe.', w / 2, 375);
  drawPanel(ctx, 95, 420, w - 190, 56, 'rgba(243,185,50,0.98)', 'rgba(255,255,255,0.3)');
  ctx.fillStyle = '#171a22';
  ctx.font = '800 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('TAP TO CONTINUE', w / 2, 448);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawStatCard(ctx, x, y, width, height, label, value, accent) {
  drawPanel(ctx, x, y, width, height, 'rgba(11,17,31,0.78)', 'rgba(255,255,255,0.13)');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(242,242,242,0.65)';
  ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(label, x + width / 2, y + 16);
  ctx.fillStyle = accent;
  ctx.font = '800 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(value, x + width / 2, y + 38, width - 12);
  ctx.textAlign = 'left';
}

function drawInfoCard(ctx, x, y, width, height, label, value, accent) {
  drawPanel(ctx, x, y, width, height, 'rgba(11,17,31,0.76)', 'rgba(255,255,255,0.12)');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(242,242,242,0.58)';
  ctx.font = '700 9px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(label, x + 12, y + 13);
  ctx.fillStyle = accent;
  ctx.font = '800 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(value, x + 12, y + 31, width - 24);
}

function drawBoardingNotice(ctx) {
  const { logicalWidth: w, palette: p } = CONFIG;
  drawPanel(ctx, 74, 570, w - 148, 56, 'rgba(11,17,31,0.88)', 'rgba(243,185,50,0.8)');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = p.vanAccent;
  ctx.font = '900 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('RESCUE IN PROGRESS', w / 2, 590);
  ctx.fillStyle = p.hudText;
  ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Stay parked while the dogs board', w / 2, 611);
  ctx.textAlign = 'left';
}

function drawPanel(ctx, x, y, width, height, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 18);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawStopHud(ctx, game) {
  const { stops, palette: p, logicalWidth: w } = CONFIG;
  const zone = nextStopZone(game);
  if (!zone) return;

  const distanceToStart = zone.startZ - game.distance;
  const brakingDistance = (game.vanSpeed * game.vanSpeed)
    / (2 * CONFIG.speed.brakeStrength * CONFIG.distance.pixelsPerMeter);
  const warningDistance = Math.max(
    stops.warningMeters,
    brakingDistance + stops.extraBrakingWarningMeters,
  );
  if (distanceToStart <= warningDistance && zone.state !== 'completed') {
    let warning = `STOP IN ${Math.max(0, Math.ceil(distanceToStart))} M  ·  BRAKE SOON`;
    if (zone.state === 'active') {
      warning = game.van.lane === zone.lane
        ? 'STOP ZONE  ·  HOLD BRAKE'
        : 'MOVE TO RIGHT LANE';
    }
    drawPanel(ctx, CONFIG.hud.stopWarningX, CONFIG.hud.stopWarningY, w - CONFIG.hud.stopWarningX * 2, CONFIG.hud.stopWarningHeight, 'rgba(245, 193, 38, 0.96)', 'rgba(255,255,255,0.45)');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#191b20';
    ctx.font = '900 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(warning, w / 2, CONFIG.hud.stopWarningY + CONFIG.hud.stopWarningTextYInset, w - CONFIG.hud.stopWarningTextWidthInset);
    ctx.textAlign = 'left';
  }

  if (game.stops.dwellProgress > 0 && zone.state === 'active') {
    drawPanel(ctx, CONFIG.hud.boardingCardX, CONFIG.hud.boardingCardY, w - CONFIG.hud.boardingCardX * 2, CONFIG.hud.boardingCardHeight, 'rgba(11,17,31,0.9)', 'rgba(255,255,255,0.2)');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = p.hudText;
    ctx.font = '900 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('BOARDING...', w / 2, CONFIG.hud.boardingLabelY);
    const barX = CONFIG.hud.boardingBarX;
    const barY = CONFIG.hud.boardingBarY;
    const barWidth = w - CONFIG.hud.boardingBarWidthInset;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, CONFIG.hud.boardingBarHeight, CONFIG.hud.taskBarRadius);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * game.stops.dwellProgress, CONFIG.hud.boardingBarHeight, CONFIG.hud.taskBarRadius);
    ctx.fillStyle = p.stopSuccess;
    ctx.fill();
    ctx.textAlign = 'left';
  }

  if (game.stops.feedbackTimer > 0 && game.stops.feedback) {
    const boxWidth = 252;
    const pulse = 0.76 + 0.24 * Math.sin((CONFIG.stops.feedbackSeconds - game.stops.successTimer) * 12);
    ctx.globalAlpha = pulse;
    drawPanel(
      ctx,
      (w - boxWidth) / 2,
      352,
      boxWidth,
      42,
      'rgba(11,17,31,0.9)',
      p.stopSuccess,
    );
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = p.stopSuccess;
    ctx.font = '900 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(game.stops.feedback, w / 2, 373, boxWidth - 16);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

export function drawEndScreen(ctx, game) {
  const { logicalWidth: w, logicalHeight: h, palette: p } = CONFIG;

  ctx.fillStyle = 'rgba(11, 13, 23, 0.82)';
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.font = '800 40px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = p.vanAccent;
  ctx.fillText(game.endReason === 'crash' ? 'CRASHED' : 'RUN OVER', w / 2, 96);

  ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = p.hudText;
  ctx.fillText('FINAL SCORE', w / 2, 156);
  ctx.font = '800 46px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = p.vanAccent;
  ctx.fillText(String(scoreOf(game)), w / 2, 178);

  const stats = [
    ['DISTANCE', formatDistance(game.distance)],
    ['DOGS RESCUED', String(game.rescued)],
    ['BONES  ·  COINS', `${game.collected}  ·  ${game.coinsCollected || 0}`],
    ['TASKS COMPLETED', String(game.tasksCompleted || 0)],
    ['STOPS / STOP BONUS', `${game.stops.completed} / ${game.stopPoints}`],
  ];
  ctx.font = '600 17px "Segoe UI", system-ui, sans-serif';
  stats.forEach(([label, value], i) => {
    const y = 252 + i * 32;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(242, 242, 242, 0.72)';
    ctx.fillText(label, 84, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = p.hudText;
    ctx.fillText(value, w - 84, y);
  });

  ctx.textAlign = 'center';
  ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = p.hudText;
  ctx.fillText('MISSIONS', w / 2, 420);

  ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
  missionStatus(game).forEach((m, i) => {
    ctx.fillStyle = m.done ? p.vanAccent : 'rgba(242, 242, 242, 0.72)';
    ctx.fillText(
      `${m.done ? '[x]' : '[ ]'} ${m.label} (${formatProgress(m)})`,
      w / 2,
      446 + i * 26,
    );
  });

  ctx.fillStyle = 'rgba(242, 242, 242, 0.85)';
  ctx.font = '600 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Press ENTER to run again', w / 2, h - 92);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawTaskDisplay(ctx, game) {
  const { palette: p, logicalWidth: w } = CONFIG;
  const task = game.task;

  if (!task) return;

  const label = COLOR_LABELS[task.color] || task.color;
  const colorHex = COLOR_HEXES[task.color] || p.vanAccent;
  const progress = `${task.progress} / ${task.count}`;

  // Background bubble - cartoon style
  const bubbleWidth = CONFIG.hud.taskCardWidth;
  const bubbleHeight = CONFIG.hud.taskCardHeight;
  const bubbleX = (w - bubbleWidth) / 2;
  const bubbleY = CONFIG.hud.topBarY;
  const radius = CONFIG.hud.taskCardRadius;

  ctx.beginPath();
  ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, radius);
  ctx.fillStyle = 'rgba(11, 13, 23, 0.85)';
  ctx.fill();
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = CONFIG.hud.taskStrokeWidth;
  ctx.stroke();

  // Task text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "Save X dogs"
  ctx.font = '800 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = p.hudText;
  ctx.fillText(`Save ${task.count} ${label.toLowerCase()} dogs`, w / 2, CONFIG.hud.taskTextY, bubbleWidth - CONFIG.hud.taskTextMaxWidthInset);

  // Progress bar
  const barWidth = CONFIG.hud.taskBarWidth;
  const barHeight = CONFIG.hud.taskBarHeight;
  const barX = (w - barWidth) / 2;
  const barY = CONFIG.hud.taskBarY;
  const progressRatio = Math.min(task.progress / task.count, 1);

  // Bar background
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, CONFIG.hud.taskBarRadius);
  ctx.fillStyle = 'rgba(242, 242, 242, 0.2)';
  ctx.fill();

  // Bar fill
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth * progressRatio, barHeight, CONFIG.hud.taskBarRadius);
  ctx.fillStyle = colorHex;
  ctx.fill();

  // Progress text
  ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = p.hudText;
  ctx.fillText(progress, w / 2, barY + barHeight / 2 + 1);
}

function drawCelebration(ctx, game) {
  const { palette: p, logicalWidth: w, logicalHeight: h } = CONFIG;

  const alpha = Math.min(game.celebrationTimer / 0.3, 1);
  ctx.globalAlpha = alpha;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '800 48px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = p.vanAccent;
  ctx.fillText('TASK COMPLETE!', w / 2, h / 2 - 20);

  ctx.font = '600 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = p.hudText;
  ctx.fillText(`+${CONFIG.tasks.scorePerTask} points`, w / 2, h / 2 + 30);

  ctx.globalAlpha = 1;
}

function drawMissions(ctx, game) {
  const { palette: p } = CONFIG;
  const missions = missionStatus(game);

  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  missions.forEach((m, i) => {
    const y = 48 + i * 19;
    ctx.fillStyle = m.done ? p.vanAccent : p.hudText;
    ctx.fillText(`${m.done ? '[x]' : '[ ]'} ${m.label} (${formatProgress(m)})`, 12, y + 1);
  });
}

function formatProgress(mission) {
  if (mission.metric === 'distance') return formatDistance(Math.min(mission.value, mission.target));
  return `${Math.min(Math.floor(mission.value), mission.target)}/${mission.target}`;
}

function formatDistance(meters) {
  const { unit } = CONFIG.distance;
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.floor(meters)} ${unit}`;
}

function drawDebugInfo(ctx, game, dogs = null) {
  const { van, parking } = game;
  let dogStates = 'N/A';
  let idleCount = 0;
  let walkingCount = 0;
  let enteringCount = 0;
  let aboardCount = 0;
  
  if (dogs && dogs.dogs) {
    for (const d of dogs.dogs) {
      if (d.state === 'idle') idleCount++;
      else if (d.state === 'walking') walkingCount++;
      else if (d.state === 'entering') enteringCount++;
      else if (d.state === 'aboard') aboardCount++;
    }
    dogStates = `idle:${idleCount} walk:${walkingCount} enter:${enteringCount} aboard:${aboardCount}`;
  }
  
  const lines = [
    `LANE: ${van.lane}`,
    `SPEED: ${game.vanSpeed.toFixed(0)} px/s`,
    `PARKING: ${parking.state}`,
    `PARK TIMER: ${parking.timer.toFixed(1)}s`,
    `DOGS: ${game.rescued} rescued`,
    `VAN STATE: ${game.parking.state}`,
    `DOG STATES: ${dogStates}`,
  ];

  ctx.font = '600 13px "Segoe UI", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  lines.forEach((line, i) => {
    const y = 70 + i * 16;
    ctx.fillStyle = 'rgba(11,13,23,0.7)';
    ctx.fillText(line, 12, y + 1);
    ctx.fillStyle = '#00ff00';
    ctx.fillText(line, 10, y);
  });
}
