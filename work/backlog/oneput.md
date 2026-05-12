# Backlog: packages/oneput

The following are potential work (tickets for work) sorted by priority: earlier tickets take precendence over later ones.  Extract the next ticket from the top, and convert it into a spec, and draft a plan based on the initial proposal.

## Crtical work

## Details

- fix: `$mod+v a` types `a` into input
  - COMMENT: detect if we're in a tinykeys intermediate state and disable the input?
  - COMMENT: blur input focus if we detect any key that has a modifier
- fix: `$mod+v` pastes into input
- fix/feat: layouts for things like `PasteElementUI` or  `PickListUI` 
  - fix: search for "jsed-demo" in jsed/src
  - fix: search for "LayoutSettings" in jsed/src
  - COMMENT - we run it as an AppObject but it provides lots of hooks
    - ```
      PasteElementUI.create({
        onRenderMenuItem: (...) => {...} // default to stdMenuItem
        onLayoutChange: (ctl, { actions, menuTitle }) => { ctl.ui.setLayout(...) }
      })
      ```
  - COMMENT - we run our own AppObject and it gives us stuff we need
    - `OneputEditDocumentAdapter` does this
- refactor: start should only be called once; make onResume required or just don't call anything
- fix: oneput-demo menu is closing on actions where it shouldn't
  - I think I altered this when working on jsed-demo; what is the preferred approach?
  - COMMENT: starting to think we stay open by default; force users to specify close in stdMenuItem
- feat: disable individual menu items
  - eg pasteBefore, pasteAfter, pasteIn
- feat: filter for global items
  - example?
  - scenario: you have nested menus, you only see the outer entry but you want to filter on the items within as well as the ones showing in the current menu
  - scenario: you have a lot of items, not all necessarily in a menu; you want to bring them up when typing
    - COMMENT: seems a bit weak
  - COMMENT: This could just be an extension of menuItemsFn; possibly we trigger it or we use a default one that just does it; it could be configured to filter on global but show only local entries
  - COMMENT: the issue is how to define "global items"
- docs: need to make ai-docs similar to effect v4
- chore: move skills/oneput/SKILL.md into oneput/AGENTS.md or delete
- feat: declarative onBack in AppObject
- refactor: null input controller backed by happy-dom input element
- refactor: deep modules for packages/oneput 
  - packages/oneput/src/lib/index.ts -> packages/oneput/src/index.ts
  - packages/oneput/src/lib/oneput should go away, it's a redundant (the directory); it's contents should be distributed to either
  - packages/oneput/src/lib/oneput/controllers
    - but move helpers/ subdir into packages/oneput/src/lib
  - packages/oneput/src/lib/oneput/types.ts
  - KeyEventBindings class - extract it from packages/oneput/src/lib/oneput/lib/bindings.ts - it's key to understanding bindings
- feat: implemenet web components
- fix: In apps/jsed-demo we had a situation where the open/close menu binding used "$mod+b" and the "go back" binding used "Meta+B".  On a mac, this resulted in both actions happening.  This was particularly confusing because the back binding resulted in a significant change to the bindings themselves but the change wasn't visible to the user, making the user think that opening/closing the menu had broken the bindings when this was not the case.  
