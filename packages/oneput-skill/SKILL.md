---
name: oneput
description: "Guide for building Oneput command-bar interfaces. Use when creating AppObjects, declaring key bindings with when conditions, building menus with stdMenuItem, defining UI layouts with Flex/FChild, or wiring up the Controller. Covers the AppObject lifecycle, bindings system, menu system, and UI areas."
---

# Building Oneput Interfaces

## Overview

Oneput is a command-bar UI system — an input with a dropdown menu for building shell-like interfaces in web apps. This skill teaches the patterns for building with it.

The main building blocks:

- **Controller** — the central API; composes sub-controllers for keys, menu, input, ui, app
- **AppObject** — a screen or state in a navigable stack
- **Bindings** — keyboard shortcuts with `when` conditions
- **Menu items** — built with `stdMenuItem` and friends
- **UI layout** — flex-based skeleton with named areas

## AppObject Pattern

An AppObject represents a screen. AppObjects form a stack — `ctl.app.run()` pushes, `ctl.app.exit()` pops.

```typescript
import type { AppObject, Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';

export class MyScreen implements AppObject {
  static create(ctl: Controller) {
    return new MyScreen(ctl);
  }

  constructor(private ctl: Controller) {}

  onStart = () => {
    this.ctl.ui.update({ params: { menuTitle: 'My Screen' } });
  };

  // Optional: called when a child AppObject exits back to this one.
  onResume = (result?: { payload?: unknown }) => {};

  // Optional: cleanup when this AppObject exits.
  onExit = () => {};

  // Declare actions with optional key bindings.
  actions = {
    DO_THING: {
      action: (ctl: Controller) => { /* ... */ },
      binding: {
        bindings: ['$mod+d'],
        description: 'Do the thing',
        when: { menuOpen: false }
      }
    }
  };

  // Declarative menu — the system calls setMenu for you.
  menu = {
    id: 'main',
    items: [
      stdMenuItem({
        id: 'do-thing',
        textContent: 'Do the thing...',
        left: (b) => [b.icon('SomeIcon')],
        action: () => { /* ... */ }
      })
    ]
  };
}
```

### Lifecycle

1. `onStart()` — called when the AppObject takes control
2. `onResume(result?)` — called when a child exits back to this one; if not implemented, `onStart` is called instead
3. `onExit()` — cleanup when this AppObject exits

### Navigation

```typescript
// Push a new AppObject onto the stack
ctl.app.run(ChildScreen.create(ctl));

// Pop back (child returns to parent)
ctl.app.exit();
ctl.app.exit({ payload: someData }); // with data

// Override the back action
ctl.app.setOnBack(() => { /* custom back */ });

// Trigger back
ctl.app.goBack();
```

## Bindings Pattern

Each binding declares `when` conditions controlling when it fires.

### `when.menuOpen`

- `true` — only active when menu is open
- `false` — only active when menu is closed
- `undefined` (or omitted) — always active

### Types

```typescript
// Full binding with action callback (used by KeysController)
type KeyBinding = {
  action?: (c: Controller) => void;
  description: string;
  bindings: string[];       // tinykeys format: "$mod+Shift+k", "Enter"
  when?: { menuOpen?: boolean };
};

// Binding info without action (used in AppObject.actions)
type ActionBinding = {
  description: string;
  bindings: string[];
  when?: { menuOpen?: boolean };
};

// Dictionary of actionId → KeyBinding
type KeyBindingMap = { [actionId: string]: KeyBinding };
```

### Setting bindings

```typescript
// Set default bindings (restored on AppObject exit)
ctl.keys.setDefaultBindings(bindings);

// Merge additional bindings with defaults (for AppObject actions).
// Default bindings (menu nav, open/close, etc.) remain active.
// Warns if an action ID conflicts with a default.
ctl.keys.setBindings(bindings);

// Fully replace all bindings — defaults are NOT included.
// Returns a callback that restores the previous bindings.
// Use for modals (Alert/Confirm) that need exclusive key control.
const restore = ctl.keys.replaceBindings(modalBindings);
restore(); // restores previous bindings

// Restore to just the defaults
ctl.keys.resetBindings();
```

### Declaring via AppObject.actions

The preferred way. Bindings are automatically registered when the AppObject starts:

```typescript
actions = {
  NAVIGATE_DOWN: {
    action: (ctl) => { /* ... */ },
    binding: {
      bindings: ['$mod+j', 'ArrowDown'],
      description: 'Navigate down',
      when: { menuOpen: false }
    }
  }
};
```

The same key can be bound to different actions under different `when` conditions. For example, `$mod+j` navigates down when the menu is closed but focuses the next menu item when it's open.

## Menu Pattern

### stdMenuItem

The main menu item builder. Supports left/right/bottom sections via `FlexChildBuilder`.

```typescript
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';

stdMenuItem({
  id: 'my-item',
  textContent: 'Main label',

  // Left section (usually an icon)
  left: (b) => [b.icon('IconName')],

  // Right section (badges, icons, etc.)
  right: (b) => [
    b.fchild({
      htmlContentUnsafe: '<code><kbd>$mod+S</kbd></code>',
      classes: ['oneput__kbd']
    }),
    b.icon('ChevronRight')
  ],

  // Optional bottom section (secondary text)
  bottom: {
    textContent: 'Additional info'
  },

  // Action when selected
  action: () => { /* ... */ }
});
```

### FlexChildBuilder methods

The `b` parameter in `left`, `right`, and `bottom` builders:

- `b.icon(name)` — render a registered icon
- `b.fchild({ textContent, htmlContentUnsafe, classes, ... })` — general flex child
- `b.iconButton(name, { title, onClick })` — clickable icon
- `b.button({ title, onClick })` — text button
- `b.spacer()` — invisible spacer

Pass `false` as an array element to conditionally exclude items:

```typescript
right: (b) => [
  count > 1 && b.fchild({ innerHTMLUnsafe: `(${count})` }),
  b.icon('ChevronRight')
]
```

### Other menu item types

```typescript
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { infoMenuItem } from '@oneput/oneput/shared/ui/menuItems/infoMenuItem.js';

// Checkbox with label
checkboxMenuItem({
  id: 'toggle',
  textContent: 'Enable feature',
  checked: false,
  action: (_, checked) => { /* ... */ }
});

// Non-interactive info display
infoMenuItem({ id: 'info', msg: 'Status message', icon: 'Info' });
```

### Setting menus programmatically

```typescript
ctl.menu.setMenu({
  id: 'my-menu',
  focusBehaviour: 'first',  // 'first' | 'last' | 'none' | 'last-action,first'
  items: [ /* ... */ ]
});

ctl.menu.openMenu();
ctl.menu.closeMenu();
```

## Controller Sub-controllers

```typescript
// Menu
ctl.menu.openMenu()
ctl.menu.closeMenu()
ctl.menu.setMenu({ id, items, focusBehaviour? })
ctl.menu.focusNextMenuItem()
ctl.menu.focusPreviousMenuItem()
ctl.menu.doMenuAction()

// Input
ctl.input.setInputValue(val)
ctl.input.getInputValue()
ctl.input.setPlaceholder(msg?)
ctl.input.focusInput()
ctl.input.runSubmitHandler()

// Keys
ctl.keys.setDefaultBindings(bindings)
ctl.keys.setBindings(bindings)       // merges with defaults
ctl.keys.replaceBindings(bindings)   // full replace (modals), returns restore callback
ctl.keys.resetBindings()
ctl.keys.getDefaultBindings()
ctl.keys.getCurrentBindings()

// UI
ctl.ui.update({ params?, flags? })
ctl.ui.setInputUI({ left?, right?, outerLeft?, outerRight? })

// App
ctl.app.run(appObject)
ctl.app.exit(result?)
ctl.app.goBack()
ctl.app.setOnBack(fn)

// Convenience
ctl.notify(message, { duration? })
ctl.alert({ message, additional })
ctl.confirm({ message, additional? })
```

## UI Layout

Oneput's visual structure is a flex-based skeleton:

```
.oneput__container
  .oneput__menu-area        — dropdown menu (header, items, footer)
  .oneput__inner-area       — content between menu and input
  .oneput__input-area       — input with left/right slots
  .oneput__outer-area       — content below input
```

### Updating layout

```typescript
ctl.ui.update({
  params: { menuTitle: 'Title' },
  flags: {
    enableModal: true,        // show modal overlay
    enableKeys: true,         // enable/disable key dispatch
    enableMenuOpenClose: true  // enable/disable menu toggle
  }
});
```

### Input UI slots

```typescript
ctl.ui.setInputUI({
  right: hflex({
    id: 'input-right',
    children: (b) => [
      b.fchild({ onMount: (node) => { /* mount component */ } })
    ]
  })
});
```

## Key Source Files

For deeper detail, read the source:

- **Types**: `packages/oneput/src/lib/oneput/types.ts` — `AppObject`, `FlexParams`, `FChildParams`, `MenuItem`
- **Bindings**: `packages/oneput/src/lib/oneput/lib/bindings.ts` — `KeyBinding`, `ActionBinding`, `KeyEventBindings`
- **Controller**: `packages/oneput/src/lib/oneput/controllers/controller.ts`
- **KeysController**: `packages/oneput/src/lib/oneput/controllers/KeysController.ts`
- **AppController**: `packages/oneput/src/lib/oneput/controllers/AppController.ts`
- **stdMenuItem**: `packages/oneput/src/lib/oneput/shared/ui/menuItems/stdMenuItem.ts`
- **Builder**: `packages/oneput/src/lib/oneput/lib/builder.ts` — `FlexChildBuilder`, `hflex`, `vflex`
- **Default bindings**: `packages/oneput/src/lib/oneput/shared/bindings/defaultBindings.ts`
- **Architecture**: `packages/oneput/docs/architecture.md`
