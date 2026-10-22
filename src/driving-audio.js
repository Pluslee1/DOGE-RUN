import { CONFIG } from './config.js';

export function createDrivingAudio(context) {
  const settings = CONFIG.audio;
  const masterGain = context.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(context.destination);

  const engine = context.createOscillator();
  engine.type = 'sawtooth';
  const engineHarmonic = context.createOscillator();
  engineHarmonic.type = 'triangle';
  const engineFilter = context.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = settings.engineFilterHz;
  const engineGain = context.createGain();
  engineGain.gain.value = 0;
  const harmonicGain = context.createGain();
  harmonicGain.gain.value = 0.18;
  engine.connect(engineFilter);
  engineHarmonic.connect(harmonicGain);
  harmonicGain.connect(engineFilter);
  engineFilter.connect(engineGain);
  engineGain.connect(masterGain);
  engine.start();
  engineHarmonic.start();

  const hornLow = context.createOscillator();
  hornLow.type = 'sine';
  hornLow.frequency.value = settings.hornLowHz;
  const hornHigh = context.createOscillator();
  hornHigh.type = 'sine';
  hornHigh.frequency.value = settings.hornHighHz;
  const hornGain = context.createGain();
  hornGain.gain.value = 0;
  hornLow.connect(hornGain);
  hornHigh.connect(hornGain);
  hornGain.connect(masterGain);
  hornLow.start();
  hornHigh.start();

  const sampleCount = Math.floor(context.sampleRate * settings.noiseBufferSeconds);
  const noiseBuffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const noiseSamples = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noiseSamples.length; index++) {
    noiseSamples[index] = Math.random() * 2 - 1;
  }

  const brakeNoise = context.createBufferSource();
  brakeNoise.buffer = noiseBuffer;
  brakeNoise.loop = true;
  const brakeFilter = context.createBiquadFilter();
  brakeFilter.type = 'bandpass';
  brakeFilter.frequency.value = settings.brakeFilterHz;
  brakeFilter.Q.value = settings.brakeFilterQ;
  const brakeGain = context.createGain();
  brakeGain.gain.value = 0;
  brakeNoise.connect(brakeFilter);
  brakeFilter.connect(brakeGain);
  brakeGain.connect(masterGain);
  brakeNoise.start();

  let lastUpdateTime = -Infinity;
  let lastCoinSoundTime = -Infinity;

  return {
    setMuted(muted) {
      const now = context.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(muted ? 0 : 1, now, settings.audioSmoothingSeconds);
    },

    playCoin(count = 1, now = context.currentTime) {
      if (context.state !== 'running' || now - lastCoinSoundTime < settings.coinPickupCooldownSeconds) return;
      lastCoinSoundTime = now;
      const pitch = settings.coinPickupHz + Math.max(0, count - 1) * settings.coinPitchStepHz;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(pitch, now);
      oscillator.frequency.exponentialRampToValueAtTime(
        pitch * settings.coinPitchEndRatio,
        now + settings.coinPickupSeconds * settings.coinPitchEndTimeRatio,
      );
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(
        settings.coinPickupGain,
        now + settings.coinPickupSeconds * settings.coinAttackTimeRatio,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + settings.coinPickupSeconds);
      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(now);
      oscillator.stop(now + settings.coinPickupSeconds);
    },

    update(game, buttons, now = context.currentTime) {
      if (context.state !== 'running' || now - lastUpdateTime < settings.audioUpdateInterval) return;
      lastUpdateTime = now;

      const active = game.state === 'running';
      const speedRatio = Math.min(Math.abs(game.vanSpeed) / CONFIG.speed.max, 1.5);
      const enginePitch = settings.engineIdleHz
        + speedRatio * (settings.engineTopSpeedHz - settings.engineIdleHz)
        + (game.isBoosting ? settings.engineBoostPitchHz : 0);
      const engineLevel = active
        ? settings.engineIdleGain + (game.isBoosting ? settings.engineGasGain : 0)
        : 0;
      const braking = active
        && game.isBraking
        && Math.abs(game.vanSpeed) >= settings.brakeMinSpeed;
      const brakeLevel = braking ? settings.brakeHissGain : 0;
      const hornLevel = active && buttons.isPressed('horn') ? settings.hornGain : 0;
      const smooth = settings.audioSmoothingSeconds;

      engine.frequency.setTargetAtTime(enginePitch, now, smooth);
      engineHarmonic.frequency.setTargetAtTime(enginePitch * settings.engineHarmonicRatio, now, smooth);
      engineGain.gain.setTargetAtTime(engineLevel, now, smooth);
      brakeGain.gain.setTargetAtTime(brakeLevel, now, smooth);
      hornGain.gain.setTargetAtTime(hornLevel, now, smooth);
    },
  };
}
