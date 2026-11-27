import { afterEach, expect, test } from 'vitest';
import { Controller } from '../../../controllers/controller.js';
import { fchild, hflex } from '../../../lib/builder.js';
import { cell } from '../../../lib/pull.js';
import { walk } from '../../../lib/utils.js';
import type { AppLayoutParams, FChildParams, FlexParams, UILayout } from '../../../types.js';
import { StandardLayout } from '../../ui/layout/StandardLayout.js';
import { StdMenuItemIds } from '../../ui/menuItems/stdMenuItem.js';
import { waitForState } from '../../test/index.js';
import { appObjectActor, attachAppObjectActor } from '../appObjectActor.js';
import {
  readable,
  slot,
  viewLayout,
  type LayoutSlots,
  type RowParams,
  type ViewDef,
  type ViewSnapshot
} from '../interpreter.js';
import type { OneputEvent } from '../oneputEvents.js';
import { standardLayout } from '../standardLayout.js';
import { standardRow } from '../standardRow.js';

type PageEvent = { type: 'NEXT_PAGE' };

const icons = {
  Close: 'x',
  Accept: 'check',
  Reject: 'x',
  Send: 'send',
  Back: 'left',
  MenuToggle: 'down',
  Busy: 'spin'
};

type BannerParams = AppLayoutParams & { banner?: string };

/** A test-only layout component: it shows only its banner, in the outer UI. */
const bannerLayout = viewLayout({
  slots: { banner: slot<string>() },
  create: (_ctl, initial: BannerParams) => {
    let settings = initial;
    const layout: UILayout<BannerParams> = {
      configure: (params) => {
        settings = params;
      },
      get outerUI() {
        return hflex({
          id: 'banner',
          children: [fchild({ id: 'banner-text', textContent: settings.banner })]
        });
      }
    };
    return layout;
  },
  params: ({ banner }): BannerParams => ({ banner })
});

const layouts = { standard: standardLayout(icons), banner: bannerLayout };
type Layouts = LayoutSlots<typeof layouts>;
const builders = { default: standardRow };
type Rows = RowParams<typeof builders>;
type PageView = ViewDef<Record<never, never>, never, PageEvent, Rows, Layouts>;
type Page = ViewSnapshot<Record<never, never>, never, PageEvent, Rows, Layouts> & {
  can(event: OneputEvent | PageEvent): boolean;
};

const rootView: PageView = {
  layout: 'standard',
  params: { menuTitle: 'Pages' },
  // Keep typed text after a row click, to see what an input switch does to it.
  settings: { clearInputAfterAction: false },
  menu: {
    id: 'pages',
    items: [
      { id: 'next', params: { text: 'Next page' }, send: { type: 'NEXT_PAGE' } },
      { id: 'help', params: { text: 'Help' } }
    ]
  }
};
const secondView: PageView = {
  menu: { items: [{ id: 'next', params: { text: 'Second page' } }] }
};

/** A two-state actor: root > first | second. NEXT_PAGE moves first to second. */
function createPageActor(second: PageView = secondView) {
  let state: 'first' | 'second' = 'first';
  const listeners = new Set<() => void>();
  const snapshot = (): Page => ({
    machine: {
      getStateNodeById: (id) => ({ path: id === 'root' ? [] : ['root'] })
    },
    getMeta: () => ({
      root: { view: rootView },
      ...(state === 'second' && { second: { view: second } })
    }),
    can: () => false
  });
  let current = snapshot();
  return {
    start() {},
    stop() {},
    send(event: OneputEvent | PageEvent) {
      if (event.type !== 'NEXT_PAGE') return;
      state = 'second';
      current = snapshot();
      listeners.forEach((listener) => listener());
    },
    getSnapshot: () => current,
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      return { unsubscribe: () => listeners.delete(onChange) };
    }
  };
}

const controllers: Controller[] = [];

afterEach(() => {
  for (const ctl of controllers) ctl._destroy();
  controllers.length = 0;
});

/** Wait until the menu publishes rows that show `text`. */
function menuShows(ctl: Controller, text: string) {
  return waitForState(ctl, 'set-menu-items', {
    name: `menu rows to show "${text}"`,
    reached: () => JSON.stringify(ctl.currentProps.menuItems).includes(text),
    seen: () => `rows [${ctl.currentProps.menuItems?.map((item) => item.id).join(', ') ?? ''}]`
  });
}

function runPages(second?: PageView) {
  const ctl = Controller.createNull({ menuOpen: true });
  controllers.push(ctl);
  const home = {
    layout: {
      layout: (c: Controller, params: object) => StandardLayout.create(c, params, icons),
      params: {}
    }
  };
  ctl.app.run(home);
  const app = appObjectActor(
    ctl,
    createPageActor(second),
    { slot: {}, menu: {}, menuItem: builders },
    layouts
  );
  const shown = menuShows(ctl, 'Next page');
  ctl.app.run(app);
  return { ctl, home, app, shown };
}

test('a row sends its named event and the child view patches the row in place', async () => {
  // arrange
  const { ctl, home, app, shown } = runPages();
  await shown;
  const patched = menuShows(ctl, 'Second page');

  // act
  ctl.simulateMenuItemClick('next');
  await patched;

  // assert
  const rows = ctl.currentProps.menuItems;
  const next = new StdMenuItemIds('next');
  expect(rows?.map((row) => row.id)).toEqual(['next', 'help']);
  expect(rows?.[0]?.children?.[0]).toMatchObject({
    children: expect.arrayContaining([
      expect.objectContaining({
        id: next.center,
        children: [expect.objectContaining({ id: next.title, textContent: 'Second page' })]
      })
    ])
  });
  expect(ctl.app.isCurrent(app)).toBe(true);
  ctl.app.goBack();
  expect(ctl.app.isCurrent(home)).toBe(true);
});

test('a child view switches the input kind on the redraw and keeps the typed text', async () => {
  // arrange
  const { ctl, shown } = runPages({
    params: { input: { kind: 'textarea', rows: 3 } },
    placeholder: 'Note...',
    menu: { items: [{ id: 'next', params: { text: 'Second page' } }] }
  });
  await shown;
  const firstInput = ctl.currentProps.inputUI?.input;
  await ctl.input.typeText('hello');
  const switched = menuShows(ctl, 'Second page');

  // act
  ctl.simulateMenuItemClick('next');
  await switched;

  // assert
  expect(firstInput).toBeUndefined();
  expect(ctl.currentProps.inputUI?.input).toEqual({ kind: 'textarea', rows: 3 });
  expect(ctl.input.getPlaceholder()).toBe('Note...');
  expect(ctl.input.getInputValue()).toBe('hello');
});

test('a view that names another layout shows that layout component', async () => {
  // arrange
  const { ctl, shown } = runPages({
    layout: 'banner',
    slots: { banner: 'Offline' },
    menu: { items: [{ id: 'next', params: { text: 'Second page' } }] }
  });
  await shown;
  const firstLayout = ctl.ui.getLayout();
  const switched = menuShows(ctl, 'Second page');

  // act
  ctl.simulateMenuItemClick('next');
  await switched;

  // assert
  expect(firstLayout).toBeInstanceOf(StandardLayout);
  expect(ctl.ui.getLayout()).not.toBeInstanceOf(StandardLayout);
  expect(ctl.currentProps.outerUI).toMatchObject({
    id: 'banner',
    children: [expect.objectContaining({ textContent: 'Offline' })]
  });
});

type LabelView = ViewDef<{ label: string }, 'rows', never, Rows, Layouts>;

/** An actor with one state whose snapshot never changes. */
function createStillActor(view: LabelView) {
  const snapshot = {
    machine: { getStateNodeById: () => ({ path: [] }) },
    getMeta: () => ({ root: { view } }),
    can: () => false
  };
  return {
    start() {},
    stop() {},
    send() {},
    getSnapshot: () => snapshot,
    subscribe: () => ({ unsubscribe() {} })
  };
}

test('a readable source change redraws the view with no new snapshot', async () => {
  // arrange
  const ctl = Controller.createNull({ menuOpen: true });
  controllers.push(ctl);
  const label = cell('First label');
  const rows = cell<readonly { id: string; params: { text: string } }[]>([
    { id: 'a', params: { text: 'Row A' } }
  ]);
  const app = appObjectActor(
    ctl,
    createStillActor({
      layout: 'standard',
      params: { menuTitle: { $from: 'label' } },
      menu: { id: 'labels', $from: 'rows' }
    }),
    { slot: { label: readable(label) }, menu: { rows: readable(rows) }, menuItem: builders },
    layouts
  );
  const shown = menuShows(ctl, 'Row A');
  ctl.app.run(app);
  await shown;
  const header = () => JSON.stringify(ctl.currentProps.menuUI?.layoutHeader);
  const retitled = waitForState(ctl, 'set-menu-items', {
    name: 'title "Second label"',
    reached: () => header().includes('Second label'),
    seen: () => (header().includes('First label') ? 'title "First label"' : 'another title')
  });

  // act
  label.set('Second label');
  await retitled;
  const rowsAfterTitle = ctl.currentProps.menuItems?.map((item) => item.id);
  const redrawn = menuShows(ctl, 'Row B');
  rows.set([{ id: 'b', params: { text: 'Row B' } }]);
  await redrawn;

  // assert
  expect(rowsAfterTitle).toEqual(['a']);
  expect(ctl.currentProps.menuItems?.map((item) => item.id)).toEqual(['b']);
  expect(header()).toContain('Second label');
});

test('owned actor reaching done exits the AppObject and passes output to parent onResume', async () => {
  // arrange
  const ctl = Controller.createNull({ menuOpen: true });
  controllers.push(ctl);
  let resumedWith: unknown;
  const home = {
    layout: {
      layout: (c: Controller, params: object) => StandardLayout.create(c, params, icons),
      params: {}
    },
    onResume(result?: { payload?: unknown }) {
      resumedWith = result?.payload;
    }
  };
  ctl.app.run(home);
  let status: 'active' | 'done' = 'active';
  const listeners = new Set<() => void>();
  const makeSnapshot = () => ({
    machine: { getStateNodeById: () => ({ path: [] }) },
    getMeta: () => ({ root: { view: rootView } }),
    can: () => false,
    status,
    output: status === 'done' ? { picked: 'alpha' } : undefined
  });
  let current = makeSnapshot();
  const actor = {
    start() {},
    stop() {},
    send(event: OneputEvent | PageEvent) {
      if (event.type !== 'NEXT_PAGE') return;
      status = 'done';
      current = makeSnapshot();
      listeners.forEach((listener) => listener());
    },
    getSnapshot: () => current,
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      return { unsubscribe: () => listeners.delete(onChange) };
    }
  };
  const app = appObjectActor(ctl, actor, { slot: {}, menu: {}, menuItem: builders }, layouts);
  const shown = menuShows(ctl, 'Next page');
  ctl.app.run(app);
  await shown;
  const exited = waitForState(ctl, 'app-change', {
    name: 'home to resume',
    reached: () => ctl.app.isCurrent(home),
    seen: () => (ctl.app.isCurrent(app) ? 'still in child app' : 'other app')
  });

  // act
  ctl.simulateMenuItemClick('next');
  await exited;

  // assert
  expect(ctl.app.isCurrent(home)).toBe(true);
  expect(resumedWith).toEqual({ picked: 'alpha' });
});

test('attachAppObjectActor forwards events without start/stop and never exits on BACK or done', async () => {
  // arrange
  const ctl = Controller.createNull({ menuOpen: true });
  controllers.push(ctl);
  const home = {
    layout: {
      layout: (c: Controller, params: object) => StandardLayout.create(c, params, icons),
      params: {}
    }
  };
  ctl.app.run(home);
  const sent: (OneputEvent | PageEvent)[] = [];
  let status: 'active' | 'done' = 'active';
  const listeners = new Set<() => void>();
  const makeSnapshot = () => ({
    machine: { getStateNodeById: () => ({ path: [] }) },
    getMeta: () => ({ root: { view: rootView } }),
    can: () => false,
    status,
    output: status === 'done' ? 'finished' : undefined
  });
  let current = makeSnapshot();
  // No start() or stop() methods, matching XState v5 invoked ActorRef.
  const actor = {
    send(event: OneputEvent | PageEvent) {
      sent.push(event);
    },
    getSnapshot: () => current,
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      return { unsubscribe: () => listeners.delete(onChange) };
    },
    finish() {
      status = 'done';
      current = makeSnapshot();
      listeners.forEach((listener) => listener());
    }
  };
  const app = attachAppObjectActor(ctl, actor, { slot: {}, menu: {}, menuItem: builders }, layouts);
  const shown = menuShows(ctl, 'Next page');
  ctl.app.run(app);
  await shown;

  // act
  await ctl.input.typeText('hi');
  ctl.app.goBack();
  const afterBack = ctl.app.isCurrent(app);
  actor.finish();
  await Promise.resolve();
  await Promise.resolve();
  const afterDone = ctl.app.isCurrent(app);
  ctl.app.replace({ layout: home.layout });

  // assert
  expect(sent).toContainEqual({ type: 'STARTED' });
  expect(sent).toContainEqual({ type: 'INPUT_CHANGED', value: 'hi' });
  expect(sent).toContainEqual({ type: 'BACK' });
  expect(sent).not.toContainEqual({ type: 'EXITED' });
  expect(afterBack).toBe(true);
  expect(afterDone).toBe(true);
});

test('two synchronous Backs on an owned actor exit once with output and keep home current', async () => {
  // arrange
  const ctl = Controller.createNull({ menuOpen: true });
  controllers.push(ctl);
  const layout = {
    layout: (c: Controller, params: object) => StandardLayout.create(c, params, icons),
    params: {}
  };
  const root = { layout };
  const resumed: unknown[] = [];
  const home = {
    layout,
    onResume(result?: { payload?: unknown }) {
      resumed.push(result?.payload);
    }
  };
  ctl.app.run(root);
  ctl.app.run(home);
  let status: 'active' | 'done' = 'active';
  const listeners = new Set<() => void>();
  const makeSnapshot = () => ({
    machine: { getStateNodeById: () => ({ path: [] }) },
    getMeta: () => ({ root: { view: rootView } }),
    can: (event: OneputEvent | PageEvent) => status === 'active' && event.type === 'BACK',
    status,
    output: status === 'done' ? { picked: 'beta' } : undefined
  });
  let current = makeSnapshot();
  const actor = {
    start() {},
    stop() {},
    send(event: OneputEvent | PageEvent) {
      if (event.type !== 'BACK' || status === 'done') return;
      status = 'done';
      current = makeSnapshot();
      listeners.forEach((listener) => listener());
    },
    getSnapshot: () => current,
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      return { unsubscribe: () => listeners.delete(onChange) };
    }
  };
  const app = appObjectActor(ctl, actor, { slot: {}, menu: {}, menuItem: builders }, layouts);
  const shown = menuShows(ctl, 'Next page');
  ctl.app.run(app);
  await shown;
  const exited = waitForState(ctl, 'app-change', {
    name: 'home to resume',
    reached: () => ctl.app.isCurrent(home),
    seen: () => (ctl.app.isCurrent(app) ? 'still in child app' : 'other app')
  });

  // act
  ctl.app.goBack();
  ctl.app.goBack();
  await exited;

  // assert
  expect(ctl.app.isCurrent(home)).toBe(true);
  expect(resumed).toEqual([{ picked: 'beta' }]);
});

test('attachAppObjectActor does not send EXITED when externally replaced while active', async () => {
  // arrange
  const ctl = Controller.createNull({ menuOpen: true });
  controllers.push(ctl);
  const layout = {
    layout: (c: Controller, params: object) => StandardLayout.create(c, params, icons),
    params: {}
  };
  ctl.app.run({ layout });
  const sent: (OneputEvent | PageEvent)[] = [];
  const snapshot = {
    machine: { getStateNodeById: () => ({ path: [] }) },
    getMeta: () => ({ root: { view: rootView } }),
    can: () => false,
    status: 'active' as const
  };
  const actor = {
    send(event: OneputEvent | PageEvent) {
      sent.push(event);
    },
    getSnapshot: () => snapshot,
    subscribe: () => ({ unsubscribe() {} })
  };
  const app = attachAppObjectActor(ctl, actor, { slot: {}, menu: {}, menuItem: builders }, layouts);
  const shown = menuShows(ctl, 'Next page');
  ctl.app.run(app);
  await shown;

  // act
  ctl.app.replace({ layout });

  // assert
  expect(sent).toEqual([{ type: 'STARTED' }]);
});

// tinykeys maps $mod to Meta on a mac and to Control elsewhere.
const mod = /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true };

type NoteEvent = { type: 'SAVE' } | { type: 'MARK' };
type NoteView = ViewDef<{ text: string; label: string }, never, NoteEvent, Rows, Layouts>;
type NoteState = { text: string; saved: string[]; marks: number };

const noteMenu: NoteView['menu'] = {
  id: 'note',
  items: [{ id: 'label', params: { text: { $from: 'label' } } }]
};
const noteView: NoteView = {
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
const markedView: NoteView = {
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

function runNotes(viewOf: (state: NoteState) => NoteView = () => noteView) {
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

function sendButton(ctl: Controller) {
  let found: FChildParams | undefined;
  walk(ctl.currentProps.inputUI?.right as FlexParams, (child) => {
    if (child.type === 'fchild' && child.attr?.title === 'Send') found = child as FChildParams;
  });
  if (!found) throw new Error('no Send button');
  return found;
}

/** The Send button's click handler. The button has one only while enabled. */
function sendClick(ctl: Controller) {
  return sendButton(ctl).attr?.onclick as (event: Event) => void;
}

test('a view action sends its event when the machine can take it and declines otherwise', async () => {
  // arrange
  const { ctl, state, shown } = runNotes();
  await shown;

  // act
  const declined = await ctl.simulateKey('Enter', mod);
  await ctl.input.typeText('hello');
  await menuShows(ctl, 'Text: [hello]');
  const saved = await ctl.simulateKey('Enter', mod);
  await ctl.simulateKey('m', mod);

  // assert
  expect(declined.defaultPrevented).toBe(false);
  expect(saved.defaultPrevented).toBe(true);
  expect(state.saved).toEqual(['hello']);
  expect(state.marks).toBe(1);
});

test('a state change replaces and removes view key bindings', async () => {
  // arrange
  const { ctl, state, shown } = runNotes(({ marks }) => (marks > 0 ? markedView : noteView));
  await shown;
  await ctl.input.typeText('hello');
  await menuShows(ctl, 'Text: [hello]');

  // act
  await ctl.simulateKey('m', mod);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await ctl.simulateKey('m', mod);
  await ctl.simulateKey('Enter', mod);
  const savedByOldKey = [...state.saved];
  await ctl.simulateKey('s', mod);

  // assert
  expect(state.marks).toBe(1);
  expect(savedByOldKey).toEqual([]);
  expect(state.saved).toEqual(['hello']);
  expect(ctl.keys.getCurrentBindings()).not.toHaveProperty('MARK');
});

test('a refresh while a modal is open keeps the modal keys', async () => {
  // arrange
  const { ctl, actor, state, shown } = runNotes();
  await shown;
  ctl.confirm({ message: 'Sure?' });
  const modalKeys = Object.keys(ctl.keys.getCurrentBindings());
  const refreshed = menuShows(ctl, 'Text: [hello]');

  // act
  actor.send({ type: 'INPUT_CHANGED', value: 'hello' });
  await refreshed;
  const keysAfterRefresh = Object.keys(ctl.keys.getCurrentBindings());
  await ctl.simulateKey('Escape');
  await ctl.simulateKey('Enter', mod);

  // assert
  expect(modalKeys).toEqual(['ok', 'cancel']);
  expect(keysAfterRefresh).toEqual(['ok', 'cancel']);
  expect(state.saved).toEqual(['hello']);
});

test('Escape closes Confirm when the app has a cancel action', async () => {
  // arrange
  const { ctl, state, shown } = runNotes(() => ({
    ...noteView,
    actions: { ...noteView.actions, cancel: { send: { type: 'MARK' } } }
  }));
  await shown;
  ctl.confirm({ message: 'Sure?' });

  // act
  await ctl.simulateKey('Escape');

  // assert
  expect(state.marks).toBe(0);
  expect(Object.keys(ctl.keys.getCurrentBindings())).not.toContain('ok');
});

test('inputSend is enabled while the machine can take its event, and inputValue clears the input', async () => {
  // arrange
  const { ctl, state, shown } = runNotes();
  await shown;
  const disabledAtStart = sendButton(ctl).attr?.disabled;
  await ctl.input.typeText('hello');
  await menuShows(ctl, 'Text: [hello]');
  const enabledWithText = !sendButton(ctl).attr?.disabled;
  const cleared = menuShows(ctl, 'Text: []');

  // act
  sendClick(ctl)(new MouseEvent('click'));
  await cleared;

  // assert
  expect(disabledAtStart).toBe(true);
  expect(enabledWithText).toBe(true);
  expect(state.saved).toEqual(['hello']);
  expect(ctl.input.getInputValue()).toBe('');
  expect(sendButton(ctl).attr?.disabled).toBe(true);
});

test('a retained inputSend callback sends nothing when the machine cannot take it or the app is not current', async () => {
  // arrange
  const { ctl, actor, state, shown } = runNotes();
  await shown;
  await ctl.input.typeText('hello');
  await menuShows(ctl, 'Text: [hello]');
  const retained = sendClick(ctl);
  actor.send({ type: 'INPUT_CHANGED', value: '' });

  // act
  retained(new MouseEvent('click'));
  actor.send({ type: 'INPUT_CHANGED', value: 'again' });
  ctl.app.run({ layout: { layout: (c) => StandardLayout.create(c, {}, icons), params: {} } });
  retained(new MouseEvent('click'));

  // assert
  expect(state.saved).toEqual([]);
});

test('a controlled inputValue keeps its whitespace', async () => {
  // arrange
  const { ctl, actor, shown } = runNotes();
  await shown;
  const shownSpaced = menuShows(ctl, 'Text: [ x ]');

  // act
  actor.send({ type: 'INPUT_CHANGED', value: ' x ' });
  await shownSpaced;

  // assert
  expect(ctl.input.getInputValue()).toBe(' x ');
});
