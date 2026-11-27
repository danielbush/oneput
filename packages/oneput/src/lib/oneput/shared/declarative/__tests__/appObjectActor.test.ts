import { afterEach, expect, test } from 'vitest';
import { Controller } from '../../../controllers/controller.js';
import { fchild, hflex } from '../../../lib/builder.js';
import { cell } from '../../../lib/pull.js';
import type { AppLayoutParams, UILayout } from '../../../types.js';
import { StandardLayout } from '../../ui/layout/StandardLayout.js';
import { StdMenuItemIds } from '../../ui/menuItems/stdMenuItem.js';
import { swapInputElement, waitForState } from '../../test/index.js';
import {
  icons,
  markedView,
  menuShows,
  mod,
  noteView,
  runNotes,
  sendButton,
  sendClick
} from './notesApp.js';
import { focusedRow, inputFocused, rowFocused, runFocus, settle } from './focusApp.js';
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
  expect(sent.map(({ type }) => type)).toEqual(['STARTED', 'ITEM_FOCUSED']);
});

test('a view action sends its event when the machine can take it and declines otherwise', async () => {
  // arrange
  const { ctl, state, shown } = runNotes(controllers);
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
  const { ctl, state, shown } = runNotes(controllers, ({ marks }) =>
    marks > 0 ? markedView : noteView
  );
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
  const { ctl, actor, state, shown } = runNotes(controllers);
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
  const { ctl, state, shown } = runNotes(controllers, () => ({
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
  const { ctl, state, shown } = runNotes(controllers);
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
  const { ctl, actor, state, shown } = runNotes(controllers);
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
  const { ctl, actor, shown } = runNotes(controllers);
  await shown;
  const shownSpaced = menuShows(ctl, 'Text: [ x ]');

  // act
  actor.send({ type: 'INPUT_CHANGED', value: ' x ' });
  await shownSpaced;

  // assert
  expect(ctl.input.getInputValue()).toBe(' x ');
});

test('a state focuses its row, a keyboard move blurs the input, and a row event focuses it again', async () => {
  // arrange
  const { ctl, state, shown } = runFocus(controllers);
  await shown;
  const blurred = inputFocused(ctl, false);
  await ctl.simulateKey('j', mod);
  await blurred;
  const stateAfterMove = state.state;
  const rowAfterMove = focusedRow(ctl);
  const refocused = inputFocused(ctl, true);

  // act
  ctl.simulateMenuItemClick('go');
  await refocused;

  // assert
  expect(stateAfterMove).toBe('browsing');
  expect(rowAfterMove).toBe('go');
  expect(state.state).toBe('typing');
  expect(focusedRow(ctl)).toBe('input-row');
});

test('a redraw with the same focus fields keeps the focus that the user moved', async () => {
  // arrange
  const { ctl, state, shown } = runFocus(controllers);
  await shown;
  ctl.menu.focusMenuItemByIndex(0, false, 'pointer');
  const redrawn = menuShows(ctl, 'Input row');

  // act
  await ctl.input.typeText('x');
  await redrawn;

  // assert
  expect(state.text).toBe('x');
  expect(state.state).toBe('typing');
  expect(focusedRow(ctl)).toBe('other');
});

test('input focus from the user sends INPUT_FOCUS_CHANGED once and the state focuses its row', async () => {
  // arrange
  const { ctl, state, shown } = runFocus(controllers);
  await shown;
  const blurred = inputFocused(ctl, false);
  await ctl.simulateKey('j', mod);
  await blurred;
  state.inputFocusEvents.length = 0;
  const onRow = rowFocused(ctl, 'input-row');

  // act
  (ctl.currentProps.inputElement as HTMLElement).focus();
  await onRow;
  await new Promise((resolve) => setTimeout(resolve, 0));

  // assert
  expect(state.state).toBe('typing');
  expect(state.inputFocusEvents).toEqual([true]);
  expect(ctl.input.isFocused).toBe(true);
});

test('input focus sends nothing while a child runs, and resume applies the focus again', async () => {
  // arrange
  const { ctl, app, state, shown } = runFocus(controllers);
  await shown;
  state.inputFocusEvents.length = 0;
  ctl.app.run({ menu: () => ({ id: 'child', items: [] }) });
  const input = ctl.currentProps.inputElement as HTMLElement;
  input.blur();
  input.focus();
  const eventsWhileChild = [...state.inputFocusEvents];
  const resumed = rowFocused(ctl, 'input-row');

  // act
  ctl.app.exit();
  await resumed;

  // assert
  expect(eventsWhileChild).toEqual([]);
  expect(ctl.app.isCurrent(app)).toBe(true);
  expect(focusedRow(ctl)).toBe('input-row');
});

test('a second run of the same AppObject sends one INPUT_FOCUS_CHANGED per focus change', async () => {
  // arrange
  const { ctl, app, home, state, shown } = runFocus(controllers);
  await shown;
  ctl.app.exit();
  const input = ctl.currentProps.inputElement as HTMLElement;
  input.blur();
  const shownAgain = rowFocused(ctl, 'input-row');
  ctl.app.run(app);
  await shownAgain;
  await new Promise((resolve) => setTimeout(resolve, 0));
  input.blur();
  state.inputFocusEvents.length = 0;

  // act
  input.focus();

  // assert
  expect(ctl.app.isCurrent(home)).toBe(false);
  expect(state.inputFocusEvents).toEqual([true]);
});

test('an attached actor that starts and resumes in a blurred state keeps the input blurred', async () => {
  // arrange
  const { ctl, app, state, shown } = runFocus(controllers, { initial: 'browsing', attach: true });
  await shown;
  const afterStart = { state: state.state, focused: ctl.input.isFocused };
  ctl.app.run({ menu: () => ({ id: 'child', items: [] }) });
  await settle();

  // act
  ctl.app.exit();
  await settle();

  // assert
  expect(afterStart).toEqual({ state: 'browsing', focused: false });
  expect(ctl.app.isCurrent(app)).toBe(true);
  expect(state.state).toBe('browsing');
  expect(ctl.input.isFocused).toBe(false);
  expect(state.inputFocusEvents).not.toContain(true);
});

test('a start with the menu closed focuses the view row when the menu opens', async () => {
  // arrange
  const { ctl, shown } = runFocus(controllers, { menuOpen: false });
  await shown;
  const onRow = rowFocused(ctl, 'input-row');

  // act
  await ctl.simulateOpenMenu();
  await onRow;

  // assert
  expect(focusedRow(ctl)).toBe('input-row');
});

test('an exit during STARTED leaves no input focus subscription', async () => {
  // arrange
  const other = { menu: () => ({ id: 'other', items: [] }) };
  let replaced = false;
  const { ctl, app, state } = runFocus(controllers, {
    attach: true,
    menuOpen: false,
    onStarted: (ctl) => {
      if (replaced) return;
      replaced = true;
      ctl.app.replace(other);
    }
  });
  await settle();
  const replacedAtOnce = ctl.app.isCurrent(other);
  ctl.app.run(app);
  await settle();
  const input = ctl.currentProps.inputElement as HTMLElement;
  input.blur();
  state.inputFocusEvents.length = 0;

  // act
  input.focus();

  // assert
  expect(replacedAtOnce).toBe(true);
  expect(ctl.app.isCurrent(app)).toBe(true);
  expect(state.inputFocusEvents).toEqual([true]);
});

test('a menu open in a blurred state keeps the input blurred', async () => {
  // arrange
  const { ctl, state, shown } = runFocus(controllers, { initial: 'browsing' });
  await shown;
  ctl.menu.closeMenu();
  await settle();
  state.inputFocusEvents.length = 0;

  // act
  await ctl.simulateOpenMenu();
  await settle();

  // assert
  expect(ctl.menu.isMenuOpen).toBe(true);
  expect(state.inputFocusEvents).toEqual([]);
  expect(state.state).toBe('browsing');
  expect(ctl.input.isFocused).toBe(false);
});

test('an input element swap while a focus move waits ends the moves', async () => {
  // arrange
  const { ctl, state, shown } = runFocus(controllers);
  await shown;
  // The row's command applies the typing focus again: the refresh queues a
  // focus, then focuses the row. The swap then blurs the focused old element,
  // and the machine goes to browsing, which queues a blur.
  const refreshed = rowFocused(ctl, 'input-row');
  ctl.simulateMenuItemClick('go');
  await refreshed;
  swapInputElement(ctl, 'textarea');
  await settle();
  const changes: boolean[] = [];
  ctl.input.subscribeFocusChange((focused) => changes.push(focused));

  // act
  await settle();

  // assert
  expect(changes).toEqual([]);
  expect(state.state).toBe('browsing');
});

/** Wait until a menu refresh shows `text` as the placeholder, or now if it does. */
function placeholderShows(ctl: Controller, text: string) {
  const state = {
    name: `placeholder "${text}"`,
    reached: () => ctl.input.getPlaceholder() === text,
    seen: () => `placeholder "${ctl.input.getPlaceholder()}"`
  };
  return state.reached() ? Promise.resolve() : waitForState(ctl, 'set-menu-items', state);
}

test('a slot shows the active keys or none, redraws on a rebind, and stops after exit', async () => {
  // arrange
  const { ctl, shown } = runNotes(controllers, () => ({
    ...noteView,
    placeholder: { $from: 'keys' }
  }));
  await shown;
  // The first render reads the keys before Oneput sets MARK; its event redraws.
  await placeholderShows(ctl, 'submit none, mark $mod+m');
  const defaults = ctl.keys.getDefaultBindings();
  const rebind = (key: string) =>
    ctl.keys.setDefaultBindings({
      ...defaults,
      SUBMIT: { ...defaults.SUBMIT, bindings: [key] }
    });
  const rebound = placeholderShows(ctl, 'submit $mod+s, mark $mod+m');

  // act
  rebind('$mod+s');
  await rebound;
  ctl.app.exit();
  const afterExit = ctl.input.getPlaceholder();
  rebind('$mod+u');
  // A menu update after the rebind: a refresh of the exited app would run before it.
  const updated = waitForState(ctl, 'set-menu-items', {
    name: 'a menu update',
    reached: () => true,
    seen: () => 'none'
  });
  void ctl.menu.invalidate();
  await updated;

  // assert
  expect(ctl.input.getPlaceholder()).toBe(afterExit);
  expect(afterExit).not.toContain('$mod+u');
});
