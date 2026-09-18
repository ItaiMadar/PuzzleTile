import { colorToCss } from './puzzle.js';

let drag = null;
let suppressClick = false;

export function renderBoard({ tilesElement, game, selected, debugMode, onSelect, onSwap, onAccrue, onDragStarted, onDragCancelled, onMessage }) {
  tilesElement.classList.toggle('dense', game.N > 24);
  tilesElement.classList.toggle('very-dense', game.N > 40);
  tilesElement.classList.toggle('won', game.won);
  tilesElement.replaceChildren(...game.order.map((tile, position) => {
    const slot = document.createElement('div');
    slot.className = 'tile-slot';

    const fixed = position === 0 || position === game.N - 1;
    const tileElement = document.createElement(fixed ? 'div' : 'button');
    const color = colorToCss(game.palette[tile.color]);
    tileElement.className = `tile${fixed ? ' edge' : ''}`;
    tileElement.dataset.index = position;
    tileElement.dataset.fixed = fixed;
    tileElement.style.background = color;
    tileElement.style.setProperty('--color', color);
    tileElement.setAttribute('aria-label', `${fixed ? (position === 0 ? 'Fixed start' : 'Fixed end') : 'Tile'} at position ${position + 1}`);

    if (debugMode) {
      const debug = document.createElement('span');
      debug.className = 'debug-values';
      game.palette[tile.color].forEach(value => {
        const line = document.createElement('span');
        line.textContent = Math.round(value);
        debug.append(line);
      });
      tileElement.append(debug);
    }

    if (!fixed) {
      tileElement.setAttribute('aria-pressed', selected === position);
      tileElement.disabled = game.won;
      tileElement.onclick = () => {
        if (!suppressClick) onSelect(position);
      };
      tileElement.onpointerdown = event => dragStart(event, position, tileElement, {
        game,
        onSwap,
        onAccrue,
        onDragStarted,
        onDragCancelled,
        onMessage,
      });
    }

    const number = document.createElement('span');
    number.className = 'tile-number';
    number.textContent = position + 1;
    number.setAttribute('aria-hidden', 'true');
    slot.append(tileElement, number);
    return slot;
  }));
}

function dragStart(event, index, element, callbacks) {
  if (callbacks.game.won || (event.button !== undefined && event.button !== 0)) return;
  drag = {
    pointerId: event.pointerId,
    index,
    x: event.clientX,
    y: event.clientY,
    element,
    moved: false,
    ghost: null,
    target: null,
    callbacks,
  };
  element.setPointerCapture(event.pointerId);
  element.onpointermove = dragMove;
  element.onpointerup = dragEnd;
  element.onpointercancel = dragCancel;
}

function dragMove(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const deltaX = event.clientX - drag.x;
  const deltaY = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(deltaX, deltaY) < 7) return;

  if (!drag.moved) {
    drag.moved = true;
    drag.callbacks.onDragStarted();
    drag.element.classList.add('is-dragging');
    const rectangle = drag.element.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.cssText += `;width:${rectangle.width}px;height:${rectangle.height}px;background:${drag.element.style.background}`;
    document.body.append(ghost);
    drag.ghost = ghost;
  }

  event.preventDefault();
  drag.ghost.style.left = `${event.clientX - drag.ghost.offsetWidth / 2}px`;
  drag.ghost.style.top = `${event.clientY - drag.ghost.offsetHeight / 2}px`;
  document.querySelectorAll('.drop-target').forEach(element => element.classList.remove('drop-target'));
  const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest('.tile');
  drag.target = hit && hit !== drag.element && hit.dataset.fixed !== 'true' ? Number(hit.dataset.index) : null;
  if (drag.target !== null) hit.classList.add('drop-target');
}

function dragEnd(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const completedDrag = drag;
  completedDrag.callbacks.onAccrue();
  dragCleanup();

  if (completedDrag.moved) {
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    if (completedDrag.target !== null) {
      completedDrag.callbacks.onSwap(completedDrag.index, completedDrag.target, 'dragged');
    } else {
      completedDrag.callbacks.onMessage('Drop a tile onto another tile to swap them.');
    }
  }
}

function dragCancel() {
  if (!drag) return;
  const cancelledDrag = drag;
  dragCleanup();
  if (cancelledDrag.moved) {
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    cancelledDrag.callbacks.onDragCancelled();
  }
}

function dragCleanup() {
  if (!drag) return;
  drag.element.classList.remove('is-dragging');
  document.querySelectorAll('.drop-target').forEach(element => element.classList.remove('drop-target'));
  drag.ghost?.remove();
  drag = null;
}
