import { colorToCss } from './puzzle.js';

let drag = null;
let suppressClick = false;

export function renderBoard({ tilesElement, game, selected, debugMode, onSelect, onMove, onAccrue, onDragStarted, onDragCancelled, onMessage }) {
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
        onMove,
        onAccrue,
        onDragStarted,
        onDragCancelled,
        onMessage,
      });
    }

    if (fixed && position === game.N - 1 && selected !== null) {
      tileElement.classList.add('tap-insertion-target');
      tileElement.setAttribute('role', 'button');
      tileElement.tabIndex = 0;
      tileElement.setAttribute('aria-label', 'Fixed end. Insert selected tile before this endpoint.');
      tileElement.onclick = () => onSelect(position);
      tileElement.onkeydown = event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(position);
        }
      };
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
  clearInsertionTarget();
  drag.target = insertionBoundaryAt(event.clientX, event.clientY, drag.index);
  if (drag.target !== null) {
    document.querySelector('#tiles')?.children[drag.target]?.classList.add('insertion-target');
  }
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
      completedDrag.callbacks.onMove(completedDrag.index, completedDrag.target, 'inserted_drag');
    } else {
      completedDrag.callbacks.onMessage('Drop the tile in a gap between two tiles.');
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
  clearInsertionTarget();
  drag.ghost?.remove();
  drag = null;
}

function insertionBoundaryAt(clientX, clientY, sourcePosition) {
  const strip = document.querySelector('#tiles');
  if (!strip) return null;
  const stripRect = strip.getBoundingClientRect();
  if (clientX < stripRect.left || clientX > stripRect.right || clientY < stripRect.top || clientY > stripRect.bottom) {
    return null;
  }

  const slots = [...strip.children];
  let closestBoundary = null;
  let closestDistance = Infinity;
  for (let boundary = 1; boundary < slots.length; boundary++) {
    const left = slots[boundary - 1].getBoundingClientRect();
    const right = slots[boundary].getBoundingClientRect();
    const boundaryX = (left.right + right.left) / 2;
    const distance = Math.abs(clientX - boundaryX);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestBoundary = boundary;
    }
  }
  return closestBoundary === sourcePosition || closestBoundary === sourcePosition + 1
    ? null
    : closestBoundary;
}

function clearInsertionTarget() {
  document.querySelectorAll('.insertion-target').forEach(element => element.classList.remove('insertion-target'));
}
