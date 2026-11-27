/**
 * The notes app: a test fixture for the adapter's actions, `inputSend` and
 * `inputValue`. A fake actor stands for a machine with a note editor.
 */
import { Controller } from '../../../controllers/controller.js';
import { walk } from '../../../lib/utils.js';
import type { FChildParams, FlexParams } from '../../../types.js';
import { StandardLayout } from '../../ui/layout/StandardLayout.js';
import { waitForState } from '../../test/index.js';
import { appObjectActor } from '../appObjectActor.js';
import type { LayoutSlots, RowParams, ViewDef } from '../interpreter.js';
import type { OneputEvent } from '../oneputEvents.js';
import { standardLayout } from '../standardLayout.js';
import { standardRow } from '../standardRow.js';

export const icons = {
  Close: 'x',
  Accept: 'check',
  Reject: 'x',
  Send: 'send',
  Back: 'left',
  MenuToggle: 'down',
  Busy: 'spin'
};

const layouts = { standard: standardLayout(icons) };
type Layouts = LayoutSlots<typeof layouts>;
const builders = { default: standardRow };
type Rows = RowParams<typeof builders>;

/** Wait until the menu publishes rows that show `text`. */
export function menuShows(ctl: Controller, text: string) {
  return waitForState(ctl, 'set-menu-items', {
    name: `menu rows to show "${text}"`,
    reached: () => JSON.stringify(ctl.currentProps.menuItems).includes(text),
    seen: () => `rows [${ctl.currentProps.menuItems?.map((item) => item.id).join(', ') ?? ''}]`
  });
}

// tinykeys maps $mod to Meta on a mac and to Control elsewhere.
export const mod = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  ? { metaKey: true }
  : { ctrlKey: true };

type NoteEvent = { type: 'SAVE' } | { type: 'MARK' };
export type NoteView = ViewDef<{ text: string; label: string }, never, NoteEvent, Rows, Layouts>;
export type NoteState = { text: string; saved: string[]; marks: number };

const noteMenu: NoteView['menu'] = {
  id: 'note',
  items: [{ id: 'label', params: { text: { $from: 'label' } } }]
};
export const noteView: NoteView = {
  layout: 'standard',
  inputValue: { $from: 'text' },
  actions: {
    SAVE: { send: { type: 'SAVE' }, binding: { bindings: ['$mod+Enter'], description: 'Save' } },
    MARK: { send: { type: 'MARK' }, binding: { bindings: ['$mod+m'], description: 'Mark' } }
  },
  inputSend: { send: { type: 'SAVE' } },
  menu: noteMenu
};
/** After a mark: SAVE moves to another key, and MARK is gone. */
export const markedView: NoteView = {
  layout: 'standard',
  actions: {
    SAVE: { send: { type: 'SAVE' }, binding: { bindings: ['$mod+s'], description: 'Save' } }
  },
  menu: noteMenu
};

/**
 * A note editor. The machine can take SAVE only with text; SAVE stores the
 * text and clears it. MARK counts, and `viewOf` can show another view after it.
 */
function createNoteActor(viewOf: (state: NoteState) => NoteView) {
  const state: NoteState = { text: '', saved: [], marks: 0 };
  const listeners = new Set<() => void>();
  const snapshot = () => ({
    machine: { getStateNodeById: () => ({ path: [] }) },
    getMeta: () => ({ root: { view: viewOf(state) } }),
    can: (event: OneputEvent | NoteEvent) => event.type !== 'SAVE' || state.text !== '',
    context: { text: state.text }
  });
  let current = snapshot();
  const actor = {
    start() {},
    stop() {},
    send(event: OneputEvent | NoteEvent) {
      if (event.type === 'INPUT_CHANGED') state.text = event.value;
      else if (event.type === 'SAVE') {
        state.saved.push(state.text);
        state.text = '';
      } else if (event.type === 'MARK') state.marks++;
      else return;
      current = snapshot();
      listeners.forEach((listener) => listener());
    },
    getSnapshot: () => current,
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      return { unsubscribe: () => listeners.delete(onChange) };
    }
  };
  return { actor, state };
}

export function runNotes(
  controllers: Controller[],
  viewOf: (state: NoteState) => NoteView = () => noteView
) {
  const ctl = Controller.createNull({ menuOpen: true });
  controllers.push(ctl);
  const home = {
    layout: {
      layout: (c: Controller, params: object) => StandardLayout.create(c, params, icons),
      params: {}
    }
  };
  ctl.app.run(home);
  const { actor, state } = createNoteActor(viewOf);
  type Note = ReturnType<typeof actor.getSnapshot>;
  const app = appObjectActor(
    ctl,
    actor,
    {
      slot: {
        text: ({ context }: Note) => context.text,
        label: ({ context }: Note) => `Text: [${context.text}]`
      },
      menu: {},
      menuItem: builders
    },
    layouts
  );
  const shown = menuShows(ctl, 'Text: []');
  ctl.app.run(app);
  return { ctl, actor, state, shown };
}

export function sendButton(ctl: Controller) {
  let found: FChildParams | undefined;
  walk(ctl.currentProps.inputUI?.right as FlexParams, (child) => {
    if (child.type === 'fchild' && child.attr?.title === 'Send') found = child as FChildParams;
  });
  if (!found) throw new Error('no Send button');
  return found;
}

/** The Send button's click handler. The button has one only while enabled. */
export function sendClick(ctl: Controller) {
  return sendButton(ctl).attr?.onclick as (event: Event) => void;
}
