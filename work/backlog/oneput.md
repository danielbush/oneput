# Backlog: packages/oneput

The following are potential work (tickets for work) sorted by priority: earlier tickets take precendence over later ones.  Extract the next ticket from the top, and convert it into a spec, and draft a plan based on the initial proposal.

## Initial proposal: (docs + feat) configurable keybindings for AppObject actions

Drafted: 03-Apr-2026

How should Oneput make keybindings configurable when an AppObject defines bindings through its `actions` property?

Questions to answer:

- how did `apps/oneput-demo` make bindings configurable?
- what is the intended path for configuring bindings when they originate from `actions` on an `AppObject`?
- how should defaults, overrides, and persistence fit together?
- what is the cleanest way to do this for app-local bindings versus shared bindings?

Concrete example:

- `ENTER` in `apps/jsed-demo/src/lib/oneput/app/EditDocument.ts`

The agent should explain the current architecture and then propose the implementation shape we actually want.

## Initial proposal: (feat) `onBack` on AppObject for goBack functionality

Drafted: 03-Apr-2026

Consider whether `AppObject` should grow an `onBack` hook for goBack functionality.

This would be conceptually equivalent to today's `setOnBack`, but owned by the `AppObject` lifecycle instead of controller-level imperative wiring.

Questions to answer:

- when should `goBack` delegate to the current app object versus popping the app stack directly?
- should `onBack` be a first-class `AppObject` hook rather than controller-level wiring?
- how should this interact with existing back bindings and menu/navigation behavior?
- what should happen when an app wants custom back behavior but still sometimes fall through to normal `goBack`?

## Initial proposal: (bug) previous app menu can leak into next AppObject

Drafted: 03-Apr-2026

Bug: when Oneput runs a new `AppObject`, the menu from the previous `AppObject` may still show if the new app does not specify a `menu`.

This was originally noticed in `apps/jsed-demo` back when we had separate `ViewDocument` and `EditDocument` app objects.

Questions to answer:

- why does the previous menu survive the app transition?
- should `ctl.app.run(...)` always clear menu state before applying the next app's menu?
- what is the intended behavior when the new app omits `menu` entirely?
- are there similar leaks for other AppObject-owned state besides menu?

## Initial proposal: (feat + refactor) better duplicate binding handling 

Drafted: 19-Mar-2026

In apps/jsed-demo we had a situation where the open/close menu binding used "$mod+b" and the "go back" binding used "Meta+B".  On a mac, this resulted in both actions happening.  This was particularly confusing because the back binding resulting in a significant change to the bindings themselves but the change wasn't visible to the user making the user think that opening/closing the menu had broken the bindings when this was not the case.  

So we need to catch duplicate bindings before they get loaded and complain via oneput's notification or alert system and maybe also console.warn it.

While we're here, I want to slightly rework the main workhorse for keybindings, the KeyEventBindings class in packages/oneput/src/lib/oneput/lib/bindings.ts and document the thinking behind how bindings work possibly updating the vocabulary and the architecture.

- "bindings format"
  - We allow the consumer to set up their bindings using a tinykeys format eg "$mod+b" etc.  This is represented by KeyBinding and KeyBindingMap types.
  - We use this same format for storage; we can't store the actions (I don't think?), but we can store the actionId's and the tinykeys string-based bindings formats.  That's why we have `defaultActions` and `defaultBindingsSerializable` in `apps/jsed-demo/src/lib/oneput/app/_bindings.ts` - and `KeyEventBindings.fromSerializable`
- "events format" for bindings
  - But... we prefer internally to transform this format to a KeyEvent, KeyEventBinding and KeyEventsMap .  This is the format we use internally when doing anything.  It is also the format we use when capturing bindings using an interacting binding editor such as `packages/oneput/src/lib/oneput/shared/appObjects/BindingsEditor.ts`.
- So `KeyEventBindings` is a class whose job is to take both formats, output either, and works with events format internally to do stuff

Things I'd like to do

- document the point of KeyEventBindings, identify concepts and make them vocabulary; document the formats and the serialization - as vocab or possibly architecture; the agent should be able to explain to a human or other agent how this works
- make sure there are existing tests for duplicates (adding) and conflicts (merging)
- then make some changes
  - have .merge mutate the existing instance and update the .conflicts property
  - remove conflicts from the constructor
  - when instantiating, KeyEventsBindings should check for duplicates
    - we probably want to degrade gracefully rather than fail hard
    - record any duplicates encountered (similar to .conflicts) and drop them
    - console warn that we have duplicates
    - console warn what actionId's were dropped
    - we can then look into reporting this via Oneput's alert or notification mechanisms

## Initial proposal: (refactor) deep modules for packages/oneput 

Drafted: 19-Mar-2026

- we want to apply a "deep modules" approach to Oneput
- packages/oneput/src/lib/index.ts -> packages/oneput/src/index.ts
- packages/oneput/src/lib/oneput should go away, it's a redundant (the directory); it's contents should be distributed to either
  - packages/oneput/src/ - can store the "tip of the iceberg" - the high-level modules
    - move the following:
      - packages/oneput/src/lib/oneput/controllers
        - but move helpers/ subdir into packages/oneput/src/lib
      - packages/oneput/src/lib/oneput/types.ts
      - KeyEventBindings class - extract it from packages/oneput/src/lib/oneput/lib/bindings.ts - it's key to understanding bindings
  - packages/oneput/src/lib - should store low-level content
    - everything else that was in packages/oneput/src/lib/oneput
- TODO: think about deep modules and how it supports progressive disclosure both for agents and humans and suggest any improvements to the above

## Initial proposal: (docs) ai-docs similar to effect-ts

Drafted: 19-Mar-2026

We want to build up a set of canoncial examples of how to use Oneput and how to extend it.  We can use apps/oneput-demo and even apps/jsed-demo for inspiration.  We may need to "polish", finish, finalize some of the examples in apps/oneput-demo in order to do this.

Some key ideas:

- we should be able to do all the things forms do
- we should be able to edit and store keybindings using a pluggable storage mechanism

## Initial proposal: (feat) support web components

Drafted: 19-Mar-2026

We should be able to run as a web component (this will require some work, some basic work has been done within packages/oneput).
I'm incline to extract this to a separate package in order to build and demo it; look into the merits of this.
