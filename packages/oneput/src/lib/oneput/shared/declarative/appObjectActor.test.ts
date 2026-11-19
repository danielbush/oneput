import { afterEach, expect, test } from 'vitest';
import { Controller } from '../../controllers/controller.js';
import { StandardLayout } from '../ui/layout/StandardLayout.js';
import { StdMenuItemIds } from '../ui/menuItems/stdMenuItem.js';
import { appObjectActor } from './appObjectActor.js';
import type { ViewDef, ViewSnapshot } from './interpreter.js';
import type { OneputEvent } from './oneputEvents.js';

type PageEvent = { type: 'NEXT_PAGE' };
type Page = ViewSnapshot<never, never, PageEvent> & {
  can(event: OneputEvent | PageEvent): boolean;
};

const rootView: ViewDef<never, never, PageEvent> = {
  title: 'Pages',
  menu: {
    id: 'pages',
    items: [
      { id: 'next', text: 'Next page', send: { type: 'NEXT_PAGE' } },
      { id: 'help', text: 'Help' }
    ]
  }
};
const secondView: ViewDef<never, never, PageEvent> = {
  menu: { items: [{ id: 'next', text: 'Second page' }] }
};

/** A two-state actor: root > first | second. NEXT_PAGE moves first to second. */
function createPageActor() {
  let state: 'first' | 'second' = 'first';
  const listeners = new Set<() => void>();
  const snapshot = (): Page => ({
    machine: {
      getStateNodeById: (id) => ({ path: id === 'root' ? [] : ['root'] })
    },
    getMeta: () => ({
      root: { view: rootView },
      ...(state === 'second' && { second: { view: secondView } })
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

const icons = {
  Close: 'x',
  Accept: 'check',
  Reject: 'x',
  Send: 'send',
  Back: 'left',
  MenuToggle: 'down'
};
const controllers: Controller[] = [];

afterEach(() => {
  for (const ctl of controllers) ctl.destroy();
  controllers.length = 0;
});

test('a row sends its named event and the child view patches the row in place', async () => {
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
  const app = appObjectActor(ctl, createPageActor(), { text: {}, lists: {} });
  ctl.app.run(app);
  await new Promise<void>((resolve) => setImmediate(resolve));

  // act
  ctl.simulateMenuItemClick('next');
  await new Promise<void>((resolve) => setImmediate(resolve));

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
