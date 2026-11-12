import { describe, expect, it } from 'vitest';
import { Controller } from '../../../controllers/controller.js';
import type { AppObject } from '../../../types.js';
import {
  findApp,
  fromChild,
  resolveRoute,
  routeMachine,
  type AppMap,
  type MachineSnapshot
} from './routeMachine.js';

// Each entry returns its own name instead of an AppObject, so the tests can
// see which entry was found.
const make = (name: string) => () => name as never;

const apps: AppMap<unknown> = {
  welcome: make('welcome'),
  form: { editing: make('form.editing'), confirm: make('form.confirm') },
  done: make('done')
};

describe('findApp', () => {
  it('finds a top-level state', () => {
    const found = findApp('welcome', apps);
    expect(found.path).toBe('welcome');
    expect('make' in found && found.make(undefined, undefined)).toBe('welcome');
  });

  it('walks into a child state when the entry is a map', () => {
    const found = findApp({ form: 'confirm' }, apps);
    expect(found.path).toBe('form.confirm');
    expect('make' in found && found.make(undefined, undefined)).toBe('form.confirm');
  });

  it('stops at a function, so one AppObject covers all children', () => {
    const found = findApp({ form: 'confirm' }, { form: make('form') });
    expect(found.path).toBe('form');
  });

  it('walks several levels', () => {
    const deep: AppMap<unknown> = { form: { editing: { email: make('email') } } };
    expect(findApp({ form: { editing: 'email' } }, deep).path).toBe('form.editing.email');
  });

  it('throws for a state that the map does not have', () => {
    expect(() => findApp({ form: 'review' }, apps)).toThrow("no AppObject for state 'form.review'");
  });

  it('throws for parallel states', () => {
    expect(() => findApp({ form: 'editing', done: undefined }, apps)).toThrow('parallel states');
  });
});

/**
 * An actor as routeMachine sees it, with an EMBEDDED_STUB for XState: `set`
 * moves it to a new snapshot and tells its subscribers. `sent` tracks the
 * events sent to it, and `subscribers` how many follow it.
 */
function stubActor(snapshot: MachineSnapshot) {
  let current = snapshot;
  const listeners = new Set<() => void>();
  const sent: unknown[] = [];
  return {
    sent,
    subscribers: () => listeners.size,
    getSnapshot: () => current,
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      return { unsubscribe: () => void listeners.delete(onChange) };
    },
    send(event: unknown) {
      sent.push(event);
    },
    set(next: MachineSnapshot) {
      current = next;
      for (const listener of [...listeners]) listener();
    }
  };
}

type StubActor = ReturnType<typeof stubActor>;

/** An AppObject that says which state made it; Back sends BACK to `actor`. */
const screen = (name: string, actor?: StubActor): AppObject & { name: string } => ({
  name,
  onBack: () => actor?.send({ type: 'BACK' })
});

describe('findApp: fromChild', () => {
  it('stops at a child entry', () => {
    // arrange
    const child = fromChild<MachineSnapshot, StubActor>('flow', { a: make('a') });

    // act
    const found = findApp({ setup: 'whatever' }, { setup: child });

    // assert
    expect(found).toEqual({ path: 'setup', child });
  });
});

describe('resolveRoute', () => {
  const apps = {
    home: make('home'),
    setup: fromChild<MachineSnapshot, StubActor>('flow', {
      keyForm: { providers: make('providers') }
    })
  } as AppMap<never, never>;

  it('key: parent path, child id and child path', () => {
    // arrange
    const child = stubActor({ value: { keyForm: 'providers' } });
    const parent = stubActor({ value: 'setup', children: { flow: child } });

    // act
    const route = resolveRoute(parent, apps);

    // assert
    expect(route?.key).toBe('setup/flow:keyForm.providers');
    expect(route?.make()).toBe('providers');
    expect(route?.actors).toEqual([parent, child]);
  });

  it('not settled: the child is missing or done', () => {
    // arrange
    const missing = stubActor({ value: 'setup', children: {} });
    const done = stubActor({
      value: 'setup',
      children: { flow: stubActor({ value: 'finished', status: 'done' }) }
    });

    // act
    const routes = [resolveRoute(missing, apps), resolveRoute(done, apps)];

    // assert
    expect(routes).toEqual([undefined, undefined]);
  });
});

describe('routeMachine: fromChild', () => {
  /** A parent with `home` and `setup`, which invokes `flow`; the router follows it. */
  function arrange() {
    const ctl = Controller.createNull();
    // The screen that Oneput shows, from its app-change events.
    let shown: string | undefined;
    ctl.events.on('app-change', (change) => {
      shown = (change.current as { name?: string } | null)?.name;
    });
    const current = () => shown;
    const parent = stubActor({ value: 'home', children: {} });
    routeMachine(ctl, parent, {
      home: () => screen('home', parent),
      setup: fromChild<MachineSnapshot, StubActor>('flow', {
        providers: (_snapshot, child) => screen('providers', child),
        provider: (snapshot, child) => screen(`provider ${snapshot.value}`, child)
      })
    });
    return { ctl, parent, current };
  }

  it('routes on the child while the parent is in its state, and follows it', () => {
    // arrange
    const { parent, current } = arrange();
    const child = stubActor({ value: 'providers' });

    // act
    parent.set({ value: 'setup', children: { flow: child } });
    const entered = current();
    child.set({ value: 'provider' });

    // assert
    expect(entered).toBe('providers');
    expect(current()).toBe('provider provider');
    expect(child.subscribers()).toBe(1);
  });

  it('a done child keeps its screen until the parent moves on; then the child is dropped', () => {
    // arrange
    const { parent, current } = arrange();
    const child = stubActor({ value: 'providers' });
    parent.set({ value: 'setup', children: { flow: child } });

    // act
    child.set({ value: 'done', status: 'done' });
    const done = current();
    parent.set({ value: 'home', children: {} });

    // assert
    expect(done).toBe('providers');
    expect(current()).toBe('home');
    expect(child.subscribers()).toBe(0);
  });

  it('Back: a child screen sends BACK to the child, a parent screen to the parent', () => {
    // arrange
    const { ctl, parent } = arrange();
    const child = stubActor({ value: 'providers' });
    ctl.app.goBack();
    parent.set({ value: 'setup', children: { flow: child } });

    // act
    ctl.app.goBack();

    // assert
    expect(parent.sent).toEqual([{ type: 'BACK' }]);
    expect(child.sent).toEqual([{ type: 'BACK' }]);
  });

  it('a new child for the same state is followed in place of the old one', () => {
    // arrange
    const { parent, current } = arrange();
    const first = stubActor({ value: 'providers' });
    const second = stubActor({ value: 'provider' });
    parent.set({ value: 'setup', children: { flow: first } });

    // act
    parent.set({ value: 'setup', children: { flow: second } });

    // assert
    expect(current()).toBe('provider provider');
    expect(first.subscribers()).toBe(0);
    expect(second.subscribers()).toBe(1);
  });
});
