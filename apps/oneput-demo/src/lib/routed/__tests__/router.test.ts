// @vitest-environment jsdom
import { Controller, type AppObject } from '@oneput/oneput';
import { routeMachine } from '@oneput/oneput/shared/routing/xstate/routeMachine.js';
import { waitForState } from '@oneput/oneput/shared/test/index.js';
import { afterEach, describe, expect, it } from 'vitest';
import { createActor, setup } from 'xstate';
import { Layout } from '../../common/layout.js';
import { Online } from '../../common/online.js';
import { SearchService } from '../../service/SearchService.js';
import { createAsyncSearchApp } from '../../shared/asyncSearchDeclarative/appObject.js';
import { createFlowRouter } from '../router.js';

const controllers: Controller[] = [];
const stops: (() => void)[] = [];

afterEach(() => {
  for (const stop of stops) stop();
  stops.length = 0;
  for (const ctl of controllers) ctl._destroy();
  controllers.length = 0;
});

function rowIds(ctl: Controller) {
  return ctl.currentProps.menuItems?.map((item) => item.id);
}

function menuHas(ctl: Controller, id: string) {
  return waitForState(ctl, 'set-menu-items', {
    name: `menu row "${id}"`,
    reached: () => rowIds(ctl)?.includes(id) === true,
    seen: () => `rows [${rowIds(ctl)?.join(', ') ?? ''}]`
  });
}

function startRoutedDemo() {
  const ctl = Controller.createNull({ menuOpen: true });
  controllers.push(ctl);
  ctl.app.run({ layout: { layout: Layout.create, params: {} } });
  const router = createFlowRouter({
    search: SearchService.createNull(),
    online: Online.createNull()
  });
  const actor = createActor(router.machine);
  actor.start();
  const route = router.route(ctl, actor);
  stops.push(() => {
    route.stop();
    actor.stop();
  });
  return { ctl, actor };
}

describe('routed declarative async search', () => {
  it('returns to welcome via parent onDone when Back is pressed', async () => {
    // arrange
    const { ctl, actor } = startRoutedDemo();
    const searchShown = menuHas(ctl, 'instructions');
    actor.send({ type: 'SEARCH' });
    await searchShown;
    const welcomeShown = menuHas(ctl, 'search');

    // act
    ctl.app.goBack();
    await welcomeShown;

    // assert
    expect(actor.getSnapshot().value).toBe('welcome');
    expect(rowIds(ctl)).toContain('search');
  });

  it('leaves cleanly when the parent transitions away while the child is active', async () => {
    // arrange
    const { ctl, actor } = startRoutedDemo();
    const searchShown = menuHas(ctl, 'instructions');
    actor.send({ type: 'SEARCH' });
    await searchShown;
    const welcomeShown = menuHas(ctl, 'search');

    // act
    actor.send({ type: 'EXITED' });
    await welcomeShown;

    // assert
    expect(actor.getSnapshot().value).toBe('welcome');
    expect(rowIds(ctl)).toContain('search');
  });

  it('replaces the AppObject with the new child actor on same-state reenter: true', async () => {
    // arrange
    const ctl = Controller.createNull({ menuOpen: true });
    controllers.push(ctl);
    ctl.app.run({ layout: { layout: Layout.create, params: {} } });
    const shownApps: AppObject[] = [];
    ctl.events.on('app-change', (change) => {
      if (change.current) shownApps.push(change.current);
    });
    const asyncSearch = createAsyncSearchApp({
      search: SearchService.createNull(),
      online: Online.createNull()
    });
    const parentMachine = setup({
      types: { events: {} as { type: 'REENTER' } },
      actors: { asyncSearch: asyncSearch.machine }
    }).createMachine({
      id: 'reenter-demo',
      initial: 'search',
      states: {
        search: {
          invoke: { id: 'search', src: 'asyncSearch', onDone: 'done' },
          on: { REENTER: { target: 'search', reenter: true } }
        },
        done: { type: 'final' }
      }
    });
    const actor = createActor(parentMachine);
    actor.start();
    const firstShown = menuHas(ctl, 'instructions');
    const route = routeMachine(ctl, actor, {
      search: asyncSearch.fromChild(ctl, 'search'),
      done: () => ({})
    });
    stops.push(() => {
      route.stop();
      actor.stop();
    });
    await firstShown;
    const firstApp = shownApps.at(-1);
    const firstChild = actor.getSnapshot().children.search;

    // act
    const reentered = waitForState(ctl, 'app-change', {
      name: 'replacement search AppObject',
      reached: () => shownApps.at(-1) !== firstApp,
      seen: () => 'same AppObject'
    });
    actor.send({ type: 'REENTER' });
    await reentered;
    const secondApp = shownApps.at(-1);
    const secondChild = actor.getSnapshot().children.search;
    ctl.app.goBack();

    // assert
    expect(secondChild).not.toBe(firstChild);
    expect(secondApp).not.toBe(firstApp);
    expect(actor.getSnapshot().value).toBe('done');
  });
});
