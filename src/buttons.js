export function createButtons(elements) {
  const pressed = new Set();
  const pointers = new Map();

  function releaseAll() {
    pressed.clear();
    pointers.clear();
    for (const element of Object.values(elements)) element?.classList.remove('is-pressed');
  }

  window.addEventListener('blur', releaseAll);

  function bind(element, name) {
    if (!element) return;

    element.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      pressed.add(name);
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
    element.addEventListener('lostpointercapture', release);
  }

  bind(elements.speed, 'speed');
  bind(elements.brake, 'brake');
  bind(elements.horn, 'horn');

  return {
    isPressed(name) {
      return pressed.has(name);
    },
    setVisible(visible) {
      for (const element of Object.values(elements)) {
        element.classList.toggle('is-hidden', !visible);
      }
    },
  };
}
