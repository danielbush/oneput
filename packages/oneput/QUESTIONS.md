# Questions

## Explain how the menu system works, how it can be static or dynamic and the use of invalidate

COMMENT: if something hasn't been implemented yet, just mention this in the explanation.

### The two layers

The displayed menu is a function of two inputs:

- **base** — the canonical list of items (`currentMenu.allMenuItems`). Seeded ONLY
  by `ctl.menu.setMenu(...)`.
- **query** — the live input value (`ctl.input.getInputValue()`).

The **displayed** list is `currentProps.menuItems`, written via `ctl.menu.setDisplayed(...)`.
So `setMenu` owns the base; whatever derives the displayed list owns the view (and never
mutates the base).

### Two derivation channels (mutually exclusive per menu)

There are two separate, typed channels that produce the displayed list. A given menu uses
ONE of them:

- **filter** (`ctl.menu.setFilter`, implemented by `helpers/Filter.ts`) — SYNC. Reads the base + query and
  returns a subset (+ highlighting). Signature `FilterFn = (query, base) => subset`.
  `FuzzyFilter` / `WordFilter` are filters; register one with `ctl.menu.setFilter(fn)` (or
  `setDefault` for the app-wide default).
- **generative** (`ctl.menu`, backed by `helpers/MenuItemsFn.ts`) — produces items purely from
  the input, IGNORING the base. Signature `MenuItemsGenFn = (input) => items` (and
  `MenuItemsGenFnAsync` for fetches). Register with `setMenuItemsFn` / `setMenuItemsFnAsync`.

They can't both drive one menu: `MenuController` keeps one active input channel
(`none`, `filter`, or `generative`). Registering a generative fn selects the generative
channel; registering a filter selects the filter channel. The `enableFilter` and
`enableGenerative` UI flags temporarily gate those channels without changing which one is active.

### Three kinds of menu

- **filter** — a static base (`setMenu`/`menu()`) + a filter over it. Typing narrows the
  list. The app shell installs a default filter so most menus are filterable for free.
- **sync-rebuild** (KatexDemo) — declarative `menu()` builds items from AppObject state.
  Typing/state changes call `invalidate()` (or the `onInputChange` hook) to rebuild. No
  filter, no generative fn.
- **async-fetch** (AsyncSearchExample) — `setMenuItemsFnAsync` fetches items keyed on input
  (debounced, out-of-order results discarded). Uses `whenEmpty` for the pre-typing
  placeholder; no `menu()`, no `setMenu`.

### Declarative `menu()` vs imperative `setMenu`

- **Imperative** — call `ctl.menu.setMenu(...)` yourself (in `onStart`, on events).
- **Declarative** — define `menu = () => ({ id, items })`. The framework pulls it for you;
  the function form re-runs from current state each pull.

A declarative `menu()` is pulled at exactly three moments, all AFTER the relevant state
exists:

- **after `onStart`/`onResume`** (`afterRun`) — so it reflects state the hook just set up,
- **on open** (pull-on-open) — so changes made while the menu was closed are picked up,
- **on `invalidate()`** — when state changes while the menu is open.

(This ordering is deliberate: pulling before `onStart`/`onResume` would build the menu from
state that isn't set up yet, or that the hook is about to change.)

### `invalidate()`

`ctl.menu.invalidate(opts?)` says: _"the state behind `menu()` changed — pull it again."_
It re-runs `menu()`, re-seeds the base, AND re-applies an active filter against the current
query in the same synchronous tick (so the user's query survives with no flash of the
unfiltered base). Guards — it's a no-op when:

- the AppObject has no declarative `menu()`, or
- the menu is **closed** (the next open re-pulls anyway, via pull-on-open).

So callers can fire `invalidate()` on any state change without checking whether the menu is
open. Pass `invalidate({ focusBehaviour: 'none' })` for changes that shouldn't move the
focused item (e.g. toggling a checkbox in place).

Related primitives:

- **`onInputChange`** (AppObject hook, framework-wired) — for a sync-rebuild menu where
  typing should rebuild `menu()`: recompute state, then `invalidate()`. KatexDemo uses this;
  NavigateHeadings uses it to run its own filtering.
- **`triggerMenuItemsFn()`** — re-run the generative fn now against the current input
  (re-fetch). This is the refresh primitive an async-fetch menu needs; `invalidate()` is a
  no-op there (no `menu()`).

Worked example: KatexDemo is sync-rebuild — declarative `menu()` reads katex state; typing
(`onInputChange`), toggling display mode, and rebinding the submit key all call
`invalidate()`; the menu rebuilds from state.

## How do I get Oneput to filter a menu using the input?

Oneput does NOT filter out of the box. You install a default filter **once**, at the app
shell level, after which every menu becomes filterable; individual AppObjects do nothing.

### Step 1 — install a default filter (once, in your app shell)

```ts
ctl.menu.setDefaultFilter(FuzzyFilter.create().filter);
```

Pick `WordFilter` (each input word must prefix-match somewhere in the item) or `FuzzyFilter`
(uFuzzy matching + ranking). In the demos this lives in the app `_layout`; `SettingsManager`
switches between the two with `ctl.menu.setDefaultFilter(...)`. Without this line, typing
does nothing to the menu.

### Step 2 — set a menu (per AppObject)

```ts
ctl.menu.setMenu({
  id: 'main',
  items: [stdMenuItem({ textContent: 'Apple', action: ... }), /* ... */]
});
```

Now typing narrows the list, with matching text highlighted. The items you passed are the
**base**; the filter derives the displayed subset from them on each keystroke.

### Overriding the filter for one AppObject

Register your own filter for the current screen. A `FilterFn` receives `(input, base)` and
returns the items to display (or `undefined` to leave the list unchanged):

```ts
ctl.menu.setFilter((input, items) => items.filter((i) => matches(i, input)));
```

`ctl.menu.resetFilter()` restores the default. (The default is also restored automatically
per AppObject, in `runBefore`.)

### Notes / gotchas

- The filter only runs **while the menu is open** and **on input change**. To re-filter
  programmatically, `invalidate()` re-applies it; for the generative channel use
  `ctl.menu.triggerMenuItemsFn()`.
- The filter reads the **base** (`allMenuItems` from your last `setMenu`) — so re-`setMenu`
  to change what's filtered.
- A filter is SYNC by definition. If selecting the displayed items needs I/O (a network
  fetch, a query embedding), that's the **generative** channel, not a filter — use
  `setMenuItemsFnAsync` (debounced, out-of-order results discarded); see AsyncSearchExample.
- To do your own filtering without the built-in channel, disable it (`enableFilter: false`)
  and derive the menu yourself in the `onInputChange` hook; see NavigateHeadings.
- A generative menu can show a placeholder for empty input via the `whenEmpty` option on
  `setMenuItemsFn` / `setMenuItemsFnAsync` (no separate `setMenu`, and clearing the input
  back to empty avoids a pointless empty fetch).

## If an AppObject uses setMenu without setting menu(), does ctl.menu.invalidate update it?

It depends what "update" means. `invalidate()` only re-pulls and re-seeds the **base** from
the declarative `menu()` if one exists. An imperative `setMenu(...)` call already seeded the
base directly but leaves no recipe to re-run, so `invalidate()` cannot rebuild that base.

If the menu is open and there is no `menu()`, `invalidate()` still redisplays the current
menu: it re-runs the active filter against the existing base items from the last `setMenu`.
That is useful when the input/filter display needs to be refreshed, but it will not pick up
new or changed base items.

To refresh the base of an imperatively-set menu, call `setMenu(...)` again yourself (that's
the imperative contract: you own the base, so you re-seed it). The **pull-on-open**
behaviour also cannot rebuild a `menu()`-less AppObject — opening the menu can only show the
last base you seeded.

The remaining guard is when the menu is **closed**: `invalidate()` returns `false` because
there is nothing visible to refresh, and a declarative menu will be re-pulled on the next
open anyway.

In short:

- **Declarative** (`menu = () => ...`) → `invalidate()` re-derives the base, then filters.
- **Imperative** (`setMenu(...)`) → `invalidate()` re-filters the existing base; call
  `setMenu(...)` again to change the base.

## When to use menuItemsFn (eg setMenuItemsFnAsync)?

setMenuItemsFnAsync gives you four things:

- Input-driven generation — it subscribes to input-change and re-runs your fn with the typed value.
- Debounce on those changes.
- Out-of-order discard — late async results get dropped (inFlight tracking).
- onDebounce / whenEmpty lifecycle hooks.

All four exist for one scenario: the input is an async query to a producer — a search box hitting a server (that's literally AsyncSearchExample). Debounce throttles the server; out-of-order discard handles racing responses.

If you need to dynamically generate menu items but not in response to typing (like a search result) then consider `setMenu` directly. See DirectoryPicker demo.

## Explain how filters and generative menus work

TODO: mutually exclusive

## Explain how focusBehaviour works

TODO: 4 layers; we can override in ctl.menu.invalidate
