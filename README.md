# Oneput

This is a sveltekit app which isused to publish the Oneput component using <https://svelte.dev/docs/kit/packaging>.

There is a tasfile `Taskfile.yml` for various tasks.

## Packaging

To test packaging see task `build:test-package` 

## Webcomponent

Can we use oneput as webcomponent?

This is a WIP.  See task `build:wc`.

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

If the above is the skeleton, then the following are the ribs of the skeleton (ok this analogy isn't maybe holding up as well I would like...):

- .oneput__hflex,
  - lets you define horizontal blocks of content that usually fit into the above areas
- .oneput__vflex,
  - a convenience class to let you stack vertically; often used within an hflex to vertically structure something eg a complex menu item
- .oneput__fchild
  - represents a flex child that lives within an hflex or vflex
  - especially intended for your icons and icon buttons

Each of these 3 structures has a programmatic counterpart which you use to populate oneput with content and which you pass as props to oneput.  See `src/lib/oneput/examples/demo/index.ts` for an example.

# Svelte library

Everything you need to build a Svelte library, powered by [`sv`](https://npmjs.com/package/sv).

Read more about creating a library [in the docs](https://svelte.dev/docs/kit/packaging).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

Everything inside `src/lib` is part of your library, everything inside `src/routes` can be used as a showcase or preview app.

## Building

To build your library:

```bash
npm run package
```

To create a production version of your showcase app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Publishing

Go into the `package.json` and give your package the desired name through the `"name"` option. Also consider adding a `"license"` field and point it to a `LICENSE` file which you can create from a template (one popular option is the [MIT license](https://opensource.org/license/mit/)).

To publish your library to [npm](https://www.npmjs.com):

```bash
npm publish
```
