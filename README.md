# sbr-hyper-core

Convert, navigate and edit html docs using 2br (2nd brain) constructs such as i-aliases. Convert takes markdown files (used in the prototype project apps/fold) and converts them and the 2br constructs into html that can then be navigated and edited. The conversion is one-way, there is no going back.

- `convert`
  - convert existing markdown (as used by the author in `apps/fold`)
- `navigate`
  - the idea is to take html (including markdown converted by `convert`) and be able to navigate it
- `modify`
- `extend`
  - we want to not just navigate html, we want to extend it; think checkboxes with state on list items
- `edit`
  - when we get to text, we want to be able to edit it
- `serialize`
  - when we save we need to generate a version of the edited content without any any temporary artifacts from the navigator
- `unload`
  - be able to leave the html the way we found it if this program is exited

## Synopsis

Build a bundle in dist/ (TODO: not productionized yet).

```sh
pnpm --filter sbr-hyper-core run build
```

Tests

```sh
pnpm --filter sbr-hyper-core run test:watch
```

Run a server and access examples/\*:

```sh
pnpm --filter sbr-hyper-core run dev
```

Current examples I'm working on:

```sh
pnpm --filter sbr-hyper-core run build:cli
cp -i ~/work/2br-danb2/.fold/idable/6058d8eb-5ef6-4c22-8bb4-2a15aa2252a7/content.md \
  ~/projects/2br-spaces-dev/packages/sbr-hyper-core/src/examples/ng-ml/index.md
pnpm --filter sbr-hyper-core run convert:ng-ml
```

- /examples/ng-ml/
- /examples/index.html .

## Learnings

- `.children` instead of `.childNodes` to focus on `Element`s
- `HTMLElement` is focusable
- we can style on `:focus` and set `outline`; setting outline makes the focus ring show on focus() calls made on click events
- `outline` css rule doesn't affect layout, avoids reflow
- TEST_FIRE
  - `await user.keyboard(...)` and ctrl+j (or other key) - doesn't work, had to use `fireEvent.keyDown(dom.window.document, FE_SIB_DOWN_KEY)` where FE_SIB_DOWN_KEY = `{ key: 'j', ctrlKey: true, };`
  - related maybe: <https://stackoverflow.com/questions/74281534/react-testing-library-user-event-keyboard-not-working>
- TEST_HOTKEY
  - `await user.keyboard(...)` doesn't trigger `hotkeys`; forced to test with hotkeys.trigger
- USEREVENT_TAB_BODY
  - adding tabIndex="0" to body and trying to move focus by simulating a tab button
    - `const user = userEvent.setup({ document: dom.window.document });`
    - `user.tab()`
  - ... doesn't work; document.activeElement stays on the body element.
  - However, if we only tabify the content inside body `user.tab()` works
  - In a real browser, including the body works as expected
