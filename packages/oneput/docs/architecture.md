# Oneput Architecture

DO NOT EDIT COMMENTS - notify they user if they are incorrect or out of date.

Oneput is a command-bar UI system — an input with a dropdown menu that can be used to build shell-like interfaces for web apps. This document describes its internal architecture.

## Controller

The `Controller` (`controllers/controller.ts`) is the central API that consumers use to interact with Oneput. It composes five sub-controllers:

| Sub-controller    | Purpose                                                       |
| ----------------- | ------------------------------------------------------------- |
| `KeysController`  | Manages key bindings — registering, dispatching, defaults     |
| `AppController`   | Manages the AppObject stack — run, exit, back navigation      |
| `MenuController`  | Menu state — open/close, items, focus, filtering              |
| `InputController` | Input state — value, placeholder, focus, submit/fill handlers |
| `UIController`    | Layout and UI areas — flex structures, flags, modal state     |

`Controller` also provides convenience methods: `notify()`, `alert()`, `confirm()`.

The `Controller` is created by `<OneputController>` (a Svelte component) which manages reactive state via `OneputProps` and passes the controller to consumers via a `run` callback.

## AppObject

COMMENT: we initially just had ctl.app.run which pushes the current AppObject onto the stack, making it a parent, and the newly running AppObject the child. ctl.app.replace allows us to launch different AppObject's without using a stack or forcing parent/child relationship. This allows us to route or use a state machine to control what happens. If an AppObject calls ctl.app.run however, we go into "stack mode" and we have to exhaust the stack before we go back to "routed" mode.

`ctl.app.replace(app)` exits the current app and starts its replacement without pushing a parent. Existing parents stay on the stack. `ctl.app.setOnRootExit(handler)` registers a controller-level handler that runs after a parentless app exits. It receives `{ app, payload }` and can select the next main screen. `exit()` with no parent calls this callback to let the controller choose what comes next. `replace(nextApp)` already specifies what comes next, so it starts `nextApp` directly without calling the callback. The callback stays registered when an app starts, is replaced, or resumes. Pass `undefined` to remove it. Back is available at the root when this handler is set and `enableGoBack` is true.

`routeApp(ctl, source, appFor, key?)` (`shared/routing/routeApp.ts`) connects any source
with `get()` and `subscribe(onChange)` to AppObjects. The first routed AppObject
replaces the caller (the current AppObject, if any), so it is the root when the
caller was the root. Changes to the route key (default: the source value,
compared with `Object.is`) also use `replace`. Routed AppObjects should not
call `exit`; the machine decides the flow. An `exit()` (or Back) from a routed
root is a root exit: routeApp stops, and Oneput calls the `setOnRootExit`
handler, where the app can tell its machine. routeApp does not register that
handler. While a child is current,
the latest source value waits until `app-change` reports a resumed route. The
router checks `isCurrent` before replacement and `contains` for stack membership.
When its route leaves the stack, both subscriptions stop. The returned `stop()`
can detach the router without changing the stack. No machine or signal library
is required.

`routeMachine(ctl, actor, apps)` (`shared/routing/xstate/routeMachine.ts`) adapts an XState actor to `routeApp`. `apps` has the shape of the machine: an entry is a function that makes the AppObject for a state and its children, or a map of child states. `findApp` walks the state value and the map together; the path it walked (for example `form.confirm`) is the route key. It declares the XState shapes it reads, so Oneput does not depend on XState.

An `AppObject` (`types.ts`) represents a screen or state in the app. AppObjects form a stack managed by `AppController` — you `run()` a new one to push it, `exit()` to pop back. If `exit` / `closeAndExit` runs while the menu is closing, pop waits for the menu outro (`onoutroend`) so parent chrome does not change while the panel is still visible. If the menu is already closed, pop is immediate.

```
interface AppObject {
  layout?                — layout factory and params applied before start/resume
  settings?              — UIFlags applied on start
  onStart()              — called when this AppObject takes control
  onResume?(result?)     — called when a child exits back to this one
  onExit?()              — cleanup when this AppObject exits
  actions?               — actions with optional key bindings
  menu?                  — declarative menu items
}
```

**Input claims.** `InputController.openScope()` / `claim()` give exclusive
semantic ownership of typed input. `claim({ release })` declares when the claim
ends (Back, menu focus leave, owner row removed); closing the AppObject scope
always releases. On menu focus, `AppController` releases claims that leave their
owner, then runs `MenuItem.onFocus`, then `AppObject.onMenuItemFocus`. Raw
`input-change` still broadcasts; AppObject `onInputChange` is skipped while a
claim is active. Two LIVE_EDIT coordinators in `shared/behaviors/liveEdit/`
share `liveEditClaim.ts`: `MenuLiveEdit` (claim on activate) and
`FocusedMenuLiveEdit` (claim on focus).

**Layout** is inherited through the AppObject stack. A root AppObject can provide
`layout: { layout: (ctl, params) => UILayout, params }`; child AppObjects can
omit `layout.layout` to reuse the active parent layout, and provide `{ params }`
to configure the inherited layout before `onStart` / `onResume`. Use
`ctl.ui.update({ params })` for later layout changes during the life of the
AppObject (merged into current settings). When an AppObject becomes current,
`runBefore` applies its declared params with `replace: true` so mid-flight
child params (e.g. menu footer) do not stick on resume. Handle UI flags
separately with `ctl.ui.update({ flags })`.

When a child exits, `onResume` runs only if the parent defines it. There is no
fallback to `onStart`. Declared settings, layout, menu, and actions are still
restored by the controller.

**Actions** let an AppObject declare bindings alongside the action handler. The `binding` field uses `ActionBinding` (no `action` callback — the action is the sibling field):

```ts
actions = {
  EDIT: {
    action: () => { ... },
    binding: {
      bindings: ['enter'],
      description: 'Edit',
      when: { menuOpen: false }
    }
  }
};
```

When an AppObject starts, `AppController.runBefore()` extracts bindings from `actions` and registers them with `KeysController`.

## Bindings System

Key bindings map keyboard shortcuts to actions. The system has several layers:

### Types (`lib/bindings.ts`)

- **`KeyBinding`** — the primary representation: `action`, `description`, `bindings` (tinykeys format strings), and `when` conditions
- **`ActionBinding`** — same as `KeyBinding` but without `action` (used in `AppObject.actions`)
- **`KeyBindingMap`** — dictionary of `actionId → KeyBinding`
- **`when.menuOpen`** — `true` = only when menu is open, `false` = only when closed, `undefined` = always active

### Dispatch (`controllers/KeysController.ts`)

`KeysController` maintains default bindings and current bindings. When bindings are set:

1. All bindings are registered on a single target (`window`) via one tinykeys call
2. When the same key string is bound to multiple actions under different `when` conditions, candidates are collected per key
3. At dispatch time, `matchesWhen()` selects the candidate whose `when` conditions match the current system state (e.g. menu open/closed)

To add more `when` flags in future, extend `matchesWhen()` and validate at registration time that no two candidates for the same key have overlapping conditions.

### Defaults and overrides

- **Default bindings** — set by the layout, restored when an AppObject exits
- **Current bindings** — can be temporarily overridden (e.g., Alert sets just an "OK" binding)
- `resetBindings()` restores defaults

### Validation (`KeyEventBindings` class in `lib/bindings.ts`)

`KeyEventBindings` handles add/remove/find operations and duplicate detection. Internally converts between tinykeys format strings and `KeyEvent` objects for easier comparison. Handles platform differences (macOS `$mod` = Meta, others = Control).

### Persistence (`shared/bindings/`)

- **`BindingsIDB`** — stores serialized bindings in IndexedDB
- **`LocalBindingsService`** — applies stored binding overrides to the Oneput action provider and sets them on the controller
- **`BindingsEditor`** — AppObject that lets users add/remove bindings via the Oneput menu interface

### Default bindings (`shared/actions/OneputActionProvider.ts`)

Provides the standard set of bindings: open/close menu, navigate items, submit, fill, back, etc. Each declares its `when.menuOpen` condition.

## UI System

Oneput's visual structure is a flex-based skeleton with named areas:

```
.oneput__container
  .oneput__menu-area        — dropdown menu (header, items, footer)
  .oneput__inner-area       — content between menu and input (e.g., status bar)
  .oneput__input-area       — input with left/right slots
  .oneput__outer-area       — content below input
```

Content is injected via `FlexParams` and `FChildParams` data structures that describe flex layouts declaratively. The `UILayout` interface lets you define the layout for all areas.

`replaceMenuUI` temporarily replaces the menu area (used by Alert, Confirm).
It swaps view only — it is not **MenuLike** (no focus / filter / activate
contract). See `docs/CONCEPTS.md`.

## Event System

`InternalEventEmitter` (`controllers/InternalEventEmitter.ts`) provides decoupled pub-sub communication between controllers. Key events:

- `bindings-change` — when key bindings are updated
- `input-change` — when the input value changes, carrying before/after value and range snapshots so consumers can reason about the edit transition
- `menu-open-change` — when menu opens/closes
- `menu-item-focus` — when focused menu item changes, with menu id and
  `MenuItemFocusCause` (`keyboard` | `pointer` | `open` | `filter` |
  `invalidate` | `programmatic`)
- `menu-action` — when a menu action fires
- `set-menu-items` — after displayed menu rows and synthetic focus are resolved, with the outer update cause
- `selection-change` — when input selection state changes
