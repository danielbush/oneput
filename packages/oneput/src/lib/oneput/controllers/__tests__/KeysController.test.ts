import { afterEach, describe, expect, test } from 'vitest';
import { Controller } from '../controller.js';

const controllers: Controller[] = [];

afterEach(() => {
  for (const ctl of controllers) ctl._destroy();
  controllers.length = 0;
});

function createNull() {
  const ctl = Controller.createNull();
  controllers.push(ctl);
  return ctl;
}

describe('replaceBindings', () => {
  const modal = { OK: { bindings: ['Enter'], description: 'OK', action: () => {} } };
  const app = { SAVE: { bindings: ['$mod+s'], description: 'Save', action: () => {} } };

  test('keeps the modal keys when the app sets bindings', () => {
    // arrange
    const ctl = createNull();
    ctl.keys.replaceBindings(modal);

    // act
    ctl.keys.setBindings(app);

    // assert
    expect(Object.keys(ctl.keys.getCurrentBindings())).toEqual(['OK']);
  });

  test('restores the latest app bindings', () => {
    // arrange
    const ctl = createNull();
    const restore = ctl.keys.replaceBindings(modal);
    ctl.keys.setBindings(app);

    // act
    restore();

    // assert
    expect(ctl.keys.getCurrentBindings()).toHaveProperty('SAVE');
    expect(ctl.keys.getCurrentBindings()).not.toHaveProperty('OK');
  });

  test('runs the modal action, not an app action with the same ID', async () => {
    // arrange
    const ctl = createNull();
    const ran: string[] = [];
    ctl.app.run({ actions: { cancel: { action: () => void ran.push('app cancel') } } });
    ctl.keys.replaceBindings({
      cancel: {
        bindings: ['Escape'],
        description: 'Cancel',
        action: () => void ran.push('modal cancel')
      }
    });

    // act
    await ctl.simulateKey('Escape');

    // assert
    expect(ran).toEqual(['modal cancel']);
  });

  test('restores the outer modal', () => {
    // arrange
    const ctl = createNull();
    ctl.keys.replaceBindings(modal);
    const restoreInner = ctl.keys.replaceBindings(app);

    // act
    restoreInner();

    // assert
    expect(Object.keys(ctl.keys.getCurrentBindings())).toEqual(['OK']);
  });
});

describe('bindings-change', () => {
  const save = (action: () => void, bindings = ['$mod+s']) => ({
    SAVE: { bindings, description: 'Save', action }
  });

  function trackChanges(ctl: Controller) {
    const changes: string[][] = [];
    ctl.events.on('bindings-change', ({ bindings }) => changes.push(Object.keys(bindings).sort()));
    return changes;
  }

  test('same keys, new action - no event, new action runs', async () => {
    // arrange
    const ctl = createNull();
    const ran: string[] = [];
    ctl.keys.setBindings(save(() => void ran.push('first')));
    const changes = trackChanges(ctl);

    // act
    ctl.keys.setBindings(save(() => void ran.push('second')));
    await ctl.simulateKey(
      's',
      /Mac/.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true }
    );

    // assert
    expect(changes).toEqual([]);
    expect(ran).toEqual(['second']);
  });

  test('changed key - event', () => {
    // arrange
    const ctl = createNull();
    ctl.keys.setBindings(save(() => {}));
    const changes = trackChanges(ctl);

    // act
    ctl.keys.setBindings(save(() => {}, ['$mod+Shift+s']));

    // assert
    expect(changes).toHaveLength(1);
    expect(ctl.keys.getCurrentBindings().SAVE?.bindings).toEqual(['$mod+Shift+s']);
  });

  test('modal open and close - an event each', () => {
    // arrange
    const ctl = createNull();
    ctl.keys.setBindings(save(() => {}));
    const changes = trackChanges(ctl);

    // act
    const restore = ctl.keys.replaceBindings({
      OK: { bindings: ['Enter'], description: 'OK', action: () => {} }
    });
    restore();

    // assert
    expect(changes).toHaveLength(2);
    expect(changes[0]).toEqual(['OK']);
    expect(changes[1]).toContain('SAVE');
  });

  test('destroy - the same keys again send an event', () => {
    // arrange
    const ctl = createNull();
    ctl.keys.setBindings(save(() => {}));
    ctl.keys.destroy();
    const changes = trackChanges(ctl);

    // act
    ctl.keys.setBindings(save(() => {}));

    // assert
    expect(changes).toHaveLength(1);
  });
});
