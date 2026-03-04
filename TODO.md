PROBLEM

packages/oneput/src/lib/oneput/controllers/KeysController.ts has a concept of default bindings.  Until now, they are bindings that are present and enabled at the very start but can be replaced by calling setBindings.  When oneput resets everything before running a new AppObject, it will reset the bindings which will reinstate the default bindings.

What we want to do instead is have the default bindings be present all the time.  These bindings are for common actions like navigating the menu, opening/closing the menu etc.

When an AppObject sets its own bindings, these should be in addition to the default bindings.  If the AppObject sets a binding that conflicts with a  default binding, have the console log a warning but allow the binding to override the default binding.  When bindings are reset, the default bindings should remain intact.
