// @vitest-environment jsdom
import { Controller } from '@oneput/oneput';
import { waitForState } from '@oneput/oneput/shared/test/index.js';
import { afterEach, describe, expect, it } from 'vitest';
import { Online } from '../../common/online.js';
import { pathOf } from '../../common/watchState.js';
import { SearchService } from '../../service/SearchService.js';
import { init } from '../_init.js';

const controllers: Controller[] = [];

afterEach(() => {
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

/** Start the page with null infrastructure and wait for the root menu. */
async function startDeclarativeDemo() {
  const ctl = Controller.createNull({ menuOpen: true });
  controllers.push(ctl);
  const rootShown = menuHas(ctl, 'katex');
  const { actor } = init(ctl, {
    online: Online.createNull(),
    search: SearchService.createNull()
  });
  await rootShown;
  return { ctl, state: () => pathOf(actor.getSnapshot().value) };
}

describe('declarative demo', () => {
  it('starts on the declarative root menu with no Back', async () => {
    // arrange
    const { ctl, state } = await startDeclarativeDemo();

    // act
    const canGoBack = ctl.app.canGoBack();

    // assert
    expect(state()).toBe('root');
    expect(rowIds(ctl)).toEqual(['search', 'katex']);
    expect(canGoBack).toBe(false);
  });

  it('opens the KaTeX stub and returns to root on Back', async () => {
    // arrange
    const { ctl, state } = await startDeclarativeDemo();
    const stubShown = menuHas(ctl, 'back');
    ctl.simulateMenuItemClick('katex');
    await stubShown;
    const stateInStub = state();
    const canGoBackInStub = ctl.app.canGoBack();
    const rootAgain = menuHas(ctl, 'katex');

    // act
    ctl.simulateMenuItemClick('back');
    await rootAgain;

    // assert
    expect(stateInStub).toBe('katex');
    expect(canGoBackInStub).toBe(true);
    expect(state()).toBe('root');
    expect(ctl.app.canGoBack()).toBe(false);
  });

  it('opens async search and returns to root on Back', async () => {
    // arrange
    const { ctl, state } = await startDeclarativeDemo();
    const searchShown = menuHas(ctl, 'instructions');
    ctl.simulateMenuItemClick('search');
    await searchShown;
    const stateInSearch = state();
    const canGoBackInSearch = ctl.app.canGoBack();
    const rootAgain = menuHas(ctl, 'katex');

    // act
    ctl.app.goBack();
    await rootAgain;

    // assert
    expect(stateInSearch).toBe('search');
    expect(canGoBackInSearch).toBe(true);
    expect(state()).toBe('root');
    expect(ctl.app.canGoBack()).toBe(false);
  });
});
