import { afterEach, expect, test } from 'vitest';
import { Controller } from '../../../controllers/controller.js';
import { fchild, hflex } from '../../../lib/builder.js';
import { cell } from '../../../lib/pull.js';
import type { AppLayoutParams, UILayout } from '../../../types.js';
import { StandardLayout } from '../../ui/layout/StandardLayout.js';
import { StdMenuItemIds } from '../../ui/menuItems/stdMenuItem.js';
import { waitForState } from '../../test/index.js';
import { appObjectActor } from '../appObjectActor.js';
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
    input: { kind: 'textarea', rows: 3, placeholder: 'Note...' },
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
      params: { menuTitle: { from: 'label' } },
      menu: { id: 'labels', from: 'rows' }
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
