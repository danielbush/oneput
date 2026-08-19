# Backlog: packages/oneput

The following are potential work (tickets for work) sorted by priority: earlier tickets take precendence over later ones.  Extract the next ticket from the top, and convert it into a spec, and draft a plan based on the initial proposal.

## Critical path

- input folding (for jsed)
  - mock up input folding
- chat interface
  - mock up chat interface
  - COMMENT: once 2br/oneput is running on mobile, this mean we could talk to hermes over it rather than telegram; it means we could ask the agent to make modifications to 2br for us (that would require mcp machinery to safely interact with 2br data)
  - how to store conversations?
    - something "2br adjacent"
- agent help / oneput as mcp
  - ask agent for help via oneput
  - agent can perform actions provided by oneput
    - menu actions
    - binded actions
    - usually these 2 should coincide

## security

- sec: consider a whitelist svelte icon renderer similar to what packages/frame does
  - COMMENT: packages/frame/src/lib/FrameIcons.ts whitelists svg internals (in /Users/danb/projects/@2br )
  - COMMENT: could we do something similar for innerHTMLUnsafe, htmlContentUnsafe ?
- flesh out packages/oneput/docs/SECURITY.md

## fix

- fix: oneput is scaling when I press cmd+`+`/cmd+`-`
- fix: `$mod+v a` types `a` into input
  - COMMENT: detect if we're in a tinykeys intermediate state and disable the input?
  - COMMENT: blur input focus if we detect any key that has a modifier; too hacky?
- fix: after typing in elize, clearing chat, getting a confirmation and cancelling (or clearing), the input is not focused again
  - COMMENT: the issue is, is there a deeper thing we can sure up here or is it just a setting in the elize app
- fix: katex: replace "Insert..." with input right submit
- fix: katex: is display mode inserting katex into html using display mode?
- fix: in elizachat if I tab to the send button (one tab from the input) and hit "enter", nothing happens
  - COMMENT: does it work if we add type="submit" to the button?
  - COMMENT: is "enter" bound to anything? 
  - COMMENT: should eliza use enter for newline in textarea or submit? 
    - I'd say newline and let tab+submit work?
- fix: is katex display mode working when we insert?
- fix: notifications (and probably alerts, confirms) bottom edge has square corners and oneput container has rounded (when the oneput menu is closed)
  - COMMENT: add visual demos for notification when menu is closed
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
- fix: disable window scrolling when menu open
  - example: Pick a file in oneput-demo;
  - COMMENT: I'm fine just to target the default document scroll on documents that exceed the browser viewport; let's not worry about other scrollable elements for now (these might have to respond to a class set by oneput when the menu is open)

## feat

- feat: make toggleMenuItem prettier
  - the toggle values could be an array of text, icons or elements
  - display the current value on the rhs
  - the value on RHS signals to the user that this item is a toggle
- feat: clearInputAfterAction on indiviudal menu items
  - example: we set clearInputAfterAction setting for the AppObject to true; but we have a toggle item that toggles on and off; the user types to filter that item, then hits enter to toggle; in this situation, if the input clears after they hit enter, it feels a little jarring; the focus is retained on the correct item however (which is good).  What to do?
- refactor: AddEntry to use menu() instead of setMenu;
  - COMMENT: this is interesting because we do interesting thins with onMenuItemFocus; we may need to look into menu invalidation
- feat: view keyboard shortcuts
  - make this a keybinding and a global menu item
  - we don't see the global menu item unless we type something like "help keys" or "help shortcuts" etc
  - COMMENT: global menu item won't work with setTime or setDate; these are AppObject's that use the menu area in a non-filtering way; the keybinding would still work;
  - COMMENT: what about typing "?" in oneput launches help global menu appobject from anywhere; for mobile we show a "?" button; th emenu would include item to show keyboard bindings; for mobile we perhpas filter it out although probably not worth the effort
- feat: layout / update / ui unification
  - ctl.ui.update should take `params` and `ui`
  - AppObject.layout should also take `params` and `ui`
    ```
    layout = {
      params: () => ({
        menuTitle: 'Katex Demo',
        inputSend: { run: () => this.insertKatex(), enabled: this.canInsert() }
      }),
      inputUI: (current) => ({ ...current, textArea: { rows: 5 } })
    };
    ```
  - COMMENT:
    - what triggers the re-pull. Today ctl.menu.invalidate() re-pulls menu(); params/chrome would need either their own ctl.ui.invalidate() — and then this demo calls two invalidates per keystroke — or one ctl.invalidate() that re-pulls everything the current AppObject declares. I'd want the latter, but it merges two things that are currently separate, and menu invalidate carries options (focusBehaviour) that make no sense for chrome.
    - Also the same rule as menu() applies: the thunk gets called on every rebuild, so it must be cheap and free of side effects. Worth stating in the type's JSDoc.
    - ctl.ui.update still earns its place for imperative mid-flight patches (BindingsEditor does this), it just stops being the only way to have dynamic params.
- feat: mod+? does replaceMenuUI to show keybindings for desktop users; this is not useful for soft-keyboard users though, so we should try to reasonably distinguish the two and only make it available to desktop (worse case we can have a setting to force desktop-isms to be be shown but that is a separate ticket); we don't need a button to trigger this either because this is not useful in mobile / soft keyboards; docs should say: type mod+?; there should be a menu action we can include in menus: "Show bindings"
  - COMMENT: I'm not sure if we should use replaceUI or just show a new menu; if we use a menu, we could add the ability to not just view bindings but to go into one and edit it; so this makes me think we want to load an AppObject that shows bindings in a nice easy way for the user to see and then optionally allow them to trigger additional actions if the consumer apps wants it
  - COMMENT: later we can extend mod+? to be a general help, maybe agent driven; in this situation we might have a "?" button on the left outside of the input
  - COMMENT: or we make it a general help / settings page; I think we need a quick way to check bindings, no other navigation; maybe `$mod+backtick` ?
- feat: show submit binding to user
  - we tend to use $mod+enter because enter tends to trigger menu actions
  - we want users to be gently reminded when they can sumbit with $mod+enter (or whatever is set)
  - idea: use the bottom right chrome in _layout; it shows the number of menu items; could we have it periodically display the submit binding for several seconds before going back to number of menu items; what does this entail
- feat: use checkbox for "Show dot files" in File Picker / Directory Browser
  - apply this to the one in apps/app
- feat: put notifications into top corner of screen
  - stack multiple notifications?
  - clicking stack should expand it
- feat: how would an agent dynamically create a new AppObject and is this a useful idea?
  - COMMENT: a DynamicAppObject that acts like a DSL?  Could an agent recreate various things in oneput-demo given this DSL?
- feat: Oneput media api tells us (reasonably) if we're mobile, tablet or desktop
  - COMMENT: to what extend is this reactive?
  - COMMENT: Should we lean heavily on responsive css for appearance?
    - that would mean stdMenuItem might be responsive; which might conflict with the way we programmatically control everything at the moment
- feat: Use oneput media api to hide key-centric ui (like showing keybidnigns in menus) in mobile / tablet view
  - this can be overridden maybe in localstorage
- feat: use menu as a calendar where we can select a day or even a range of days
  - COMMENT: do we use menu items or do we just override that with a custom layout? - no, we have both the grid with headings and days within; it would super hacky to bend menu items to do all of this
  - COMMENT: menu items maybe is one example of a way to browser a "command structure" using the familiar j,k or arrow keys with enter/mod+enter for submission
  - COMMENT: start by mocking up the calendar
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
- [?] feat: filter for global items
  - COMMENT
    - this could be implemented with what we have currently?
    - take any example where you think you need "global" for some definition of global, ask yourself, how would we implement it with existing constructs?  (make sure to include mobile which doesn't have key bindings)
  - COMMENT
    - items that belong to the AppObject but we don't want to render all of them; I don't think vscode does this; it shows everything
    - surface deep items
    - surface global items
      - the ability to jump to something from anywhere
      - but do we want to limit it in some situations?
  - example?
  - scenario: you have nested menus, you only see the outer entry but you want to filter on the items within as well as the ones showing in the current menu
  - scenario: you have a lot of items, not all necessarily in a menu; you want to bring them up when typing
  - COMMENT: like vscode
  - COMMENT: This could just be an extension of generative; possibly we trigger it or we use a default one that just does it; it could be configured to filter on global but show only local entries
  - COMMENT: the issue is how to define "global items"
- feat: implement web components
- feat: notifications should have an optional left icon
  - COMMENT: example: auto-save fails, we should an error icon; next autosave succeeds, we get a recovery icon
- feat: should notifications allow for title + text?
  - COMMENT: example: auto-save, if we fail we might want to say, "Save failed" and then second line, some sort of CTA eg "try saving again"; possible even a link or button to retry
  - COMMENT: if we allow buttons in messages, we could lean on alert or confirm but allow button labels to be customised
- feat: an AppObject that allows an agent to create any AppObject
  - COMMENT: allow agents to create standard rich widgets and menu entries
  - COMMENT: so it can be created with all the configurations in place
  - COMMENT: if we're doing this on the fly (live in the browser), we don't want an agent injecting arbitary js, so do we need a dsl?
- feat: global action to switch to chat sessions
  - COMMENT: be able to dial up a chat session from any AppObject?
  - COMMENT: is this an argument to use replaceUI
    - but we lose the ability to have other menu items at all or we have to create the idea of one again; if we do want menu items below the chat, better to stick with the menu system
  - COMMENT: really need a concrete use case so we're not building in the air
  - COMMENT: this could be an AppObject question - how do we allow a global AppObject to subsume things temporarily?
    - we run it; have a keybinding to trigger it; that binding could be maintained globally; some context could be passed if the global AppObject needs it; probably we instantiate, but it could be possible to have a long-lived object that goes into suspend when we exit it

## refactor

- refactor: rename all things "ui" to "chrome"
  - COMMENT: one agent remarked that `ctl.ui.update({ params: ..., ui: ... })` is a bit much
- refactor: the eliza scroll and clear buttons could do with some love
  - COMMENT: should they be both in inner ui?
- refactor: console warn: `Binding "Control+[" on action "JSED__SOFT_EXIT" overrides default action "ONEPUT__EXIT" warn @ client.js?v=dda90c6a:3209` - too many , clutters the console;
  - COMMENT: log it into oneput itself so we can view it?
- refactor: console error: `Binding "Escape" on actions "JSED__CANCEL_VIA_EXIT" overrides non-default action "JSED__SOFT_EXIT"`
  - keep these as console.error's?
  - why are we getting any at all??
- refactor: why do we have both Directory Browser and File Picker; can we just use one?
  - COMMENT: or put the canonical example in shared/ and keep the other in demo if you must
  - COMMENT: I think we were showcasing nested AppObjects in one; I think we can get rid of that one
- refactor: wording: prefer "layout params" instead of "signals"
- refactor: move TimeDisplay and DateDisplay into oneput/shared/ui/widgets or similar?
- refactor/proposal - menu loading / transition
  - BACKGROUND: because FilePicker sometimes wants to take a promise when instantiating and we need to reoslve that before we can show the menu, we have to nail down menu loading
  - A
    - make `resetMenuBeforeStart` options that default to true
    - additionally have ctl.app disable the menu when we exit and before we start the child AppObject; re-enable after onStart?
    - if we invalidate during this time do nothing
    - COMMENT: this gets us so the menu isn't cut down by a reset and it also buys a non-skeleton loader by just disabling the old items
    - .menu is however going to get called by afterRun after calling onStart synchronously
      - A.1 - make onStart async
        - COMMENT: this would work nicely with undisabling the menu only after we async completes and presumably at that point the AppObject can show a menu using .menu
        - COMMENT: if setMenu is called, ctl.app might have to honour it because it might be the child AppObject calling from within the async onStart; if the parent is somehow callig setMenu after being replaced, you have bigger issues, that's a problem the author should fix, preferably use .menu and the pull system.
        - COMMENT: is the reset setting and parent menu disabling combined with this enough to avoid the cut-down issues we had before?
      - A.2 - allow .menu to return void or null to signal not to do anything to the menu
        - COMMENT: I like this; this is almost equivalent to AppObject's that don't use .menu but the system can be invalidted and will pull .menu again
        - COMMENT: we use void return to keep the parent showing, but it will be enabled?
          - ctl.app might have to keep menu disabled if parent menu is still showing and .menu return void
            - COMMENT: not so great, have to try it to see if this is going too far; this could be an argument for waiting on async onStart
- refactor: oneput-demo filepicker uses paint() + setMenu
- refactor(oneput-demo,jsed-demo): uses of .run when .onStart is sufficient
- refactor(oneput-demo,jsed-demo): use of ctl.ui.update({ params }) at onStart
- refactor(oneput-demo,jsed-demo): use of ctl.ui.update({ flags }) at onStart
- refactor: make MenuItemsFn purely about debounce; no menu items
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

- chore: run knip - dead exports / code etc
- chore: test importing the built package, make sure all expoected exports work and test files etc are not include
  - COMMENT: publishConfig looks out date cmopared to exports in package.json -
- docs: need to make ai-docs similar to effect v4
- chore: move skills/oneput/SKILL.md into oneput/AGENTS.md or delete
- set up playwright smoke tests on oneput-demo
  - "open menu should show expected menu items"
  - "typing filters menu"
  - open AsyncSearch demo and test generative works - really simple tests
  - etc
  - run this on PR's

## style

- style: don't define a small icon width / height; instead, define one setting height or width; the consumer can create compact or loose variants by setting a class on the appropriate part of the ui eg innerUI triggering different CSS custom property values
- style: prefer play for send button rather then the "dart" thingy
- style: in oneput internal demo (not oneput-demo), the divider text has an additional indent (margin-left by the looks) that breaks alignment with the main text in the menu items
- style: the radius of the input border box (which gets the focus ring) is more pronounced than the border radius of the oneput container
  - COMMENT: it's more noticeable when there is no chrome above the input
- style: the gap between input and top of oneput container is different to the gap to the left/right sides of the container
  - COMMENT: it's more noticeable when there is no chrome above the input

## defer

- Convert `createActions` and `createMenuItems` to objects (.create)
  - have a `ctl.menu.invalidate()`?
    - menuItems = MenuItems.create(...) could call it
  - COMMENT: I think we should wait for it to be justified; eg we need more control over the structure of menu items maybe because we're injecting items in addition to the ones in createMenuItems