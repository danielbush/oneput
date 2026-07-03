# Open

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
  - status:
    - 3-Jul-2026: I haven't implemented this yet; not sure it's an issue after all the recent changes; let's keep this open
  - as soon as menu starts to close, we disable any visual menu updates whilst allowing the menu data to be updated; we can reinforce this for consumers by giving them ctl.app.closeAndExit

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

## IOS_SAFARI_OSK_DEAD_SPACE

- what: when the OSK is up in IOS safari, scrolling past the bottom of the layout viewport results in a bunch of dead space outside of the layout viewport; nothing can occupy this space or be positioned there, it's a void.
- see: <https://www.reddit.com/r/webdev/comments/xaksu6/on_ios_safari_whenever_the_keyboard_opens_up_for/>
- solution: don't use IOS safari :D - not going to try to fix this for the moment, possibly <https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API> may provide a fix at some point.
