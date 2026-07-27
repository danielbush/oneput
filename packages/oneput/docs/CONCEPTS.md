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

SUMMARY: we start with who "owns" what. We have the host application which authors/owns its own AppObject's and layout. It might create its own reusable components like RICH_MENU_ITEM's or reusable AppObject's or SharedAppObject's. By contrast a 3rd party is by definition reusable but can't assume too much abou the layout of the host application; it sticks with RICH_MENU_ITEM's and SharedAppObject's or provides 3rd party chrome. The menu area is prominent feature of Oneput's ui, the focal point. The current menu gets to own the most significant real estate including a fixed header and footer and the content in between. The current menu is owned by the current active AppObject or SharedAppObject. They operate within the Oneput application which owns the overall UI and layout. SharedAppObject's own less than AppObject's; they have more restricted access to things like the layout.

- The Oneput application owns the layout, overall UI and any normal AppObject's usually including the initial aka root AppObject.
- AppObject's own the menus that are shown during their lifetimes.
- The current menu (created by `setMenu` usualy via declarative `AppObject.menu`) owns the menuUI excluding the "layout" menu ui.

To create and compose reusable "components" including 3rd party components we have several strategies:

- create a RICH_MENU_ITEM
  - for bespoke ui that you want to show in the menu area which acts as the central display area of oneput
  - eg a calendar
  - it might be that the host application builds its own AppObject or even SharedAppObject around a 3rd party RICH_MENU_ITEM giving it the most freedom to do things
  - 3rd party providers should provide RICH_MENU_ITEM's, SharedAppObject's and any business logic formatting functions as 3 separate things maximising consumer options
- create a SharedAppObject
  - particularly useful for 3rd party but may also be good for internally reusable AppObject's
  - limited access to layout to avoid creating chaos; instead can send signal to the host UI like "exitWithResult" etc
  - may incorporate RICH_MENU_ITEM's to achieve a desired result
- create an AppObject
  - AppObject's are created for the Oneput application; they have full access to the UI/layout because it is also owned by the Oneput application
- 3rd party chrome
  - examples are the "menu item count" widget, or a widget that shows the time
  - the host application
- TODO
  - what we haven't covered is 3rd party SharedAppObject that might want to set or influence 3rd party chrome

### Signals vs direct UI (`exitWithResult` and friends)

Shared AppObjects should not assume where host chrome lives. They advertise
intent with layout params (e.g. `exitWithResult`: “I can accept and exit with a
result”). The host layout decides how to surface that — a common choice is a
submit/Done control on the inner right of the input (`inputUI.right`), even when
the input field itself is disabled.

`SharedCtl` (type-only allowlist) keeps Shared AppObjects off direct UI writes
like `setInputUI`, so they cannot fight the layout over that slot. Hosts still
pass the real `Controller`; only the Shared AppObject’s constructor is typed
narrower.

Host-owned AppObjects retain full `setInputUI`. If the layout also maps
`exitWithResult` onto `inputUI.right`, those can clash (`ui.update` replaces
`inputUI` from the layout; `setInputUI` patches it). That is an acceptable
first-party footgun:

> Host layouts may surface `exitWithResult` (e.g. on `inputUI.right`). If your
> own AppObjects also call `setInputUI`, those can clash — coordinate them.
> Shared AppObjects use `SharedCtl` and cannot set input UI, so they don’t have
> this risk.

“Coordinate” can mean composing in the layout (e.g. adornments from the
AppObject plus Done from `exitWithResult` in one `right` flex), not only
“use one or the other.”

## RICH_MENU_ITEM's

- examples
  - set date
  - set time
