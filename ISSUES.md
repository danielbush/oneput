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
