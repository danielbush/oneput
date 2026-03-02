PROBLEM: at the moment, Oneput (packages/oneput) has local and global bindings.  Local bindings apply wwhen oneput's menu is open and often includes bindings to move the menu item focus up and down etc.  Global bindings apply when it's closed.  The code currently handles this using a boolean, usually called `isLocal`.  The keys controller (packages/oneput/src/lib/oneput/controllers/KeysController.ts) sets bindings using setBindings(keyBindingsMap, isLocal) and also can set default bindings (which apply when no other bindings are set) setDefaultBindings(keyBindingsMap, isLocal).  We want to remove this isLocal flag and instead set a flag on the binding.  This means that the type KeyBinding in packages/oneput/src/lib/oneput/lib/bindings.ts becomes:

```ts
export type KeyBinding = {
  action?: (c: Controller) => void;
  description: string;
  bindings: string[];
  when: {
    menuOpen?: boolean
  }
};
```

When `menuOpen` is not set, the binding should apply all the time.


Be aware of the type AppObject.actions , this is a new attribute that hasn't been completely set up yet in the code.  It's shape should be:

```ts
{
  description: string;
  bindings: string[];
  when: {
    menuOpen?: boolean
  }

}
```

with the `action`.  This allows packages/oneput/src/lib/oneput/controllers/AppController.ts to call setBindings (in KeysController) on actions that set a binding.  Atm the type for `AppObject['actions']['binding']` is borrowing from `KeyBinding` but is slightly different.  KeyBinding is the final format we use to set bindings.  `AppObject['actions']['binding]` specifies just the binding information for actions (actions may or may not have bindings when defined in the AppObject).

This affects

- apps/oneput-demo
- apps/jsed-demo
- packages/oneput
