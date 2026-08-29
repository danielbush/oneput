[LiveEditMixedMenu.ts](/Users/danb/projects/@oneput/apps/oneput-demo/src/lib/app/liveEdit/LiveEditMixedMenu.ts) does not declare `AppObject.behaviors`, but it still uses `AppObjectBehavior` indirectly.

`liveEdit.item()` adds:

```typescript
requires: [liveEdit]
```

`AppController` finds that requirement and calls `liveEdit.attach(...)`. As the code stands, `AppObjectBehavior` cannot simply be removed.

Architecturally, however, I think it can and probably should be removed. Its only implementation is `MixedMenuLiveEdit`, and its responsibilities are all input-claim termination rules:

- Give LIVE_EDIT an `InputScope`.
- Release on Back.
- Release when menu focus moves.
- Release when the item disappears.
- Release when the AppObject suspends or exits.

Those rules can belong to the claim itself.

## Removing `AppObjectBehavior`

I would move claim termination into `InputClaimOptions`:

```typescript
input.claim({
  owner: {
    type: 'menu-item',
    itemId
  },

  value,

  release: {
    back: 'release-and-handle',
    menuFocusLeavesOwner: true,
    ownerRemoved: true
  }
});
```

These names are illustrative. The important contract is:

- `back: 'release-and-handle'` releases the claim and prevents AppObject navigation.
- `menuFocusLeavesOwner` releases when another item receives focus.
- `ownerRemoved` releases when the base menu no longer contains the row.
- Closing the AppObject input scope always releases the claim.

`AppController` would route the events directly:

```typescript
goBack() {
  if (this.ctl.input.handleBack() === 'handled') {
    return;
  }

  // AppObject onBack or stack pop...
}
```

The claim should receive Back before `enableGoBack` is checked. `enableGoBack` controls AppObject navigation. It should not prevent cancellation of a temporary input mode.

Focus would follow the same model:

```typescript
onMenuItemFocus(data) {
  this.ctl.input.handleMenuItemFocus(data);
  this.current?.onMenuItemFocus?.(data);
}
```

The input system would also inspect base-menu updates to detect removal of the owning row.

`MixedMenuLiveEdit` then becomes a normal coordinator:

```typescript
export class MixedMenuLiveEdit {
  private active?: InputClaimHandle;

  private toggle(itemId: string, binding: LiveEditBinding) {
    this.active = this.ctl.input.claim({
      owner: { type: 'menu-item', itemId },
      value: binding.value,
      release: {
        back: 'release-and-handle',
        menuFocusLeavesOwner: true,
        ownerRemoved: true
      },
      onRelease: () => {
        this.active = undefined;
      }
    });
  }
}
```

It would no longer need:

- `implements AppObjectBehavior`
- `attach()` or `detach()`
- `AppObjectBehaviorContext`
- `requires`
- `AppObject.behaviors`
- behavior collection and reconciliation in `AppController`

This also simplifies catalogs. A catalogued live-edit action can claim the active AppObject’s input scope directly. No separate behavior dependency must travel with the action or row.

My conclusion: **do not remove `AppObjectBehavior` from the current implementation without replacement, but redesign claims to own their termination policy and then remove it.** There is no independent behavior use in the repository today, and the interface currently looks like a generic abstraction built around one specific claim use case.