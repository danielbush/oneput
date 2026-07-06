# Current

## Outcomes

- EditorABM builds off OneputABM
  - OneputABM
    - menuItem
      - hide Oneput
    - actions
      - open/close menu
      - etc
- getMenuItems need to be coded up statically - see EditorABM.ts
- I think what I was thinking is that an AppObject can take OneputDefaultABM and just filter and extend it using .filter and .add ;
- EditorABM provides a bunch of pre-defined actions/bindings and menu items which a child AppObject might want to filter.
- EditorABM is build off OneputDefaultABM
- EditorABM.getMenuItems needs to filter by action id
- rename
  - EditorControls
  - OneputControls
  - ActionSet
  - CommandSet
- Oneput default menu items: BACK, HIDE_ONEPUT, SUBMIT and EXIT
 



## ABM (actions, bindings, menu)

Current thinking: rename ABM to something like `Controls`, `ActionSet`, or
`CommandSet`. "ABM" implies ownership of a whole menu, which is not quite right.

The cleaner model:

- A controls instance owns the active command set:
  - actions
  - bindings
  - optional static menu item presets keyed by action id
  - `.filter([...])`
  - `.add(...)`
  - `.rebind(...)`
    - allows user bidning preferences to be used after being loaded from a service eg LocalBindingsService
- `.filter([...])` creates a new controls instance and filters all action-owned parts:
  - action disappears
  - binding disappears
  - default menu item preset disappears
- `.add(...)` creates a new controls instance with extra or overridden actions/bindings/menu item presets.
- AppObjects own their menu composition.
  - menu items are coded statically where the UI/state decisions live
  - menu item labels, icons, conditional visibility, confirmation flows, nested pick lists, and state-specific branches stay explicit
- Menu code reads from the active controls instance.
  - if an action was filtered out, menu code can omit that row
  - no generic menu generator tries to infer UI from actions
  - reusable shell rows can come from static presets, e.g. Oneput BACK, HIDE_ONEPUT, SUBMIT, EXIT

Controls are associated with an AppObject; menus are composed by the AppObject
from those controls.

Example shape:

```ts
const controls = EditorControls.create(...)
  .filter([
    JsedAction.ENTER,
    JsedAction.UNDO,
    JsedAction.REDO,
    JsedAction.CUT,
    JsedAction.COPY
  ]);

const actions = controls.getActions();

return [
  editor.focusOps.canCopy() &&
    actions[JsedAction.COPY] &&
    stdMenuItem({
      id: 'COPY_ELEMENT',
      textContent: 'Copy...',
      left: (b) => [b.icon(icons.Copy)],
      action: actions[JsedAction.COPY].action
    })
];
```

Default menu preset shape:

```ts
const controls = OneputDefaultControls
  .filter([OneputAction.BACK, OneputAction.SUBMIT, OneputAction.EXIT])
  .add({
    actions: {
      [JsedAction.COPY]: { action, binding }
    },
    menuItems: {
      [JsedAction.COPY]: ({ action }) =>
        stdMenuItem({
          id: 'COPY_ELEMENT',
          textContent: 'Copy...',
          action
        })
    }
  });

actions = () => controls.getActions();

menu = () => ({
  id: 'my-app-object',
  items: [
    ...controls.getMenuItems([
      OneputAction.BACK,
      OneputAction.SUBMIT,
      OneputAction.EXIT
    ]),
    // hand-authored app rows here
  ]
});
```

Important identity distinction:

- action id = command identity (`JSED__COPY`)
- menu item id = rendered row identity (`COPY_ELEMENT`, `recent-file-123`, etc.)
- they may be the same for simple command rows, but controls should not depend on `menuItem.id === actionId`

This keeps `EditorABM.getMenuItems()` mostly as hand-authored menu UI, but makes it possible for child AppObjects to derive a narrower active action set from `EditorABM` and manually populate menus from that set.
