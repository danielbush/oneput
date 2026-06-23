# Current

## Declarative `AppObject.menu` pull model + async `whenEmpty` option

Design notes from a session exploring backlog item "proper pull model for declarative
AppObject.menu" (`work/backlog/oneput.md`, refactor section). Two related changes.

### Background: how menus are populated today

Displayed menu = `derive(base, query)`:

- **base** — `currentMenu.allMenuItems`, seeded ONLY by `ctl.menu.setMenu(...)`
  (constructed in `CurrentMenu`, `helpers/CurrentMenu.ts`).
- **query** — the live input value (`ctl.input.getInputValue()`).
- **derive** — a `menuItemsFn` (registered via `setMenuItemsFn` / `setMenuItemsFnAsync`,
  see `controllers/helpers/MenuItemsFn.ts`). It fires on `input-change`, only while the
  menu is open, reads `allMenuItems`, and writes ONLY the displayed layer
  (`_setMenu` → `currentProps.menuItems`). It never touches `allMenuItems`.

Contract is documented on the `CurrentMenu` constructor field:
- `setMenu` updates `allMenuItems` (the base)
- `_setMenu` and all `menuItemsFn*` update only `currentProps.menuItems` (displayed)

Three deriver patterns observed:
- **filter** — FuzzyFilter / WordFilter (`shared/filters/`). Read base, return a subset
  (+ highlight via `derivedHTML`). Set as the *default* fn in the demos' `_layout.ts`.
- **generative-from-state** — KatexDemo. fn ignores its args and just rebuilds the whole
  menu from AppObject state (`renderUI` → `renderMenuItems` → `setMenu`). This is the
  `renderMenuItems` pattern the ticket wants to remove.
- **generative-from-results** — AsyncSearchExample. fn ignores base, fetches from network
  keyed on input, builds fresh items. `setMenu` is used only to show a pre-typing
  placeholder.

IMPORTANT correction to the ticket's premise (line ~59): a closed menu does NOT currently
re-pull from `menu()` on open. `menu()` is pulled exactly once, in `AppController.runBefore`
(`this.ctl.menu.setMenu(this.current?.menu())`). `openMenu()` only flips `menuOpen` +
emits; it does not re-pull.

### Change 1 — `ctl.menu.invalidate()` (guarded on `menu`)

Signal that the declarative base must be re-pulled.

- `invalidate(opts?: { focusBehaviour?: FocusBehaviour })`.
- **Guarded**: if the current AppObject did NOT define a declarative `menu()`, `invalidate()`
  is a no-op. (This is the deliberately simple rule — we explicitly chose NOT to add
  base-dependence branching / conditional displayed-layer logic.)
- When `menu()` exists: re-pull it (re-seed base), refresh display. If a base-reading fn
  (filter) is active it should re-run against the current input so the user's query is
  preserved (re-filter the new base; this does NOT yank the filtered view — that only
  happened in a naive "setMenu and stop" impl).
- Must carry `focusBehaviour` so state changes that shouldn't move focus can pass `'none'`
  — e.g. KatexDemo's display-mode checkbox toggle (currently `renderMenuItems(... 'none')`,
  see the focus-index comment in `KatexDemo.renderMenuItems`).

`invalidate()` vs `triggerMenuItemsFn()` (they are complementary, not alternatives):
- `invalidate()` = "the base/state behind `menu()` changed" → re-pull base.
- `triggerMenuItemsFn()` = "re-run the deriver now against current input" (re-filter or
  re-fetch). This is the only refresh primitive a generative-from-results menu needs.

### Change 2 — `whenEmpty` render option on `setMenuItemsFn` / `setMenuItemsFnAsync`

Let a deriver own its ENTIRE displayed lifecycle, so generative-from-results menus need
neither `setMenu` nor `menu()`.

- New option, e.g. `setMenuItemsFnAsync(fn, { whenEmpty: (b) => [...], onDebounce, focusBehaviour })`.
- When input is empty/whitespace: render `whenEmpty` items directly; do NOT call the fn.
- Side benefit: avoids a pointless `fetchData('')` when the user deletes all input back to
  empty (today the placeholder is a one-time `setMenu`, so clearing re-fires the fn).

### Worked migration examples (the acceptance targets)

- **KatexDemo** (`apps/oneput-demo/src/lib/app/KatexDemo.ts`) — generative-from-state.
  Becomes `menu = () => buildItems()` reading `getInputValue()` + `previewDisplayMode` +
  `helpMessage`. The three current `renderUI()` triggers become `invalidate(...)`:
  checkbox action, `bindings-change` subscription, AND input change (the katex preview is
  part of `menu()`'s output, so typing is just another invalidate trigger). `setMenuItemsFn`,
  `renderUI`, `renderMenuItems` all disappear. Checkbox toggle uses
  `invalidate({ focusBehaviour: 'none' })`.

- **AsyncSearchExample** (`apps/oneput-demo/src/lib/app/AsyncSearchExample.ts`) —
  generative-from-results. Drop the `setMenu` at line ~78 and define no `menu()`. Move the
  instructions placeholder into `whenEmpty`. `invalidate()` is therefore a guarded no-op
  for it. Refresh stays as `triggerMenuItemsFn()` (already used by the error-refresh button).

### Resulting model

- Declarative menus (filter / generative-from-state): `menu()` + `invalidate()`.
- Generative-from-results (async): no `menu()`, no `setMenu`; fn owns the view via
  `whenEmpty` + `triggerMenuItemsFn()`; `invalidate()` is a guarded no-op.

### Open question

`whenEmpty` shape — does it take a builder `(b) => FlexChildren[]` returning menu items
(consistent with other builders), or a plain `MenuItem[]`? Lean builder for consistency.
