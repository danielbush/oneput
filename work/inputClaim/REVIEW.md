> One thing I'd like to do is be able to put live menu items in a catalog eg here is an example of a catalog [IdableCatalog.ts](apps/app/src/lib/oneput/lib/IdableCatalog.ts) - the idea is to list actions; some actions support a menuItem; the approach above requires both a menu item and a field behaviors .  How would it work?

The `AppObject` should not list the behavior separately. A live-edit catalog entry should declare that it requires `MixedMenuLiveEdit`, and Oneput should install that requirement automatically.

I would treat this as dependency propagation:

```text
Catalog entry
├─ action
├─ optional menu item
└─ required behaviors

AppController
└─ installs the union of required behaviors
```

### Catalog shape

Create one stable `MixedMenuLiveEdit` for the catalog. Each live-edit field uses that instance:

```typescript
function getEntries(
  ctx: IdableCatalogContext,
  liveEdit: MixedMenuLiveEdit
): CatalogEntries {
  const editTitle = liveEdit.field({
    id: 'EDIT_TITLE',
    value: {
      read: () => ctx.sessions.getTitle(),
      write: (value) => ctx.sessions.setTitle(value)
    },
    placeholder: 'Edit title...'
  });

  return {
    EDIT_TITLE: {
      description: 'Edit title',
      action: editTitle.activate,
      requires: [liveEdit],

      menuItem: ({ action }) =>
        editTitle.menuItem({
          action,
          render: ({ value, editing }) =>
            stdMenuItem({
              id: 'EDIT_TITLE',
              textContent: `Title: ${value || '—'}`,
              bottom: {
                textContent: editing
                  ? 'Editing.'
                  : 'Activate to edit.'
              }
            })
        })
    }
  };
}
```

`field()` is important. It gives the action and menu item one stable field identity:

```typescript
type LiveEditField = {
  activate: () => void;

  menuItem: (options: {
    action: () => void;
    render: LiveEditRender;
  }) => MenuItem;
};
```

The catalog action and menu action are then the same operation: toggle the field’s claim. `MixedMenuLiveEdit.item()` currently hides that action inside the resulting row. For catalog use, I would expose the field first.

### Behavior requirements

Add a general requirement to catalog entries:

```typescript
type ActionCatalogEntry = {
  description: string;
  action: AppActionHandler;
  menuItem?: ...;
  requires?: readonly AppObjectBehavior[];
};
```

Preserve that requirement on produced actions and menu items:

```typescript
type AppAction = {
  action: AppActionHandler;
  binding?: ActionBinding;
  requires?: readonly AppObjectBehavior[];
};

type MenuItem = {
  // Existing properties...
  requires?: readonly AppObjectBehavior[];
};
```

I prefer `requires` over `behaviors`. The catalog does not own or install the behavior. It only declares a dependency.

### AppController behavior host

`AppController` should reconcile the union of:

- Behaviors declared by `AppObject.behaviors`.
- Behaviors required by active actions.
- Behaviors required by base menu items.

It should deduplicate them by object identity:

```typescript
requiredBehaviors = union(
  appObject.behaviors,
  actionRequirements,
  baseMenuItemRequirements
);
```

The controller then attaches newly required behaviors and detaches behaviors that are no longer required.

Use the base menu, not the filtered displayed menu. Filtering a row out must not detach its behavior as a side effect.

If the last live-edit row disappears while it owns a claim, detaching `MixedMenuLiveEdit` must release that claim:

```typescript
detach() {
  this.active?.claim.release('behavior-detached');
  this.context = undefined;
}
```

The current implementation clears `active` without first releasing it, so that detail would need attention.

### AppObject usage

The consuming `AppObject` remains unchanged:

```typescript
actions = () => this.catalog.getActions();

menu = () => ({
  id: 'editor',
  items: this.catalog.getMenuItems([
    IdableAction.EDIT_TITLE,
    IdableAction.TOGGLE_THEME
  ])
});
```

There is no `behaviors` field. Including the catalog action or row brings its requirements with it.

One final contract needs a decision: what happens when a key binding invokes a live-edit action while its row is not in the current menu? I would require `activate()` to ensure that the menu is open and the row exists before it claims the input. Otherwise the user can enter an invisible edit mode. If a field cannot meet that contract, it should be a menu-only contribution and not a general bound action.

This is the proper direction, in my view: catalog entries become self-contained application capabilities, while `AppController` remains the sole owner of lifecycle installation and teardown.

---

> any change to inline (non-catalogued) behaviors?

Yes, but only for menu-bound behaviors such as `MixedMenuLiveEdit`.

An inline live-edit menu would no longer need this:

```typescript
behaviors = [this.liveEdit];
```

`liveEdit.item()` and `liveEdit.bind()` would add their requirement to the returned menu item:

```typescript
bind(item: MenuItem, binding: LiveEditBinding): MenuItem {
  return {
    ...item,
    requires: [...(item.requires ?? []), this],
    action: () => this.toggle(item.id, binding)
  };
}
```

The demo becomes:

```typescript
private readonly liveEdit = MixedMenuLiveEdit.create(this.ctl);

menu = () => ({
  items: [
    this.liveEdit.item({
      id: 'name',
      value: {
        read: () => this.values.name,
        write: (value) => {
          this.values.name = value;
        }
      },
      render: ({ value, editing }) =>
        stdMenuItem({
          id: 'name',
          textContent: `Name: ${value}`,
          bottom: {
            textContent: editing ? 'Editing.' : 'Activate to edit.'
          }
        })
    })
  ]
});
```

I would keep `AppObject.behaviors` for app-wide behaviors:

```typescript
behaviors = [
  closeOnExternalDisconnect,
  preserveCanvasSelection,
  interceptEscape
];
```

The distinction would be:

- A behavior required by a menu item travels with that item.
- A behavior required by the whole `AppObject` stays in `AppObject.behaviors`.
- A catalog action can also carry a requirement when it must work without its menu item.

The controller deduplicates requirements, so explicitly declaring the same behavior remains safe during migration. However, I would document one preferred source for each behavior. `MixedMenuLiveEdit` should normally come from its items, not from `AppObject.behaviors`.

The only meaningful timing difference is that item-required behaviors attach when the base menu is built. App-wide behaviors attach before `onStart`. Therefore, a behavior needed during `onStart` must remain explicit. `MixedMenuLiveEdit` does not appear to need that early attachment.