# Open

## LOAD_LUCIDE

How do we use lucide.createIcons but avoid icons flashing into existence when a menu with items using said icons opens?

## MENU_OPEN_CLOSE_RACE

If we add a global binding to open a menu and then a local binding of the same keys to close the menu, we may observe that when we close the menu, the menu is closed via the local binding but then the global binding which relies on the menu state may execute because the menu state gets updated to closed before it runs.

## UNWANTED_AUTOCOMPLETE

Edge will often show a "Save Info" popup when clicking on the input element, even with `autocomplete="off"`. Current hack is to use an actual value eg "one-time-code" or something random. A random choice unfortunately is an unrecognised value and will cause a lint issue.

## POINTER_UP

On mobile we may want to scroll through the menu items rather than activate the particular item our finger comes into contact with. Therefore use pointer up events for menu item actions as the mobile browser will cancel the pointer up if it detects that you are dragging instead of tapping.
