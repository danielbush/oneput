# Open

## LOAD_LUCIDE

How do we use lucide.createIcons but avoid icons flashing into existence when a menu with items using said icons opens?

## MENU_OPEN_CLOSE_RACE

- what: If we add a global binding to open a menu and then a local binding of the same keys to close the menu, we may observe that when we close the menu, the menu is closed via the local binding but then the global binding which relies on the menu state may execute because the menu state gets updated to closed before it runs.
- solution: use setTimeout (hack)

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
