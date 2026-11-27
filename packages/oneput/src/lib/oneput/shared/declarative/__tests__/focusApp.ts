/**
 * The focus app: a test fixture for the adapter's focus events and the view's
 * focus fields. A fake actor stands for a machine with two states: `typing`
 * (the input and the `input-row` row have focus) and `browsing` (the input is
 * blurred). Like the KaTeX demo's INPUT_ROW, `input-row` is not the first row.
 */
import { Controller } from '../../../controllers/controller.js';
import { StandardLayout } from '../../ui/layout/StandardLayout.js';
import { waitForState } from '../../test/index.js';
import { appObjectActor, attachAppObjectActor } from '../appObjectActor.js';
import type { LayoutSlots, RowParams, ViewDef } from '../interpreter.js';
import type { OneputEvent } from '../oneputEvents.js';
import { standardLayout } from '../standardLayout.js';
import { standardRow } from '../standardRow.js';
import { icons } from './notesApp.js';

const layouts = { standard: standardLayout(icons) };
const builders = { default: standardRow };
type FocusEvent = { type: 'GO' };
type FocusView = ViewDef<
  Record<never, never>,
  never,
  FocusEvent,
  RowParams<typeof builders>,
  LayoutSlots<typeof layouts>
>;

const rootView: FocusView = {
  layout: 'standard',
  settings: { enableMenuItemFocus: true, enableFilter: false },
  menu: {
    id: 'focus',
    items: [
      { id: 'other', params: { text: 'Other' } },
      { id: 'input-row', params: { text: 'Input row' } },
      { id: 'go', params: { text: 'Go' }, send: { type: 'GO' } }
    ]
  }
};
const typingView: FocusView = { inputFocus: 'focused', menu: { focusItem: 'input-row' } };
const browsingView: FocusView = { inputFocus: 'blurred' };

export type FocusState = {
  state: 'typing' | 'browsing';
  /** The text, so that typing gives a new snapshot and a redraw. */
  text: string;
  /** Each `INPUT_FOCUS_CHANGED` that the machine got. */
  inputFocusEvents: boolean[];
};

/**
 * Keyboard focus on `input-row`, input focus, or `GO` go to `typing`.
 * Keyboard focus on another row, or an input blur, go to `browsing`.
 * `onStarted` runs when the actor gets `STARTED`.
 */
function createFocusActor(initial: FocusState['state'], onStarted: () => void) {
  const state: FocusState = { state: initial, text: '', inputFocusEvents: [] };
  const listeners = new Set<() => void>();
  const snapshot = () => ({
    machine: { getStateNodeById: (id: string) => ({ path: id === 'root' ? [] : ['root'] }) },
    getMeta: () => ({
      root: { view: rootView },
      [state.state]: { view: state.state === 'typing' ? typingView : browsingView }
    }),
    can: () => true,
    text: state.text
  });
  let current = snapshot();
  const next = (to: FocusState['state']) => {
    state.state = to;
    current = snapshot();
    listeners.forEach((listener) => listener());
  };
  const actor = {
    start() {},
    stop() {},
    send(event: OneputEvent | FocusEvent) {
      if (event.type === 'STARTED') onStarted();
      else if (event.type === 'ITEM_FOCUSED' && event.cause === 'keyboard') {
        next(event.id === 'input-row' ? 'typing' : 'browsing');
      } else if (event.type === 'INPUT_FOCUS_CHANGED') {
        state.inputFocusEvents.push(event.focused);
        next(event.focused ? 'typing' : 'browsing');
      } else if (event.type === 'INPUT_CHANGED') {
        state.text = event.value;
        next(state.state);
      } else if (event.type === 'GO') next('typing');
    },
    getSnapshot: () => current,
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      return { unsubscribe: () => listeners.delete(onChange) };
    }
  };
  return { actor, state };
}

/** The ID of the row with menu focus. */
export function focusedRow(ctl: Controller) {
  const index = ctl.currentProps.menuItemFocus?.[0] ?? -1;
  return ctl.currentProps.menuItems?.[index]?.id;
}

/** Wait until the input has native focus, or has lost it. */
export function inputFocused(ctl: Controller, focused: boolean) {
  return waitForState(ctl, 'input-focus-change', {
    name: focused ? 'the input to have focus' : 'the input to lose focus',
    reached: () => ctl.input.isFocused === focused,
    seen: () => `focused ${ctl.input.isFocused}`
  });
}

/** Wait until the row `id` has menu focus. */
export function rowFocused(ctl: Controller, id: string) {
  return waitForState(ctl, 'menu-item-focus', {
    name: `row "${id}" to have menu focus`,
    reached: () => focusedRow(ctl) === id,
    seen: () => `row "${focusedRow(ctl)}"`
  });
}

/** Let Oneput's queued focus and refreshes run. */
export async function settle() {
  for (let task = 0; task < 3; task++) await new Promise((resolve) => setTimeout(resolve, 0));
}

type FocusOptions = {
  initial?: FocusState['state'];
  /** Attach the actor (`attachAppObjectActor`) instead of owning it. */
  attach?: boolean;
  menuOpen?: boolean;
  /** Runs when the actor gets `STARTED`, with the controller. */
  onStarted?: (ctl: Controller) => void;
};

/**
 * Run the focus app over a home AppObject, with the input in the document so
 * that it can get native focus. In `typing` with the menu open, `shown`
 * resolves when `input-row` and the input have focus; otherwise after
 * {@link settle}.
 */
export function runFocus(
  controllers: Controller[],
  { initial = 'typing', attach = false, menuOpen = true, onStarted = () => {} }: FocusOptions = {}
) {
  const ctl = Controller.createNull({ menuOpen });
  controllers.push(ctl);
  const input = ctl.currentProps.inputElement as HTMLElement;
  document.body.appendChild(input);
  ctl.onDestroy(() => input.remove());
  // Home does not focus the input, thus no focus from home reaches the app.
  const home = {
    settings: { focusInputOnStart: false },
    layout: {
      layout: (c: Controller, params: object) => StandardLayout.create(c, params, icons),
      params: {}
    }
  };
  ctl.app.run(home);
  const { actor, state } = createFocusActor(initial, () => onStarted(ctl));
  const sources = { slot: {}, menu: {}, menuItem: builders };
  const app = attach
    ? attachAppObjectActor(ctl, actor, sources, layouts)
    : appObjectActor(ctl, actor, sources, layouts);
  const focused = initial === 'typing' && menuOpen;
  const ready = focused && Promise.all([rowFocused(ctl, 'input-row'), inputFocused(ctl, true)]);
  ctl.app.run(app);
  const shown = ready || settle();
  return { ctl, app, home, state, shown };
}
