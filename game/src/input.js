// Keyboard + mouse input. WASD/arrows move, Shift run, E enter/exit car,
// Space punch, M next mission, P/Esc pause, F save, L load, click shoot.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    up: false, down: false, left: false, right: false, run: false,
    mouseX: 0, mouseY: 0, viewW: 1280, viewH: 720,
    clicked: false, pressedE: false, pressedM: false, pressedSpace: false,
    pressedP: false, pressedF: false, pressedL: false, pressedEnter: false,
  };
  function poll() {
    input.up = keys.has('KeyW') || keys.has('ArrowUp');
    input.down = keys.has('KeyS') || keys.has('ArrowDown');
    input.left = keys.has('KeyA') || keys.has('ArrowLeft');
    input.right = keys.has('KeyD') || keys.has('ArrowRight');
    input.run = keys.has('ShiftLeft') || keys.has('ShiftRight');
  }
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code); poll();
    if (e.code === 'KeyE') input.pressedE = true;
    if (e.code === 'KeyM') input.pressedM = true;
    if (e.code === 'Space') input.pressedSpace = true;
    if (e.code === 'KeyP' || e.code === 'Escape') input.pressedP = true;
    if (e.code === 'KeyF') input.pressedF = true;
    if (e.code === 'KeyL') input.pressedL = true;
    if (e.code === 'Enter') input.pressedEnter = true;
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.code); poll(); });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left; input.mouseY = e.clientY - r.top;
    input.viewW = r.width; input.viewH = r.height;
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left; input.mouseY = e.clientY - r.top;
    input.viewW = r.width; input.viewH = r.height;
    input.clicked = true;
  });
  // expose a test hook used by play-testing: window.__gameInput
  window.__gameInput = input;
  return input;
}
