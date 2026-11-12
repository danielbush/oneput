import { describe, expect, it } from 'vitest';
import { Controller } from '../../controllers/controller.js';
import { cell } from '../../lib/pull.js';
import type { AppObject } from '../../types.js';
import { routeApp } from './routeApp.js';
import type { AppChange, RootAppExit } from '../../controllers/AppController.js';

/** A cell with visible subscription ownership and immediate notifications. */
function trackedSource<T>(initial: T) {
  const value = cell(initial);
  const active = new Set<() => void>();
  return {
    get: value.get,
    set: value.set,
    active,
    subscribe(onChange: () => void) {
      active.add(onChange);
      const unsubscribe = value.subscribe(onChange);
      onChange();
      return () => {
        active.delete(onChange);
        unsubscribe();
      };
    }
  };
}

function screen(name: string, log: string[]): AppObject {
  return {
    onStart: () => {
      log.push(`${name}.start`);
    },
    onResume: () => {
      log.push(`${name}.resume`);
    },
    onExit: () => {
      log.push(`${name}.exit`);
    }
  };
}

describe('routeApp', () => {
  it('replaces the caller, so the routed AppObject is the root', () => {
    // arrange
    const ctl = Controller.createNull();
    const log: string[] = [];
    const caller = screen('caller', log);
    const a = screen('a', log);
    ctl.app.run(caller);

    // act
    routeApp(ctl, trackedSource('a'), () => a);

    // assert
    expect(log).toEqual(['caller.start', 'caller.exit', 'a.start']);
    expect(ctl.app.isCurrent(a)).toBe(true);
    expect(ctl.app.contains(caller)).toBe(false);
    expect(ctl.app.canGoBack()).toBe(false);
  });

  it('starts with no current AppObject', () => {
    // arrange
    const ctl = Controller.createNull();
    const changes: AppChange[] = [];
    ctl.events.on('app-change', (change) => changes.push(change));
    const a = screen('a', []);

    // act
    routeApp(ctl, trackedSource('a'), () => a);

    // assert
    expect(ctl.app.isCurrent(a)).toBe(true);
    expect(changes).toEqual([{ previous: null, current: a }]);
  });

  it("starts from the caller's onStart", () => {
    // arrange
    const ctl = Controller.createNull();
    const log: string[] = [];
    const a = screen('a', log);
    const b = screen('b', log);
    const source = trackedSource<'a' | 'b'>('a');
    const caller: AppObject = {
      onStart: () => {
        log.push('caller.start');
        routeApp(ctl, source, (value) => (value === 'a' ? a : b));
      },
      onExit: () => {
        log.push('caller.exit');
      }
    };
    const changes: AppChange[] = [];
    ctl.events.on('app-change', (change) => changes.push(change));

    // act
    ctl.app.run(caller);

    // assert
    expect(log).toEqual(['caller.start', 'caller.exit', 'a.start']);
    expect(changes).toEqual([{ previous: null, current: a }]);
    expect(ctl.app.contains(caller)).toBe(false);

    // act
    source.set('b');

    // assert
    expect(ctl.app.isCurrent(b)).toBe(true);
    expect(changes).toEqual([
      { previous: null, current: a },
      { previous: a, current: b }
    ]);
  });

  it('replaces only for a new key', () => {
    // arrange
    const ctl = Controller.createNull();
    const log: string[] = [];
    const a = screen('a', log);
    const b = screen('b', log);
    const source = trackedSource({ screen: 'a', detail: 1 });
    routeApp(
      ctl,
      source,
      (value) => (value.screen === 'a' ? a : b),
      (value) => value.screen
    );

    // act
    source.set({ screen: 'a', detail: 2 });
    source.set({ screen: 'b', detail: 3 });

    // assert
    expect(log).toEqual(['a.start', 'a.exit', 'b.start']);
    expect(ctl.app.isCurrent(b)).toBe(true);
    expect(ctl.app.contains(a)).toBe(false);
  });

  it('waits for nested children and routes the latest value on resume', () => {
    // arrange
    const ctl = Controller.createNull();
    const log: string[] = [];
    const a = screen('a', log);
    const b = screen('b', log);
    const c = screen('c', log);
    const child = screen('child', log);
    const grandchild = screen('grandchild', log);
    const source = cell<'a' | 'b' | 'c'>('a');
    const apps = { a, b, c };
    routeApp(ctl, source, (value) => apps[value]);
    ctl.app.run(child);
    ctl.app.run(grandchild);
    log.length = 0;

    // act
    source.set('b');
    source.set('c');

    // assert
    expect(ctl.app.isCurrent(grandchild)).toBe(true);
    expect(log).toEqual([]);

    // act
    ctl.app.exit();
    ctl.app.exit();

    // assert
    expect(log).toEqual([
      'grandchild.exit',
      'child.resume',
      'child.exit',
      'a.resume',
      'a.exit',
      'c.start'
    ]);
    expect(ctl.app.isCurrent(c)).toBe(true);
    expect(ctl.app.contains(a)).toBe(false);
  });

  it('stops on a root exit, which goes to the onRootExit handler', () => {
    for (const leave of ['exit', 'back'] as const) {
      // arrange
      const ctl = Controller.createNull();
      const source = trackedSource('a');
      const log: string[] = [];
      const a = screen('a', log);
      const rootExits: RootAppExit[] = [];
      ctl.app.setOnRootExit((exit) => rootExits.push(exit));
      routeApp(ctl, source, () => a);

      // act
      if (leave === 'exit') ctl.app.exit('bye');
      else ctl.app.goBack();
      source.set('b');

      // assert
      expect(rootExits).toEqual([{ app: a, payload: leave === 'exit' ? 'bye' : undefined }]);
      expect(source.active.size).toBe(0);
      expect(ctl.app.contains(a)).toBe(false);
      expect(log).toEqual(['a.start', 'a.exit']);
    }
  });

  it('stops on external replacement', () => {
    // arrange
    const ctl = Controller.createNull();
    const source = trackedSource('a');
    const log: string[] = [];
    const outside = screen('outside', log);
    const a = screen('a', log);
    routeApp(ctl, source, () => a);
    const changes: AppChange[] = [];
    ctl.events.on('app-change', (change) => changes.push(change));

    // act
    ctl.app.replace(outside);
    source.set('b');

    // assert
    expect(source.active.size).toBe(0);
    expect(changes).toEqual([{ previous: a, current: outside }]);
    expect(log).toEqual(['a.start', 'a.exit', 'outside.start']);
  });

  it('can detach while suspended without changing the stack', () => {
    // arrange
    const ctl = Controller.createNull();
    const source = trackedSource('a');
    const log: string[] = [];
    const a = screen('a', log);
    const child = screen('child', log);
    const router = routeApp(ctl, source, () => a);
    ctl.app.run(child);

    // act
    source.set('b');
    router.stop();
    router.stop();
    ctl.app.exit();

    // assert
    expect(source.active.size).toBe(0);
    expect(ctl.app.isCurrent(a)).toBe(true);
    expect(log).toEqual(['a.start', 'child.start', 'child.exit', 'a.resume']);
  });

  it('settles source changes from start and exit hooks', () => {
    // arrange
    const ctl = Controller.createNull();
    const source = cell<'a' | 'b' | 'c'>('a');
    const a: AppObject = { onStart: () => source.set('b'), onExit: () => source.set('c') };
    const b: AppObject = {};
    const c: AppObject = {};
    const apps = { a, b, c };

    // act
    routeApp(ctl, source, (value) => apps[value]);

    // assert
    expect(ctl.app.isCurrent(c)).toBe(true);
    expect(ctl.app.contains(a)).toBe(false);
    expect(ctl.app.contains(b)).toBe(false);
  });

  it('keeps the route when a pending key changes back before resume', () => {
    // arrange
    const ctl = Controller.createNull();
    const log: string[] = [];
    const a = screen('a', log);
    const b = screen('b', log);
    const child = screen('child', log);
    const source = cell<'a' | 'b'>('a');
    routeApp(ctl, source, (value) => (value === 'a' ? a : b));
    ctl.app.run(child);

    // act
    source.set('b');
    source.set('a');
    ctl.app.exit();

    // assert
    expect(ctl.app.isCurrent(a)).toBe(true);
    expect(log).toEqual(['a.start', 'child.start', 'child.exit', 'a.resume']);
  });

  it('waits for a child opened by the first route start hook', () => {
    // arrange
    const ctl = Controller.createNull();
    const source = cell<'a' | 'b'>('a');
    const child: AppObject = {};
    const a: AppObject = { onStart: () => ctl.app.run(child) };
    const b: AppObject = {};
    routeApp(ctl, source, (value) => (value === 'a' ? a : b));

    // act
    source.set('b');

    // assert
    expect(ctl.app.isCurrent(child)).toBe(true);

    // act
    ctl.app.exit();

    // assert
    expect(ctl.app.isCurrent(b)).toBe(true);
  });

  it('detaches when the first route exits in its start hook', () => {
    // arrange
    const ctl = Controller.createNull();
    const source = trackedSource('a');
    const a: AppObject = { onStart: () => ctl.app.exit() };

    // act
    routeApp(ctl, source, () => a);
    source.set('b');

    // assert
    expect(ctl.app.contains(a)).toBe(false);
    expect(source.active.size).toBe(0);
  });

  it('uses the source value set by the route resume hook', () => {
    // arrange
    const ctl = Controller.createNull();
    const source = cell<'a' | 'b' | 'c'>('a');
    const a: AppObject = { onResume: () => source.set('c') };
    const b: AppObject = {};
    const c: AppObject = {};
    const child: AppObject = {};
    const apps = { a, b, c };
    routeApp(ctl, source, (value) => apps[value]);
    ctl.app.run(child);
    source.set('b');

    // act
    ctl.app.exit();

    // assert
    expect(ctl.app.isCurrent(c)).toBe(true);
    expect(ctl.app.contains(b)).toBe(false);
  });
});
