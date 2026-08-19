# Review: pull-based toggle and checkbox

Review of the staged work in the `oneput` worktree (`/Users/danb/projects/@oneput.oneput`), against `PLAN.md`.

Reproduced in the oneput demo: **Insert katex** → type `\sum_{i=1}^n i` → click **Display mode**. The preview switches every click. The checkbox stays unchecked.

## Verdict

The split is right: keep stateless `toggleMenuItem`, add `pullToggleMenuItem`, make `checkboxMenuItem` pull-only, BindingsEditor is one `setMenu` again (no `paint`).

Do not land until the Katex checkbox paints after `invalidate`. The tests do not cover that case.

## Katex checkbox never ticks

File: `apps/oneput-demo/src/lib/app/KatexDemo.ts` (`checkboxMenuItem` for display mode).

What works: the click **action** runs. `displayMode` flips. `recompute()` plus `invalidate` rebuilds the preview.

What fails: the **box** never looks checked, including the first click.

### Why

`checkboxMenuItem()` calls `PullCheckbox.mount()` and keeps a `paint()` handle on **that** factory result.

On click the demo does, in order:

1. `action` sets `this.displayMode`.
2. `widget.paint()` (handle from the current factory result).
3. `ctl.menu.invalidate()` so the preview HTML can change.

`menu()` then builds a **new** `checkboxMenuItem` (new `mount()`, new `paint()`). The input id stays `katex-display-mode-checkbox-input`. `FChild` reuses the node and does **not** run `onMount` again.

So:

- The widget that **mounted** is from the previous factory call (or, on the first click, `paint` then `invalidate` in the same turn).
- The `paint()` on the **new** handle is a no-op: that widget never mounted.
- Katex passes only `{ get: () => this.displayMode }`. There is no `subscribe`, so the mounted widget is not told to paint after the rebuild.
- The rebuilt input has no `checked` attribute. Svelte refreshes the node. Any tick from step 2 is gone before you see it.

The flag is live. The widget on the node is not the handle the next click paints.

### What already does this correctly

`packages/jsed/src/ui/oneput/JsedCatalog.ts` — only the two **element indicator** checkboxes, not the rest of jsed.

There `invalidateMenu` still rebuilds, then `notify()`s a catalog-lifetime `notifier()`. Each checkbox `source.subscribe`s to that signal. The widget that actually mounted paints again from `get()`.

Katex needs the same: a long-lived `subscribe` (or a `cell` for `displayMode`) that paints **after** invalidate, on the mounted widget.

## Tests

File: `packages/oneput/src/lib/oneput/shared/ui/menuItems/pullMenuItems.test.ts`.

They cover the BindingsEditor shape: mount one factory result, click **that** item, assert paint. Also: second row on a shared `cell`, unmount, `canFilter: false`.

They do **not** cover Katex/JsedCatalog:

- Build item A, mount A, then build item B from the same live `get()` (no second `onMount`).
- Run **B’s** `action` (and/or `invalidate` without remounting).
- Assert the **mounted** node follows `get()`.

`pull.test.ts` for `cell` / `notifier` is fine and is not this gap.

Add a test like: mount A, construct B with `{ get }` only, click B, node unchanged; then the same with `subscribe`/`cell.set` or `notifier` after a fake rebuild, node updates.

## What looks good

- `lib/pull.ts`: `Pull`, `cell`, `notifier`.
- `PullToggleLabel` / `PullCheckbox` own a span or the `.checked` **property**.
- `pullToggleMenuItem` + `canFilter: false` + `titleOnMount`.
- Stateless `toggleMenuItem` unchanged.
- BindingsEditor: `source: { get: () => whenIndex }`, `onToggle` only assigns, one `setMenu`.
- Settings: `{ get: () => this.useTestService }`, no rebuild — that call site is OK.
- Skill, `CONCEPTS.md` (PULL_ROWS), `AGENTS.md`.

CSS / `ISSUES.md` whitespace is unrelated; leave or drop, not a blocker.

## Suggested fix (Katex)

Match the element-indicator pattern: keep a `notifier` (or `cell`) on `KatexDemo` for the life of the screen. `source: { get: () => this.displayMode, subscribe: ... }`. After `invalidate` (or on `cell.set`), notify so the **mounted** widget paints. Keep `invalidate` for the preview pane.

Do not rely on `widget.paint()` from the factory result after a rebuild that reuses the node.

# Response

The review is right, and the Katex regression is mine. Before my change the tick came from Svelte's checked attribute on every rebuild; now nothing paints it, so the box never moves.

The mechanism is exactly as described, and it is worth being precise about it because it is not Katex-specific. checkboxMenuItem closes over the paint() handle of its own mount() call. Only build #1's widget ever mounts (the input id is stable, so FChild reuses the node and never runs onMount again). Every later build produces a handle whose widget never mounted, so its paint() is a no-op. The click that fires is always the latest build's. So the live widget and the paintable handle drift apart the moment a call site invalidates.

That means the footgun is in the factory, not in KatexDemo. Any call site that rebuilds is exposed — Katex today, and a pullToggleMenuItem inside an AppObject menu() tomorrow. Settings and BindingsEditor only escape it because they never rebuild that row.

Two ways to go:

A. Fix Katex as the review suggests. A notifier (or cell) on KatexDemo for the life of the screen, notified after invalidate. Small, matches the jsed element-indicator pattern, and leaves the factory as-is. The contract then reads: if your call site rebuilds, you must pass subscribe.

B. Fix the factory. Key the mount by host id in a small registry inside pull/: the widget registers on mount and unregisters on destroy, and paint() resolves the live widget by id instead of closing over an instance. A rebuilt row then paints the widget that is actually on the node, and Katex needs no change at all. subscribe goes back to meaning only what the plan says it means — another write must move this row.

I lean to B, with A's notifier unnecessary afterwards. B removes a rule nobody will remember, and the plan's own line — "Click then pull is enough for one row" — is only true today when the caller never rebuilds. The cost is a module-level Map and last-mount-wins if two live menus share an id.

Either way I'd add the test the review names: mount A, build B from the same live get() with no second onMount, run B's action, assert the mounted node. That is the case the current suite steps around.

Which do you want? And if B, do you want the registry public (usable by future pull widgets) or kept private to pull/?