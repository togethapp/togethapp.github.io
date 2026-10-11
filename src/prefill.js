/**
 * A form filled in from its address: `#/lists/new?titre=Courses&lignes=Pain%0ALait`.
 *
 * Made for an assistant (Claude, say) that is asked « une liste de courses pour
 * la raclette » and answers with a link: tapped, or pasted into « Ouvrir un
 * lien », it opens the app on the form, already filled in. Nothing is created
 * until the person has read it and pressed the button, so a link can only ever
 * suggest — it cannot write anything on its own.
 *
 * The names are French, like the rest of the app's addresses, and short, since
 * they are written by hand as often as not.
 */

/** The forms that can be filled in this way. */
const PREFILL_FORMS = ['lists/new', 'polls/new', 'spends/new', 'agenda/new'];

const PREFILL_TEXT = 200;
const PREFILL_LINES = 100;
const PREFILL_PEOPLE = 30;

/**
 * The form's address inside whatever was pasted — `#/lists/new?…` — or null.
 * A message around it, or the whole https://… in front, is left out.
 */
export function prefillLinkFrom(pasted) {
  const found = String(pasted || '').match(/#\/((?:lists|polls|spends|agenda)\/new)\?([^\s#]*)/);
  return found ? `#/${found[1]}?${found[2]}` : null;
}

/** The address without what fills the form: `#/lists/new`. */
export function withoutPrefill(address) {
  return String(address || '').replace(/^(#\/?(?:lists|polls|spends|agenda)\/new)\?.*$/, '$1');
}

/**
 * What the address fills in, cleaned: `{ title, lines, people, … }` with only
 * what it gave, or null when it gives nothing (or is not one of the forms).
 */
export function prefillOf(address) {
  const found = String(address || '').match(/^#\/?((?:lists|polls|spends|agenda)\/new)\?(.*)$/);
  if (!found || !PREFILL_FORMS.includes(found[1])) return null;
  let params;
  try {
    params = new URLSearchParams(found[2]);
  } catch {
    return null;
  }
  const text = (key) => (params.get(key) || '').replace(/\s+/g, ' ').trim().slice(0, PREFILL_TEXT);
  const lines = (key) =>
    (params.get(key) || '')
      .split(/\r?\n/)
      .map((line) => line.trim().slice(0, PREFILL_TEXT))
      .filter(Boolean)
      .slice(0, PREFILL_LINES);

  const fill = {};
  const title = text('titre');
  if (title) fill.title = title;
  const question = text('question');
  if (question) fill.question = question;
  for (const [key, name] of [['lignes', 'lines'], ['choix', 'choices']]) {
    const value = lines(key);
    if (value.length) fill[name] = value;
  }
  const people = [];
  for (const name of (params.get('personnes') || '').split(',')) {
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, 60);
    if (clean && !people.some((other) => other.toLowerCase() === clean.toLowerCase())) people.push(clean);
  }
  if (people.length) fill.people = people.slice(0, PREFILL_PEOPLE);
  for (const [key, name] of [['jour', 'day'], ['fin', 'until']]) {
    const value = text(key);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) fill[name] = value;
  }
  const hour = text('heure');
  if (/^\d{1,2}:\d{2}$/.test(hour)) fill.hour = hour.padStart(5, '0');
  const currency = text('monnaie').toUpperCase();
  if (/^[A-Z]{3}$/.test(currency)) fill.currency = currency;
  return Object.keys(fill).length ? fill : null;
}
