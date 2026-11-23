/**
 * The parts of the app fetched only once they are needed: Home's 3D view and
 * the arcade's games. A first visit, on a slow network, then waits for the
 * screens themselves and nothing more.
 *
 * `load` is an arrow that imports the part's first module by its path, and
 * nothing else (see view-home.js and app.js): served from src/, it is a module like any other; in the published app,
 * tools/bundle.js makes each part a file of its own beside the app
 * (dist/holo.js, dist/arcade.js) and turns that line into fetching it. In the
 * single-file build everything is inside, and the part is there at once.
 */

const parts = new Map();

/**
 * The part named `name`: `{ module, coming }` — `module` once it is here,
 * else null, and `coming`, the promise of it. One that failed (offline on a
 * first visit) is forgotten, so the next call tries again.
 */
export function laterPart(name, load) {
  let part = parts.get(name);
  if (!part) {
    part = { module: null, coming: null };
    part.coming = load().then(
      (module) => (part.module = module),
      (error) => {
        parts.delete(name);
        throw error;
      },
    );
    parts.set(name, part);
  }
  return part;
}
