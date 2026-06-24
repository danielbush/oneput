# Current

## Declarative `AppObject.menu` pull model + async `whenEmpty` option

Design notes from a session exploring backlog item "proper pull model for declarative
AppObject.menu" (`work/backlog/oneput.md`, refactor section). Two related changes.

### IMPLEMENTED (this session) — all type-checks + oneput unit tests pass; demos NOT runtime-verified

The taxonomy (filter / sync-rebuild / async-fetch — see "Menu taxonomy" below) is now
realised in code with the channels mutually exclusive. Summary of what shipped:

- **`setFilter` as its own module + channel.** `FilterController` (`helpers/Filter.ts`),
  exposed as `ctl.menu.filter` with `set`/`setDefault`/`reset`/`clear`/`run`/`_enable`.
  Filter is the typed sync channel `(query, base) => subset`; generative (`menuItemsFn`)
  stays in `helpers/MenuItemsFn.ts`. They share nothing but the paint target + enable gate.
  Separate **`enableFilter`** UIFlag (defaults `!enableModal`). Demos migrated
  (`setDefaultFilter` in both `_layout.ts`, `SettingsManager`). NavigateHeadings sets
  `enableFilter:false` (rolls its own listener).
- **Flash-free `invalidate`.** `AppController.reseedMenu` re-seeds base then `filter.run()`
  in the SAME synchronous tick → single render, no flash. No `reseedBase` split needed.
- **Pull-on-open + closed-guard (matched pair).** `openMenu` calls `reseedMenu()` after
  flipping `menuOpen`; `invalidateMenu` no-ops when the menu is closed. Net: callers fire
  `invalidate()` on any state change without checking open state. `runBefore`'s
  `setMenu(menu())` is still load-bearing — it owns the AppObject→AppObject transition
  (no openMenu fires there); no `filter.run` needed because reset clears the input.
- **Rename for clarity** (done by user): `_setMenu` → `setDisplayed` (displayed layer);
  `setMenu` still seeds the base. `run`/listeners use `setDisplayed`.
- **`whenEmpty`** on `setMenuItemsFn`/`...Async`: when input blank, render items directly
  (don't call fn); rendered immediately on registration too. Async also cancels pending +
  in-flight fetch. Shape = plain `() => MenuItemAny[]` (mirrors `setMenu`, not a builder).
  AsyncSearchExample dropped its `setMenu` placeholder → `whenEmpty`; no `menu()`/`setMenu`.
- **Generative ⊻ filter enforced two ways.** (a) `setMenuItemsFn`/`...Async` auto-call
  `filter.clear()` (covers async-fetch + sync-generative — no flag needed); (b)
  `FilterController.run()` now honours `disabled` so `enableFilter:false` works through
  invalidate (covers sync-rebuild like KatexDemo, which calls no generative fn).
  These fixed a real regression: post-split the default WordFilter was clobbering
  generative menus (AsyncSearch results → empty; Katex preview → filtered).
- **First-class `onInputChange` AppObject hook.** `onInputChange?: (data:{value}) => void`,
  wired/unwired by `AppController.reset` like `onMenuItemFocus`. KatexDemo migrated off its
  manual `ctl.events.on('input-change')` to this hook.
- **`menu()` pulled AFTER onStart/onResume (no ordering race).** `runBefore` now just
  CLEARS the menu (`setMenu()`); a new `afterRun()` calls `reseedMenu()` after the hook in
  both `run()` and `pop()`. So a declarative menu always reflects post-setup state and an
  AppObject never has to re-render after start/resume. KatexDemo dropped its trailing
  `onStart` `invalidate()`. `menu()` is now pulled at exactly three post-state moments:
  afterRun (post-setup), pull-on-open, and `invalidate()` (while open).
- **jsed migrated to declarative `menu()` + `invalidate()`.** `JsedEditDocumentUI` defines
  `menu()`; its editor-change subscription calls `invalidate()` (no-op while closed →
  pull-on-open rebuilds); `onStart`/`onResume` no longer hand-render. `ui/actions.ts` +
  `ui/menuItems.ts` take an OPTIONAL `invalidateMenu` that defaults to `ctl.menu.invalidate()`
  (override only for imperative consumers with no `menu()`). `renderMenuItems` kept solely
  for tests that inspect items while the menu is closed.

Resulting clean shapes: filter = `setMenu`/`menu()` + `setFilter`; sync-rebuild = `menu()` +
`invalidate()` + `onInputChange` (KatexDemo) / declarative `menu()` + editor subscription
(jsed); async-fetch = `setMenuItemsFnAsync` + `whenEmpty` (AsyncSearchExample).

OPEN / NOT DONE: runtime verification of demos; the `setMenu`→`seedMenu`/`setBase` rename
was discussed but only `_setMenu`→`setDisplayed` was applied; deprecating
`setDefaultMenuItemsFn`/`setMenuItemsFn` (kept for generative-sync) not pursued.

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

### Change 1 — `ctl.menu.invalidate()` (guarded on `menu`) — DONE

Implemented and migrated KatexDemo. Type-checks + oneput unit tests pass.

- `AppController.invalidateMenu(opts?)` — re-pulls `current?.menu()`, guarded
  (no-op returning `false` if no declarative `menu()`); spreads optional
  `focusBehaviour` override onto the re-seeded menu.
- `MenuController.invalidate(opts?)` — public entry, delegates to AppController.
- KatexDemo migrated: declarative `menu = () => ({ id, focusBehaviour: 'first',
  items: buildMenuItems() })`; `renderUI` split into `recompute()` (katex state +
  input UI) and `buildMenuItems()` (pure items); `renderMenuItems` removed. All
  triggers call `invalidate()` (input change, `bindings-change`, checkbox uses
  `invalidate({ focusBehaviour: 'none' })`). `setMenuItemsFn` kept ONLY as the
  input-change trigger (returns undefined) to preserve the menu-open firing guard.
- DEFERRED: `invalidate()` does NOT re-run an active filter `menuItemsFn` yet.
  KatexDemo doesn't need it and there are no declarative+filter menus today. Add
  fn re-run (preserve query) when a filter menu first needs `invalidate`.

Original spec for reference:


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

### Refactor - filter vs generative menus - attempt 2

Stepping back. This whole thread keeps circling because of ONE root cause: `MenuItemsFn`
is **opaque**. A single hook means "do something on type" — filter / refetch /
rebuild-from-state are all indistinguishable to the system. Every hard question here
(invalidate, flash, async) is the same wall: the system can't reason about what a menu
*does*.

Where we landed on invalidate: leave it dumb. `invalidate()` = "base/state changed →
re-pull `menu()`, paint base." It does NOT try to re-run the typing-step. If the caller
wants both, they compose `invalidate()` + `triggerMenuItemsFn()`. The flash-free
re-filter is only a problem if invalidate tries to be smart about the fn — so it doesn't.
This ships fine; no new work. (Confirms the DEFERRED note above.)

Why NOT do the big split now (the `filter(generate(input), input)` pipeline from
attempt 1): only ONE stage is ever query-driven at a time —
- filter menus: base is query-independent, the filter is query-driven.
- async-search: generate is query-driven, "filter" is identity.
So it's not a real two-input pipeline; it's "one query-driven deriver over an optional
base" — which is what `MenuItemsFn` already is. The split risks inventing two boxes when
the user only ever fills one.

On async filter: a *pure* filter (subset of in-memory base by query) is sync by
definition. The only async "filter" is semantic/embedding search (needs I/O for the query
embedding) — and that models cleanly as a **generate** stage. So the load-bearing line is
the **I/O boundary**, not filter-vs-generate: sync ⇒ one paint; async ⇒
stale-while-revalidate. If we ever want async filtering as first-class, filter can't live
on `CurrentMenu` (would need debounce/sequencing) → you'd build ONE shared async-aware
derive runner instead. Not now.

Foundation verdict: not broken, just **un-typed**. Sound to ship, risky to build on — the
next feature that needs to reason about a menu (preserve query, partial refresh, optimistic
update) hits the same wall. The real fix is NOT the big refactor; it's the smaller move of
**letting a menu declare its kind** so the system branches without guessing.

NEXT (before any code): write the menu **taxonomy** as the domain model — the three
patterns (filter / generative-from-state / generative-from-results, see Background) — and
for each, decide what it needs from `invalidate` and from refresh. The API falls out of
that table. That document IS the foundation.

### Menu taxonomy (the domain model)

The one axis that matters: **does deriving the menu need I/O?** (sync vs async). That single
line governs which refresh primitive applies AND how the paint happens. The three kinds are
just that axis crossed with "is there a separate query step":

| kind | item source | query consumed by | sync/async |
|------|-------------|-------------------|------------|
| **filter** | static base (`setMenu`/`menu()`) | a filter over the base | sync |
| **sync-rebuild** (was "generative-from-state") | rebuilt from AppObject state (query is one input) | the builder itself | sync |
| **async-fetch** (was "generative-from-results") | fetched via I/O, keyed on query | the fetch | async |

Note: **filter** and **sync-rebuild** both read in-memory state and are sync; they differ
only in *whether the query is a separate step over a base, or folded into one builder*.
Semantic/embedding search is NOT a fourth kind — it's **async-fetch** (needs I/O for the
query embedding), even though its output is a subset.

#### The kind is declared by WHICH primitives you call (no enum)

- **filter** → `setMenu`/`menu()` (base) **+** `setFilter(fn)` (sync, `(base, query) → subset`)
- **sync-rebuild** → `menu = () => buildItems()` reading `getInputValue()`; every
  trigger (incl. typing) calls `invalidate()`. No filter, no fn.
- **async-fetch** → `setMenuItemsFnAsync(fn, { whenEmpty })`. No `menu()`, no base.

The win: `setFilter` is a **typed channel**. The system now knows "is a sync filter
registered?" — the one fact it was missing. The opaque `MenuItemsFn` ambiguity is gone
because filtering and generation come in through different doors.

#### What each kind needs from invalidate / refresh

| kind | `invalidate()` (base/state changed) | `triggerMenuItemsFn()` (refresh now) |
|------|--------------------------------------|--------------------------------------|
| **filter** | re-pull `menu()` → new base, then re-apply registered filter at current query → **one sync paint, no flash** | re-run filter at current query (rarely needed; invalidate covers base change) |
| **sync-rebuild** | re-pull `menu()` (rebuilds from state); typing is also just an invalidate trigger | same as invalidate |
| **async-fetch** | guarded no-op (no `menu()`) | refetch at current query (the only refresh it needs) |

#### Why this kills the flash without invalidate "guessing"

invalidate doesn't inspect a fn. It asks one typed question: *was `setFilter` called?*
- yes → re-seed base, run the sync filter inline, paint once.
- no → re-seed base / rebuild, paint once.
Either way: single paint. The flash only ever came from doing it in two steps because the
fn was opaque. Typed channel ⇒ one step.

#### Smallest path to get here
1. Add `setFilter(fn)` (sync) — move FuzzyFilter/WordFilter off `setDefaultMenuItemsFn`.
2. Teach `invalidate` the "re-seed base then run filter inline (one paint)" path.
3. Leave `setMenuItemsFn*` as purely generative; add `whenEmpty` (Change 2).
4. Migrate demos: filter menus → `setFilter`; KatexDemo already sync-rebuild;
   AsyncSearchExample → async-fetch (no `menu()`, `whenEmpty` placeholder).

### Refactor - filter vs generative menus - attempt 1

What the user would see: two registration points instead of one overloaded setMenuItemsFn.

- `setFilter(fn)` — sync, (base, query) → subset.
- `setMenuItemsFn/...Async` — produces the base.
- Plus `setMenu/menu()` to seed a static base.

Can they switch/use both? Yes. They're orthogonal stages: displayed = filter(generate(input), input). An AppObject can set a base (static or generative) and a filter over it, or just one.

Why can't they filter using generative? They can — a generative fn reading base and returning a subset is a filter. Nothing stops it today. The split doesn't add a capability; it names the two roles so the system knows which is sync-derivable-from-base. **That knowledge is the only thing that lets invalidate re-derive without a flash. Without the distinction, every fn is opaque and invalidate has to guess.**

So the question isn't "what can the user do" — it's "what does the system know about what they did."


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
