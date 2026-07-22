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
- ability to go back to the previous menu
  - may pop the AppObject stack, or stay within one AppObject
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
