# Open

## LOAD_LUCIDE

How do we use lucide.createIcons but avoid icons flashing into existence when a menu with items using said icons opens?

## MENU_OPEN_CLOSE_RACE

If we add a global binding to open a menu and then a local binding of the same keys to close the menu, we may observe that when we close the menu, the menu is closed via the local binding but then the global binding which relies on the menu state may execute because the menu state gets updated to closed before it runs.
