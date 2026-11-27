# Declarative KaTeX

The KaTeX demo written as a declarative AppObject: an XState machine whose states describe what Oneput shows. It does what `../../main/KatexDemo.ts` does, with no AppObject class.

- `machine.ts`: the states and transitions, as data. The view gives a textarea input whose text the machine controls (`inputValue`), the SUBMIT and `TOGGLE_DISPLAY_MODE` actions, the Send button (`inputSend`) and the menu rows by name. `INSERT` runs only while the formula is valid; otherwise the key declines and Send is disabled. Focus is in the states (INPUT_ROW): `typing` focuses the textarea and the preview row, and declines `DO_ACTION`, so Enter writes a newline even when pointer hover moved menu focus to a row; `browsingMenu` blurs the textarea, so Enter runs the focused row. Keyboard focus on another row goes to `browsingMenu`; keyboard focus on the preview, or textarea focus, goes back to `typing`. A blur does not change the state, because the browser also blurs the textarea, for example when the window loses focus or when the input changes from `input` to `textarea` as the demo starts. `INSERT` ends in `typing`, and the adapter applies the state's focus again after each command, thus a click on Insert (which blurs the textarea first) focuses the textarea and the preview row again.
- `actions.ts`: the implementations behind the machine's names. Each change compiles the source with `renderFormula`; an insert appends to the `DemoDocument`.
- `content.ts`: the named content the views refer to: `slot` sources that read the snapshot, and the `preview`, `insert` and `displayMode` row builders.
- `appObject.ts`: `createKatexApp` makes the child of a routed app (`ROUTED_DECL`).
- `__tests__/appObject.test.ts`: tests the AppObject through Oneput, with a null `DemoDocument`.

The compile and the page wrapper are in `../katex/`, which the imperative demo also uses.
