/**
 * Build the self-contained versions of the app.
 *
 *   dist/marque-points.html           a whole page, opened straight from disk
 *   dist/marque-points.artifact.html  a fragment, for a host that supplies its
 *                                     own <head>/<body> skeleton
 *
 * The app is normally served over http:// as ES modules. Those files instead
 * carry the stylesheet and every module inline, so the app opens from a file
 * or from a host that only takes one page, and keeps working offline.
 *
 * And the files of the published app, which index.html loads (served over
 * https, on GitHub Pages):
 *
 *   dist/app.js                      the app, every module in one file — one
 *                                    request instead of one per module
 *   dist/lang-fr.js, dist/lang-en.js the words of one language each: only the
 *                                    one in use is fetched (src/i18n.js)
 *   dist/holo.js, dist/arcade.js     the 3D view and the arcade's games,
 *                                    fetched once opened (src/later.js)
 *
 * Output is deterministic — same sources in, same bytes out — so a test can
 * check that the committed files are not stale. Run it with `npm run bundle`.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');

/**
 * Modules in dependency order: each one only uses what comes before it — but
 * for app.js and the screens split out of it (view-*.js), which call each
 * other, and only from inside functions, run once everything is loaded.
 */
const MODULES = ['lang-fr.js', 'lang-en.js', 'i18n.js', 'later.js', 'arcade-games.js', 'games.js', 'model.js', 'scoring.js', 'helpers.js', 'tarot.js', 'qr.js', 'stamp.js', 'people.js', 'reacts.js', 'lists.js', 'polls.js', 'spends.js', 'ideas.js', 'stats.js', 'dashboard.js', 'search.js', 'holo.js', 'sky.js', 'flows.js', 'ics.js', 'recap.js', 'export-docx.js', 'export-pdf.js', 'storage.js', 'config.js', 'lock.js', 'remote.js', 'move.js', 'prefill.js', 'cloud.js', 'live.js', 'notify.js', 'swipe.js', 'view-polls.js', 'view-lists.js', 'view-spends.js', 'view-ideas.js', 'view-games.js', 'view-groups.js', 'view-flows.js', 'view-account.js', 'view-install.js', 'view-holo.js', 'view-look.js', 'view-home.js', 'view-join.js', 'view-people.js', 'view-notify.js', 'view-search.js', 'view-reacts.js', 'view-arcade.js', 'arcade.js', 'view-arcade-play.js', 'app.js'];

/**
 * The parts fetched only once needed (src/later.js), each a file of its own in
 * the published app: dist/<name>.js. The app reaches them by
 * `import('./<module>')` and nothing else — a static import of one from
 * outside it would put it back in the app, and the build refuses it. Each
 * part's modules use what the app's export, passed in when it arrives, and
 * each other.
 */
const PARTS = {
  holo: ['holo.js', 'view-holo.js'],
  arcade: ['arcade.js', 'view-arcade-play.js'],
};

/**
 * The words, one language per module, each one object: `export const FR = {…}`.
 * The published app carries none of them; index.html fetches the one in use
 * beside it, dist/lang-<lang>.js, which sets `TOGETHER_STRINGS[lang]`.
 */
const LANGUAGE_MODULES = { fr: ['lang-fr.js', 'FR'], en: ['lang-en.js', 'EN'] };

const PART_OF = new Map(Object.entries(PARTS).flatMap(([part, names]) => names.map((name) => [name, part])));
const LANGUAGE_OF = new Map(Object.entries(LANGUAGE_MODULES).map(([lang, [name, symbol]]) => [name, { lang, symbol }]));

/** `import('./view-holo.js')`: the only way into a part. */
const DYNAMIC_IMPORT = /\bimport\(\s*'\.\/([\w.-]+)'\s*\)/g;
/** Each `import { a, b } from './x.js';`, with its names and where from. */
const IMPORT_NAMES = /^import\s*\{([^}]*)\}\s*from\s*'\.\/([\w.-]+)'\s*;?\s*$/gm;
/** Each top-level export and its kind: a `let` changes, and a part would keep its first value. */
const EXPORTED = /^export\s+(?:async\s+)?(const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm;

/**
 * An import, on one line or spread over several — a long list of names wraps,
 * and a wrapped import left in the bundle makes the whole page fail to parse.
 */
const IMPORT_LINE = /^import\s[\s\S]*?;\s*$/gm;
/**
 * `import { a as b }`. The bundle puts every module in one scope and strips the
 * imports, so the name that survives is `a` — and every `b` in the file becomes
 * a reference to nothing. The page then dies at the first call, with one line in
 * the console and a blank screen. Renaming the export is the fix; this makes the
 * build say so instead of shipping it.
 */
const ALIASED_IMPORT = /\bimport\s*\{[^}]*?\b(\w+)\s+as\s+(\w+)/;
const EXPORT_KEYWORD = /^export\s+(?=(?:const|let|function|class|async)\b)/gm;
/** `export { a, b };` and `export default …` — forms with nothing to keep. */
const EXPORT_LIST = /^export\s*\{[^}]*\}\s*;?\s*$/gm;
/** Anything still looking like a module statement after the stripping. */
const LEFTOVER_MODULE = /^\s*(?:import|export)\b/m;
/** Top-level declarations, used to catch a name defined by two modules. */
const TOP_LEVEL_DECLARATION = /^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;

/**
 * The code as the browser needs it: no comments, no indentation, no blank
 * line. The sources are written to be read — a third of the app is
 * explanation — and a phone on a slow network should not wait for that.
 *
 * A small scanner of JavaScript, not a pattern: it knows the strings, the
 * template literals (and the code inside their `${…}`) and the regular
 * expressions, so that nothing in them is touched — the HTML of a template
 * keeps its every space, an address keeps its `//`. Line breaks between
 * statements are kept, one at least, so that no statement runs into the next.
 */
const REGEX_AFTER = new Set([...'(,=:[!&|?{};+-*%<>~^']);
const REGEX_KEYWORDS = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);

export function stripComments(source) {
  let out = '';
  // What we are in: code (`depth` counts its braces, so that the one closing
  // a template's `${` is told apart), or a template literal.
  const stack = [{ kind: 'code', depth: 0 }];
  let lineStart = true;
  let last = '';
  let lastWord = '';
  const emit = (text) => {
    out += text;
    const trimmed = text.trimEnd();
    if (trimmed) last = trimmed[trimmed.length - 1];
  };
  const newline = () => {
    if (!lineStart) out += '\n';
    lineStart = true;
  };
  let i = 0;
  const n = source.length;
  while (i < n) {
    const frame = stack[stack.length - 1];
    const c = source[i];
    if (frame.kind === 'template') {
      const start = i;
      while (i < n && source[i] !== '`' && !(source[i] === '$' && source[i + 1] === '{')) i += source[i] === '\\' ? 2 : 1;
      emit(source.slice(start, i));
      if (source[i] === '`') {
        emit('`');
        stack.pop();
        i += 1;
      } else if (i < n) {
        emit('${');
        stack.push({ kind: 'code', depth: 0 });
        i += 2;
      }
      lineStart = false;
      lastWord = '';
      continue;
    }
    if (c === '\n') {
      newline();
      i += 1;
      continue;
    }
    if ((c === ' ' || c === '\t' || c === '\r') && lineStart) {
      i += 1;
      continue;
    }
    if (c === '/' && source[i + 1] === '/') {
      while (i < n && source[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) throw new Error('Cannot strip: a comment is never closed.');
      const inside = source.slice(i, end + 2);
      i = end + 2;
      if (inside.includes('\n')) newline();
      else if (!lineStart) out += ' ';
      continue;
    }
    lineStart = false;
    if (c === '"' || c === "'") {
      const start = i;
      i += 1;
      while (i < n && source[i] !== c) {
        if (source[i] === '\n') throw new Error(`Cannot strip: a string runs past its line, near ${JSON.stringify(source.slice(start, start + 40))}.`);
        i += source[i] === '\\' ? 2 : 1;
      }
      i += 1;
      emit(source.slice(start, i));
      lastWord = '';
      continue;
    }
    if (c === '`') {
      emit('`');
      stack.push({ kind: 'template' });
      i += 1;
      continue;
    }
    if (c === '/' && (!last || REGEX_AFTER.has(last) || REGEX_KEYWORDS.has(lastWord))) {
      const start = i;
      i += 1;
      let inClass = false;
      while (i < n) {
        const d = source[i];
        if (d === '\n') throw new Error(`Cannot strip: a regular expression runs past its line, near ${JSON.stringify(source.slice(start, start + 40))}.`);
        if (d === '\\') {
          i += 2;
          continue;
        }
        if (d === '[') inClass = true;
        else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) break;
        i += 1;
      }
      i += 1;
      while (i < n && /[a-z]/i.test(source[i])) i += 1;
      emit(source.slice(start, i));
      lastWord = '';
      continue;
    }
    if (/[\w$]/.test(c)) {
      const start = i;
      while (i < n && /[\w$]/.test(source[i])) i += 1;
      lastWord = source.slice(start, i);
      emit(lastWord);
      continue;
    }
    if (c === '{') frame.depth += 1;
    if (c === '}') {
      if (frame.depth === 0 && stack.length > 1) {
        stack.pop();
        emit('}');
        i += 1;
        lastWord = '';
        continue;
      }
      frame.depth -= 1;
    }
    emit(c);
    if (c !== ' ' && c !== '\t') lastWord = '';
    i += 1;
  }
  if (stack.length !== 1) throw new Error('Cannot strip: a template literal or a `${` is never closed.');
  return out.trimEnd();
}

const GENERATED_BY = 'Généré par tools/bundle.js — modifiez les sources, pas ce fichier.';
const GENERATED = '<!-- Generated by tools/bundle.js — edit the sources, not this file. -->';

/**
 * A stamp of what the app is made of, so that every change is visible.
 *
 * The version in sw.js is bumped by hand, which is exactly the kind of promise
 * that gets forgotten — and a version that stops moving is worse than none: the
 * screen says v6 for weeks while the app changes underneath. This is computed
 * from the sources themselves, so it cannot be forgotten. It also guarantees
 * sw.js differs after any change, which is what makes a published update take
 * over and the page reload itself once.
 *
 * Computed over the inputs only, with the stamped lines removed, so building
 * twice in a row gives the same answer.
 */
const STAMPED_IN_WORKER = /^const BUILD = '[^']*';$/m;
const STAMPED_IN_PAGE = /^([ \t]*)<meta name="app-build" content="[^"]*" \/>$/m;

async function buildStamp(root) {
  const files = ['styles.css', 'manifest.webmanifest', ...MODULES.map((name) => `src/${name}`)];
  const hash = createHash('sha256');
  for (const name of files.sort()) hash.update(name).update(await readFile(join(root, name)));
  // The two stamped files count too, minus the stamps themselves.
  hash.update('index.html').update((await readFile(join(root, 'index.html'), 'utf8')).replace(STAMPED_IN_PAGE, ''));
  hash.update('sw.js').update((await readFile(join(root, 'sw.js'), 'utf8')).replace(STAMPED_IN_WORKER, ''));
  return hash.digest('hex').slice(0, 8);
}

/**
 * What the page lets run: its own files and the inline scripts it carries,
 * named by their hash — so markup slipped in through some text (a name, a
 * title) would not run even if it ever got past escapeHtml. A meta tag, since
 * GitHub Pages sets no headers; it only covers what comes after it, so it sits
 * first in <head>. Written by the build, never by hand: an inline script
 * edited without building again would otherwise be blocked.
 */
const POLICY_IN_PAGE = /^([ \t]*)<meta http-equiv="Content-Security-Policy" content="[^"]*" \/>$/m;
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;

export function contentPolicy(html, { self = true } = {}) {
  const hashes = [...html.matchAll(INLINE_SCRIPT)].map(
    ([, code]) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`,
  );
  return [`script-src ${[...(self ? ["'self'"] : []), ...hashes].join(' ')}`, "object-src 'none'", "base-uri 'none'"].join('; ');
}

function withPolicy(html, options) {
  if (!POLICY_IN_PAGE.test(html)) {
    throw new Error('Cannot bundle: index.html has no Content-Security-Policy meta tag to write.');
  }
  return html.replace(POLICY_IN_PAGE, (_, indent) =>
    `${indent}<meta http-equiv="Content-Security-Policy" content="${contentPolicy(html, options)}" />`);
}

/** The served page's policy, written before the stamp is computed over the page. */
async function stampPolicy(root) {
  const page = await readFile(join(root, 'index.html'), 'utf8');
  const stamped = withPolicy(page);
  if (stamped !== page) await writeFile(join(root, 'index.html'), stamped);
}

/** Write the stamp into sw.js and the page, and say whether anything moved. */
async function stampFiles(root, stamp) {
  let moved = false;

  const worker = await readFile(join(root, 'sw.js'), 'utf8');
  const line = `const BUILD = '${stamp}';`;
  if (!STAMPED_IN_WORKER.test(worker)) {
    throw new Error("Cannot bundle: sw.js has no `const BUILD = '…';` line to stamp.");
  }
  const stampedWorker = worker.replace(STAMPED_IN_WORKER, line);
  if (stampedWorker !== worker) {
    await writeFile(join(root, 'sw.js'), stampedWorker);
    moved = true;
  }

  const page = await readFile(join(root, 'index.html'), 'utf8');
  if (!STAMPED_IN_PAGE.test(page)) {
    throw new Error('Cannot bundle: index.html has no app-build meta tag to stamp.');
  }
  const stampedPage = page.replace(STAMPED_IN_PAGE, (_, indent) => `${indent}<meta name="app-build" content="${stamp}" />`);
  if (stampedPage !== page) {
    await writeFile(join(root, 'index.html'), stampedPage);
    moved = true;
  }

  return moved;
}

/** The names of the published app's files under dist/, as servedFiles() writes them. */
export function servedNames() {
  return ['app.js', ...Object.keys(LANGUAGE_MODULES).map((lang) => `lang-${lang}.js`), ...Object.keys(PARTS).map((part) => `${part}.js`)];
}

/**
 * The offline cache must know every file the served page loads: a file left
 * out of it is a file the app cannot open without a network on a first visit.
 * The comment in sw.js promised this check — here it is.
 */
async function checkOfflineShell(root) {
  const worker = await readFile(join(root, 'sw.js'), 'utf8');
  const missing = servedNames().filter((name) => !worker.includes(`'./dist/${name}'`));
  if (missing.length) {
    throw new Error(`Cannot bundle: sw.js does not cache dist/${missing.join(', dist/')} — add them to SHELL and bump VERSION.`);
  }

  // The version is written twice — in sw.js, which names the cache, and in the
  // page, which shows it so anyone can tell which copy they are looking at.
  // Two places that must agree, so they are checked rather than trusted.
  const page = await readFile(join(root, 'index.html'), 'utf8');
  const inWorker = /const VERSION = '([^']+)'/.exec(worker)?.[1];
  const inPage = /name="app-version" content="([^"]+)"/.exec(page)?.[1];
  if (!inWorker || !inPage || inWorker !== inPage) {
    throw new Error(
      `Cannot bundle: sw.js says version ${inWorker ?? '(none)'} and index.html says ${inPage ?? '(none)'} — make them match.`,
    );
  }
  // The stamp is written by this very build, so the two must agree afterwards:
  // a mismatch means one of the files was not stamped.
  const builtWorker = /const BUILD = '([^']+)'/.exec(worker)?.[1];
  const builtPage = /name="app-build" content="([^"]+)"/.exec(page)?.[1];
  if (!builtWorker || !builtPage || builtWorker !== builtPage) {
    throw new Error(
      `Cannot bundle: sw.js is stamped ${builtWorker ?? '(none)'} and index.html ${builtPage ?? '(none)'} — run the bundler again.`,
    );
  }
}

/**
 * The calendar function, as one file.
 *
 * Supabase's own editor takes a single file pasted into it, so the function is
 * shipped that way: the calendar writer inlined, then the handler, neither of
 * them left with an import. The source of the two halves stays where it is
 * readable — src/ics.js and supabase/functions/agenda/handler.js — and this
 * builds what gets deployed, exactly as dist/ is built for the app.
 */
export async function edgeFunction(name = 'agenda') {
  const strip = (code) =>
    code
      .replace(IMPORT_LINE, '')
      .replace(EXPORT_LIST, '')
      .replace(EXPORT_KEYWORD, '')
      .trim();

  const sources = EDGE_SOURCES[name];
  if (!sources) throw new Error(`Cannot build the ${name} function: no such function.`);
  const parts = (await Promise.all(sources.map((path) => readFile(join(root, path), 'utf8')))).map(strip);
  const declaredIn = new Map();
  parts.forEach((part, index) => {
    const leftover = part.match(LEFTOVER_MODULE);
    if (leftover) {
      throw new Error(
        `Cannot build the ${name} function: a module statement was left in — ${leftover[0].trim()}`,
      );
    }
    for (const [, identifier] of part.matchAll(TOP_LEVEL_DECLARATION)) {
      if (declaredIn.has(identifier)) {
        throw new Error(`Cannot build the ${name} function: "${identifier}" is declared twice (${declaredIn.get(identifier)}, ${sources[index]}).`);
      }
      declaredIn.set(identifier, sources[index]);
    }
  });

  const text = `${EDGE_HEADERS[name]}\n${parts.join('\n\n')}\n`;
  // Le nombre de lignes est écrit dans le fichier lui-même : un collage
  // incomplet — le piège de l'éditeur de Supabase — se voit alors d'un coup
  // d'œil, au lieu de ressortir en « Expression expected » à la première ligne
  // qui manque. Le compte est fait sur le texte fini, marque comprise : elle
  // tient sur une ligne, quel que soit le nombre écrit dessus.
  const lines = text.split('\n').length - 1;
  if (!text.includes(LINE_COUNT_MARK)) {
    throw new Error(`Cannot build the ${name} function: its header no longer says how long it is.`);
  }
  return text.replace(LINE_COUNT_MARK, String(lines));
}

const LINE_COUNT_MARK = '{{lignes}}';

/** What each Edge Function is made of, in order: each part only uses what comes before it. */
const EDGE_SOURCES = {
  agenda: ['src/ics.js', 'supabase/functions/agenda/handler.js'],
  notifier: ['src/ics.js', 'supabase/functions/notifier/webpush.js', 'supabase/functions/notifier/handler.js'],
};

const EDGE_HEADER = `// ${GENERATED_BY}
//
// Collez ce fichier dans Supabase → Edge Functions, sous le nom « agenda »,
// avec la vérification du JWT **désactivée** : un agenda qui s'abonne ne peut
// envoyer aucun en-tête. Voir docs/DEPLOIEMENT.md, étape 8.
//
// Le fichier fait ${LINE_COUNT_MARK} lignes. Si l'éditeur en affiche moins une fois collé,
// le collage est incomplet : refaites un « tout sélectionner » dans l'éditeur,
// puis recollez. Le plus sûr est de copier depuis la version brute du fichier
// sur GitHub (bouton « Raw »), qui est du texte et rien d'autre.`;

const EDGE_HEADERS = {
  agenda: EDGE_HEADER,
  notifier: `// ${GENERATED_BY}
//
// Collez ce fichier dans Supabase → Edge Functions, sous le nom « notifier »,
// avec la vérification du JWT **désactivée**. Voir docs/DEPLOIEMENT.md, étape 10.
//
// Le fichier fait ${LINE_COUNT_MARK} lignes. Si l'éditeur en affiche moins une fois collé,
// le collage est incomplet : refaites un « tout sélectionner » dans l'éditeur,
// puis recollez. Le plus sûr est de copier depuis la version brute du fichier
// sur GitHub (bouton « Raw »), qui est du texte et rien d'autre.`,
};

/** Every substitution must fire: a silent no-op would ship a broken page. */
function substitute(source, pattern, replacement, what) {
  const result = source.replace(pattern, replacement);
  if (result === source) {
    throw new Error(`Cannot bundle: index.html has no ${what} to work from any more.`);
  }
  return result;
}

function extract(source, pattern, what) {
  const match = source.match(pattern);
  if (!match) throw new Error(`Cannot bundle: index.html has no ${what} any more.`);
  return match[1];
}

/** One module as it goes into a bundle: imports and `export` words gone, checked. */
async function readModule(name) {
  const source = await readFile(join(root, 'src', name), 'utf8');
  const aliased = ALIASED_IMPORT.exec(source);
  if (aliased) {
    throw new Error(
      `Cannot bundle: src/${name} imports "${aliased[1]}" as "${aliased[2]}". ` +
        'The bundle strips imports, so the alias would refer to nothing — rename the export instead.',
    );
  }
  const imports = [...source.matchAll(IMPORT_NAMES)].map(([, names, from]) => ({
    from,
    names: names.split(',').map((one) => one.trim()).filter(Boolean),
  }));
  const exports = [...source.matchAll(EXPORTED)].map(([, kind, identifier]) => ({ kind, identifier }));
  const code = source
    .replace(IMPORT_LINE, '')
    .replace(EXPORT_LIST, '')
    .replace(EXPORT_KEYWORD, '')
    .trim();

  // A module statement left in would make the whole bundle fail to parse,
  // and the page would come up blank with one line in the console.
  const leftover = code.match(LEFTOVER_MODULE);
  if (leftover) {
    throw new Error(
      `Cannot bundle: src/${name} still has a module statement the bundler does not know how to strip: ${leftover[0].trim()}`,
    );
  }
  return { name, code, imports, exports };
}

/** Every module, read once, in MODULES order, refusing a name two of them define. */
async function readModules() {
  const modules = new Map();
  const declaredIn = new Map();
  for (const name of MODULES) {
    const module = await readModule(name);
    for (const [, identifier] of module.code.matchAll(TOP_LEVEL_DECLARATION)) {
      const previous = declaredIn.get(identifier);
      if (previous) {
        throw new Error(
          `Cannot bundle: "${identifier}" is declared both in ${previous} and in ${name}. ` +
            'Rename one of them — the bundle puts every module in one scope.',
        );
      }
      declaredIn.set(identifier, name);
    }
    modules.set(name, module);
  }
  for (const name of PART_OF.keys()) {
    if (!modules.has(name)) throw new Error(`Cannot bundle: the part ${PART_OF.get(name)} names src/${name}, which is not in MODULES.`);
  }

  // A part is reached by import() only: a static import from outside it would
  // need it loaded with the app, which is what it is kept out of.
  for (const module of modules.values()) {
    for (const { from } of module.imports) {
      const part = PART_OF.get(from);
      if (part && PART_OF.get(module.name) !== part) {
        throw new Error(
          `Cannot bundle: src/${module.name} imports src/${from}, which is fetched later (part "${part}"). ` +
            "Reach it with later() and import('./" + from + "') instead.",
        );
      }
    }
    for (const [, target] of module.code.matchAll(DYNAMIC_IMPORT)) {
      if (!PART_OF.has(target)) {
        throw new Error(`Cannot bundle: src/${module.name} imports src/${target} later, but no part holds it — add it to PARTS.`);
      }
    }
  }
  return modules;
}

/** What a part hands back: every export of its modules. */
function partExports(modules, part) {
  return PARTS[part].flatMap((name) => modules.get(name).exports.map(({ identifier }) => identifier));
}

/**
 * What a part takes from the app: each name its modules import from outside
 * it. A `let` is refused — the part would hold the value it had on arrival.
 */
function partImports(modules, part) {
  const names = new Set();
  for (const name of PARTS[part]) {
    for (const { from, names: imported } of modules.get(name).imports) {
      if (PART_OF.get(from) === part) continue;
      const source = modules.get(from);
      for (const identifier of imported) {
        const exported = source?.exports.find((one) => one.identifier === identifier);
        if (!exported) throw new Error(`Cannot bundle: src/${name} imports "${identifier}", which src/${from} does not export.`);
        if (exported.kind === 'let') {
          throw new Error(`Cannot bundle: the part ${part} imports "${identifier}" from src/${from}, a \`let\` it would see frozen.`);
        }
        names.add(identifier);
      }
    }
  }
  return [...names].sort();
}

/** One module in a bundle, stripped once every check has read it as written. */
const section = (name, code) => `// ---- src/${name} ${'-'.repeat(Math.max(0, 60 - name.length))}\n${stripComments(code)}`;

/** Every module in one script, the parts included: the single-file builds. */
async function buildScript() {
  const modules = await readModules();
  const parts = [];
  for (const module of modules.values()) {
    // The part is right there, in the same scope: import() hands it at once.
    const code = module.code.replace(DYNAMIC_IMPORT, (_, target) =>
      `Promise.resolve({ ${partExports(modules, PART_OF.get(target)).join(', ')} })`);
    parts.push(section(module.name, code));
  }
  return parts.join('\n\n');
}

/**
 * The fetching of a part, in the published app: its file, beside dist/app.js,
 * sets TOGETHER_PARTS[name] to a function of what it takes from the app, which
 * returns what it exports.
 */
const PART_LOADER = `  // ---- fetching the parts (tools/bundle.js) -----------------------------
  const TOGETHER_AT = new URL('.', document.currentScript?.src || document.baseURI).href;
  globalThis.TOGETHER_PARTS_AT = TOGETHER_AT;
  function togetherPart(name, takes) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(\`\${name}.js\`, TOGETHER_AT).href;
      script.addEventListener('load', () => {
        script.remove();
        const make = globalThis.TOGETHER_PARTS?.[name];
        if (!make) {
          reject(new Error(\`\${name}.js brought nothing\`));
          return;
        }
        try {
          resolve(make(takes()));
        } catch (error) {
          reject(error);
        }
      });
      script.addEventListener('error', () => {
        script.remove();
        reject(new Error(\`Could not fetch \${name}.js\`));
      });
      document.head.append(script);
    });
  }`;

/**
 * The files of the published app: dist/app.js, one file per language, one per
 * part. Named by their path under dist/.
 */
export async function servedFiles() {
  const modules = await readModules();
  for (const name of ['togetherPart', 'TOGETHER_AT']) {
    if ([...modules.values()].some((module) => new RegExp(`^(?:const|let|var|function|class)\\s+${name}\\b`, 'm').test(module.code))) {
      throw new Error(`Cannot bundle: "${name}" is the bundle's own name, rename it in the sources.`);
    }
  }
  const files = {};
  const app = [PART_LOADER];
  for (const module of modules.values()) {
    const language = LANGUAGE_OF.get(module.name);
    if (language) {
      // Not inside: what index.html fetched, if it is here already.
      app.push(section(module.name, `const ${language.symbol} = globalThis.TOGETHER_STRINGS?.${language.lang};`));
      const opening = `const ${language.symbol} = {`;
      if (!module.code.includes(opening) || module.exports.length !== 1 || !module.code.endsWith('};')) {
        throw new Error(`Cannot bundle: src/${module.name} must be one object, \`export const ${language.symbol} = {…};\`, and nothing else.`);
      }
      files[`lang-${language.lang}.js`] =
        `// ${GENERATED_BY}\n${stripComments(module.code).replace(opening, `(globalThis.TOGETHER_STRINGS ||= {}).${language.lang} = {`)}\n`;
      continue;
    }
    if (PART_OF.has(module.name)) continue;
    app.push(section(module.name, module.code.replace(DYNAMIC_IMPORT, (_, target) => {
      const part = PART_OF.get(target);
      return `togetherPart('${part}', () => ({ ${partImports(modules, part).join(', ')} }))`;
    })));
  }
  files['app.js'] = `// ${GENERATED_BY}\n(() => {\n${app.join('\n\n')}\n})();\n`;

  for (const part of Object.keys(PARTS)) {
    const body = PARTS[part].map((name) => section(name, modules.get(name).code)).join('\n\n');
    files[`${part}.js`] = `// ${GENERATED_BY}\n(globalThis.TOGETHER_PARTS ||= {}).${part} = ({ ${partImports(modules, part).join(', ')} }) => {\n${body}\n\n  return { ${partExports(modules, part).join(', ')} };\n};\n`;
  }
  return files;
}

/**
 * `target` is 'page' for a standalone document, or 'artifact' for a fragment
 * whose host wraps it in its own skeleton — there, a download the page starts
 * by itself is ignored, so the export falls back to copyable text.
 */
export async function bundle(target = 'page') {
  await checkOfflineShell(root);
  // Stamped before anything is read, so the page carries the stamp of what it
  // was built from.
  await stampPolicy(root);
  await stampFiles(root, await buildStamp(root));
  const [html, css, script] = await Promise.all([
    readFile(join(root, 'index.html'), 'utf8'),
    readFile(join(root, 'styles.css'), 'utf8'),
    buildScript(),
  ]);

  if (/<\/script/i.test(script) || /<\/style/i.test(css)) {
    throw new Error('Cannot bundle: a source file contains a closing script or style tag.');
  }

  const scriptTag = /^([ \t]*)<script src="dist\/app\.js"><\/script>$/m;
  // The words fetched beside the app: here, they are inside it.
  const wordsScript = /^[ \t]*<!-- The words of the language in use[\s\S]*?<\/script>\n/m;
  const styleLink = /^([ \t]*)<link rel="stylesheet" href="styles\.css" \/>$/m;
  // The manifest and the touch icon are files sitting next to the served app.
  // A single self-contained page has no such neighbours, so they are dropped
  // rather than left pointing at nothing.
  const strip = (html) =>
    substitute(html, wordsScript, '', 'script fetching the words')
      .replace(/^[ \t]*<link rel="manifest"[^>]*>\n/m, '')
      .replace(/^[ \t]*<link rel="apple-touch-icon"[^>]*>\n/m, '');
  const run = (preamble, indent) =>
    `${indent}<script>\n${preamble}(() => {\n${script}\n})();\n${indent}</script>`;

  if (target === 'artifact') {
    // The host supplies <head> and <body>, so hand it the title, the styles
    // and the page content — and nothing else.
    const title = extract(html, /<title>([^<]*)<\/title>/, 'title');
    const body = extract(strip(html), /<body>\n([\s\S]*?)\n[ \t]*<\/body>/, 'body');
    const content = substitute(body, scriptTag, (_, indent) =>
      run("window.MARQUE_POINTS_EXPORT_MODE = 'copy';\n", indent), 'app script tag');
    return `<title>${title}</title>\n<style>\n${css.trimEnd()}\n</style>\n${GENERATED}\n${content}\n`;
  }

  let output = substitute(strip(html), styleLink, (_, indent) =>
    `${indent}<style>\n${css.trimEnd()}\n${indent}</style>`, 'stylesheet link');
  output = substitute(output, scriptTag, (_, indent) => run('', indent), 'app script tag');
  // One file, with nothing of its own to load: its two inline scripts, and no
  // other script from anywhere, even beside it.
  output = withPolicy(output, { self: false });
  return substitute(output, '<head>', `<head>\n    ${GENERATED}`, 'head tag');
}

// Only write the files when run as a command, not when imported by a test.
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  await mkdir(join(root, 'dist'), { recursive: true });
  for (const [target, name] of [['page', 'marque-points.html'], ['artifact', 'marque-points.artifact.html']]) {
    const output = await bundle(target);
    await writeFile(join(root, 'dist', name), output);
    console.log(`dist/${name} — ${(output.length / 1024).toFixed(0)} KB`);
  }
  for (const [name, output] of Object.entries(await servedFiles())) {
    await writeFile(join(root, 'dist', name), output);
    console.log(`dist/${name} — ${(output.length / 1024).toFixed(0)} KB`);
  }

  for (const name of Object.keys(EDGE_SOURCES)) {
    const edge = await edgeFunction(name);
    await writeFile(join(root, 'supabase', 'functions', name, 'index.ts'), edge);
    console.log(`supabase/functions/${name}/index.ts — ${(edge.length / 1024).toFixed(0)} KB`);
  }
}
