## DUAL_EXPORTS

We support dual `exports` in package.json for packages like `packages/{jsed,oneput}`. `exports` points to src and TypeScript files directly so consuming apps in the workspace see changes without rebuilding. `publishConfig.exports` points to built code in `dist/` for publishing.

## SPLIT_TYPE_IDENTITY

TypeScript can see the same workspace package through two different resolution paths — the real source path (`packages/oneput/src/lib/...`) and the node_modules symlink path (`apps/foo/node_modules/@oneput/oneput/src/lib/...`). When a class has `private` properties (like `InternalEventEmitter.listeners`), TypeScript treats the two paths as distinct types, causing "Types have separate declarations of a private property" errors.

trigger: An app imports a type (e.g. `Controller`) directly from `@oneput/oneput`, AND also imports a component (e.g. `MenuStatus.svelte`) that internally references that same type. If the two imports resolve through different paths, the types don't unify.

### Fix A: `preserveSymlinks: true` (no longer used)

All resolution stays on node_modules paths, so there's only one canonical path. Downside: "go to definition" in the editor navigates to `node_modules/` paths instead of the real source files.

### Fix B: TypeScript `paths` (used by both apps)

Set `preserveSymlinks: false` and add `paths` in `tsconfig.json` to redirect workspace package imports to their real source paths. This ensures all resolution uses the same canonical path.

Key details:

- `paths` must match the package's `exports` structure exactly. For `@oneput/oneput`, the main export is at `src/lib/index.ts` but the `./shared/*` subpath export maps to `src/lib/oneput/shared/*` (note the extra `oneput/` directory).
- Do NOT use SvelteKit's `kit.alias` for this. SvelteKit alias sets both TypeScript `paths` AND Vite `resolve.alias`. Vite's alias uses the main entry (`@oneput/oneput` → `index.ts`) as a prefix match, which breaks subpath imports (e.g. `@oneput/oneput/shared/styles/foo.css` resolves to `index.ts/shared/styles/foo.css`).
- Instead, set `paths` directly in `tsconfig.json`. This only affects TypeScript, while Vite resolves through node_modules normally (which works fine at runtime).
- When overriding `paths`, you must replicate SvelteKit's default paths (`$lib`, `$lib/*`, `$app/types`) since the override replaces them entirely.
- SvelteKit will warn: "You have specified paths in your tsconfig.json which interferes with SvelteKit's auto-generated tsconfig.json. Use `kit.alias` instead." We can't use `kit.alias` because it sets Vite's `resolve.alias` too (see above), so we override with `paths` directly and accept the warning.

## ONEPUT_UI_PACKAGE_BOUNDARY

- when: May-2026
- context:
  - We moved the reusable Oneput app integration from `apps/jsed-demo/src/lib/oneput/app/` into `packages/jsed/src/ui/oneput/app/`.
  - `apps/jsed-demo` should import it from `@oneput/jsed/ui/oneput/app`.
  - A separate project should also be able to import this jsed Oneput UI entrypoint.
- problem:
  - The moved code depends on Oneput APIs such as `Controller`, `AppObject`, builders, icons, key bindings, and shared menu UI.
  - Importing the root `@oneput/oneput` entrypoint from jsed pulls in `.svelte` components (`Oneput.svelte`, `MenuStatus.svelte`, etc.).
  - jsed's Vite/Vitest setup is not a Svelte/SvelteKit app setup, so following that import chain caused parse failures on `.svelte` files.
  - Exporting broad Oneput subpaths like `@oneput/oneput/controllers/*` and `@oneput/oneput/lib/*` works technically, but it expands Oneput's public API more than the existing deliberate `./shared/*` export pattern.
  - Pointing a published jsed subpath's `"types"` at `src/` is also a smell. It can work if `src` is published, but runtime and types then come from different trees (`dist` for JS, `src` for TS).
- current workaround:
  - jsed imports narrow Oneput subpaths rather than the root package, and Oneput exposes those subpaths in `package.json`.
  - jsed builds `dist/ui/oneput/app/index.js` as an additional library entry.
  - jsed's published UI subpath currently uses built JS with source TS types because declaration generation for that subpath follows Oneput source imports across the package boundary.
- options:
  - Add a small explicit non-Svelte Oneput entrypoint, e.g. `@oneput/oneput/headless`, that exports only the controller/types/builders/icons/bindings needed by AppObject-style integrations.
  - Move reusable non-Svelte APIs that jsed needs under Oneput's existing `./shared/*` public surface.
  - Add Svelte support to jsed's Vite/Vitest config (`@sveltejs/vite-plugin-svelte`, or SvelteKit if jsed becomes a SvelteKit package), which would solve `.svelte` parsing locally but would not by itself define a clean public Oneput API.
  - Publish proper Oneput declaration files for whichever public subpaths jsed consumes, then emit jsed declarations for `@oneput/jsed/ui/oneput/app` into `dist`.
- preferred direction:
  - Prefer a deliberately named non-Svelte Oneput public entrypoint over broad `controllers/*` and `lib/*` exports.
  - Once that exists, switch jsed's UI entrypoint to import only from that public API and emit `dist/ui/oneput/app/index.d.ts` instead of pointing publish types at `src/`.
