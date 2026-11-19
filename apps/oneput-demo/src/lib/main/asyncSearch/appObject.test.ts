// @vitest-environment jsdom
import { Controller } from '@oneput/oneput';
import { StdMenuItemIds } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { err, ok } from 'neverthrow';
import { describe, expect, it } from 'vitest';
import { SimulatedClock } from 'xstate';
import { Layout } from '../../common/_layout.js';
import { createAsyncSearchAppObject } from './appObject.js';
import { SearchService } from './searchService.js';

function createController() {
  const ctl = Controller.createNull({ menuOpen: true });
  ctl.app.run({ layout: { layout: Layout.create, params: {} } });
  return ctl;
}

function status(ctl: Controller) {
  const outerRight = ctl.currentProps.outerUI?.children?.[1];
  return outerRight && outerRight.type === 'fchild' ? outerRight.textContent : undefined;
}

/** Let resolved requests and the controller's queued refresh update the view. */
async function flushSearchView() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('declarative async search AppObject', () => {
  it('starts a debounce with the default clock', async () => {
    // arrange
    const ctl = createController();
    ctl.app.run(createAsyncSearchAppObject(ctl, SearchService.createNull()));

    // act
    await ctl.input.typeText('app');
    await flushSearchView();

    // assert
    expect(status(ctl)).toBe('Debouncing...');
    ctl.app.exit();
    ctl.destroy();
  });

  it('restarts the debounce, draws the results, and selects the last row', async () => {
    // arrange
    const ctl = createController();
    const clock = new SimulatedClock();
    const service = SearchService.createNull({
      clock,
      response: (query) => ({
        result: ok(Array.from(query, (text) => ({ id: text, text }))),
        delayMs: 50
      })
    });
    const app = createAsyncSearchAppObject(ctl, service, clock);
    ctl.app.run(app);
    await flushSearchView();
    const initialRows = ctl.currentProps.menuItems?.map((item) => item.id);

    // act
    await ctl.input.typeText('a');
    clock.increment(400);
    await ctl.input.typeText('p');
    clock.increment(100);
    await flushSearchView();
    const debouncingStatus = status(ctl);
    const pendingRows = ctl.currentProps.menuItems;

    clock.increment(400);
    await flushSearchView();
    const fetchingStatus = status(ctl);
    const spinner = ctl.currentProps.inputUI?.right?.children?.[0];
    clock.increment(50);
    await flushSearchView();
    const resultIds = ctl.currentProps.menuItems?.map((item) => item.id);
    const focusedId = ctl.menu.focusedMenuItem?.id;
    const readyStatus = status(ctl);
    const busyAfterResults = ctl.currentProps.inputUI?.right;

    ctl.simulateMenuItemClick('p');
    await flushSearchView();

    // assert
    expect(initialRows).toEqual(['instructions']);
    expect(ctl.input.getPlaceholder()).toBe('Start typing something...');
    expect(debouncingStatus).toBe('Debouncing...');
    expect(pendingRows).toEqual([]);
    expect(fetchingStatus).toBe('Fetching data...');
    expect(spinner).toMatchObject({
      icon: 'RefreshCw',
      classes: expect.arrayContaining(['oneput__rotate'])
    });
    expect(resultIds).toEqual(['a', 'p']);
    expect(focusedId).toBe('p');
    expect(readyStatus).toBe('Ready');
    expect(busyAfterResults).toBeUndefined();
    expect(status(ctl)).toBe('Selected: p');
    expect(ctl.input.getInputValue()).toBe('');
    expect(ctl.app.isCurrent(app)).toBe(true);
    ctl.app.exit();
    ctl.destroy();
  });

  it.each([
    ['success', ok([{ id: 'stale', text: 'Stale result' }])],
    ['failure', err({ message: 'Stale failure' })]
  ])('keeps newer results after an older %s', async (_, staleResponse) => {
    // arrange
    const ctl = createController();
    const clock = new SimulatedClock();
    const service = SearchService.createNull({
      clock,
      response: (query) =>
        query === 'ap'
          ? { result: staleResponse, delayMs: 700 }
          : { result: ok([{ id: 'latest', text: query }]) }
    });
    ctl.app.run(createAsyncSearchAppObject(ctl, service, clock));

    // act
    await ctl.input.typeText('ap');
    clock.increment(500);
    await flushSearchView();
    const originalStatus = status(ctl);
    await ctl.input.typeText('p');
    clock.increment(500);
    await flushSearchView();
    const firstResults = ctl.currentProps.menuItems?.map((item) => item.id);
    clock.increment(200);
    await flushSearchView();

    // assert
    expect(originalStatus).toBe('Fetching data...');
    expect(firstResults).toEqual(['latest']);
    expect(ctl.currentProps.menuItems?.map((item) => item.id)).toEqual(['latest']);
    expect(status(ctl)).toBe('Ready');
    expect(ctl.input.getInputValue()).toBe('app');
    ctl.app.exit();
    ctl.destroy();
  });

  it('shows the error and retries the same input', async () => {
    // arrange
    const ctl = createController();
    const clock = new SimulatedClock();
    const responses = [
      err({ message: 'Simulated search failure' }),
      ok([{ id: 'result', text: 'app' }])
    ];
    const service = SearchService.createNull({
      clock,
      response: (query) => ({ result: query === 'app' ? (responses.shift() ?? ok([])) : ok([]) })
    });
    ctl.app.run(createAsyncSearchAppObject(ctl, service, clock));

    // act
    await ctl.input.typeText('app');
    clock.increment(500);
    await flushSearchView();
    const failedStatus = status(ctl);
    const errorRow = ctl.currentProps.menuItems?.[0];
    ctl.simulateMenuItemClick('retry-search');
    await flushSearchView();
    const retryingStatus = status(ctl);
    clock.increment(500);
    await flushSearchView();

    // assert
    expect(failedStatus).toBe('⚠️ Error');
    expect(errorRow).toMatchObject({ id: 'retry-search' });
    const retryIds = new StdMenuItemIds('retry-search');
    expect(
      errorRow?.children?.find((child) => child && child.id === retryIds.bottom)
    ).toMatchObject({
      children: expect.arrayContaining([
        expect.objectContaining({
          id: retryIds.bottomCenter,
          textContent: 'Simulated search failure'
        })
      ])
    });
    expect(retryingStatus).toBe('Debouncing...');
    expect(status(ctl)).toBe('Ready');
    expect(ctl.input.getInputValue()).toBe('app');
    expect(ctl.currentProps.menuItems?.map((item) => item.id)).toEqual(['result']);
    ctl.app.exit();
    ctl.destroy();
  });

  it('holds edits from the start of closing until the next open edit', async () => {
    // arrange
    const ctl = createController();
    const clock = new SimulatedClock();
    const service = SearchService.createNull({
      clock,
      response: (query) => ({ result: ok([{ id: query, text: query }]) })
    });
    ctl.app.run(createAsyncSearchAppObject(ctl, service, clock));
    await flushSearchView();

    // act
    const closed = new Promise<void>((resolve) => {
      const stop = ctl.events.on('menu-open-change', (open) => {
        if (!open) {
          stop();
          resolve();
        }
      });
    });
    ctl.menu.closeMenu();
    await ctl.input.typeText('a');
    const stillRenderingOpen = ctl.menu.isMenuOpen;
    const closingStatus = status(ctl);

    await closed;
    await ctl.input.typeText('p');
    clock.increment(500);
    await ctl.simulateOpenMenu();
    const reopenedRows = ctl.currentProps.menuItems?.map((item) => item.id);
    const reopenedStatus = status(ctl);

    await ctl.input.typeText('p');
    clock.increment(500);
    await flushSearchView();

    // assert
    expect(stillRenderingOpen).toBe(true);
    expect(closingStatus).toBe('');
    expect(reopenedRows).toEqual(['instructions']);
    expect(reopenedStatus).toBe('');
    expect(ctl.input.getInputValue()).toBe('app');
    expect(ctl.currentProps.menuItems?.map((item) => item.id)).toEqual(['app']);
    expect(status(ctl)).toBe('Ready');
    ctl.app.exit();
    ctl.destroy();
  });

  it('shows instructions for blank input and an empty menu for no results', async () => {
    // arrange
    const ctl = createController();
    const clock = new SimulatedClock();
    ctl.app.run(createAsyncSearchAppObject(ctl, SearchService.createNull(), clock));

    // act
    await ctl.input.typeText('   ');
    clock.increment(500);
    await flushSearchView();
    const blankRows = ctl.currentProps.menuItems?.map((item) => item.id);
    await ctl.input.typeText('a');
    clock.increment(500);
    await flushSearchView();

    // assert
    expect(blankRows).toEqual(['instructions']);
    expect(ctl.currentProps.menuItems).toEqual([]);
    expect(status(ctl)).toBe('Ready');
    ctl.app.exit();
    ctl.destroy();
  });
});
