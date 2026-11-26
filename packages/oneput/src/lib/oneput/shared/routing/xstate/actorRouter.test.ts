import { describe, expect, it } from 'vitest';
import { Controller } from '../../../controllers/controller.js';
import type { AppObject } from '../../../types.js';
import { createActorRouter } from './actorRouter.js';
import type { MachineSnapshot } from './routeMachine.js';

/**
 * An actor as createActorRouter sees it, with an EMBEDDED_STUB for XState:
 * `set` moves it to a new snapshot and tells its subscribers. `status`
 * shows its lifecycle, and `subscribers` counts who still listens.
 */
function stubActor(snapshot: MachineSnapshot) {
  let current = snapshot;
  let status = 'not started';
  const listeners = new Set<() => void>();
  const sent: { type: string }[] = [];
  return {
    sent,
    status: () => status,
    subscribers: () => listeners.size,
    start() {
      status = 'running';
    },
    stop() {
      status = 'stopped';
    },
    getSnapshot: () => current,
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      return { unsubscribe: () => void listeners.delete(onChange) };
    },
    send(event: { type: string }) {
      sent.push(event);
    },
    set(next: MachineSnapshot) {
      current = next;
      for (const listener of [...listeners]) listener();
    }
  };
}

function arrange() {
  const ctl = Controller.createNull();
  // The screen that Oneput shows, from its app-change events.
  let shown: string | undefined;
  ctl.events.on('app-change', (change) => {
    shown = (change.current as { name?: string } | null)?.name;
  });
  const screen = (name: string): AppObject & { name: string } => ({ name });
  const actor = stubActor({ value: 'welcome' });
  const router = createActorRouter(actor, () => ({
    welcome: () => screen('welcome'),
    form: { editing: () => screen('editing') }
  }));
  return { ctl, actor, router, shown: () => shown };
}

describe('createActorRouter', () => {
  it('starts the actor and routes it', () => {
    // arrange
    const { ctl, actor, router, shown } = arrange();

    // act
    router.start(ctl);
    const atStart = shown();
    actor.set({ value: { form: 'editing' } });
    router.send({ type: 'NEXT' });

    // assert
    expect(actor.status()).toBe('running');
    expect(atStart).toBe('welcome');
    expect(shown()).toBe('editing');
    expect(actor.sent).toEqual([{ type: 'NEXT' }]);
  });

  it('stops everything when the controller is destroyed', () => {
    // arrange
    const { ctl, actor, router } = arrange();
    router.start(ctl);

    // act
    ctl._destroy();
    actor.set({ value: { form: 'editing' } });

    // assert
    expect(actor.status()).toBe('stopped');
    expect(actor.subscribers()).toBe(0);
  });

  it('stop: later updates change nothing, also after repeats', () => {
    // arrange
    const { ctl, actor, router, shown } = arrange();
    router.start(ctl);

    // act
    router.stop();
    router.stop();
    ctl._destroy();
    actor.set({ value: { form: 'editing' } });

    // assert
    expect(actor.status()).toBe('stopped');
    expect(actor.subscribers()).toBe(0);
    expect(shown()).toBe('welcome');
  });

  it('stop: no effect before start', () => {
    // arrange
    const { actor, router } = arrange();

    // act
    router.stop();

    // assert
    expect(actor.status()).toBe('not started');
  });

  it('start: rolls back when the first route throws', () => {
    // arrange
    const { ctl, actor, router } = arrange();
    actor.set({ value: 'unmapped' });

    // act
    const start = () => router.start(ctl);

    // assert
    expect(start).toThrow("no AppObject for state 'unmapped'");
    expect(actor.status()).toBe('stopped');
    expect(actor.subscribers()).toBe(0);
  });

  it('start: no routing when the first onStart stops the router', () => {
    // arrange
    const ctl = Controller.createNull();
    const actor = stubActor({ value: 'welcome' });
    const welcome: AppObject = { onStart: () => router.stop() };
    const other: AppObject = {};
    const router = createActorRouter(actor, () => ({
      welcome: () => welcome,
      other: () => other
    }));
    router.start(ctl);

    // act
    actor.set({ value: 'other' });

    // assert
    expect(actor.subscribers()).toBe(0);
    expect(ctl.app.isCurrent(welcome)).toBe(true);
    expect(ctl.app.contains(other)).toBe(false);
  });

  it('reattach: routes again after a root exit', () => {
    // arrange
    const { ctl, actor, router, shown } = arrange();
    router.start(ctl);
    ctl.app.exit();
    const afterExit = shown();
    actor.set({ value: { form: 'editing' } });

    // act
    router.reattach();
    const reattached = shown();
    actor.set({ value: 'welcome' });

    // assert
    expect(afterExit).toBeUndefined();
    expect(reattached).toBe('editing');
    expect(shown()).toBe('welcome');
  });

  it('reattach: throws after stop', () => {
    // arrange
    const { ctl, router } = arrange();
    router.start(ctl);
    router.stop();

    // act
    const reattach = () => router.reattach();

    // assert
    expect(reattach).toThrow('needs a started router');
  });
});
