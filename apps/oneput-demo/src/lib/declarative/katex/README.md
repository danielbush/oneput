# KaTeX AppObject

| In `KatexDemo`                                                             | In the declarative sketch                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Five-row textarea with filtering off                                       | `ready.meta.view.input` is an always-on editor. `INPUT_CHANGED` updates the formula directly.                                                                                                                                                    |
| `KatexPreview` mounts a live widget                                        | The preview row reads `formulaPreview`. The shared interpreter passes its `SafeHtml` to Oneput as `htmlContent`.                                                                                                                                 |
| `KatexFormula` renders, checks limits and remembers the last valid preview | `checking` calls the shared `FormulaMarkup` compiler. It keeps `trust: false`, the KaTeX limits, the 4096-character source cap and the 200,000-character output cap. The compiler calls `sanitiseHtml(..., 'math')` before it returns the token. |
| Invalid formula shows a notification                                       | `invalid` adds plain-text detail to the preview row. The full menu, current focus and last good preview stay in place. Edit the formula to try again.                                                                                            |
| Insert row, Send and the submit binding                                    | All send `INSERT_FORMULA`. The guard requires a valid current formula. `DemoDocument` appends the safe markup and the editor clears.                                                                                                             |
| Display mode checkbox and shortcut                                         | Both send `TOGGLE_DISPLAY_MODE`. The checkbox reads the current mode and the preview recompiles.                                                                                                                                                 |
| Input and menu focus feed each other                                       | `ITEM_FOCUSED` handles keyboard moves. The AppObject links native input focus to the preview row. Oneput handles Back.                                                                                                                           |

Suppose you type `\frac{a}{b}`. The preview updates and **Insert** becomes
available. Delete the final brace. The preview row shows the error next to
the last good preview and **Insert** is unavailable. Restore the brace, then
activate **Insert**. The fraction appears on the page and the textarea clears.

The sketch reuses the shared AppObject adapter, row patches and interpreter.
The formula owns the textarea from the start, so it needs no gated field
edit. The old demo has no example formulas. This sketch uses plain help
text and standard row styling. It leaves out the custom preview styling and
binding-aware help and placeholder wording. An unavailable **Insert** can
retain focus and exposes its disabled state to assistive technology.

## Open questions

- Where should the real Oneput host implement the shared `ApplyView` update so
  menu refreshes also preserve textarea selection and focus?
- Should binding-aware help and the custom preview styling be included when
  the sketch is connected to the demo route?
