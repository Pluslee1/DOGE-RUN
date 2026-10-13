import { CONFIG, DEBUG } from './config.js';
import { createGame, update } from './game.js';
import { createInput } from './input.js';
import { createTrafficField, requestHornManeuver, updateTraffic } from './traffic.js';
import { createPickupField, spawnBoneLine, updatePickups } from './collectibles.js';
import { createStopDogField, updateStopDogs } from './dogs.js';
import { createObstacleField, spawnRoadObstacles, updateRoadObstacles } from './obstacles.js';
import { createRenderer3D } from './render3d.js';
import { drawHud, drawEndScreen } from './hud.js';
import { createButtons } from './buttons.js';
import { scoreOf } from './score.js';
import { processTrafficCollision } from './collisions.js';
import { createDrivingAudio } from './driving-audio.js';
import {
  WORLDS, UPGRADES, profile, saveProfile, selectRoute, selectedRoute,
  upgradeLevel, upgradeCost, buyUpgrade, earnCoins, recordTaskCompletion,
} from './progression.js';

// Global error handler
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error || e.message);
  if (!window.__errorShown) {
    window.__errorShown = true;
    alert('Error: ' + (e.error?.message || e.message) + '\n\nCheck console (F12) for details.');
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
  if (!window.__errorShown) {
    window.__errorShown = true;
    alert('Promise error: ' + (e.reason?.message || e.reason) + '\n\nCheck console (F12) for details.');
  }
});

const worldCanvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');
const hudCtx = hudCanvas.getContext('2d');

// Let the career/route screen paint before constructing the large Three.js scene.
let renderer3d = null;

let game;
let field;
let pickups;
let dogs;
let obstacles;
let lastTime = 0;
let sceneTime = 0;
let restartReadyAt = 0;
let hornWasPressed = false;
let audioContext = null;
let drivingAudio = null;
const pauseButton = document.getElementById('pause');
const careerPanel = document.getElementById('career');
const worldSelect = document.getElementById('world-select');
const levelSelect = document.getElementById('level-select');
const garageList = document.getElementById('garage-list');
const careerMessage = document.getElementById('career-message');

function renderCareer() {
  worldSelect.innerHTML = WORLDS.map((world) => (
    `<option value="${world.id}" ${world.id === profile.selectedWorld ? 'selected' : ''}>${world.flag} ${world.name}</option>`
  )).join('');
  const world = WORLDS.find((item) => item.id === profile.selectedWorld) || WORLDS[0];
  const unlocked = Math.min(profile.unlockedLevels[world.id] || 0, CONFIG.progression.levelCount - 1);
  levelSelect.innerHTML = world.routes.map((route, index) => (
    `<option value="${index}" ${index > unlocked ? 'disabled' : ''} ${index === profile.selectedLevel ? 'selected' : ''}>${index + 1}. ${route}${index > unlocked ? ' · Locked' : ''}</option>`
  )).join('');
  document.getElementById('coin-bank').textContent = profile.coins.toLocaleString();
  garageList.innerHTML = UPGRADES.map((upgrade) => {
    const level = upgradeLevel(upgrade.id);
    const cost = upgradeCost(upgrade.id);
    const maxed = cost === null;
    return `<div class="garage-row"><div><strong>${upgrade.name} ${'●'.repeat(level)}${'○'.repeat((CONFIG.garage.upgradeCosts[upgrade.id] || []).length - level)}</strong><small>${upgrade.description}</small></div><button type="button" data-upgrade="${upgrade.id}" ${maxed || profile.coins < cost ? 'disabled' : ''}>${maxed ? 'MAXED' : `🪙 ${cost}`}</button></div>`;
  }).join('');
}

renderCareer();
worldSelect.addEventListener('change', () => {
  selectRoute(worldSelect.value, 0);
  careerMessage.textContent = 'Route selected. The rescue road setting is unchanged.';
  renderCareer();
});
levelSelect.addEventListener('change', () => {
  if (selectRoute(profile.selectedWorld, Number(levelSelect.value))) {
    careerMessage.textContent = `Selected ${selectedRoute().name}.`;
  }
  renderCareer();
});
garageList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-upgrade]');
  if (!button || !buyUpgrade(button.dataset.upgrade)) return;
  careerMessage.textContent = 'Garage upgrade purchased and saved.';
  renderCareer();
});
document.getElementById('drive-route').addEventListener('click', tryRestart);

function unlockAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    audioContext ||= new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    drivingAudio ||= createDrivingAudio(audioContext);
  } catch {
    audioContext = null;
  }
}

function playStopSuccess() {
  if (!audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  const tone = audioContext.createOscillator();
  const volume = audioContext.createGain();
  tone.type = 'sine';
  tone.frequency.setValueAtTime(660, now);
  tone.frequency.setValueAtTime(880, now + 0.12);
  volume.gain.setValueAtTime(0.0001, now);
  volume.gain.exponentialRampToValueAtTime(0.12, now + 0.025);
  volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  tone.connect(volume);
  volume.connect(audioContext.destination);
  tone.start(now);
  tone.stop(now + 0.43);
}

function savedBestScore() {
  try {
    return Number(localStorage.getItem('doge-rescue-best-score')) || 0;
  } catch {
    return 0;
  }
}

function resize() {
  const scale = Math.min(window.innerWidth / CONFIG.logicalWidth, window.innerHeight / CONFIG.logicalHeight);
  const cssWidth = Math.max(1, Math.floor(CONFIG.logicalWidth * scale));
  const cssHeight = Math.max(1, Math.floor(CONFIG.logicalHeight * scale));
  const dpr = window.devicePixelRatio || 1;

  for (const canvas of [worldCanvas, hudCanvas]) {
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
  }

  if (renderer3d) renderer3d.resize(cssWidth, cssHeight, dpr);

  hudCanvas.width = Math.round(cssWidth * dpr);
  hudCanvas.height = Math.round(cssHeight * dpr);
  hudCtx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

function startRun(seed) {
  game = createGame(seed);
  game.route = selectedRoute();
  game.upgrades = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgradeLevel(upgrade.id)]));
  game.shieldTimer = upgradeLevel('startingShield') > 0 ? CONFIG.powerups.startingShieldSeconds : 0;
  game.bestScore = savedBestScore();
  field = createTrafficField(seed);
  pickups = createPickupField((seed ^ 0x9e3779b9) >>> 0);
  dogs = createStopDogField((seed ^ 0x85ebca6b) >>> 0);
  obstacles = createObstacleField((seed ^ CONFIG.obstacles.seedSalt) >>> 0);
  lastTime = 0;
  hornWasPressed = false;

  field.onWave = (wave) => {
    spawnBoneLine(pickups, wave);
    spawnRoadObstacles(obstacles, wave);
  };
}

function randomSeed() {
  return Math.floor(Math.random() * 0x7fffffff);
}

function tryRestart() {
  if (game.state === 'running') return;
  if (performance.now() < restartReadyAt) return;
  if (game.state === 'crashed') {
    startRun(randomSeed());
  }
  game.route = selectedRoute();
  game.upgrades = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgradeLevel(upgrade.id)]));
  if (game.state === 'ready' && upgradeLevel('startingShield') > 0) game.shieldTimer = CONFIG.powerups.startingShieldSeconds;
  game.state = 'running';
  careerPanel.classList.add('is-hidden');
  lastTime = 0;
  unlockAudio();
}

function togglePause() {
  if (game.state === 'running') game.state = 'paused';
  else if (game.state === 'paused') {
    game.state = 'running';
    lastTime = 0;
    unlockAudio();
  }
}

const input = createInput(window, tryRestart, togglePause);
input.attachSwipe(worldCanvas);
worldCanvas.addEventListener('click', tryRestart);
pauseButton.addEventListener('click', togglePause);

const buttons = createButtons(
  {
    speed: document.getElementById('speed'),
    brake: document.getElementById('brake'),
    horn: document.getElementById('horn'),
    jump: document.getElementById('jump'),
  },
);

function frame(now) {
  const dt = lastTime === 0 ? 0 : (now - lastTime) / 1000;
  lastTime = now;

  const step = Math.min(dt, 1 / 20);
  sceneTime += step;
  const completedStops = game.stops.completed;
  const completedTasks = game.tasksCompleted;
  const keyboardJump = input.jumpPressed();
  const buttonJump = buttons.takePressed('jump');
  const stepped = update(game, step, input.laneStep(), buttons, keyboardJump || buttonJump);
  const hornPressed = buttons.isPressed('horn');

  if (stepped) {
    updateRoadObstacles(game, obstacles, step);
    const pickupResult = updatePickups(game, pickups, step);
    if (pickupResult.coins > 0) {
      game.coinsEarned += earnCoins(pickupResult.coins);
      renderCareer();
    }
    updateStopDogs(game, dogs, step);
    if (game.tasksCompleted > completedTasks) {
      recordTaskCompletion(game.route);
      careerMessage.textContent = `Route progress saved: ${selectedRoute().name}.`;
      renderCareer();
    }
    if (hornPressed && !hornWasPressed) requestHornManeuver(game, field);
    updateTraffic(game, field, step);
    processTrafficCollision(game, field);
    if (game.stops.completed > completedStops) playStopSuccess();
  }
  hornWasPressed = hornPressed;

  drivingAudio?.update(game, buttons);

  if (game.state === 'crashed' && !game.crashFinalized) {
    game.crashFinalized = true;
    game.bestScore = Math.max(game.bestScore || 0, scoreOf(game));
    try {
      localStorage.setItem('doge-rescue-best-score', String(game.bestScore));
    } catch {
      // The run summary remains available even when storage is unavailable.
    }
    restartReadyAt = performance.now() + 400;
    careerMessage.textContent = `Run complete · ${game.coinsCollected} road coins collected · ${profile.coins.toLocaleString()} in your garage bank.`;
    careerPanel.classList.remove('is-hidden');
  }

  buttons.setVisible(game.state === 'running');
  pauseButton.classList.toggle('is-hidden', game.state !== 'running');

  const renderStep = game.state === 'running' || game.crashState === 'halted' ? step : 0;
  renderer3d?.render(game, renderStep, field, dogs, sceneTime, pickups, obstacles);
  drawHud(hudCtx, game, dogs);
  if (game.state === 'crashed') drawEndScreen(hudCtx, game);

  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
startRun(randomSeed());
resize();
requestAnimationFrame(frame);
// Two animation frames give the browser a chance to show the route picker before
// WebGL compiles shaders and builds the pooled roadside/game meshes.
requestAnimationFrame(() => requestAnimationFrame(() => {
  renderer3d = createRenderer3D(worldCanvas);
  resize();
}));
