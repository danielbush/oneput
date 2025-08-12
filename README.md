# Oneput

A cheat code for ux. Also a command bar.

This is a sveltekit app which isused to publish the Oneput component using <https://svelte.dev/docs/kit/packaging>.

There is a tasfile `Taskfile.yml` for various tasks.

## Synopsis

Oneput is an input accompanied by a dropdown that usually acts as a menu. Together you can use them to mimic almost all ux or form functionality eg inputs, confirmations, radio and normal checkboxes and so on. Whether you should is another question. So if that bothers you, then just call it a command bar.  Oneput also includes additional areas around the menu and input where you can add additional interactive elements.

You could use Oneput as an initial scaffold, allowing you to quickly sketch out your web-based ideas in the browser using oneput to provide a skeleton of the app state you are developing. Then replace oneput with more appropriate UI. You could even keep oneput for power users.

Oneput is written in svelte but can be packaged as a web component.

In a bit more detail:

Oneput is designed to open a menu and filter options as you type; when the menu is open, you have key bindings to navigate the menu(s) eg up and down arrow keys; these bindings only apply when the menu is open. These can be configured via Oneput.

Since Oneput handles bindings for when the menu opens, it also lets you set global bindings that you can use when the menu system is not open eg to run arbitrary actions of your choosing. When the menu opens, any global bindings are disabled and the menu bindings apply.  You can of course choose to expose some of your arbitrary actions as menu items. Incidentally you can configure Oneput to let you set your global bindings and the menu bindings via its menu system which is all part of what Oneput is about. In fact... since menu items can execute whatever you want, you can also add menu items in Oneput to load different sets of global bindings etc etc.  You can see where this is going can't you?  Oneput can become effectively a shell and ui for your browser-based app.  Admittedly it might be more attractive to power users.

Ordinarily the input will act as a filter for the menu. The filter behaviour can be disabled allowing the input to be used for interactions with the user both with menu open or closed eg such as selecting from numbered radio options or confirming yes or no.

Oneput's structure (it's skeleton so to speak) is flex-based.  You could argue that grid might be better in some situations but flex is a simple mental model that achieves most of oneput's layout requirements.  The content you inject "into" oneput's skeleton could of course be styled any way you wish.

Oneput's content and structure (the skeleton) is controlled programmatically.

Key parts of Oneput's styling can be controlled using css custom properties.  All parts of oneput are delineated with class names that you can also target.

Oneput was created using sveltekit and the "library" option which means `src/routes` is for demo purposes and `src/lib` is the main thing we export from this codebase.

## Packaging

To test packaging see task `test:package` 

## Webcomponent

Can we use oneput as webcomponent?

This is a WIP.  See task `test:wc`.

## Styling

Oneput consists of a container within which we have "areas".

The menu and input areas have additional structures.

- .oneput__container
  - .oneput__menu-area
    - .oneput__menu-header
    - .oneput__menu-body
      - .oneput__menu-item (several)
    - .oneput__menu-footer
  - .oneput__inner-area
    - represents the content between the menu area and the input area; eg a status bar
  - .oneput__input-area
    - .oneput__input-outer
      - .oneput__input-outer-left
      - .oneput__input-inner
        - .oneput__input-left
        - .oneput__input
        - .oneput__input-right
      - .oneput__input-outer-right
  - .oneput__outer-area
    - comes "after" the input-area

If the above is the skeleton, then the following are the ribs of the skeleton ...

- .oneput__hflex,
  - lets you define horizontal blocks of content that usually fit into the above areas
- .oneput__vflex,
  - a convenience class to let you stack vertically; often used within an hflex to vertically structure something eg a complex menu item
- .oneput__fchild
  - represents a flex child that lives within an hflex or vflex
  - especially intended for your icons and icon buttons

Each of these 3 structures has a programmatic counterpart which you use to populate oneput with content and which you pass as props to oneput.  See `src/lib/oneput/examples/demo/index.ts` for an example.

### Dark mode

- Your web page should set `color-scheme` to `light dark` to allow dark mode.
- use `media (prefers-color-scheme: dark) {...}` to theme oneput in dark mode for users that request it via their OS settings
  - `...` will take the form of: `.oneput__container { --oneput-...: ...; ... }`
  - see `src/lib/oneput/oneput-defaults.css` for the available css variable settings.
- to force dark mode via a toggle, use JavaScript to add a class (e.g., `.dark-mode`) to the html element or a wrapper. Inside the media query for `prefers-color-scheme: dark` (above), target `.dark-mode` to set your dark mode variable values instead of setting them untargeted as above. This allows the class to force dark mode even if the system is set to light.

