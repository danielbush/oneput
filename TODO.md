PROBLEM

In apps/jsed-demo/src/lib/oneput/app/EditDocument.ts we have a PREV_TOKEN action that uses $mod+h binding.  This clashes with the default binding in apps/jsed-demo/src/lib/oneput/app/_bindings.ts that hides Oneput.  Make it so that we override the default binding when this happens.  The default binding should still work once we leave this AppObject.  Print a warning to the console when this happens.  Use the bindings library packages/oneput/src/lib/oneput/lib/bindings.ts to encapsulate any checking logic away from the KeysController.
