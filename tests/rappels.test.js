import test from 'node:test';
import assert from 'node:assert/strict';

import { remind } from '../tools/rappels.js';

const CONFIG = { url: 'https://p.supabase.co/rest/v1/', key: 'cle-publique' };

/** A notifier that answers `status` and `body`, and remembers what it was asked. */
function notifier(status, body) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { status, text: async () => JSON.stringify(body) };
  };
  return { calls, fetchImpl };
}

test('the hourly run asks the notifier for the eve’s reminders, with the page’s public key', async () => {
  const { calls, fetchImpl } = notifier(200, { status: 'ok', reminders: 1, sent: 2 });
  assert.equal(await remind(CONFIG, fetchImpl), '200 {"status":"ok","reminders":1,"sent":2}');
  assert.equal(calls[0].url, 'https://p.supabase.co/functions/v1/notifier');
  assert.deepEqual(JSON.parse(calls[0].options.body), { action: 'remind' });
  assert.equal(calls[0].options.headers.apikey, 'cle-publique');
});

test('without a database, an older notifier or the SQL update, it says so instead of failing', async () => {
  assert.match(await remind({ url: '', key: '' }, notifier(200, {}).fetchImpl), /Pas de base/);
  assert.match(await remind(CONFIG, notifier(400, { status: 'error', message: 'unknown action' }).fetchImpl), /recollez-la/);
  assert.match(await remind(CONFIG, notifier(502, { status: 'error', message: 'database unreachable' }).fetchImpl), /mise à jour SQL/);
  const offline = async () => { throw new Error('fetch failed'); };
  assert.match(await remind(CONFIG, offline), /Pas de réponse : fetch failed/);
});
