// @vitest-environment jsdom
import { Controller } from '@oneput/oneput';
import { appObjectActor } from '@oneput/oneput/shared/declarative/appObjectActor.js';
import type { ViewDef } from '@oneput/oneput/shared/declarative/interpreter.js';
import type { OneputEvent } from '@oneput/oneput/shared/declarative/oneputEvents.js';
import { StdMenuItemIds } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { expect, test } from 'vitest';
import { createActor, setup } from 'xstate';
import { Layout } from '../common/_layout.js';

type PageEvent = { type: 'NEXT_PAGE' };

const pageMachine = setup({
  types: {
    events: {} as OneputEvent | PageEvent,
    meta: {} as { view?: ViewDef<never, never, PageEvent> }
  }
}).createMachine({
  description: 'Show two pages in the same menu.',
  initial: 'first',
  meta: {
    view: {
      title: 'Pages',
      menu: {
        id: 'pages',
        items: [
          { id: 'next', text: 'Next page', send: { type: 'NEXT_PAGE' } },
          { id: 'help', text: 'Help' }
        ]
      }
    }
  },
  states: {
    first: {
      description: 'Offer to open the next page.',
      on: {
        NEXT_PAGE: {
          target: 'second',
          description: 'Open the second page in the current menu.'
        }
      }
    },
    second: {
      description: 'Mark the original row as the current page.',
      meta: { view: { menu: { items: [{ id: 'next', text: 'Second page' }] } } }
    }
  }
});

test('a row sends its named event and the child view patches the row in place', async () => {
  // arrange
  const ctl = Controller.createNull({ menuOpen: true });
  const home = { layout: { layout: Layout.create, params: {} } };
  ctl.app.run(home);
  const app = appObjectActor(ctl, createActor(pageMachine), { text: {}, lists: {} });
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
  ctl.destroy();
});
