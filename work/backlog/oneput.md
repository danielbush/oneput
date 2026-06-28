# Backlog: packages/oneput

The following are potential work (tickets for work) sorted by priority: earlier tickets take precendence over later ones.  Extract the next ticket from the top, and convert it into a spec, and draft a plan based on the initial proposal.

## Critical path

- directory browser
  - oneput lets us select folders and go into them
  - select a file, go into a menu with actions; the actions may be asynchronous, maybe we close the menu and show notifcation: working..., then replace with a new notfication: action completed
- talk to hermes
  - COMMENT: once 2br/oneput is running on mobile, this mean we could talk to hermes over it rather than telegram; it means we could ask the agent to make modifications to 2br for us (that would require mcp machinery to safely interact with 2br data)
  - how to store conversations?
    - something "2br adjacent"

## fix

- fix: is katex display mode working when we insert?
- fix: notifications (and probably alerts, confirms) bottom edge has square corners and oneput container has rounded (when the oneput menu is closed)
  - COMMENT: add visual demos for notification when menu is closed
- fix: `$mod+v a` types `a` into input
  - COMMENT: detect if we're in a tinykeys intermediate state and disable the input?
  - COMMENT: blur input focus if we detect any key that has a modifier
- fix: `$mod+v` pastes into input
- fix/feat: layouts for things like `PasteElementUI` or  `PickListUI` 
  - fix: search for "jsed-demo" in jsed/src
  - fix: search for "LayoutSettings" in jsed/src
  - COMMENT: we run it as an AppObject but it provides lots of hooks
    - ```
      PasteElementUI.create({
        onRenderMenuItem: (...) => {...} // default to stdMenuItem
        onLayoutChange: (ctl, { actions, menuTitle }) => { ctl.ui.setLayout(...) }
      })
      ```
  - COMMENT: we run our own AppObject and use helper functions for actions and menu items
- fix: In apps/jsed-demo we had a situation where the open/close menu binding used "$mod+b" and the "go back" binding used "Meta+B".  On a mac, this resulted in both actions happening.  This was particularly confusing because the back binding resulted in a significant change to the bindings themselves but the change wasn't visible to the user, making the user think that opening/closing the menu had broken the bindings when this was not the case.  

## feat

- feat: do we demo disabled individual menu items?
- feat: do we demo disabled menu? (enableMenuActions = false)?
- feat: disable nav/keys when menu is disabled? - enableMenuActions = false
  - COMMENT: assuming we don't, but not sure
- feat: declarative onBack in AppObject
- feat: a mechanism for gettign key bindings
  - COMMENT: this could just be a design that could be used
  - COMMENT: how best to show keybindings relevant to a new app object?
  - COMMENT: how best to show keybindings (global ones) when the menu is closed
- feat: whenEmpty in MenuItemsFn.ts - should it provide a builder ?
- feat: a lifecycle companion object for your AppObject
  - COMMENT: I don't know if this is justified; does it also weaken the point of having things like onExit in AppObject?
  - COMMENT: this would declutter AppObjects and make subscription logic more specific
  - COMMENT: semantics should avoid ambiguity about where we use it; do we run it in onStart or in constructor or make it nullable and run in static create/createNull ?
    - i think ctl.app.lifecycle.add is suggestive of doing it before onStart; although maybe we could handle if run in onStart?  Seems messy
  - ctl.app.lifecycle.add({ onStart, onExit, onSuspend, onResume })
  - onStart(ctx: Ctx) - add subscription,
- feat: add more onX to AppObject
  - COMMENT: complements onEvent; onEvent (our stuff), onX (oneput stuff)
  - it automatically handles start/exit and suspend/resume
  - katex `bindings-change`
  - EditDocumentUI in @2br/web - `menu-open-change`
- feat: disable individual menu items
  - eg pasteBefore, pasteAfter, pasteIn
- feat: filter for global items
  - example?
  - scenario: you have nested menus, you only see the outer entry but you want to filter on the items within as well as the ones showing in the current menu
  - scenario: you have a lot of items, not all necessarily in a menu; you want to bring them up when typing
    - COMMENT: seems a bit weak
  - COMMENT: This could just be an extension of menuItemsFn; possibly we trigger it or we use a default one that just does it; it could be configured to filter on global but show only local entries
  - COMMENT: the issue is how to define "global items"
- feat: implement web components
- feat: notifications should have an optional left icon
  - COMMENT: example: auto-save fails, we should an error icon; next autosave succeeds, we get a recovery icon
- feat: should notifications allow for title + text?
  - COMMENT: example: auto-save, if we fail we might want to say, "Save failed" and then second line, some sort of CTA eg "try saving again"; possible even a link or button to retry
  - COMMENT: if we allow buttons in messages, we could lean on alert or confirm but allow button labels to be customised

## refactor

- refactor: the tick hack in reseedMenu - can we avoid that
  - can we get reseedMenu to pull menu() and apply filter and THEN paint menu items? (more explicitly)
- proper pull model for declarative AppObject.menu
  - ctl.menu.invalidate() signals that menu must be pulled again
  - this only is an issue if the menu is showing, since I think a closed menu will pull from `menu` when opening
  - this gets rid of `renderMenuItems` - we can just define `menu: () => {...}` and have it render based on AppObject state; we call ctl.menu.invalidate() whenever this state changes
  - COMMENT: svelte's reactive model would make this even easier (use `$state` for the state that affects menu rendering) but we don't want oneput to be restricted to svelte
- menuItemsFn takes an optional `whenEmpty`
- refactor: start should only be called once; make onResume required or just don't call anything
- refactor: null input controller backed by happy-dom input element
- refactor: deep modules for packages/oneput 
  - packages/oneput/src/lib/index.ts -> packages/oneput/src/index.ts
  - packages/oneput/src/lib/oneput should go away, it's a redundant (the directory); it's contents should be distributed to either
  - packages/oneput/src/lib/oneput/controllers
    - but move helpers/ subdir into packages/oneput/src/lib
  - packages/oneput/src/lib/oneput/types.ts
  - KeyEventBindings class - extract it from packages/oneput/src/lib/oneput/lib/bindings.ts - it's key to understanding bindings
- refactor: `bindings-change` event can stay, but ideally we just automatically refresh the layout (UILayout) and re-pull menu() so AppObjects don't need to worry about this event but any binding messages in menu , input placeholder etc will just update;
  - example: KatexDemo seems to be testing this because it has a help message that specifies the binding
  - COMMENT: packages/oneput/src/lib/oneput/shared/ui/DynamicPlaceholder.ts is the previous attempt to handle this, any good?

## chore

- docs: need to make ai-docs similar to effect v4
- chore: move skills/oneput/SKILL.md into oneput/AGENTS.md or delete

## defer

- Convert `createActions` and `createMenuItems` to objects (.create)
  - have a `ctl.menu.invalidate()`?
    - menuItems = MenuItems.create(...) could call it
  - COMMENT: I think we should wait for it to be justified; eg we need more control over the structure of menu items maybe because we're injecting items in addition to the ones in createMenuItems