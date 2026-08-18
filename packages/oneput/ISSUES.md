# Issues

## QUEUE_POP_ON_OUTRO

- when: Aug-2026
- what:
  - Exit an AppObject while its menu is closing.
  - `pop` restores parent chrome (title, tick, `innerUI`) before Svelte `whoosh` measures height.
  - The panel is shoved, then animates down from the wrong height (~192px).
  - This is not the item-list flash in FLASH_OF_NEXT_MENU. Items were already frozen. Chrome was not.
- observed sequence:
  1. Close (X or `closeAndExit`) sets `menuOpen=false` and emits `menu-open-change`.
  2. Same turn used to `exit` → `pop` → `runBefore` → parent `onResume` (`installFrameControls` in frame-harness).
  3. Then `whoosh` starts and measures the already-shifted panel.
- confirmation:
  - Frame node/edge metadata: close the menu and watch title / tick / Home-zoom bar change before the panel finishes leaving.
  - `exit` with the menu already closed must still pop at once (no outro).
- solution:
  - `exit()` queues `pop` when a menu outro is in progress; otherwise it pops now.
  - `closeAndExit` is `closeMenu()` then `exit()`. A close that starts an outro queues; a no-op close pops now.
  - `closeMenu` does not start an outro when the menu is already closed or open/close is disabled.
  - Real UI: `Oneput.svelte` `onoutroend` completes the outro (`menu-outro-end`), then the queued pop runs.
  - `createNull` has no component: it completes the outro in the close timeout.
  - `queuePop` unwires the leaving AppObject’s `onMenuOpenChange` so that close does not run the hook again (`closeAndExit` would otherwise `submit` twice). `reset` after pop subscribes the parent.
  - Do not freeze more chrome slots. Do not `setTimeout(200)` in AppObjects.
- note:
  - `isMenuOpenImmediate` remains. It is the sync latch for MENU_OPEN_CLOSE_RACE (`menuOpen` still flips in a timeout), not the outro flag.


## INVALIDATION_REBUILD_FEEDBACK_LOOP

This affected invalidation of the menu in MenuController in a consumer but could be applied in other places potentially.

- when: Aug-2026
- what:
  - Several invalidation requests in one reactive turn can each rebuild the same menu.
  - A rebuild writes new menu state. Reactive consumers can respond to that state and request another invalidation before the UI settles.
  - The repeated rebuilds can form a feedback loop that keeps the browser main thread busy and makes the page unresponsive.
- observed sequence:
  1. The Frame demo app used `Command+B` for graph navigation and Oneput used `Command+Shift+B` to open its menu.
  2. Frame did not reject the extra Shift modifier, so one key press started both actions.
  3. Frame navigation changed the selected graph node (in svelteflow). Its selection callback requested a Oneput menu invalidation.
  4. Oneput opened the menu and requested its normal pull-on-open invalidation.
  5. Both invalidations arrived in the same reactive turn. Before coalescing, each request rebuilt the declarative menu and wrote new menu state.
  6. The related reactive updates could request more invalidations before the previous UI work settled. The page then became unresponsive.
- confirmation:
  - Restoring both original Frame conditions reproduced two invalidation requests from one shortcut.
  - With invalidation coalescing enabled, Oneput logged `Coalesced 2 menu invalidations`, performed one rebuild, and did not freeze.
- solution:
  - Match host shortcuts exactly. The consumer app now rejects Shift and Alt for its `Command+B` shortcut.
  - Use `coalesce` for menu invalidation. It merges requests made before the next microtask and performs one rebuild.
  - Release the current batch before the rebuild starts. An invalidation requested while a rebuild runs must create a trailing batch instead of being lost.

## IMPORT_CSS_GOTCHA

- what:
  - CSS `@import` inside `oneput-defaults.css` (e.g. co-located widget CSS like `chatSessionItem.css`) breaks when a consumer stylesheet itself `@import`s defaults.
  - COMMENT: ie "don't use @import for modular css"
  - Vite/PostCSS error: `@import must precede all other statements (besides @charset or empty @layer)` — the nested `@import` lands mid-bundle after other rules.
- when:
  - Direct JS import of defaults often works (`import '@oneput/oneput/shared/styles/oneput-defaults.css'`).
  - Fails when another CSS file wraps defaults, e.g. jsed-demo’s `apps/jsed-demo/src/lib/jsed/styles/oneput-defaults.css` which only contains `@import '@oneput/oneput/shared/styles/oneput-defaults.css'`.
- why:
  - CSS requires `@import` at the top of a stylesheet. Nested `@import`s are not reliably hoisted to the top of the _final_ concatenated CSS graph, so they become invalid mid-file.
- solution:
  - Do **not** CSS-`@import` widget styles from defaults.
  - Co-locate widget CSS next to the builder and load it with a JS side-effect import from that module (e.g. `import './chatSessionItem.css'` in `chatSessionItem.ts`).
  - Keep declaring `@layer …, oneput.shared` in defaults so widget rules in that layer still beat `oneput.elements` shell chrome.
  - Hosts that use the builder get the CSS automatically; hosts that only import defaults do not pull unused widget CSS.
- see: README “Styles” under Usage; `shared/ui/menuItems/chatSessionItem.ts`

## ASYNC_MENU_FLASH

- what:
  - we transition to a new AppObject eg FilePicker; FilePicker needs to read from the fs to update the menu; whilst updating, the old AppObject's menu is cleared creating a jumpy "cut down" effect just before the async loads in the new results
  - the menu will get truncated when switching AppObject's as part of clearing out the old data; we can't avoid that
- solution:
  - skeleton
    - when loading, set a skeleton menu
    - see docstring in ctl.menu.setMenuLoading

## FLASH_OF_NEXT_MENU

- what:
  - we exit an AppObject and close the menu at the same time
  - this can cause a weird little jump in the menu as it winds down but updates with items for the new AppObject
  - particularly noticeable if the old AppObject has few items and the new one has a lot
- solution:
  - as soon as menu starts to close, we disable any visual menu updates whilst allowing the menu data to be updated; we can reinforce this for consumers by giving them ctl.app.closeAndExit.
  - 8-Jul-2026: confirmed this happens; you just need small child menu that you close and exit from.
- see: QUEUE_POP_ON_OUTRO for parent chrome jumping during the same close (title, tick, innerUI). Deferred pop is the fix there; item freeze does not cover chrome.

## LOAD_LUCIDE

How do we use lucide.createIcons but avoid icons flashing into existence when a menu with items using said icons opens?

## MENU_OPEN_CLOSE_RACE

- what: If we add a global binding to open a menu and then a local binding of the same keys to close the menu, we may observe that when we close the menu, the menu is closed via the local binding but then the global binding which relies on the menu state may execute because the menu state gets updated to closed before it runs.
- also issues with `enter`: if setTimeout hack is not used, the following will run when you hit `enter` on a menu item when menuOpen is `true` even though it should only run when the menu is closed.
  ```js
      binding: {
        bindings: ['enter'],
        description: 'Edit first editable token',
        when: { menuOpen: false }
      }
  ```
- solution: use setTimeout (hack)
- COMMENT(May-2026): the issue is that menu open state is changing before the binding runs.
- COMMENT(May-2026): I've moved the setTimeout to the menu open/close functions

## UNWANTED_AUTOCOMPLETE

- what: Edge will often show a "Save Info" popup when clicking on the input element, even with `autocomplete="off"`.
- solution: Current hack is to use an actual value eg "one-time-code" or something random. A random choice unfortunately is an unrecognised value and will cause a lint issue.

## POINTER_UP

- what: On mobile we may want to scroll through the menu items rather than activate the particular item our finger comes into contact with.
- solution: Use pointer up events for menu item actions as the mobile browser will cancel the pointer up if it detects that you are dragging instead of tapping.

## IOS_CLICK_ZOOM

- what: in ios clicking the input, will cause scrolling and the screen to zoom in especially if font-sizes are "small"
- solution
  - https://stackoverflow.com/questions/2989263/disable-auto-zoom-in-input-text-tag-safari-on-iphone
    - Add `maximum-scale=1` to meta.name = "viewport" tag.

## VISUAL_VIEWPORT_ZOOM

- what: the viewport on mobile phones can be pinch zoomed. This will blow up or shrink the input.
- solution:
  - do a css `transform` and `scale(1/visualViewport.scale)` . A version of this is here: https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API .
  - use `element.style.transformOrigin = 'bottom left'` to prevent drift for bottom-anchored input

## OSK_VISUAL_VIEWPORT

- what: when the on-screen keyboard (OSK) comes up it may hide a position fixed elements (eg Oneput). In a simple scrollable html page with a floating fixed position element at the bottom of the layout viewport, when the OSK is triggered, the element may retain its position, but scrolling up the page will cause the fixed element to go under the OSK; scrolling down again causes the element to come back
- solution: we listen to both the window and the visual viewport for resize and scroll events and adjust the position of the fixed element taking into account the weird things that happen to the visual viewport relative to the layout viewport when the OSK is present; see <https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport#simulating_position_device-fixed> . This correction can be a bit janky although it seems to have improved even in IOS safari (as at Sep-2025).
- possible future solution: https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API - does not appear to be well enough supported yet

## MENU_VISUAL_VIEWPORT_HEIGHT

- what: a fixed menu max-height (or even `100svh`-based CSS alone) can clip the open menu at the top when the OSK shrinks the visual viewport, or on short/landscape viewports. Layout viewport units don't track the keyboard.
- solution: CSS owns the formula —
  `max(7.5rem, min(28rem, calc(var(--oneput-visual-viewport-height, 100svh) - var(--oneput-non-menu-chrome))))`.
  `--oneput-non-menu-chrome` starts as a CSS estimate (`6.5rem`); `Anchor.svelte` replaces it with a measured value (container − menu) and sets `--oneput-visual-viewport-height` from `visualViewport.height`. Recomputed on vv resize/scroll and via ResizeObserver when the menu opens/closes.

## IOS_SAFARI_OSK_DEAD_SPACE

- what: when the OSK is up in IOS safari, scrolling past the bottom of the layout viewport results in a bunch of dead space outside of the layout viewport; nothing can occupy this space or be positioned there, it's a void.
- see: <https://www.reddit.com/r/webdev/comments/xaksu6/on_ios_safari_whenever_the_keyboard_opens_up_for/>
- solution: don't use IOS safari :D - not going to try to fix this for the moment, possibly <https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API> may provide a fix at some point.
