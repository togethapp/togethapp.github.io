/**
 * Slide left to delete — the gesture a phone's own lists taught everyone.
 *
 * A card or a line slides left to uncover a red « Supprimer » behind it.
 * Sliding only uncovers the button; it takes a tap on it to delete, so a swipe
 * meant as a scroll deletes nothing. The same everywhere something can be
 * deleted from a list of things: documents in their tab, the lines of a list,
 * an account's expenses, the cards of a board.
 */

import { escapeHtml, view } from './app.js';
import { t } from './i18n.js';

/** How far a row slides to uncover its button, in pixels. */
const SWIPE_OPEN = 96;

/**
 * A row that slides. `kind` says which binder handles it; `tag` and `bodyClass`
 * let a line of a list stay an `<li>` holding the line itself.
 */
export function swipeHtml(id, inner, { kind, tag = 'div', bodyClass = '' } = {}) {
  return `
    <${tag} class="swipe" data-swipe="${escapeHtml(id)}" data-swipe-kind="${escapeHtml(kind)}">
      <button type="button" class="swipe__delete" data-swipe-delete tabindex="-1" aria-hidden="true">
        ${escapeHtml(t('action.delete'))}
      </button>
      <div class="swipe__body ${bodyClass}">${inner}</div>
    </${tag}>`;
}

/**
 * A card function made slideable, for the documents in their tab. `canDelete`
 * leaves a card as it was where deleting is not this device's to do — a poll
 * someone else organises.
 */
export function swipeable(cardHtml, canDelete = () => true) {
  return (document_) =>
    canDelete(document_) ? swipeHtml(document_.id, cardHtml(document_), { kind: 'doc' }) : cardHtml(document_);
}

/**
 * A line slid away is not gone at once: it leaves the screen, and a note at the
 * foot offers to bring it back for a few seconds. Only then is it deleted —
 * here and for the others — so an « Annuler » never has to undo what the
 * database already threw away. Leaving the screen, or the app, settles it.
 */
const UNDO_KEPT = 5000;
let pending = null;

/** Delete for good what is waiting to be, if anything. */
export function commitPendingDelete() {
  if (!pending) return;
  const { onDelete, id, timer } = pending;
  pending = null;
  clearTimeout(timer);
  document.getElementById('undo-toast')?.remove();
  onDelete(id);
}

function hideRow(row) {
  row.hidden = true;
}

function offerUndo(kind, id, onDelete, said, row) {
  commitPendingDelete();
  hideRow(row);
  pending = { kind, id, onDelete, timer: setTimeout(commitPendingDelete, UNDO_KEPT) };
  const toast = document.createElement('div');
  toast.id = 'undo-toast';
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span>${escapeHtml(said)}</span>
    <button type="button" class="toast__action" data-undo>${escapeHtml(t('action.undoDelete'))}</button>`;
  toast.querySelector('[data-undo]').addEventListener('click', () => {
    if (!pending) return;
    clearTimeout(pending.timer);
    pending = null;
    toast.remove();
    // The row may have been drawn again meanwhile: show whichever is there.
    view.querySelectorAll(`[data-swipe-kind="${kind}"]`).forEach((other) => {
      if (other.dataset.swipe === id) other.hidden = false;
    });
  });
  document.body.append(toast);
}

// Closing the app or putting it away is leaving the screen too.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') commitPendingDelete();
});

/**
 * Make every row of that kind on the page slide, and delete through
 * `onDelete(id)`. With `undo` (what the note at the foot says), the delete
 * waits a few seconds and can be taken back.
 */
export function bindSwipes(kind, onDelete, { undo = '' } = {}) {
  view.querySelectorAll(`[data-swipe-kind="${kind}"]`).forEach((row) => {
    // Drawn again while waiting to be deleted: stays out of sight.
    if (pending && pending.kind === kind && pending.id === row.dataset.swipe) hideRow(row);
    const body = row.querySelector('.swipe__body');
    const button = row.querySelector('[data-swipe-delete]');
    let start = null;
    let offset = 0;
    let moved = false;
    let open = false;

    const place = (x, animate) => {
      offset = x;
      body.style.transition = animate ? 'transform 0.18s ease' : 'none';
      body.style.transform = x ? `translateX(${x}px)` : '';
    };
    const settle = (wanted) => {
      open = wanted;
      place(open ? -SWIPE_OPEN : 0, true);
      row.classList.toggle('swipe--open', open);
      button.tabIndex = open ? 0 : -1;
      button.setAttribute('aria-hidden', open ? 'false' : 'true');
    };

    body.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      start = { x: event.clientX, y: event.clientY, from: open ? -SWIPE_OPEN : 0 };
      moved = false;
    });
    body.addEventListener('pointermove', (event) => {
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (!moved) {
        if (Math.abs(dx) < 8) return;
        // Mostly up or down: a scroll, not a swipe.
        if (Math.abs(dy) > Math.abs(dx)) {
          start = null;
          return;
        }
        moved = true;
        body.setPointerCapture?.(event.pointerId);
      }
      place(Math.min(0, Math.max(-row.clientWidth * 0.6, start.from + dx)), false);
    });
    const end = () => {
      if (!start) return;
      start = null;
      if (moved) settle(offset < -SWIPE_OPEN / 2);
    };
    body.addEventListener('pointerup', end);
    body.addEventListener('pointercancel', end);
    // The click that ends a swipe is not a tap on what slid; nor is a tap on a
    // row left open, which only closes it again.
    body.addEventListener('click', (event) => {
      if (!moved && !open) return;
      event.preventDefault();
      event.stopPropagation();
      if (!moved) settle(false);
      moved = false;
    }, true);

    button.addEventListener('click', () => {
      if (undo) offerUndo(kind, row.dataset.swipe, onDelete, undo, row);
      else onDelete(row.dataset.swipe);
    });
  });
}

/* --------------------------------------------------------- pull to refresh --- */

/** How far down a finger pulls, in pixels, before letting go fetches. */
const PULL_FAR = 72;

/**
 * Pull the top of the page down to fetch what the others did — the gesture of
 * every phone app, which a web app installed on the home screen does not get
 * from the browser. The same as the round arrows at the top (#sync), so it is
 * offered only where they are. In a browser tab, the browser's own pull
 * (reload) is left alone.
 */
export function bindPullToRefresh() {
  const installed = () =>
    matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let start = null;
  let pulled = 0;
  let mark = null;

  const show = (distance) => {
    if (!mark) {
      mark = document.createElement('div');
      mark.className = 'pull';
      mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML = '<span class="pull__arrow">↻</span>';
      document.body.append(mark);
    }
    const shown = Math.min(distance, PULL_FAR * 1.4);
    mark.style.transform = `translate(-50%, ${shown * 0.8}px) rotate(${shown * 4}deg)`;
    mark.style.opacity = String(Math.min(1, shown / PULL_FAR));
    mark.classList.toggle('pull--ready', distance >= PULL_FAR);
  };
  const hide = () => {
    mark?.remove();
    mark = null;
  };

  document.addEventListener('touchstart', (event) => {
    start = null;
    pulled = 0;
    if (!installed() || event.touches.length !== 1 || window.scrollY > 0) return;
    const sync = document.getElementById('sync');
    if (!sync || sync.hidden || sync.disabled || document.body.classList.contains('playing')) return;
    // What answers a finger of its own: the 3D view, a sketch, a slide, a form.
    if (event.target.closest('canvas, dialog, input, textarea, select, .swipe, [data-no-pull]')) return;
    start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });

  document.addEventListener('touchmove', (event) => {
    if (!start) return;
    const dx = event.touches[0].clientX - start.x;
    const dy = event.touches[0].clientY - start.y;
    if (window.scrollY > 0 || dy < 0 || (pulled === 0 && Math.abs(dx) > Math.abs(dy))) {
      start = null;
      hide();
      return;
    }
    pulled = dy;
    if (pulled > 12) show(pulled - 12);
  }, { passive: true });

  const end = () => {
    if (!start) return;
    start = null;
    const far = pulled - 12 >= PULL_FAR;
    hide();
    if (far) document.getElementById('sync')?.click();
  };
  document.addEventListener('touchend', end);
  document.addEventListener('touchcancel', () => {
    start = null;
    hide();
  });
}
