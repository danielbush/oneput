PROBLEM

Instead of using `findKeyConflicts` (in packages/oneput/src/lib/oneput/lib/bindings.ts) to detect conflicts  between `KeyBindingMap`'s I'd prefer we work with the `KeyEventBindings` class.  This class takes a `KeyBindingMap` and converts it to a format that is safer to compare.

So we would have 

```ts
overrides = KeyEventBinding.create(appObjectBindingMap)
finalBindings = KeyEventBinding.create(defaultKeyBindingMap).merge(overrides)
```

We can then access the conflicts to warn about them if we want

```ts
finalBindings.conflicts
```

KeyBindingMap's should be documented a little better.  They can be split into a serializable part that we can persist somewhere allowing users to store their preferred key bindings.  They also use the tinykeys format which is a convenient way to define key bindings.


In addition `registerKeys` in KeysController should also use `KeyEventBindings` class .

```ts
finalBindings = KeyEventBinding.create(appObjectBindingMap)
finalBindings.candidatesByKey
```

Update tests accordingly.
