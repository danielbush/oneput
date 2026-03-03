PROBLEM

packages/oneput/src/lib/oneput/shared/appObjects/BindingsEditor.ts doesn't support the when-flag for bindings.

We need to

- (1) show it in the bindings editor
- (2) update the "Add binding..." to allow us to set a flag


(1) I think we can just show it to the right of the menu item that represents an individual binding for a given action; use a style similar to the oneput_kbd .

(2) When we add a binding we need to allow the user to set the flags

- "add binding...." captures the binding
- if the user hits the tick to capture it we go to new menu;
- the new menu shows menuOpen flag set to false by default
- the user can hit enter to toggle the state between true, false, both
- in oneput__std-menu-item-bottom we should have a note saying to toggle by hitting enter
- there should be an
  - ok menu item
  - cancel menu item - binding is cancelled
