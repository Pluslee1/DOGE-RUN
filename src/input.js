import { CONFIG } from './config.js';

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const ACTION_KEYS = new Set(['Enter']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);

const SWIPE_THRESHOLD_PX = CONFIG.lanes.swipeThresholdPx;

export function createInput(target = window, onAction = null, onPause = null) {
  let pendingSteps = 0;
  let pendingJump = false;

  const onKeyDown = (event) => {
    if (ACTION_KEYS.has(event.code)) {
      if (onAction && !event.repeat) onAction();
      event.preventDefault();
      return;
    }

    if (PAUSE_KEYS.has(event.code)) {
      if (onPause && !event.repeat) onPause();
      event.preventDefault();
      return;
    }

    if (JUMP_KEYS.has(event.code)) {
      if (!event.repeat) pendingJump = true;
      event.preventDefault();
      return;
    }

    let dir = 0;
    for (const code of LEFT_KEYS) if (event.code === code) dir = -1;
    for (const code of RIGHT_KEYS) if (event.code === code) dir = 1;
    if (dir === 0) return;

    event.preventDefault();
    // One press = exactly one lane. Ignore the OS auto-repeat.
    if (event.repeat) return;
    pendingSteps = dir;
  };

  const onBlur = () => { pendingSteps = 0; pendingJump = false; };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('blur', onBlur);

  return {
    attachSwipe(surface) {
      const pointers = new Map();

      surface.addEventListener('pointerdown', (event) => {
        pointers.set(event.pointerId, { startX: event.clientX, startY: event.clientY, fired: false });
        surface.setPointerCapture?.(event.pointerId);
      });

      surface.addEventListener('pointermove', (event) => {
        const track = pointers.get(event.pointerId);
        if (!track || track.fired) return;

        const dx = event.clientX - track.startX;
        const dy = event.clientY - track.startY;
        if (Math.abs(dy) >= SWIPE_THRESHOLD_PX && Math.abs(dy) > Math.abs(dx)) {
          track.fired = true;
          if (dy < 0) pendingJump = true;
          return;
        }
        if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
        if (Math.abs(dx) <= Math.abs(dy)) return;

        // A swipe may fire only once; the finger must lift before the next one.
        track.fired = true;
        pendingSteps = dx > 0 ? 1 : -1;
      });

      const release = (event) => pointers.delete(event.pointerId);
      surface.addEventListener('pointerup', release);
      surface.addEventListener('pointercancel', release);
      surface.addEventListener('lostpointercapture', release);
    },

    laneStep() {
      const steps = pendingSteps;
      pendingSteps = 0;
      return steps;
    },
    jumpPressed() {
      const pressed = pendingJump;
      pendingJump = false;
      return pressed;
    },
  };
}
