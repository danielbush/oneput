// @vitest-environment jsdom
import { Controller, FlexChildBuilder } from '@oneput/oneput';
import { err, ok } from 'neverthrow';
import { describe, expect, it } from 'vitest';
import { createActor, SimulatedClock, waitFor, type ActorRefFrom } from 'xstate';
import { renderActiveView, type OneputView } from '../interpreter.js';
import { createAsyncSearchMachine } from './machine.js';
import { SearchService } from './searchService.js';
import { sources } from './sources.js';

function renderSearch(
  ctl: Controller,
  actor: ActorRefFrom<ReturnType<typeof createAsyncSearchMachine>>
) {
  return renderActiveView(ctl, actor.getSnapshot(), () => actor.getSnapshot(), sources, {
    activate: (event) => actor.send(event),
    change: (value) => actor.send({ type: 'INPUT_CHANGED', value }),
    release: (id, reason) => actor.send({ type: 'INPUT_RELEASED', id, reason })
  })._unsafeUnwrap();
}

function outerRightText(view: OneputView) {
  return view.layout.outerRight?.(new FlexChildBuilder('input-status')).textContent;
}

describe('async search', () => {
  it.each([
    ['success', ok([{ id: 'old', text: 'old' }])],
    ['failure', err({ message: 'Old search failed' })]
  ])(
    'ignores an older %s during debounce and retries the latest failure',
    async (_, oldResponse) => {
      // arrange
      const ctl = Controller.createNull();
      const clock = new SimulatedClock();
      const latestResponses = [
        err({ message: 'Simulated failure' }),
        ok([{ id: 'new', text: 'p' }])
      ];
      const service = SearchService.createNull({
        clock,
        response: (query) =>
          query === 'ap'
            ? { result: oldResponse, delayMs: 100 }
            : { result: query === 'app' ? (latestResponses.shift() ?? ok([])) : ok([]) }
      });
      const actor = createActor(createAsyncSearchMachine(service), { clock }).start();

      // act
      actor.send({ type: 'INPUT_CHANGED', value: 'ap' });
      clock.increment(500);
      const fetching = renderSearch(ctl, actor);
      actor.send({ type: 'INPUT_CHANGED', value: 'app' });
      clock.increment(100);
      await Promise.resolve();
      await Promise.resolve();
      const debouncing = renderSearch(ctl, actor);
      clock.increment(400);
      await waitFor(actor, (snapshot) => snapshot.matches('error'));
      const failed = renderSearch(ctl, actor);
      const retry = failed.menu.items[0];
      if (!retry || !retry.action) throw new Error('Expected a retry action.');
      retry.action(ctl);
      const retrying = renderSearch(ctl, actor);
      clock.increment(500);
      await waitFor(actor, (snapshot) => snapshot.matches('results'));
      const results = renderSearch(ctl, actor);
      const result = results.menu.items[0];
      if (!result || !result.action) throw new Error('Expected a result action.');
      result.action(ctl);
      const selected = renderSearch(ctl, actor);

      // assert
      expect(outerRightText(fetching)).toBe('Fetching data...');
      expect(fetching.inputRight?.children?.[0]).toMatchObject({
        icon: 'RefreshCw',
        classes: expect.arrayContaining(['oneput__rotate'])
      });
      expect(outerRightText(debouncing)).toBe('Debouncing...');
      expect(debouncing.menu.items).toEqual([]);
      expect(outerRightText(failed)).toBe('⚠️ Error');
      expect(failed.menu.id).toBe(fetching.menu.id);
      expect(failed.input).toEqual(fetching.input);
      expect(failed.inputRight).toBeUndefined();
      expect(failed.settings.clearInputAfterAction).toBe(false);
      expect(retry.id).toBe('retry-search');
      expect(outerRightText(retrying)).toBe('Debouncing...');
      expect(outerRightText(results)).toBe('Ready');
      expect(results.menu.focusBehaviour).toBe('last');
      expect(results.menu.items).toHaveLength(1);
      expect(result.id).toBe('new');
      expect(outerRightText(selected)).toBe('Selected: p');
      expect(selected.settings.clearInputAfterAction).toBe(true);
      actor.stop();
    }
  );

  it('restarts the debounce and distinguishes no results from blank input', async () => {
    // arrange
    const ctl = Controller.createNull();
    const clock = new SimulatedClock();
    const service = SearchService.createNull({
      clock,
      response: (query) =>
        query === 'app'
          ? { result: ok([]) }
          : { result: ok([{ id: 'old', text: 'old' }]), delayMs: 100 }
    });
    const actor = createActor(createAsyncSearchMachine(service), { clock }).start();
    const initial = renderSearch(ctl, actor);

    // act
    actor.send({ type: 'INPUT_CHANGED', value: 'ap' });
    clock.increment(400);
    actor.send({ type: 'INPUT_CHANGED', value: 'app' });
    clock.increment(100);
    const stillDebouncing = renderSearch(ctl, actor);
    clock.increment(400);
    await waitFor(actor, (snapshot) => snapshot.matches('noResults'));
    const noResults = renderSearch(ctl, actor);
    actor.send({ type: 'INPUT_CHANGED', value: 'ap' });
    clock.increment(500);
    actor.send({ type: 'INPUT_CHANGED', value: '   ' });
    clock.increment(100);
    await Promise.resolve();
    await Promise.resolve();
    const cleared = renderSearch(ctl, actor);

    // assert
    expect(outerRightText(initial)).toBe('');
    expect(initial.menu.items[0]).toMatchObject({ id: 'instructions' });
    expect(outerRightText(stillDebouncing)).toBe('Debouncing...');
    expect(outerRightText(noResults)).toBe('Ready');
    expect(noResults.menu.items).toEqual([]);
    expect(outerRightText(cleared)).toBe('Ready');
    expect(cleared.menu.items[0]).toMatchObject({ id: 'instructions' });
    expect(actor.getSnapshot().matches('empty')).toBe(true);
    actor.stop();
  });

  it('invalidates a request when the input changes with the menu closed', async () => {
    // arrange
    const ctl = Controller.createNull();
    const clock = new SimulatedClock();
    const service = SearchService.createNull({
      clock,
      response: (text) => ({ result: ok([{ id: text, text }]), delayMs: 100 })
    });
    const actor = createActor(createAsyncSearchMachine(service), { clock }).start();
    actor.send({ type: 'INPUT_CHANGED', value: 'ap' });
    clock.increment(500);

    // act
    actor.send({ type: 'MENU_CLOSED' });
    actor.send({ type: 'INPUT_CHANGED', value: 'app' });
    clock.increment(100);
    await Promise.resolve();
    await Promise.resolve();
    actor.send({ type: 'MENU_OPENED' });
    clock.increment(500);

    // assert
    expect(actor.getSnapshot().matches('unsearched')).toBe(true);
    expect(renderSearch(ctl, actor).menu.items).toEqual([]);
    actor.stop();
  });
});
