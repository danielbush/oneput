# Questions

## Explain how the menu system works, how it can be static or dynamic and the use of invalidate

COMMENT: if something hasn't been implemented yet, just mention this in the explanation.

### The two layers

The displayed menu is a function of two inputs:

- **base** — the canonical list of items (`currentMenu.allMenuItems`). Seeded ONLY
  by `ctl.menu.setMenu(...)`.
- **query** — the live input value (`ctl.input.getInputValue()`).

A **menuItemsFn** combines them: `displayed = derive(base, query)`. It runs on every
input change (while the menu is open), reads the base, and writes only the _displayed_
list (`currentProps.menuItems`) — it never mutates the base. So `setMenu` owns the base;
the fn owns the view.

### Static vs dynamic

**Static** — call `setMenu({ id, items })` once. With no menuItemsFn, the displayed
list is just the base. This is the simplest case.

**Dynamic** — register a menuItemsFn. Three shapes show up:

- **Filter** (`FuzzyFilter` / `WordFilter`) — reads the base, returns a subset (with
  match highlighting). Set as the default fn, so most menus are filterable for free.
- **Generative-from-state** (KatexDemo) — items are derived from AppObject state, not
  filtered from a base. Rebuilds the whole menu when state changes.
- **Generative-from-results** (AsyncSearchExample) — items come from an external source
  (e.g. a network search) keyed on input; the base is ignored.

### Declarative `menu()` vs imperative `setMenu`

An AppObject can populate its menu two ways:

- **Imperative** — call `ctl.menu.setMenu(...)` yourself (in `onStart`, on events, etc.).
  Most AppObjects do this today.
- **Declarative** — define `menu = () => ({ id, items })`. The system calls `setMenu`
  for you when the AppObject runs/resumes. The function form means it re-runs from
  current state each time it's pulled.

### `invalidate()`

`ctl.menu.invalidate(opts?)` says: _"the state behind `menu()` changed — pull it again."_
It re-runs the declarative `menu()` and re-seeds the menu. It is **guarded**: if the
AppObject has no declarative `menu()`, it's a no-op.

This replaces the old pattern of hand-writing a `renderMenuItems()` helper and calling it
on every state change. Instead: define `menu()` to read state, and call `invalidate()`
whenever that state changes. Pass `invalidate({ focusBehaviour: 'none' })` for changes
that shouldn't move the focused item (e.g. toggling a checkbox in place).

`invalidate()` is for "the base/state moved". Its counterpart, `triggerMenuItemsFn()`, is
for "re-run the deriver against the current input" (re-filter, or re-fetch for an async
menu). They're complementary: a generative-from-results menu only ever needs
`triggerMenuItemsFn()` (its displayed view doesn't depend on a base), so `invalidate()` is
a no-op there.

Worked example: KatexDemo uses declarative `menu()` + `invalidate()`. Typing, toggling
display mode, and rebinding the submit key all just call `invalidate()`; the menu rebuilds
from state.

### Not yet implemented

- `invalidate()` does NOT yet re-run an active **filter** menuItemsFn. So if a menu were
  both declarative AND filtered, invalidating mid-filter would show the unfiltered base
  until the next keystroke. No menu needs this combination today; it'll be added when one
  does (re-seed base, then re-run the filter against the current query to preserve it).
- A **`whenEmpty`** render option on `setMenuItemsFn` / `setMenuItemsFnAsync` (so a
  generative menu can show a placeholder for empty input without a separate `setMenu`
  call, and avoid a pointless empty fetch) is designed but not built.

## How do I get Oneput to filter a menu using the input?

Oneput does NOT filter out of the box — there is no built-in default filter. You set
one up **once**, at the app shell level, and then every menu becomes filterable. So it's
not free, but it's a single line of setup, after which individual AppObjects do nothing.

### Step 1 — install a default filter (once, in your app shell)

```ts
ctl.menu.fn.setDefaultMenuItemsFn(FuzzyFilter.create().menuItemsFn);
```

Pick `WordFilter` (each input word must prefix-match somewhere in the item) or
`FuzzyFilter` (uFuzzy matching + ranking). In the demos this lives in the app `_layout`;
`SettingsManager` switches between the two. Without this line, typing does nothing to the
menu.

### Step 2 — set a menu (per AppObject)

```ts
ctl.menu.setMenu({
  id: 'main',
  items: [stdMenuItem({ textContent: 'Apple', action: ... }), /* ... */]
});
```

Now typing narrows the list, with matching text highlighted. The items you passed are
the **base**; the default filter derives the displayed subset from them on each keystroke.
(See "The two layers" above.)

### Overriding the filter for one AppObject

Register your own fn for the current screen. It receives `(input, allMenuItems)` and
returns the items to display (or `undefined` to leave the list unchanged):

```ts
ctl.menu.fn.setMenuItemsFn((input, items) => items.filter((i) => matches(i, input)));
```

Call `setMenuItemsFn()` with no argument to restore the default.

### Notes / gotchas

- The fn only runs **while the menu is open** and **on input change**. To filter
  programmatically (without the user typing), call `ctl.menu.fn.triggerMenuItemsFn()`.
- The fn reads the **base** (`allMenuItems` from your last `setMenu`) — so re-`setMenu`
  to change what's filtered.
- For async/remote filtering, use `setMenuItemsFnAsync` (debounced, out-of-order results
  discarded) instead — see AsyncSearchExample.
- A `whenEmpty` option (placeholder items shown when the input is empty) is designed but
  **not yet implemented**; today, empty input shows the full base list.
