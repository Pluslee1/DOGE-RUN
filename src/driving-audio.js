import { CONFIG } from './config.js';

export function createDrivingAudio(context) {
  const settings = CONFIG.audio;

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
  engineGain.connect(context.destination);
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
  hornGain.connect(context.destination);
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
  brakeGain.connect(context.destination);
  brakeNoise.start();

  let lastUpdateTime = -Infinity;

  return {
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
