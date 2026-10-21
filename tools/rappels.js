/**
 * The eve's reminders, asked every hour by .github/workflows/rappels.yml:
 * this tells the notifier function to look. The database says what is due —
 * an event tomorrow, at the evening of each device's own time zone — and
 * remembers what it sent, so an hour asked twice sends nothing twice.
 *
 *     node tools/rappels.js
 *
 * Never fails the run: a database without reminders yet, or a notifier not
 * pasted again, is said in the log rather than in an e-mail every hour.
 */
import { REMOTE } from '../src/config.js';
import { normaliseUrl } from '../src/remote.js';

/** Ask once; answers what to print. */
export async function remind(config = REMOTE, fetchImpl = globalThis.fetch) {
  if (!config?.url || !config?.key) return 'Pas de base dans src/config.js : rien à rappeler.';
  try {
    const response = await fetchImpl(`${normaliseUrl(config.url)}/functions/v1/notifier`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: config.key, authorization: `Bearer ${config.key}` },
      body: JSON.stringify({ action: 'remind' }),
      signal: AbortSignal.timeout(60000),
    });
    const text = await response.text();
    if (response.status === 400 && /unknown action/.test(text)) {
      return 'La fonction « notifier » ne connaît pas encore les rappels : recollez-la (docs/DEPLOIEMENT.md, étape 10).';
    }
    if (response.status === 502) {
      return 'La fonction ne lit pas les rappels dans la base : la mise à jour SQL n’y est pas encore passée.';
    }
    return `${response.status} ${text.slice(0, 300)}`;
  } catch (error) {
    return `Pas de réponse : ${error?.message || error}`;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(await remind());
