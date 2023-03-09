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
  - when: Mar-2023
  - what:
    - adding tabIndex="0" to body and trying to move focus by simulating a tab button
      - `const user = userEvent.setup({ document: dom.window.document });`
      - `user.tab()`
    - ... doesn't work; document.activeElement stays on the body element.
    - However, if we only tabify the content inside body `user.tab()` works
    - In a real browser, including the body works as expected
  - solution:
    - don't start from the body
- RTL_FAIL
  - when: Mar-2023
  - what
    - RTL using jest and jsdom doesn't work; I've tried to test the code by exercising the event handlers as close as possible to a user and it's a massive time suck with mysterious errors like USEREVENT_TAB_BODY .
  - solution:
    - I want good test coverage to catch errors and so I can upgrade dependencies with confidence.
    - The strategy I'm thinking is we can test the functions that act on the dom without the event handlers.
    - I think we can still write out tests as though a user were doing them but manipulate the dom directly with the these functions.
    - Then we can test the glue code that connects up the event handling with these functions. These tests would be slightly artificial so I wouldn't go overboard with them.
    - We can add some real e2e tests to make sure everything hangs together, either karma or cypress, I guess cypress.
    - I'm hoping this will make the tests mercifully easy to write without the mystery bugs.
    - I think we should structure the code to separate the glue code from functions that do stuff.
