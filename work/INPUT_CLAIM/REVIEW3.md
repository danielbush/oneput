
Implemented a LIVE_EDIT for /Users/danb/projects/@oneput/apps/oneput-demo/src/lib/app/liveEdit/LiveEditWholeMenu.ts

I would make this a distinct `FOCUSED_LIVE_EDIT` pattern. A row claims the input when it receives menu focus. It does not claim during `menu()` construction, and it does not need an action.

This is the claim-based replacement for [LiveEditWholeMenu.ts](/Users/danb/projects/@oneput/apps/oneput-demo/src/lib/app/liveEdit/LiveEditWholeMenu.ts).

## Recommended contract

Add a narrow focus hook to `MenuItem`:

```typescript
type MenuItemFocusCause =
  | 'keyboard'
  | 'pointer'
  | 'open'
  | 'filter'
  | 'invalidate'
  | 'programmatic';

type MenuItem = {
  // Existing fields...
  onFocus?: (
    ctl: Controller,
    context: { cause: MenuItemFocusCause }
  ) => void;
};
```

A `FocusedMenuLiveEdit` helper would add that hook:

```typescript
this.liveEdit.item({
  id: 'name',
  value: {
    read: () => this.values.name,
    write: (value) => {
      this.values.name = value;
    }
  },
  placeholder: 'Edit name...',
  render: ({ value, editing }) =>
    stdMenuItem({
      id: 'name',
      textContent: `Name: ${value || '—'}`,
      bottom: {
        textContent: editing
          ? 'Editing.'
          : 'Move focus here to edit.'
      }
    })
});
```

Conceptually, the produced item contains:

```typescript
{
  ...rendered,
  id,
  tag: 'button',

  onFocus: () => {
    liveEdit.claim(id, binding);
  }
}
```

The controller order should be:

```typescript
handleMenuItemFocus(data) {
  // Release the previous row’s claim when necessary.
  this.ctl.input.handleMenuItemFocus(data);

  // Let the newly focused row claim the input.
  data.menuItem?.onFocus?.(this.ctl, {
    cause: data.cause
  });

  this.current?.onMenuItemFocus?.(data);
}
```

Moving from row A to row B then performs an atomic handover:

```text
focus leaves A
  → A claim releases
  → previous input owner resumes briefly
focus enters B
  → B takes a claim
  → B value is displayed and selected
```

The helper must make claiming the current row idempotent. Menu invalidation can report the same focused row again:

```typescript
private claim(itemId: string, binding: LiveEditBinding) {
  if (this.active?.itemId === itemId) {
    return;
  }

  this.active?.claim.release('replaced');

  const claim = this.ctl.input.claim({
    owner: { type: 'menu-item', itemId },
    value: binding.value,
    placeholder: binding.placeholder,
    select: 'all',
    release: {
      back: 'release-and-handle',
      menuFocusLeavesOwner: true,
      ownerRemoved: true
    },
    onRelease: () => {
      if (this.active?.claim === claim) {
        this.active = undefined;
      }
    }
  });

  this.active = { itemId, claim };
}
```

## Important UX constraint

I recommend this pattern when filtering is disabled and most or all focusable rows are editable:

```typescript
settings = {
  enableFilter: false
};
```

Using claim-on-focus in a filtered mixed menu is hazardous:

- Opening the menu can focus an editable row and immediately replace the filter input.
- Filtering can move focus onto an editable row while the user is typing.
- Pointer hover can unexpectedly start editing.
- An invalidation can appear to re-enter editing.

For a mixed filtered menu, activation-based [MixedMenuLiveEdit.ts](/Users/danb/projects/@oneput/packages/oneput/src/lib/oneput/shared/behaviors/MixedMenuLiveEdit.ts) remains the safer pattern.

If immediate editing is required in a mixed menu, use `cause` to accept only deliberate keyboard navigation:

```typescript
onFocus: (_ctl, { cause }) => {
  if (cause === 'keyboard') {
    this.claim(id, binding);
  }
}
```

Pointer activation can continue to use the existing action path. Do not claim on `open`, `filter`, or `invalidate`.

## Catalog use

Because `onFocus` travels with the menu item, catalog use remains simple:

```typescript
menuItem: () =>
  focusedLiveEdit.item({
    id: 'EDIT_TITLE',
    value,
    render
  });
```

The consuming `AppObject` needs no hooks or extra fields.

I would therefore have two public coordinators that share an internal claim builder:

- `MixedMenuLiveEdit`: claim on activation; suitable for filtered mixed menus.
- `FocusedMenuLiveEdit`: claim on deliberate focus; suitable for whole editable menus.

I would not add a `claimOn: 'activate' | 'focus'` flag to the existing class. The two patterns have different filtering rules and different safe defaults, so separate names make misuse easier to detect.