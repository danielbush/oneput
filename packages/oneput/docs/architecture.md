# Oneput Architecture

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

An `AppObject` (`types.ts`) represents a screen or state in the app. AppObjects form a stack managed by `AppController` — you `run()` a new one to push it, `exit()` to pop back.

```
interface AppObject {
  onStart()              — called when this AppObject takes control
  onResume?(result?)     — called when a child exits back to this one
  onExit?()              — cleanup when this AppObject exits
  actions?               — actions with optional key bindings
  menu?                  — declarative menu items
}
```

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
- **`LocalBindingsService`** — merges stored bindings with default actions and sets them on the controller
- **`BindingsEditor`** — AppObject that lets users add/remove bindings via the Oneput menu interface

### Default bindings (`shared/bindings/defaultBindings.ts`)

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

## Event System

`InternalEventEmitter` (`controllers/InternalEventEmitter.ts`) provides decoupled pub-sub communication between controllers. Key events:

- `bindings-change` — when key bindings are updated
- `input-change` — when the input value changes, carrying before/after value and range snapshots so consumers can reason about the edit transition
- `menu-open-change` — when menu opens/closes
- `menu-item-focus` — when focused menu item changes
- `menu-action` — when a menu action fires
- `set-menu-items` — when menu items are set
- `selection-change` — when input selection state changes
