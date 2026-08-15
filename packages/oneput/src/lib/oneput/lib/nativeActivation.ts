/**
 * Native activation — which key events the browser already handles.
 *
 * Oneput registers its bindings on `window`, thus a binding fires wherever the
 * true (DOM) focus is. That is wrong for a control that the browser activates
 * by itself: if the user tabs to the submit button and presses Enter, they
 * expect a click on that button, not a menu action.
 *
 * See INPUT_SUBMIT_SCHEME in `docs/CONCEPTS.md`.
 */

/** Keys that activate a focused control. Space is `' '` in `KeyboardEvent.key`. */
const ACTIVATION_KEYS = ['Enter', ' '];

/** `<input>` types that behave like a button, not like a text field. */
const ACTIVATABLE_INPUT_TYPES = ['button', 'submit', 'reset', 'checkbox', 'radio'];

function isActivatableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  switch (target.tagName) {
    case 'BUTTON':
    case 'SUMMARY':
      return true;
    case 'A':
      return target.hasAttribute('href');
    case 'INPUT':
      return ACTIVATABLE_INPUT_TYPES.includes((target as HTMLInputElement).type);
    default:
      return false;
  }
}

/**
 * True if the browser activates the event target by itself, thus Oneput must
 * not dispatch a binding.
 *
 * Only unmodified `Enter` / `Space` count. A binding with a modifier (e.g.
 * `$mod+Enter`) still fires while a button has the focus. Shift is permitted
 * because the browser also activates on `Shift+Enter`.
 *
 * The text input and the textarea are not activatable: `Enter` there belongs to
 * the menu action or to the text (see `when.multiline`).
 */
export function isNativeActivation(evt: KeyboardEvent): boolean {
  if (evt.metaKey || evt.ctrlKey || evt.altKey) {
    return false;
  }
  if (!ACTIVATION_KEYS.includes(evt.key)) {
    return false;
  }
  return isActivatableTarget(evt.target);
}
