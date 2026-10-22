/**
 * The database kept up to date from GitHub (.github/workflows/supabase.yml), so
 * that nobody pastes SQL on a phone any more: at each merge into main that
 * touches supabase/, this runs supabase/mise-a-jour.sql through Supabase's
 * own API; the workflow then deploys the two functions with Supabase's CLI.
 *
 *     node tools/supabase.js     runs the update, and says whether the
 *                                functions can follow (GITHUB_OUTPUT)
 *
 * It needs SUPABASE_ACCESS_TOKEN — a personal token from Supabase, kept as a
 * GitHub secret (docs/DEPLOIEMENT.md, étape 12) — and takes the project from
 * src/config.js. Without either, it says so and stops without failing: the
 * run stays green, nothing is touched. An update the database refuses fails
 * the run, so that it shows.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { REMOTE } from '../src/config.js';
import { normaliseUrl } from '../src/remote.js';

/** The project's reference — `ikndckzjhhdlnwtvfkvx` in https://ikndckzjhhdlnwtvfkvx.supabase.co —, or ''. */
export function projectRef(url) {
  try {
    const host = new URL(normaliseUrl(url)).hostname;
    return /^[a-z0-9]{8,40}\.supabase\.co$/.test(host) ? host.split('.')[0] : '';
  } catch {
    return '';
  }
}

/** Run SQL on the project, as its owner: { ok, status, message }. */
export async function runSql({ token, ref, sql, fetchImpl = globalThis.fetch }) {
  try {
    const response = await fetchImpl(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query: sql }),
      signal: AbortSignal.timeout(120000),
    });
    const text = await response.text();
    if (response.ok) return { ok: true, status: response.status, message: 'Mise à jour passée.' };
    let message = text;
    try {
      message = JSON.parse(text)?.message || text;
    } catch {
      // Not JSON: said as it came.
    }
    const hint = response.status === 401 || response.status === 403
      ? ' La clé SUPABASE_ACCESS_TOKEN est refusée : refaites-en une (étape 12 du guide).'
      : '';
    return { ok: false, status: response.status, message: `${String(message).slice(0, 500)}${hint}` };
  } catch (error) {
    return { ok: false, status: 0, message: `Pas de réponse de Supabase : ${error?.message || error}` };
  }
}

/** The run from GitHub: the update, then whether the functions may follow. */
export async function main({ env = process.env, config = REMOTE, read = readFileSync, say = console.log, fetchImpl } = {}) {
  const output = (ready, ref = '') => {
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `ready=${ready}\nref=${ref}\n`);
  };
  const ref = projectRef(config?.url);
  if (!ref) {
    say('Pas de projet Supabase dans src/config.js : rien à mettre à jour.');
    output('no');
    return 0;
  }
  if (!env.SUPABASE_ACCESS_TOKEN) {
    say('Pas de secret SUPABASE_ACCESS_TOKEN : rien n’est mis à jour. Pour que la base se mette à jour toute seule, voir docs/DEPLOIEMENT.md, étape 12.');
    output('no');
    return 0;
  }
  const result = await runSql({
    token: env.SUPABASE_ACCESS_TOKEN, ref, sql: read('supabase/mise-a-jour.sql', 'utf8'), fetchImpl,
  });
  say(result.ok ? `${result.message} (projet ${ref})` : `La base a refusé la mise à jour (${result.status}) : ${result.message}`);
  output(result.ok ? 'yes' : 'no', ref);
  return result.ok ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await main();
