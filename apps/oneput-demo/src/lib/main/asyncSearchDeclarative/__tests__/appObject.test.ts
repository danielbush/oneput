// @vitest-environment jsdom
import { Controller } from '@oneput/oneput';
import { StdMenuItemIds } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { err, ok } from 'neverthrow';
import { describe, expect, it } from 'vitest';
import { SimulatedClock } from 'xstate';
import { Layout } from '../../../common/layout.js';
import { Online } from '../../../common/online.js';
import { createAsyncSearchAppObject } from '../appObject.js';
import { SearchService } from '../../../service/SearchService.js';
import { waitForState } from '@oneput/oneput/shared/test/index.js';

function createController() {
  const ctl = Controller.createNull({ menuOpen: true });
  ctl.app.run({ layout: { layout: Layout.create, params: {} } });
  return ctl;
}

function status(ctl: Controller) {
  const outerRight = ctl.currentProps.outerUI?.children?.[1];
  return outerRight && outerRight.type === 'fchild' ? outerRight.textContent : undefined;
}

function title(ctl: Controller) {
  const header = ctl.currentProps.menuUI?.layoutHeader?.children?.find(
    (child) => child && child.classes?.includes('oneput__menu-item-header')
  );
  return header && header.type === 'fchild' ? header.textContent : undefined;
}

/** Track each view that the menu publishes, as status and row IDs. */
function trackViews(ctl: Controller) {
  const data: string[] = [];
  ctl.events.on('set-menu-items', () => {
    data.push(`${status(ctl) ?? ''} [${rowIds(ctl)?.join(', ') ?? ''}]`);
  });
  return { data };
}

function rowIds(ctl: Controller) {
  return ctl.currentProps.menuItems?.map((item) => item.id);
}

/**
 * Wait until a menu refresh shows this status and, when given, these row IDs.
 * Call it before the step that leads to that view.
 */
function viewShows(ctl: Controller, expected: { status: string; rows?: readonly string[] }) {
  const rows = (ids?: readonly string[]) => `rows [${ids?.join(', ') ?? ''}]`;
  return waitForState(ctl, 'set-menu-items', {
    name: `open view to show status "${expected.status}"${expected.rows ? ` ${rows(expected.rows)}` : ''}`,
    reached: () =>
      ctl.menu.isMenuOpen &&
      status(ctl) === expected.status &&
      (!expected.rows || rowIds(ctl)?.join() === expected.rows.join()),
    seen: () =>
      `${ctl.menu.isMenuOpen ? 'open' : 'closed'}, status "${status(ctl) ?? ''}" ${rows(rowIds(ctl))}`
  });
}

describe('declarative async search AppObject', () => {
  it('shows the host going offline with no machine event', async () => {
    // arrange
    const ctl = createController();
    const online = Online.createNull();
    const shown = viewShows(ctl, { status: '', rows: ['instructions'] });
    ctl.app.run(createAsyncSearchAppObject(ctl, online, SearchService.createNull()));
    await shown;
    const onlineTitle = title(ctl);
    const offline = waitForState(ctl, 'set-menu-items', {
      name: 'title "Async Search Example (offline)"',
      reached: () => title(ctl) === 'Async Search Example (offline)',
      seen: () => `title "${title(ctl) ?? ''}"`
    });

    // act
    online.simulate(false);
    await offline;

    // assert
    expect(onlineTitle).toBe('Async Search Example');
    expect(rowIds(ctl)).toEqual(['instructions']);
    ctl.app.exit();
    ctl._destroy();
  });

  it('starts a debounce with the default clock', async () => {
    // arrange
    const ctl = createController();
    ctl.app.run(createAsyncSearchAppObject(ctl, Online.createNull(), SearchService.createNull()));
    const debouncing = viewShows(ctl, { status: 'Debouncing...', rows: [] });

    // act
    await ctl.input.typeText('app');
    await debouncing;

    // assert
    expect(status(ctl)).toBe('Debouncing...');
    ctl.app.exit();
    ctl._destroy();
  });

  it('restarts the debounce, draws the results, and focuses the first row', async () => {
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
    const app = createAsyncSearchAppObject(ctl, Online.createNull(), service, clock);
    const empty = viewShows(ctl, { status: '', rows: ['instructions'] });
    ctl.app.run(app);
    await empty;
    const initialRows = rowIds(ctl);

    // act
    await ctl.input.typeText('a');
    clock.increment(400);
    const debouncing = viewShows(ctl, { status: 'Debouncing...', rows: [] });
    await ctl.input.typeText('p');
    clock.increment(100);
    await debouncing;
    const debouncingStatus = status(ctl);
    const pendingRows = ctl.currentProps.menuItems;

    const fetching = viewShows(ctl, { status: 'Fetching data...' });
    clock.increment(400);
    await fetching;
    const fetchingStatus = status(ctl);
    const spinner = ctl.currentProps.inputUI?.right?.children?.[0];
    const results = viewShows(ctl, { status: 'Ready', rows: ['a', 'p'] });
    clock.increment(50);
    await results;
    const resultIds = rowIds(ctl);
    const focusedId = ctl.menu.focusedMenuItem?.id;
    const readyStatus = status(ctl);
    const busyAfterResults = ctl.currentProps.inputUI?.right;

    const selected = viewShows(ctl, { status: 'Selected: p' });
    ctl.simulateMenuItemClick('p');
    await selected;

    // assert
    expect(initialRows).toEqual(['instructions']);
    expect(title(ctl)).toBe('Async Search Example');
    expect(ctl.input.getPlaceholder()).toBe('Start typing something...');
    expect(debouncingStatus).toBe('Debouncing...');
    expect(pendingRows).toEqual([]);
    expect(fetchingStatus).toBe('Fetching data...');
    expect(spinner).toMatchObject({
      icon: 'RefreshCw',
      classes: expect.arrayContaining(['oneput__rotate'])
    });
    expect(resultIds).toEqual(['a', 'p']);
    expect(focusedId).toBe('a');
    expect(readyStatus).toBe('Ready');
    expect(busyAfterResults).toBeUndefined();
    expect(status(ctl)).toBe('Selected: p');
    expect(ctl.input.getInputValue()).toBe('');
    expect(ctl.app.isCurrent(app)).toBe(true);
    ctl.app.exit();
    ctl._destroy();
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
          : { result: ok([{ id: 'latest', text: query }]), delayMs: 400 }
    });
    const searches = service.trackSearches();
    ctl.app.run(createAsyncSearchAppObject(ctl, Online.createNull(), service, clock));

    // act
    const fetching = viewShows(ctl, { status: 'Fetching data...' });
    await ctl.input.typeText('ap');
    clock.increment(500);
    await fetching;
    const refetching = viewShows(ctl, { status: 'Fetching data...', rows: [] });
    await ctl.input.typeText('p');
    clock.increment(500);
    await refetching;
    const views = trackViews(ctl);
    // The stale response arrives while the newer request is still fetching.
    clock.increment(200);
    const stale = searches.data.find(({ query }) => query === 'ap');
    // The stopped request got this response before this await continues.
    await stale?.response;
    const latest = viewShows(ctl, { status: 'Ready', rows: ['latest'] });
    clock.increment(200);
    await latest;

    // assert
    expect(stale?.query).toBe('ap');
    expect(views.data.filter((view) => /stale|Error/i.test(view))).toEqual([]);
    expect(ctl.input.getInputValue()).toBe('app');
    ctl.app.exit();
    ctl._destroy();
  });

  describe('focus after a new search', () => {
    /** Search 'ap', move to the first row and click it, so 'a' is the last activated row. */
    async function activateFirstRow() {
      const ctl = createController();
      const clock = new SimulatedClock();
      const service = SearchService.createNull({
        clock,
        response: (query) => ({ result: ok(Array.from(query, (text) => ({ id: text, text }))) })
      });
      ctl.app.run(createAsyncSearchAppObject(ctl, Online.createNull(), service, clock));
      const results = viewShows(ctl, { status: 'Ready', rows: ['a', 'p'] });
      await ctl.input.typeText('ap');
      clock.increment(500);
      await results;
      ctl.menu.focusMenuItemById('a');
      const selected = viewShows(ctl, { status: 'Selected: a', rows: ['a', 'p'] });
      ctl.simulateMenuItemClick('a');
      await selected;
      return { ctl, clock };
    }

    it('keeps focus on a clicked row that is not the last', async () => {
      // arrange
      const { ctl } = await activateFirstRow();

      // act
      const focusAfterSelect = ctl.menu.focusedMenuItem?.id;

      // assert
      expect(focusAfterSelect).toBe('a');
      ctl.app.exit();
      ctl._destroy();
    });

    it('focuses the last activated row when new results still include it', async () => {
      // arrange
      const { ctl, clock } = await activateFirstRow();

      // act
      const newResults = viewShows(ctl, { status: 'Ready', rows: ['a', 'x'] });
      await ctl.input.typeText('ax');
      clock.increment(500);
      await newResults;

      // assert
      expect(ctl.menu.focusedMenuItem?.id).toBe('a');
      ctl.app.exit();
      ctl._destroy();
    });

    it('focuses the first row when new results lack the last activated row', async () => {
      // arrange
      const { ctl, clock } = await activateFirstRow();

      // act
      const newResults = viewShows(ctl, { status: 'Ready', rows: ['x', 'y'] });
      await ctl.input.typeText('xy');
      clock.increment(500);
      await newResults;

      // assert
      expect(ctl.menu.focusedMenuItem?.id).toBe('x');
      ctl.app.exit();
      ctl._destroy();
    });
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
    ctl.app.run(createAsyncSearchAppObject(ctl, Online.createNull(), service, clock));

    // act
    const failed = viewShows(ctl, { status: '⚠️ Error', rows: ['retry-search'] });
    await ctl.input.typeText('app');
    clock.increment(500);
    await failed;
    const failedStatus = status(ctl);
    const errorRow = ctl.currentProps.menuItems?.[0];
    const retrying = viewShows(ctl, { status: 'Debouncing...' });
    ctl.simulateMenuItemClick('retry-search');
    await retrying;
    const retryingStatus = status(ctl);
    const results = viewShows(ctl, { status: 'Ready', rows: ['result'] });
    clock.increment(500);
    await results;

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
    ctl._destroy();
  });

  it('shows instructions for blank input and an empty menu for no results', async () => {
    // arrange
    const ctl = createController();
    const clock = new SimulatedClock();
    ctl.app.run(
      createAsyncSearchAppObject(ctl, Online.createNull(), SearchService.createNull(), clock)
    );

    // act
    const blank = viewShows(ctl, { status: 'Ready', rows: ['instructions'] });
    await ctl.input.typeText('   ');
    clock.increment(500);
    await blank;
    const blankRows = rowIds(ctl);
    const noResults = viewShows(ctl, { status: 'Ready', rows: [] });
    await ctl.input.typeText('a');
    clock.increment(500);
    await noResults;

    // assert
    expect(blankRows).toEqual(['instructions']);
    expect(ctl.currentProps.menuItems).toEqual([]);
    expect(status(ctl)).toBe('Ready');
    ctl.app.exit();
    ctl._destroy();
  });
});
