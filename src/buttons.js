export function createButtons(elements) {
  const pressed = new Set();
  const pointers = new Map();
  const justPressed = new Set();

  function bind(element, name) {
    if (!element) return;

    element.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      pressed.add(name);
      if (name === 'jump') justPressed.add(name);
      element.classList.add('is-pressed');
      pointers.set(event.pointerId, name);
      element.setPointerCapture?.(event.pointerId);
    });

    const release = (event) => {
      if (pointers.get(event.pointerId) !== name) return;
      pressed.delete(name);
      element.classList.remove('is-pressed');
      pointers.delete(event.pointerId);
    };

    element.addEventListener('pointerup', release);
    element.addEventListener('pointercancel', release);
    element.addEventListener('pointerleave', release);
    element.addEventListener('lostpointercapture', release);
  }

  bind(elements.speed, 'speed');
  bind(elements.brake, 'brake');
  bind(elements.horn, 'horn');
  bind(elements.jump, 'jump');

  return {
    isPressed(name) {
      return pressed.has(name);
    },
    takePressed(name) {
      const wasPressed = justPressed.has(name);
      justPressed.delete(name);
      return wasPressed;
    },
    setVisible(visible) {
      for (const element of Object.values(elements)) {
        element.classList.toggle('is-hidden', !visible);
      }
    },
  };
}
