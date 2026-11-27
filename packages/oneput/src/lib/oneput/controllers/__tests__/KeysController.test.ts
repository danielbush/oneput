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
