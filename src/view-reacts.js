/**
 * Reactions and a few words, on screen: under what they are about, a row of
 * what was reacted — « 👍 2 », a tap adds one's own or takes it back — and a
 * button that opens all of it: the five reactions, who gave which, the words
 * left, and a field for some more. The same row under an idea, a poll's
 * choice, an event and an activity; the logic is reacts.js.
 *
 * Calls back into app.js and the other views only from inside functions.
 */

import { askForText, escapeHtml, everything } from './app.js';
import { t } from './i18n.js';
import { REACTIONS, WORDS_MOST, addWords, myReaction, react, reactionsTo, removeWords, wordsOn } from './reacts.js';
import { makeDialog } from './view-games.js';
import { myName, setMyName } from './view-groups.js';
import { replaceBoard } from './view-ideas.js';
import { replacePoll } from './view-polls.js';

/** The words shown under an event's row: the last few, the rest a tap away. */
const WORDS_SHOWN = 2;

/**
 * The row under a thing: its reactions, and the way to react or say a word.
 * `title` names the thing in the window; `said` shows the last words under
 * the row (an event's page), where the rest only count them.
 */
export function talkHtml(document_, target, { title = '', said = false } = {}) {
  const me = myName();
  const rows = reactionsTo(document_, target, me);
  const words = wordsOn(document_, target, me);
  const chips = rows.map((row) => `
    <button type="button" class="talk__chip ${row.mine ? 'talk__chip--mine' : ''}" data-talk-react="${escapeHtml(row.emoji)}"
            aria-pressed="${row.mine ? 'true' : 'false'}" title="${escapeHtml(row.names.join(', '))}"
            aria-label="${escapeHtml(t('talk.chip', { emoji: row.emoji, names: row.names.join(', ') }))}">
      <span aria-hidden="true">${escapeHtml(row.emoji)} ${row.names.length}</span>
    </button>`).join('');
  const open = words.length
    ? `💬 ${words.length}`
    : `<span aria-hidden="true">☺+</span>`;
  return `
    <div class="talk" data-talk="${escapeHtml(target)}" data-talk-doc="${escapeHtml(document_.id)}" data-talk-title="${escapeHtml(title)}">
      ${chips}
      <button type="button" class="talk__open" data-talk-open
              aria-label="${escapeHtml(words.length ? t('talk.openWords', { count: words.length }) : t('talk.open'))}">${open}</button>
    </div>
    ${said && words.length ? `
      <div class="talk__said">
        ${words.slice(-WORDS_SHOWN).map((one) => `<p><strong>${escapeHtml(one.name)}</strong> ${escapeHtml(one.text)}</p>`).join('')}
      </div>` : ''}`;
}

/** The document a row is about, as it is now. */
function talkDocument(id) {
  return everything().find((one) => one.id === id) || null;
}

/** Keep a document a reaction or a word changed, where its kind is kept. */
function keepTalk(next) {
  if (next.kind === 'board') replaceBoard(next);
  else if (next.kind === 'poll') replacePoll(next);
}

/** Who reacts on this device: its first name — asked once, if it has none yet. */
async function talkName() {
  const held = myName();
  if (held) return held;
  const name = await askForText({
    title: t('talk.whoTitle'),
    hint: t('talk.whoHint'),
    confirmLabel: t('action.save'),
  });
  return name && name.trim() ? setMyName(name) : '';
}

/** React with `emoji` — or take it back — as this device's first name. */
async function reactTo(id, target, emoji) {
  const name = await talkName();
  const current = talkDocument(id);
  if (!name || !current) return;
  keepTalk(react(current, target, name, emoji));
}

/** The window: react, see who did, read the words, and add some. */
function openTalk(id, target, title) {
  const dialog = makeDialog('dialog dialog--talk');
  const fill = () => {
    const current = talkDocument(id);
    if (!current) {
      dialog.close();
      return;
    }
    const me = myName();
    const mine = myReaction(current, target, me);
    const rows = reactionsTo(current, target, me);
    const words = wordsOn(current, target, me);
    const typed = dialog.querySelector('[data-talk-text]')?.value || '';
    dialog.innerHTML = `
      <form method="dialog" class="stack">
        <h2>${escapeHtml(title || t('talk.title'))}</h2>
        <div class="talk-pick" role="group" aria-label="${escapeHtml(t('talk.pick'))}">
          ${REACTIONS.map((emoji) => `
            <button type="button" class="talk-pick__one ${emoji === mine ? 'talk-pick__one--on' : ''}" data-talk-pick="${escapeHtml(emoji)}"
                    aria-pressed="${emoji === mine ? 'true' : 'false'}">${escapeHtml(emoji)}</button>`).join('')}
        </div>
        ${rows.length ? `<p class="muted small">${rows.map((row) => `${escapeHtml(row.emoji)} ${escapeHtml(row.names.join(', '))}`).join(' · ')}</p>` : ''}
        <div class="talk-words">
          ${words.length
            ? words.map((one) => `
                <p class="talk-word">
                  <span><strong>${escapeHtml(one.name)}</strong> ${escapeHtml(one.text)}</span>
                  ${one.mine ? `<button type="button" class="button button--small button--ghost" data-talk-drop="${escapeHtml(one.id)}"
                                        aria-label="${escapeHtml(t('talk.drop'))}">✕</button>` : ''}
                </p>`).join('')
            : `<p class="muted small">${escapeHtml(t('talk.none'))}</p>`}
        </div>
        <label>
          ${escapeHtml(t('talk.wordsLabel'))}
          <textarea data-talk-text rows="2" maxlength="${WORDS_MOST}" placeholder="${escapeHtml(t('talk.placeholder'))}"></textarea>
        </label>
        <div class="row">
          <button type="button" class="button button--primary" data-talk-send>${escapeHtml(t('talk.send'))}</button>
          <button type="button" class="button" data-talk-close>${escapeHtml(t('action.close'))}</button>
        </div>
      </form>`;
    const field = dialog.querySelector('[data-talk-text]');
    field.value = typed;

    dialog.querySelectorAll('[data-talk-pick]').forEach((button) => {
      button.addEventListener('click', async () => {
        await reactTo(id, target, button.dataset.talkPick);
        fill();
      });
    });
    dialog.querySelectorAll('[data-talk-drop]').forEach((button) => {
      button.addEventListener('click', () => {
        const now = talkDocument(id);
        if (now) keepTalk(removeWords(now, button.dataset.talkDrop));
        fill();
      });
    });
    dialog.querySelector('[data-talk-send]').addEventListener('click', async () => {
      const text = field.value.trim();
      if (!text) {
        field.focus();
        return;
      }
      const name = await talkName();
      const now = talkDocument(id);
      if (!name || !now) return;
      keepTalk(addWords(now, target, name, text));
      field.value = '';
      fill();
    });
    dialog.querySelector('[data-talk-close]').addEventListener('click', () => dialog.close());
  };
  fill();
  dialog.showModal();
}

/** Make the rows of a page work. */
export function bindTalk(root) {
  root.querySelectorAll('[data-talk]').forEach((row) => {
    const id = row.dataset.talkDoc;
    const target = row.dataset.talk;
    row.querySelectorAll('[data-talk-react]').forEach((chip) => {
      chip.addEventListener('click', () => reactTo(id, target, chip.dataset.talkReact));
    });
    row.querySelector('[data-talk-open]')?.addEventListener('click', () => openTalk(id, target, row.dataset.talkTitle));
  });
}
