import test from 'node:test';
import assert from 'node:assert/strict';

import { main, projectRef, runSql } from '../tools/supabase.js';

test('the project is read from the database’s address', () => {
  assert.equal(projectRef('https://ikndckzjhhdlnwtvfkvx.supabase.co/rest/v1/'), 'ikndckzjhhdlnwtvfkvx');
  assert.equal(projectRef('https://ikndckzjhhdlnwtvfkvx.supabase.co'), 'ikndckzjhhdlnwtvfkvx');
  assert.equal(projectRef('http://127.0.0.1:8123'), '', 'not a Supabase project');
  assert.equal(projectRef(''), '');
});

/** Supabase's API, answering `status` and `body`, remembering what it was asked. */
function api(status, body) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: status < 300, status, text: async () => JSON.stringify(body) };
  };
  return { calls, fetchImpl };
}

test('the update goes to the project’s SQL endpoint, with the token', async () => {
  const { calls, fetchImpl } = api(201, []);
  const result = await runSql({ token: 'sbp_cle', ref: 'abcdefgh12', sql: 'select 1;', fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(calls[0].url, 'https://api.supabase.com/v1/projects/abcdefgh12/database/query');
  assert.equal(calls[0].options.headers.authorization, 'Bearer sbp_cle');
  assert.deepEqual(JSON.parse(calls[0].options.body), { query: 'select 1;' });
});

test('a refusal says why, and what to do about a refused token', async () => {
  const sqlError = await runSql({ token: 't', ref: 'abcdefgh12', sql: 'x', fetchImpl: api(400, { message: 'syntax error at or near "x"' }).fetchImpl });
  assert.equal(sqlError.ok, false);
  assert.match(sqlError.message, /syntax error/);
  const refused = await runSql({ token: 't', ref: 'abcdefgh12', sql: 'x', fetchImpl: api(401, { message: 'Unauthorized' }).fetchImpl });
  assert.match(refused.message, /refaites-en une/);
});

test('the run reads the update file, and stays green without a token', async () => {
  const said = [];
  const config = { url: 'https://abcdefgh12.supabase.co/rest/v1/' };
  assert.equal(await main({ env: {}, config, say: (line) => said.push(line) }), 0);
  assert.match(said[0], /Pas de secret SUPABASE_ACCESS_TOKEN/);
  assert.equal(await main({ env: { SUPABASE_ACCESS_TOKEN: 't' }, config: { url: '' }, say: () => {} }), 0);

  const { calls, fetchImpl } = api(201, []);
  const read = (path) => (path === 'supabase/mise-a-jour.sql' ? 'create table x();' : '');
  assert.equal(await main({ env: { SUPABASE_ACCESS_TOKEN: 't' }, config, read, say: () => {}, fetchImpl }), 0);
  assert.deepEqual(JSON.parse(calls[0].options.body), { query: 'create table x();' });
  assert.equal(await main({ env: { SUPABASE_ACCESS_TOKEN: 't' }, config, read, say: () => {}, fetchImpl: api(400, { message: 'non' }).fetchImpl }), 1,
    'a refused update fails the run, so that it shows');
});
