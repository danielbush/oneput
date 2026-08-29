## Basic idea

An input claim makes input ownership a first-class controller concept. It separates two questions:

1. Who currently owns typed text?
2. What causes that ownership to change?

Today, ownership is implicit. `input-change` is broadcast. The menu filter, generative menu, and current `AppObject` can all react. `MixedLiveEdit` must disable one listener path, update UI flags, replace the input value, and restore everything later.

With claims, input events have one semantic destination:

```text
No claim
  → current AppObject input policy
  → filter, generative menu, or ordinary onInputChange

Active claim
  → claim.onChange
```

Raw input events can still be broadcast for diagnostics and input history. Only the semantic input route becomes exclusive.

A claim could look like this:

```typescript
const claim = ctl.input.claim({
  owner: { menuId: 'node-metadata', itemId: 'node-label' },

  read: () => node.title,

  write: (value) => {
    node.title = value;
    void ctl.menu.invalidate({ focusBehaviour: 'none' });
  },

  placeholder: 'Edit node label...',
  select: 'all'
});
```

Acquiring it would perform one atomic transition:

- Suspend the current input owner.
- Disable its filtering or generation channel.
- Read and display the field value.
- Apply the placeholder and input shape.
- Focus the input.
- Select the value after the DOM update.

The returned handle controls the lifetime:

```typescript
claim.release('back');
claim.release('focus-changed');
claim.release('activated-again');
```

Release would:

- Stop routing changes to the field.
- Restore the previous input owner.
- Restore its placeholder and input shape.
- Restore or clear its query according to policy.
- Re-enable its filtering or generation channel.

I prefer restoring the previous owner’s value. For example, if the user filtered with `lab`, edited the label, and then stopped editing, the filter owner would still contain `lab`. Clearing it should be an explicit product choice:

```typescript
resumePrevious: 'restore' // or 'clear'
```

Claims should be scoped to the current `AppObject`. When that object suspends or exits, the controller releases its claim automatically. The handle should also be idempotent. A stale asynchronous callback must not release a newer claim.

Mixed-menu LIVE_EDIT would sit one level above this primitive:

```text
MixedMenuLiveEdit behavior
├─ editable-row activation → acquire input claim
├─ focus leaves row         → release input claim
├─ activate same row        → release input claim
└─ back                     → release and consume back
```

The claim owns input routing and chrome. The behavior owns menu interaction policy. The `AppObject` only identifies editable rows and supplies `read` and `write` operations.

That produces an API such as:

```typescript
private readonly liveEdit = MixedMenuLiveEdit.create(this.ctl);

behaviors = [this.liveEdit];

menu = () => ({
  id: 'node-metadata',
  items: [
    this.liveEdit.item({
      id: 'node-label',
      value: {
        read: () => this.getNode()?.title ?? '',
        write: (value) => {
          const node = this.getNode();
          if (node) node.title = value;
        }
      },
      placeholder: 'Edit node label...',
      render: ({ value, editing }) =>
        stdMenuItem({
          id: 'node-label',
          textContent: `Label: ${value || '—'}`,
          bottom: {
            textContent: editing ? 'Editing.' : 'Activate to edit.'
          }
        })
    }),

    stdMenuItem({
      id: 'some-normal-action',
      textContent: 'A normal action'
    })
  ]
});
```

A claim does not fully replace the behavior/interceptor idea. It gives that behavior the correct lower-level primitive. Without claims, every future input behavior must manually coordinate flags, values, placeholders, filtering, and cleanup. With claims, an AppObject behavior only decides when ownership begins and ends.

## How does live edit make the claim?

`liveEdit` makes the claim when the user activates an opted-in menu item. The action installed by `liveEdit.item()` or `liveEdit.bind()` is the bridge.

```typescript
const item = this.liveEdit.bind(
  stdMenuItem({
    id: 'node-label',
    textContent: `Label: ${node.title || '—'}`
  }),
  {
    value: {
      read: () => node.title,
      write: (value) => {
        node.title = value;
      }
    },
    placeholder: 'Edit node label...'
  }
);
```

Conceptually, `bind()` does this:

```typescript
bind(item: MenuItem, binding: LiveEditBinding): MenuItem {
  return {
    ...item,
    action: () => this.toggle(item.id, binding)
  };
}
```

When activated, `toggle()` acquires the claim:

```typescript
private toggle(itemId: string, binding: LiveEditBinding) {
  if (this.active?.itemId === itemId) {
    this.active.claim.release('activated-again');
    return;
  }

  this.active?.claim.release('replaced');

  const claim = this.input.claim({
    owner: { type: 'menu-item', itemId },

    value: {
      read: binding.value.read,
      write: (value) => {
        binding.value.write(value);
        void this.ctl.menu.invalidate({
          focusBehaviour: 'none'
        });
      }
    },

    placeholder: binding.placeholder,
    textArea: binding.textArea,
    select: 'all',

    onRelease: () => {
      if (this.active?.claim !== claim) return;

      this.active = undefined;
      void this.ctl.menu.invalidate({
        focusBehaviour: 'none'
      });
    }
  });

  this.active = { itemId, claim };
}
```

The claim handle becomes the editing state. `MixedMenuLiveEdit` does not need a separate `filtering | editing` state machine:

```typescript
get editingItemId() {
  return this.active?.itemId;
}
```

Its behavior hooks only decide when to release that handle:

```typescript
onBack = () => {
  if (!this.active) return 'continue';

  this.active.claim.release('back');
  return 'handled';
};

onMenuItemFocus = ({ menuItem }) => {
  if (this.active && menuItem?.id !== this.active.itemId) {
    this.active.claim.release('focus-changed');
  }
};
```

For correct lifecycle control, I would not give the behavior an unrestricted `InputController`. `AppController` should install each behavior with an AppObject-scoped context:

```typescript
type AppObjectBehaviorContext = {
  input: InputScope;
  menu: MenuController;
};
```

```typescript
interface AppObjectBehavior {
  attach(context: AppObjectBehaviorContext): void;
  detach(): void;
}
```

`InputScope.claim()` creates claims tied to the current `AppObject`. When that object suspends or exits, closing the scope releases every remaining claim. This prevents a stale `MixedMenuLiveEdit` instance from retaining input ownership.

The complete flow is:

```text
AppObject starts
  → AppController gives liveEdit an InputScope

Menu is built
  → liveEdit.bind() wraps selected menu items

Editable item is activated
  → wrapped action calls InputScope.claim()
  → input claim suspends the filter owner
  → field value appears in the input

User types
  → current claim receives the input
  → binding.write() changes the node
  → menu preview is invalidated

Focus moves or Back is pressed
  → liveEdit releases the claim
  → filter owner resumes

AppObject suspends or exits
  → AppController closes InputScope
  → any outstanding claim is released
```

This keeps the layers distinct:

- `InputScope` enforces exclusive ownership and cleanup.
- `MixedMenuLiveEdit` defines activation and release policy.
- The editable menu item supplies domain reads and writes.
- The surrounding `AppObject` remains arbitrary.