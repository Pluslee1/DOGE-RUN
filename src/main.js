import '../css/style.css';
import { CONFIG, DEBUG } from './config.js';
import { createGame, update } from './game.js';
import { createInput } from './input.js';
import { createTrafficField, requestHornManeuver, updateTraffic } from './traffic.js';
import { createPickupField, spawnBoneLine, updatePickups } from './collectibles.js';
import { createStopDogField, updateStopDogs } from './dogs.js';
import { createObstacleField, spawnRoadObstacles, updateRoadObstacles } from './obstacles.js';
import { drawHud, drawEndScreen } from './hud.js';
import { createButtons } from './buttons.js';
import { scoreOf } from './score.js';
import { processTrafficCollision } from './collisions.js';
import { createDrivingAudio } from './driving-audio.js';
import { createGameRadio } from './radio.js';
import { companionReaction } from './city-conditions.js';
import {
  WORLDS, UPGRADES, profile, saveProfile, selectRoute, selectedRoute,
  upgradeLevel, upgradeCost, buyUpgrade, earnCoins, recordTaskCompletion, selectedVan, selectVan, unlockVan,
  shelterUpgradeLevel, shelterUpgradeCost, buyShelterUpgrade, shelterLevel, shelterUpgradeCount,
  shelterCarePackageCost, buyShelterCarePackage,
  recordShelterRescue, processShelterAdoptions,
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
let soundMuted = false;
const shelterDogBarkAudio = new Audio('/audio/dog-bark.wav');
shelterDogBarkAudio.preload = 'auto';
let shelterActive = false;
let shelterPetMessageUntil = 0;
let shelterControlsHintTimeout = 0;
const shelterKeys = new Set();
const shelterTouch = new Set();
let shelterLookPointer = null;
const pauseButton = document.getElementById('pause');
pauseButton.style.setProperty('--pause-left', `${CONFIG.hud.pauseLeftPercent}%`);
pauseButton.style.setProperty('--pause-top', `${CONFIG.hud.pauseTopPercent}%`);
pauseButton.style.setProperty('--pause-size', `${CONFIG.hud.pauseSizePercent}%`);
const careerPanel = document.getElementById('career');
const careerCard = careerPanel.querySelector('.career-card');
const radioDock = document.getElementById('radio-dock');
const pauseMenu = document.getElementById('pause-menu');
const shelterView = document.getElementById('shelter-view');
const ambientMusicAudio = document.getElementById('ambient-music-audio');
const radioAudio = document.getElementById('game-radio-audio');
const pauseMusicToggle = document.getElementById('pause-music-toggle');
const homeMusicToggle = document.getElementById('home-music-toggle');
const homeSettingsButton = document.getElementById('home-settings-button');
const homeSettings = document.getElementById('home-settings');
const shelterMusicToggle = document.getElementById('shelter-music-toggle');
let ambientMusicEnabled = true;
let radioManuallyPaused = false;
ambientMusicAudio.volume = CONFIG.audio.ambientMusicVolume;
const shelterDoorAction = document.getElementById('shelter-door-action');
const shelterRoomAction = document.getElementById('shelter-room-action');
const shelterPetAction = document.getElementById('shelter-pet-action');
const shelterVolunteerAction = document.getElementById('shelter-volunteer-action');
const shelterTaskStatus = document.getElementById('shelter-task-status');
const shelterControlsHint = document.getElementById('shelter-controls-hint');
const shelterInteractionMessage = document.getElementById('shelter-interaction-message');
const adoptionToast = document.getElementById('adoption-toast');
const adoptionToastQueue = [];
let adoptionToastShowing = false;
const worldCards = document.getElementById('world-cards');
const garageList = document.getElementById('garage-list');
const careerMessage = document.getElementById('career-message');
const vanList = document.getElementById('van-list');
const vanDetails = document.getElementById('van-details');
const vanAction = document.getElementById('van-action');
let garagePreview = null;
const gameRadio = createGameRadio({
  audio: document.getElementById('game-radio-audio'),
  label: document.getElementById('radio-channel'),
  status: document.getElementById('radio-status'),
  playButton: document.getElementById('radio-play'),
  previousButton: document.getElementById('radio-previous'),
  nextButton: document.getElementById('radio-next'),
  onPlaybackChange: (state) => {
    if (state === 'paused') {
      radioManuallyPaused = true;
      ambientMusicEnabled = false;
    }
    else if (state === 'starting' || state === 'playing' || state === 'error') {
      radioManuallyPaused = false;
      ambientMusicEnabled = true;
    }
    syncAmbientMusic();
  },
});
let previewVanId = selectedVan().id;
careerCard.insertBefore(radioDock, worldCards);

function showNextAdoptionToast() {
  if (adoptionToastQueue.length === 0) {
    adoptionToastShowing = false;
    adoptionToast.hidden = true;
    return;
  }
  adoptionToastShowing = true;
  const dog = adoptionToastQueue.shift();
  adoptionToast.textContent = `🏡 ${dog.name} found a loving home!`;
  adoptionToast.hidden = false;
  window.setTimeout(showNextAdoptionToast, CONFIG.shelter.adoptionToastSeconds * 1000);
}

function queueAdoptionNotices(adoptedDogs) {
  adoptionToastQueue.push(...adoptedDogs);
  if (!adoptionToastShowing && adoptionToastQueue.length > 0) showNextAdoptionToast();
}

function updateAmbientMusicButtons() {
  const label = ambientMusicEnabled ? '♫ Pause background music' : '♫ Play background music';
  pauseMusicToggle.textContent = label;
  homeMusicToggle.textContent = label;
  shelterMusicToggle.textContent = ambientMusicEnabled ? '♫Ⅱ' : '♫▶';
  shelterMusicToggle.setAttribute('aria-label', label);
  shelterMusicToggle.title = label;
}

function syncAmbientMusic() {
  updateAmbientMusicButtons();
  const ambientScene = shelterActive || !careerPanel.classList.contains('is-hidden') || game?.state === 'paused';
  const gameplayScene = game?.state === 'running' && !shelterActive;
  const shouldPlay = ambientMusicEnabled
    && !radioManuallyPaused
    && (ambientScene || gameplayScene)
    && radioAudio.paused
    && document.visibilityState !== 'hidden';
  if (!shouldPlay) {
    ambientMusicAudio.pause();
    return;
  }
  if (ambientMusicAudio.paused) {
    ambientMusicAudio.play().catch(() => {});
  }
}

function toggleAmbientMusic() {
  ambientMusicEnabled = !ambientMusicEnabled;
  if (!ambientMusicEnabled) {
    radioManuallyPaused = true;
    gameRadio.stop();
  } else {
    radioManuallyPaused = false;
    if (game?.state === 'running' && !shelterActive) gameRadio.start();
  }
  syncAmbientMusic();
}

radioAudio.addEventListener('play', () => {
  ambientMusicAudio.pause();
});
radioAudio.addEventListener('pause', syncAmbientMusic);
pauseMusicToggle.addEventListener('click', toggleAmbientMusic);
homeMusicToggle.addEventListener('click', toggleAmbientMusic);
shelterMusicToggle.addEventListener('click', toggleAmbientMusic);
homeSettingsButton.addEventListener('click', () => {
  const isOpen = homeSettings.classList.toggle('is-hidden') === false;
  homeSettingsButton.setAttribute('aria-expanded', String(isOpen));
});
document.addEventListener('pointerdown', syncAmbientMusic);
document.addEventListener('keydown', syncAmbientMusic);
document.addEventListener('visibilitychange', syncAmbientMusic);
updateAmbientMusicButtons();

function renderCareer() {
  worldCards.innerHTML = WORLDS.map((world) => (
    `<button class="world-card${world.id === profile.selectedWorld ? ' is-selected' : ''}" type="button" data-world="${world.id}" aria-label="Play ${world.name}" aria-pressed="${world.id === profile.selectedWorld}">
      <span class="world-art world-art--${world.id}" role="img" aria-label="${world.name} landscape">${worldPreview(world.id)}</span>
      <span class="world-card-name">${world.flag} ${world.name}</span>
      <span class="world-card-route">${world.routes[0]}</span>
    </button>`
  )).join('');
  document.getElementById('coin-bank').textContent = profile.coins.toLocaleString();
  document.getElementById('dog-bank').textContent = `${profile.carriedDogs.length} / ${CONFIG.shelter.capacity}`;
  renderShelterRoster();
  renderGarage();
  garageList.innerHTML = UPGRADES.map((upgrade) => {
    const level = upgradeLevel(upgrade.id);
    const cost = upgradeCost(upgrade.id);
    const maxed = cost === null;
    return `<div class="garage-row"><div><strong>${upgrade.name} ${'●'.repeat(level)}${'○'.repeat((CONFIG.garage.upgradeCosts[upgrade.id] || []).length - level)}</strong><small>${upgrade.description}</small></div><button type="button" data-upgrade="${upgrade.id}" ${maxed || profile.coins < cost ? 'disabled' : ''}>${maxed ? 'MAXED' : `🪙 ${cost}`}</button></div>`;
  }).join('');
}

function renderShelterRoster() {
  const residents = profile.shelteredDogs || [];
  const visibleResidents = residents.slice(-CONFIG.shelter.rosterVisible).reverse();
  document.getElementById('shelter-total').textContent = `${residents.length} here · ${profile.adoptedDogTotal} adopted`;
  document.getElementById('shelter-empty').hidden = visibleResidents.length > 0;
  document.getElementById('shelter-residents').innerHTML = visibleResidents.map((dog) => {
    const fur = CONFIG.dogs.coatColors[dog.color] || CONFIG.companion.faceColor;
    const color = `#${fur.toString(16).padStart(6, '0')}`;
    const name = dog.name.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character]));
    return `<span class="shelter-resident"><i style="--resident-fur:${color}" aria-hidden="true">🐕</i>${name}</span>`;
  }).join('');
}

function updateShelterSummary() {
  const active = profile.shelteredDogs.length;
  const adopted = profile.adoptedDogTotal;
  document.getElementById('shelter-count').textContent = `${active} here · ${adopted} adopted`;
  document.getElementById('shelter-summary').textContent = profile.shelteredDogTotal
    ? `${profile.shelteredDogTotal} dogs rescued so far. ${adopted} have found homes, and a small pack always stays here.`
    : 'Your shelter is ready. Bring home your first rescue dog!';
}

function renderShelterUpgrades() {
  const level = shelterLevel();
  const upgradeCount = shelterUpgradeCount();
  document.getElementById('shelter-level-progress').textContent = `Rank ${level} · ${upgradeCount} points`;
  document.getElementById('shelter-upgrades').innerHTML = CONFIG.shelter.upgradeCatalog.map((upgrade) => {
    const level = shelterUpgradeLevel(upgrade.id);
    const cost = shelterUpgradeCost(upgrade.id);
    const maximum = CONFIG.shelter.upgradeCosts[upgrade.id].length;
    const buttonText = cost === null ? 'BUILT' : `🪙 ${cost}`;
    const disabled = cost === null || profile.coins < cost;
    return `<div class="shelter-upgrade"><div class="shelter-upgrade__copy"><strong>${upgrade.name} · Lv ${level}/${maximum}</strong><small>${upgrade.description}</small></div><button type="button" data-shelter-upgrade="${upgrade.id}" ${disabled ? 'disabled' : ''}>${buttonText}</button></div>`;
  }).join('');
  const packageCost = shelterCarePackageCost();
  const packageButton = document.getElementById('buy-care-package');
  document.getElementById('care-package-count').textContent = `Owned: ${profile.carePackages} · each adds 1 rank point`;
  packageButton.textContent = `🪙 ${packageCost}`;
  packageButton.disabled = profile.coins < packageCost;
}

function renderGarage() {
  const vehicle = CONFIG.garage.vans.find((van) => van.id === previewVanId) || CONFIG.garage.vans[0];
  const owned = profile.unlockedVans.includes(vehicle.id);
  const equipped = profile.selectedVan === vehicle.id;
  garagePreview?.setVehicle(vehicle);
  vanDetails.innerHTML = `<strong>${vehicle.name}</strong><span>${vehicle.description}</span><small>Speed ${Math.round(vehicle.speedMultiplier * 100)}% · Coin bonus ${Math.round((vehicle.coinMultiplier - 1) * 100)}%</small>`;
  vanList.innerHTML = CONFIG.garage.vans.map((van) => {
    const vanOwned = profile.unlockedVans.includes(van.id);
    return `<button class="van-option${vehicle.id === van.id ? ' is-selected' : ''}${vanOwned ? '' : ' is-locked'}" type="button" data-preview-van="${van.id}" aria-pressed="${vehicle.id === van.id}">
      <strong>${van.name}</strong><small>${vanOwned ? (profile.selectedVan === van.id ? 'Equipped' : 'Owned') : `🪙 ${van.price.toLocaleString()}`}</small>
    </button>`;
  }).join('');
  vanAction.dataset.van = vehicle.id;
  vanAction.disabled = equipped;
  vanAction.textContent = equipped ? 'Equipped' : owned ? 'Equip van' : `Unlock for 🪙 ${vehicle.price.toLocaleString()}`;
}

renderCareer();
syncAmbientMusic();
worldCards.addEventListener('click', (event) => {
  const card = event.target.closest('[data-world]');
  if (!card || !selectRoute(card.dataset.world, 0)) return;
  gameRadio.setWorld(selectedRoute().worldId);
  careerMessage.textContent = `Driving to ${selectedRoute().name}…`;
  renderCareer();
  tryRestart();
});
document.getElementById('drive-route').addEventListener('click', tryRestart);
document.getElementById('enter-shelter').addEventListener('click', () => {
  if (!renderer3d) {
    careerMessage.textContent = 'The shelter is getting ready. Try again in a moment.';
    return;
  }
  shelterActive = true;
  gameRadio.stop();
  unlockAudio();
  shelterControlsHint.hidden = false;
  window.clearTimeout(shelterControlsHintTimeout);
  shelterControlsHintTimeout = window.setTimeout(() => {
    shelterControlsHint.hidden = true;
  }, CONFIG.shelter.controlsHintSeconds * 1000);
  shelterKeys.clear();
  shelterTouch.clear();
  shelterPetMessageUntil = 0;
  shelterInteractionMessage.textContent = '';
  shelterPetAction.hidden = true;
  shelterRoomAction.hidden = true;
  shelterVolunteerAction.hidden = true;
  shelterTaskStatus.hidden = true;
  shelterTaskStatus.textContent = '';
  input.laneStep();
  input.jumpPressed();
  game.state = 'ready';
  renderer3d.enterShelter(selectedVan(), profile.shelteredDogs, profile.shelterUpgrades, profile.carePackages);
  careerPanel.classList.add('is-hidden');
  pauseMenu.classList.add('is-hidden');
  pauseButton.classList.add('is-hidden');
  buttons.setVisible(false);
  careerCard.insertBefore(radioDock, worldCards);
  document.getElementById('shelter-coins').textContent = profile.coins.toLocaleString();
  updateShelterSummary();
  shelterView.classList.remove('is-hidden');
  syncAmbientMusic();
  renderShelterUpgrades();
});
document.getElementById('leave-shelter').addEventListener('click', () => {
  window.clearTimeout(shelterControlsHintTimeout);
  shelterControlsHint.hidden = true;
  shelterActive = false;
  shelterKeys.clear();
  shelterTouch.clear();
  shelterPetMessageUntil = 0;
  shelterPetAction.hidden = true;
  shelterRoomAction.hidden = true;
  shelterVolunteerAction.hidden = true;
  shelterTaskStatus.hidden = true;
  shelterInteractionMessage.textContent = '';
  input.laneStep();
  input.jumpPressed();
  shelterView.classList.add('is-hidden');
  careerCard.insertBefore(radioDock, worldCards);
  renderCareer();
  careerPanel.classList.remove('is-hidden');
  startRun(randomSeed());
  syncAmbientMusic();
});
shelterDoorAction.addEventListener('click', () => {
  renderer3d?.toggleShelterDoor();
});
shelterRoomAction.addEventListener('click', () => {
  const response = renderer3d?.interactShelterRoom();
  if (!response) return;
  shelterInteractionMessage.textContent = response.text;
  shelterPetMessageUntil = performance.now() + CONFIG.shelter.roomInteractionSeconds * 1000;
});
shelterPetAction.addEventListener('click', () => {
  const response = renderer3d?.petShelterDog();
  if (!response) return;
  shelterInteractionMessage.textContent = `${response.name} loves the pets! ♥${response.taskActive ? ` (${response.taskProgress}/${response.taskRequired})` : ''}`;
  shelterPetMessageUntil = performance.now() + CONFIG.shelter.petReactionSeconds * 1000;
});
function talkToVolunteer() {
  const response = renderer3d?.talkToShelterVolunteer();
  if (!response) return;
  shelterInteractionMessage.textContent = response.text;
  shelterPetMessageUntil = performance.now() + CONFIG.shelter.volunteerDialogueSeconds * 1000;
}
shelterVolunteerAction.addEventListener('click', talkToVolunteer);
vanList.addEventListener('click', (event) => {
  const option = event.target.closest('[data-preview-van]');
  if (!option) return;
  previewVanId = option.dataset.previewVan;
  renderGarage();
});
vanAction.addEventListener('click', () => {
  const vehicle = CONFIG.garage.vans.find((van) => van.id === vanAction.dataset.van);
  if (!vehicle) return;
  const success = profile.unlockedVans.includes(vehicle.id)
    ? selectVan(vehicle.id)
    : unlockVan(vehicle.id);
  if (!success) {
    careerMessage.textContent = 'Collect more coins to unlock that van.';
    return;
  }
  careerMessage.textContent = `${vehicle.name} is ready for the road.`;
  renderCareer();
});
garageList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-upgrade]');
  if (!button || !buyUpgrade(button.dataset.upgrade)) return;
  careerMessage.textContent = 'Garage upgrade purchased and saved.';
  renderCareer();
});

function worldPreview(worldId) {
  const art = {
    lagos: '<svg viewBox="0 0 240 128" aria-hidden="true"><rect width="240" height="128" fill="#83d9ea"/><circle cx="195" cy="27" r="15" fill="#ffe28b"/><path d="M0 74 37 49 64 72 104 38 143 75 180 48 240 79V128H0" fill="#4aa78e"/><path d="M0 85h240v43H0" fill="#34424a"/><path d="M0 92h240M0 118h240" stroke="#f2d6a3" stroke-width="4" stroke-dasharray="20 15"/><path d="M8 72V48h34v24m8-1V37h37v34m75 4V48h29v27m8-1V35h35v42" fill="#f1a354" stroke="#784a3a" stroke-width="3"/><path d="M7 48h36M49 37h38M174 48h31M208 35h37" stroke="#fff0c0" stroke-width="5"/><path d="M105 81v-28m0 0-12-12m12 12 12-14m-12 14-17 1m17-1 18 2" fill="none" stroke="#176c59" stroke-width="4" stroke-linecap="round"/></svg>',
    japan: '<svg viewBox="0 0 240 128" aria-hidden="true"><rect width="240" height="128" fill="#93d8f1"/><circle cx="190" cy="26" r="15" fill="#ff8790"/><path d="m0 82 42-33 40 35 39-46 42 45 37-32 40 31v46H0" fill="#79b77f"/><path d="M0 91h240v37H0" fill="#43505a"/><path d="M0 101h240" stroke="#fff0c3" stroke-width="4" stroke-dasharray="18 14"/><path d="M20 78V43h42v35m118-1V48h41v29" fill="#fff1e5" stroke="#855c62" stroke-width="3"/><path d="M14 44h54L41 28zM173 49h53l-26-18z" fill="#e75f63"/><path d="M78 77c-14-16-4-28 6-27 10 1 9 13 0 16 18-11 28 7 13 15m33-6c-13-15-3-26 7-24 9 2 8 12-1 15 18-9 27 8 12 14" fill="#f48ba0"/></svg>',
    usa: '<svg viewBox="0 0 240 128" aria-hidden="true"><rect width="240" height="128" fill="#f4b66c"/><path d="M0 65 50 37l37 30 42-37 38 38 37-30 36 27v63H0" fill="#c96d55"/><path d="M0 82h240v46H0" fill="#40424a"/><path d="M0 100h240" stroke="#f7dc8b" stroke-width="4" stroke-dasharray="21 16"/><path d="M15 80V45h27v35m19 0V34h35v46m72 0V43h31v37m13 0V29h29v51" fill="#e8dfca" stroke="#7f5249" stroke-width="3"/><path d="M58 34h37L77 20zM181 43h31l-15-13z" fill="#4b6475"/><path d="M124 80V55m0 0-12-9m12 9 12-12m-12 12-16 1m16-1 16 3" fill="none" stroke="#476a4e" stroke-width="4" stroke-linecap="round"/><path d="M132 68c-8-12 0-17 6-14 6 4 0 9-5 9 12-4 15 5 5 7" fill="#ed7d71"/></svg>',
  };
  return art[worldId] || art.lagos;
}

function unlockAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    audioContext ||= new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    drivingAudio ||= createDrivingAudio(audioContext);
    drivingAudio.setMuted(soundMuted);
  } catch {
    audioContext = null;
  }
}

function playStopSuccess() {
  if (soundMuted || !audioContext || audioContext.state !== 'running') return;
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

function playVehicleHitSound() {
  if (soundMuted || !audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  const settings = CONFIG.audio;
  const thump = audioContext.createOscillator();
  const thumpGain = audioContext.createGain();
  thump.type = 'triangle';
  thump.frequency.setValueAtTime(settings.vehicleHitLowHz, now);
  thump.frequency.exponentialRampToValueAtTime(settings.vehicleHitEndHz, now + settings.vehicleHitSeconds);
  thumpGain.gain.setValueAtTime(settings.vehicleHitGain, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + settings.vehicleHitSeconds);
  thump.connect(thumpGain);
  thumpGain.connect(audioContext.destination);
  thump.start(now);
  thump.stop(now + settings.vehicleHitSeconds);

  const rattle = audioContext.createOscillator();
  const rattleGain = audioContext.createGain();
  rattle.type = 'square';
  rattle.frequency.setValueAtTime(settings.vehicleHitMetalHz, now);
  rattle.frequency.exponentialRampToValueAtTime(settings.vehicleHitMetalHz * 0.48, now + settings.vehicleHitSeconds * 0.55);
  rattleGain.gain.setValueAtTime(settings.vehicleHitMetalGain, now);
  rattleGain.gain.exponentialRampToValueAtTime(0.0001, now + settings.vehicleHitSeconds * 0.55);
  rattle.connect(rattleGain);
  rattleGain.connect(audioContext.destination);
  rattle.start(now);
  rattle.stop(now + settings.vehicleHitSeconds * 0.55);
}

function playShelterDogBark() {
  if (soundMuted) return;
  const bark = shelterDogBarkAudio.cloneNode();
  bark.volume = CONFIG.shelter.dogBarkVolume;
  bark.play().catch(() => {});
}

function savedBestScore() {
  try {
    return Number(localStorage.getItem('doge-rescue-best-score')) || 0;
  } catch {
    return 0;
  }
}

function resize() {
  const viewport = window.visualViewport;
  const viewportWidth = viewport?.width || window.innerWidth;
  const viewportHeight = viewport?.height || window.innerHeight;
  const scale = Math.min(viewportWidth / CONFIG.logicalWidth, viewportHeight / CONFIG.logicalHeight);
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
  game.carriedDogs = profile.carriedDogs.slice(0, CONFIG.shelter.capacity).map((dog) => ({ ...dog }));
  game.shelteredDogs = profile.shelteredDogs.slice(-CONFIG.shelter.residentDisplayCount).map((dog) => ({ ...dog }));
  game.carriedDogColors = profile.carriedDogColors.slice(0, CONFIG.shelter.capacity);
  game.onboardDogs = game.carriedDogColors.length;
  game.shelterDue = game.onboardDogs >= CONFIG.shelter.capacity;
  game.route = selectedRoute();
  game.vehicle = selectedVan();
  renderer3d?.setVehicle(game.vehicle);
  game.upgrades = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgradeLevel(upgrade.id)]));
  game.bestScore = savedBestScore();
  field = createTrafficField(seed);
  pickups = createPickupField((seed ^ 0x9e3779b9) >>> 0);
  dogs = createStopDogField(
    (seed ^ 0x85ebca6b) >>> 0,
    game.carriedDogs.map((dog) => dog.name),
  );
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
  game.vehicle = selectedVan();
  renderer3d?.setVehicle(game.vehicle);
  game.upgrades = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgradeLevel(upgrade.id)]));
  game.state = 'running';
  careerPanel.classList.add('is-hidden');
  document.querySelector('.stage').insertBefore(radioDock, document.querySelector('.controls'));
  lastTime = 0;
  unlockAudio();
  if (ambientMusicEnabled) ambientMusicAudio.play().catch(() => {});
  gameRadio.start();
  syncAmbientMusic();
}

function togglePause() {
  if (game.state === 'running') {
    game.state = 'paused';
    radioManuallyPaused = true;
    gameRadio.stop();
    syncAmbientMusic();
  }
  else if (game.state === 'paused') {
    game.state = 'running';
    lastTime = 0;
    unlockAudio();
    radioManuallyPaused = false;
    if (ambientMusicEnabled) {
      ambientMusicAudio.play().catch(() => {});
      gameRadio.start();
    }
    syncAmbientMusic();
  }
}

document.getElementById('resume-run').addEventListener('click', togglePause);
document.getElementById('restart-run').addEventListener('click', () => {
  startRun(randomSeed());
  tryRestart();
  pauseMenu.classList.add('is-hidden');
});
document.getElementById('home-run').addEventListener('click', () => {
  startRun(randomSeed());
  shelterActive = false;
  gameRadio.stop();
  careerCard.insertBefore(radioDock, worldCards);
  careerPanel.classList.remove('is-hidden');
  pauseMenu.classList.add('is-hidden');
  pauseButton.classList.add('is-hidden');
  syncAmbientMusic();
});
document.getElementById('sound-toggle').addEventListener('click', (event) => {
  soundMuted = !soundMuted;
  drivingAudio?.setMuted(soundMuted);
  event.currentTarget.textContent = `Sound: ${soundMuted ? 'Off' : 'On'}`;
});

const input = createInput(window, tryRestart, togglePause);
input.attachSwipe(worldCanvas);
worldCanvas.addEventListener('click', () => { if (!shelterActive) tryRestart(); });
const shelterKeyDirections = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};
window.addEventListener('keydown', (event) => {
  if (!shelterActive) return;
  if (event.code === 'KeyF' && !event.repeat) {
    const response = renderer3d?.petShelterDog();
    if (response) {
      shelterInteractionMessage.textContent = `${response.name} loves the pets! ♥${response.taskActive ? ` (${response.taskProgress}/${response.taskRequired})` : ''}`;
      shelterPetMessageUntil = performance.now() + CONFIG.shelter.petReactionSeconds * 1000;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  if (event.code === 'KeyG' && !event.repeat) {
    talkToVolunteer();
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  if (event.code === 'KeyE' && !event.repeat) {
    const response = renderer3d?.interactShelterRoom();
    if (response) {
      shelterInteractionMessage.textContent = response.text;
      shelterPetMessageUntil = performance.now() + CONFIG.shelter.roomInteractionSeconds * 1000;
    } else {
      renderer3d?.toggleShelterDoor();
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  const direction = shelterKeyDirections[event.code];
  if (direction) {
    shelterKeys.add(direction);
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
window.addEventListener('keyup', (event) => {
  if (!shelterActive) return;
  const direction = shelterKeyDirections[event.code];
  if (direction) {
    shelterKeys.delete(direction);
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
window.addEventListener('blur', () => {
  shelterKeys.clear();
  shelterTouch.clear();
});
worldCanvas.addEventListener('pointerdown', (event) => {
  if (!shelterActive) return;
  shelterLookPointer = { id: event.pointerId, x: event.clientX };
  worldCanvas.setPointerCapture?.(event.pointerId);
});
worldCanvas.addEventListener('pointermove', (event) => {
  if (!shelterActive || !shelterLookPointer || shelterLookPointer.id !== event.pointerId) return;
  const deltaX = event.clientX - shelterLookPointer.x;
  shelterLookPointer.x = event.clientX;
  renderer3d?.turnShelterCamera(deltaX);
});
const releaseShelterLook = (event) => {
  if (shelterLookPointer?.id === event.pointerId) shelterLookPointer = null;
};
worldCanvas.addEventListener('pointerup', releaseShelterLook);
worldCanvas.addEventListener('pointercancel', releaseShelterLook);
document.querySelector('.shelter-pad').addEventListener('pointerdown', (event) => {
  const button = event.target.closest('[data-walk]');
  if (!button || !shelterActive) return;
  event.preventDefault();
  button.setPointerCapture?.(event.pointerId);
  shelterTouch.add(button.dataset.walk);
});
const releaseWalkButton = (event) => {
  const button = event.target.closest?.('[data-walk]');
  if (button) shelterTouch.delete(button.dataset.walk);
};
document.querySelector('.shelter-pad').addEventListener('pointerup', releaseWalkButton);
document.querySelector('.shelter-pad').addEventListener('pointercancel', releaseWalkButton);
document.getElementById('shelter-upgrades').addEventListener('click', (event) => {
  const button = event.target.closest('[data-shelter-upgrade]');
  if (!button) return;
  const upgrade = button.dataset.shelterUpgrade;
  if (!buyShelterUpgrade(upgrade)) {
    document.getElementById('shelter-shop-message').textContent = 'Collect more coins on the road to buy this upgrade.';
    return;
  }
  renderer3d?.updateShelterUpgrades(profile.shelterUpgrades);
  document.getElementById('shelter-coins').textContent = profile.coins.toLocaleString();
  const upgradeName = CONFIG.shelter.upgradeCatalog.find((item) => item.id === upgrade)?.name || 'Shelter upgrade';
  document.getElementById('shelter-shop-message').textContent = `Shelter Rank ${shelterLevel()}! ${upgradeName} built in the yard.`;
  renderShelterUpgrades();
});
document.getElementById('buy-care-package').addEventListener('click', () => {
  if (!buyShelterCarePackage()) {
    document.getElementById('shelter-shop-message').textContent = 'Collect more coins for the next care package.';
    return;
  }
  renderer3d?.updateShelterCarePackages(profile.carePackages);
  document.getElementById('shelter-coins').textContent = profile.coins.toLocaleString();
  document.getElementById('shelter-shop-message').textContent = `Care package delivered! Shelter Rank ${shelterLevel()} · ${shelterUpgradeCount()} rank points.`;
  renderShelterUpgrades();
});
pauseButton.addEventListener('click', togglePause);

const buttons = createButtons(
  {
    speed: document.getElementById('speed'),
    brake: document.getElementById('brake'),
    horn: document.getElementById('horn'),
  },
);

function frame(now) {
  if (document.visibilityState === 'hidden') {
    lastTime = now;
    requestAnimationFrame(frame);
    return;
  }
  const dt = lastTime === 0 ? 0 : (now - lastTime) / 1000;
  lastTime = now;

  const step = Math.min(dt, 1 / 20);
  sceneTime += step;
  const completedStops = game.stops.completed;
  const completedTasks = game.tasksCompleted;
  const keyboardJump = shelterActive ? (input.laneStep(), input.jumpPressed(), false) : input.jumpPressed();
  const stepped = shelterActive ? false : update(game, step, input.laneStep(), buttons, keyboardJump);
  const hornPressed = buttons.isPressed('horn');

  if (stepped) {
    updateRoadObstacles(game, obstacles, step);
    const pickupResult = updatePickups(game, pickups, step);
    if (pickupResult.coins > 0) drivingAudio?.playCoin(pickupResult.coins);
    if (pickupResult.coins > 0) {
      game.coinsEarned += earnCoins(pickupResult.coins * (game.vehicle?.coinMultiplier || 1));
      renderCareer();
    }
    const onboardBeforeUpdate = game.onboardDogs;
    updateStopDogs(game, dogs, step);
    if (game.dogsJustSheltered?.length) {
      recordShelterRescue(game.dogsJustSheltered);
      game.shelteredDogs = profile.shelteredDogs.slice(-CONFIG.shelter.residentDisplayCount).map((dog) => ({ ...dog }));
      game.dogsJustSheltered = [];
      saveProfile();
      renderCareer();
    }
    if (game.onboardDogs !== onboardBeforeUpdate || profile.carriedDogs.length !== game.onboardDogs) {
      profile.carriedDogs = game.carriedDogs.map((dog) => ({ ...dog }));
      profile.carriedDogColors = game.carriedDogColors.slice();
      saveProfile();
    }
    if (game.tasksCompleted > completedTasks) {
      recordTaskCompletion(game.route);
      careerMessage.textContent = `Route progress saved: ${selectedRoute().name}.`;
      renderCareer();
    }
    if (hornPressed && !hornWasPressed) {
      companionReaction(game, 'hornMessage');
      requestHornManeuver(game, field);
    }
    updateTraffic(game, field, step);
    if (processTrafficCollision(game, field)) playVehicleHitSound();
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
    renderCareer();
    careerCard.insertBefore(radioDock, worldCards);
    careerPanel.classList.remove('is-hidden');
  }

  const newlyAdopted = processShelterAdoptions();
  if (newlyAdopted.length > 0) {
    queueAdoptionNotices(newlyAdopted);
    game.shelteredDogs = profile.shelteredDogs.slice(-CONFIG.shelter.residentDisplayCount).map((dog) => ({ ...dog }));
    renderer3d?.updateShelterResidents(profile.shelteredDogs);
    renderShelterRoster();
    if (shelterActive) updateShelterSummary();
  }

  buttons.setVisible(game.state === 'running');
  pauseButton.classList.toggle('is-hidden', game.state !== 'running');
  pauseMenu.classList.toggle('is-hidden', game.state !== 'paused');

  const renderStep = game.state === 'running' || game.crashState === 'halted' ? step : 0;
  if (shelterActive) {
    const directions = new Set([...shelterKeys, ...shelterTouch]);
    const walkInput = {
      x: (directions.has('right') ? 1 : 0) - (directions.has('left') ? 1 : 0),
      z: (directions.has('forward') ? 1 : 0) - (directions.has('back') ? 1 : 0),
    };
    const length = Math.hypot(walkInput.x, walkInput.z) || 1;
    walkInput.x /= length;
    walkInput.z /= length;
    const doorState = renderer3d?.renderShelter(step, sceneTime, walkInput, playShelterDogBark);
    shelterDoorAction.hidden = !doorState?.doorNearby;
    shelterDoorAction.disabled = Boolean(doorState?.doorOpen && !doorState.canCloseDoor);
    shelterDoorAction.textContent = doorState?.doorOpen
      ? doorState.canCloseDoor ? 'Close shelter door' : 'Door open · step outside to close'
      : 'Open shelter door';
    shelterRoomAction.hidden = !doorState?.roomAction;
    shelterRoomAction.textContent = doorState?.roomAction?.label || 'Use shelter item';
    shelterPetAction.hidden = !doorState?.petDogName;
    shelterPetAction.textContent = doorState?.petDogName ? `Pet ${doorState.petDogName}` : 'Pet dog';
    shelterVolunteerAction.hidden = !doorState?.volunteerNearby;
    shelterVolunteerAction.textContent = `Talk to ${CONFIG.shelter.volunteerName}`;
    shelterTaskStatus.hidden = !doorState?.volunteerTaskAssigned;
    if (doorState?.volunteerMessage) {
      shelterInteractionMessage.textContent = doorState.volunteerMessage;
      shelterPetMessageUntil = performance.now() + CONFIG.shelter.volunteerDialogueSeconds * 1000;
    }
    if (doorState?.volunteerTaskTurnedIn) {
      shelterTaskStatus.textContent = 'Volunteer task complete · Thank you!';
    } else if (doorState?.volunteerTaskAssigned) {
      shelterTaskStatus.textContent = `Greet different dogs: ${doorState.volunteerTaskProgress}/${doorState.volunteerTaskRequired}`;
    }
    if (performance.now() >= shelterPetMessageUntil) shelterInteractionMessage.textContent = '';
    hudCtx.clearRect(0, 0, CONFIG.logicalWidth, CONFIG.logicalHeight);
  } else {
    // The career and pause screens cover a static world. Avoid a full Three.js
    // scene update and draw on every animation frame while neither is playing.
    if (game.state === 'running' || game.state === 'crashed') {
      renderer3d?.render(game, renderStep, field, dogs, sceneTime, pickups, obstacles);
    }
    drawHud(hudCtx, game, dogs);
  }
  if (game.state === 'crashed') drawEndScreen(hudCtx, game);

  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
window.visualViewport?.addEventListener('resize', resize);
startRun(randomSeed());
gameRadio.setWorld(selectedRoute().worldId);
resize();
requestAnimationFrame(frame);
// Two animation frames give the browser a chance to show the route picker before
// WebGL compiles shaders and builds the pooled roadside/game meshes.
requestAnimationFrame(() => requestAnimationFrame(async () => {
  try {
    // Keep Three.js and the large game scene out of the initial route-picker
    // bundle so the UI can become interactive before WebGL setup begins.
    const { createGaragePreview, createRenderer3D } = await import('./render3d.js');
    garagePreview = createGaragePreview(document.getElementById('garage-preview'));
    garagePreview.setVehicle(selectedVan());
    renderer3d = createRenderer3D(worldCanvas);
    renderer3d.setVehicle(selectedVan());
    resize();
    renderer3d.render(game, 0, field, dogs, sceneTime, pickups, obstacles);
  } catch (error) {
    console.error('Game graphics failed to initialize:', error);
    careerMessage.textContent = 'The 3D game could not start. Please reload and try again.';
  }
}));
