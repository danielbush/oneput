# Current

## Facts

- oneput-demo sets keys in _layout.ts but does it from a LocalBindingService
  - LocalBindingsService just uses packages/oneput/src/lib/oneput/shared/bindings/defaultBindings.ts
- jsed-demo sets keys in _layouts.ts but pulls it directly from packages/oneput/src/lib/oneput/shared/bindings/defaultBindings.ts

## OneputControls (actions, bindings, menu)

- Don't override things unnecessarily in EditorControls

- `OneputControls`
  - COMMENT: similar to EditorControls; EditorControls will become this
  - provides api:
    - .getActions - for use with AppObject.actions
    - .getMenu() - for use with AppObject.menu()
    - .add({ ... }) - creates a copy and adds/overrides actions/bindings
    - .filter(['FOO', ...]) - creates a copy restricted to only the ones specified
    - COMMENT: any modification (add/filter) creates a copy; so a child AppObject either uses the parent controls or it ends using its own if it modifies them
    - .keyBindingMap
      - builds keybindings based on actions

- `OneputDefaultControls = OneputControls.create(...).add(...)`
  - just very basic bindings that open menu etc
  - replaces packages/oneput/src/lib/oneput/shared/bindings/defaultBindings.ts
    - oneput-demo
    - jsed-demo
    - 2br apps/web

- re-work `apps/oneput-demo/src/lib/app/_layout.ts` and `Root`
  - bindings service and OneputDefaultControls
- re-work `apps/jsed-demo/src/lib/oneput/app/_layout.ts` and `Root`
  - builds off DemoControls

- `EditorControls = OneputDefaultControls.create().add(...)`

- pass EditorControls to PasteElementUI et al and set actions/bindings this way

## Layout and settings management

- LAYOUT_PROBLEM
  - what:
    - we set layout
    - child app object assumes this
    - child launches another app object that sets some crazy layout
    - it exits
    - what happens to child?
  - solution:
    - Oneput sets a Layout for the AppObject if it doesn't set one using the current layout
    - that way the child will be resumed and the correct layout will also be restored

- configure AppObject
  - onStart / onResume are hooks, but we're just formalising certain core things with more specific hooks
  - layout hook
    - calls setLayout for us
    - verify child AppObjects inherit
    - verify whenw exit, parent's layout is restored (pretty sure)
  - settings hook
    - flags that set defaults for your AppObject
    - things like focusInputOnMenuOpen etc
- fix input focus in demo
  - how do we do it in 2br apps/web?
    - manual in start
    - what about
      - focusInputOnStart
      - focusInputOnMenuOpen
      - clearInputAfterAction
      - clearInputAfterBack
      - where are these set?
        - AppObject
          - settings: { focusInputOnStart: true, ... }
        - or flags?
          - doesn't feel right
        