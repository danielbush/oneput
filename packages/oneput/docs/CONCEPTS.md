# concepts and vocabulary

## actions and catalogs of actions

- the key idea is that we define actions more generally; then declare what they do, what bindings they have and whether they have a menu item
- this helps to declutter `.menu` and `.actions` in the AppObject
- specify whether the menu is available
  - `ActionCatalogEntry` defines `canShowMenuItem`
- TBD: specify whether actions are available
- see OneputCatalog, JsedCatalog as examples

## pulling and invalidation vs imperative

- favour using declaring menus (AppObject.menu); these are pulled; usine invalidate to re-pull (re-update)
  - we still provide the ability to imperatively set the menu using setMenu for maximum freedom
- actions have been declarative for some time

## PULL_ROWS - mounted widgets that read live state

Invalidation re-pulls the **shape** of the menu: which rows exist, preview
content, filter results. It is not how a single label or a checkbox tick moves,
because rows keep stable ids: a rebuild reuses the mounted node and does not
run `onMount` again. A value copied into the row at build time then goes stale.

For that, a row mounts a small widget on an `FChild` host it owns. The widget
reads a `Pull<T>` source (`lib/pull.ts`) on mount and again after each click.
It never writes a Svelte-managed text node.

- `checkboxMenuItem` — the widget owns the `checked` property of the input.
- `pullToggleMenuItem` — the widget owns the title node, so the row is pinned
  (`canFilter: false`).
- `toggleMenuItem` stays snapshot-based, for callers that already rebuild.

A rebuilt row does not hold the widget the user can see: only the first build
mounted. So a row paints by **host id**, through a registry private to
`pull/`, and reaches the widget that is on that node now.

`subscribe` on the source is needed when a write must move the row _after_ the
click has painted: a keyboard action, a second row on the same state, or your
own `invalidate` — the rebuild lands later, so notify once it has. `cell()` and
`notifier()` provide it.

Use `FChild` `onMount`, not the Flex mount map: Flex runs `onMount` once, on
the parent Flex instance.

## MenuLike (menu and menu-like contract)

Working name: **MenuLike** (rename later if a better term lands).

`setMenu` / `menu()` govern the **list** menu. More generally, anything that
owns the menu area should honour this MenuLike contract:

- a focus that can be moved (calendar: up/down and left/right; list: next/prev)
- ability to filter/search, or turn it off
- an action that fires on the focused thing (may load a new menu / AppObject)
- identity
  - item id + last-action tracking (where it applies)
- filter / generative
  - chat: often generative
  - calendar: often neither
  - traditional list: either
  - katex demo: generative used for preview

`replaceMenuUI` is **not** MenuLike — it only swaps pixels (alerts /
confirmations). Using it for calendar/chat means rebuilding focus, filter, and
activate yourself.

## Composition and ownership

SUMMARY: we start with who "owns" what. We have the host application which authors/owns its own AppObject's and layout. It might create its own reusable components like RICH_MENU_ITEM's or reusable AppObject's (using `SharedCtl`). By contrast a 3rd party is by definition reusable but can't assume too much about the layout of the host application; it sticks with RICH_MENU_ITEM's and shared AppObjects (`SharedCtl`) or provides 3rd party chrome that the consumer can add to its ui layout. The menu area is the most prominent feature of Oneput's ui, the focal point. The current menu gets to own the most significant real estate including a fixed header and footer and the content in between. The current menu is owned by the current active AppObject. They operate within the Oneput application which owns the overall UI and layout. Shared AppObjects own less than host AppObjects; they take `SharedCtl` and have more restricted access to layout chrome.

- The Oneput application owns the layout, overall UI and any normal AppObject's usually including the initial aka root AppObject.
- AppObject's own the menus that are shown during their lifetimes.
- The current menu (created by `setMenu` usually via declarative `AppObject.menu`) owns the menuUI excluding the "layout" menu ui.

To create and compose reusable "components" including 3rd party components we have several strategies:

- 3rd party providers can call signals (which the hosting ui should handle eg `inputAccept`, `inputSend`, etc.) and set flags (`enableGoBack` etc) and use AppObject lifecycle (imperatively or declaratively: onMenuOpenClose, onBack etc). These don't give much control over the ui but they do handle very common situations.
- create a RICH_MENU_ITEM
  - for bespoke ui that you want to show in the menu area which acts as the central display area of oneput
  - eg a calendar
  - it might be that the host application builds its own AppObject or even a shared AppObject (`SharedCtl`) around a 3rd party RICH_MENU_ITEM giving it the most freedom to do things
  - 3rd party providers should provide RICH_MENU_ITEM's, shared AppObjects, and any business logic formatting functions as 3 separate things maximising consumer options
- create a shared AppObject (`SharedCtl` in `create` / ctor)
  - particularly useful for 3rd party but may also be good for internally reusable AppObject's
  - limited access to layout to avoid creating chaos; instead can send signal to the host UI like "inputAccept" etc
  - may incorporate RICH_MENU_ITEM's to achieve a desired result
- create an AppObject
  - AppObject's are created for the Oneput application; they have full access to the UI/layout because it is also owned by the Oneput application
- 3rd party chrome
  - examples are the "menu item count" widget, or a widget that shows the time
  - the host application
- TODO
  - what we haven't covered is a 3rd party shared AppObject that might want to set or influence 3rd party chrome when its active

## Signals vs direct UI (`inputSend`, `inputAccept`, `inputReject`)

Shared AppObjects should not assume where host chrome lives. They advertise
chrome roles with layout params (not lifecycle):

- `inputAccept` — accept the current choice (e.g. Done on SetDate; confirm key capture). Exit stays in the AppObject’s `run` when needed.
- `inputSend` — send / submit a message (e.g. Eliza chat)
- `inputReject` — dismiss (e.g. abort key capture in BindingsEditor)
- exit without a result — not a layout param
  - AppObject calls bare `ctl.app.exit()` (no payload)
  - typically from `onBack` / goBack, or `onMenuOpenChange` when the menu closes
  - opt in with flags `enableGoBack` and `enableMenuOpenClose`
  - host layout surfaces ← and X from those flags
  - when the menu is closing, `exit` / `closeAndExit` wait for the close outro before pop; when the menu is already closed, pop is immediate

The host layout decides how to surface these — commonly on `inputUI.right`, even
when the input field itself is disabled. Shared button chrome lives in
`shared/ui/buttons.ts` (`acceptButton`, `sendButton`, `rejectButton`).
A reusable host shell is `shared/ui/layout/StandardLayout.ts` — close over host
icons in the install factory (`(ctl, params) => StandardLayout.create(...)`).

`SharedCtl` (type-only allowlist) is what reusable / 3rd-party AppObjects take in
`create` / the constructor — hosts still pass the real `Controller`; the
constructor is typed narrower so it cannot call layout-direct APIs like
`setInputUI`.

Host-owned AppObjects retain full `setInputUI`. If the layout also maps these
signals onto `inputUI.right`, those can clash (`ui.update` replaces `inputUI`
from the layout; `setInputUI` patches it). That is an acceptable first-party
footgun:

> Host layouts may surface `inputAccept` / `inputSend` / `inputReject` (e.g. on
> `inputUI.right`). If your own AppObjects also call `setInputUI`, those can
> clash — coordinate them. Shared AppObjects use `SharedCtl` and cannot set
> input UI, so they don’t have this risk.

“Coordinate” can mean composing in the layout (e.g. adornments from the
AppObject plus Accept from `inputAccept` in one `right` flex), not only
“use one or the other.”

## RICH_MENU_ITEM's

- examples
  - set date
  - set time

## ENTER_SEMANTICS - enter key semantics

Recall we have `DO_ACTION` which triggers a menu action for the currently focused menu item; and we have `SUBMIT` action which submits the input. It's common for both of these to be the `Enter` key. The AppObject author (consumer) can of course use a different key.

Factors (ENTER_SEMANTICS_FACTORS)

- tabbing from browser native input focus to a button focus (eg a submit/send button or even the menu open/close button etc) and hitting `Enter` should trigger that button using native browser functionality
- similarly for `Space` should also trigger the button under focus using native browser functionality
- a focused menu item (using oneput synthetic menu item focus) implies `DO_ACTION` should trigger; it's common to bind `Enter` to `DO_ACTION`; so we want to allow for this binding
- sometimes we need `Enter` even when natively focused on a button - eg key capture in a bindings editor that has to intercept everything
- the consumer may want `Enter` to generate a newline when the input is a textarea
- there is no value in `Enter` generating a newline when the input is a single line; `Enter` is more free for use elsewhere in this scenario; this is also often the more common scenario; switching to a multiline input suggests the user has been put into a temporary dedicated authoring mode in order to write something more substantial.
- mobile users don't care about `Tab` or `Enter` as ux is driven by touch and soft-keyboard
- `$mod+Enter` might be a common binding choice for `SUBMIT`

Example: see KatexDemo. Here we have a multiline input where we type latex; we have a checkbox-based menu item that toggles display mode. We have a submit button.

We have 3 settings that we can vary to achieve a satisfactory outcome based on these factors.

- (1) `rows` in `setInputUI`
  - just sets if we're multiline or not; if multiline the consumer then needs to decide what ENTER_SEMANTICS they want
  - `InputController.isMultiline` detects multiline textarea; single line textarea counts as a multiline because native `Enter` will still generate a newline
- (2) `enableMenuItemFocus` (default true)
  - if `false` removes menu item focus and related actions that change it, gates the `DO_ACTION` binding associated with this focus but does not disable the menu item action itself; it signals to the user that keyboard menu selection/activation semantics are no longer present but that doesn't prevent them from activating the present menu items by other means: dedicated key binding, touch/click, native tab focus
  - by contrast: `enableMenuActions` disables the action but does not change the appearance or disable menu item focus; it's used to temporarily freeze interactivity; the 2 could be combined along with styling to disable the menu (TODO: we might set a disable flag on the input so CSS styling can reflect the change)
- (3) `enableNativeActivation` (default true)
  - if native browser focus is on a button, this will take precedence over any declared oneput binding for `Enter` and `Space`; (a modifier on `Enter` or `Space` or any key is considered a different binding)

COMMENT: dead combination: `enableMenuItemFocus: false` + `enableNativeActivation: false` leaves `Enter` doing nothing anywhere except a newline in a textarea.
