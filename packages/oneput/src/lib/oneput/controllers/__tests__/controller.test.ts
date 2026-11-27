import { describe, it, expect, afterEach } from 'vitest';
import { Controller } from '../controller.js';
import { stdMenuItem } from '../../shared/ui/menuItems/stdMenuItem.js';

const controllers: Controller[] = [];

afterEach(() => {
  for (const ctl of controllers) {
    ctl._destroy();
  }
  controllers.length = 0;
});

function createNull(props: Parameters<typeof Controller.createNull>[0] = {}) {
  const ctl = Controller.createNull(props);
  controllers.push(ctl);
  return ctl;
}

describe('Controller', () => {
  describe('createNull', () => {
    it('tracks app changes without spying', () => {
      // arrange
      const ctl = createNull();
      const appChanges = ctl.trackAppChanges();
      const appObject = {
        onStart: () => {}
      };

      // act
      ctl.app.run(appObject);

      // assert
      expect(appChanges.data).toEqual([{ previous: null, current: appObject }]);
    });

    it('emits app-change events', () => {
      // arrange
      const ctl = createNull();
      const events: { previous: object | null; current: object | null }[] = [];
      const appObject = {
        onStart: () => {}
      };
      ctl.events.on('app-change', (payload) => {
        events.push(payload as { previous: object | null; current: object | null });
      });

      // act
      ctl.app.run(appObject);

      // assert
      expect(events).toEqual([{ previous: null, current: appObject }]);
    });
  });

  describe('notify', () => {
    it('injects notification UI into currentProps', () => {
      // arrange
      const ctl = createNull();

      // act
      ctl.notify('hello world');

      // assert
      expect(ctl.currentProps.injectUI).toBeDefined();
    });
  });

  describe('clearNotifications', () => {
    it('clears injected notification UI from currentProps', () => {
      // arrange
      const ctl = createNull();
      ctl.notify('hello world');

      // act
      ctl.clearNotifications();

      // assert
      expect(ctl.currentProps.injectUI).toBeUndefined();
    });
  });

  describe('toggleHide', () => {
    it('dispatches oneput-toggle-hide event on window', () => {
      // arrange
      const ctl = createNull();
      const events: Event[] = [];
      window.addEventListener('oneput-toggle-hide', (e) => events.push(e));

      // act
      ctl.toggleHide();

      // assert
      expect(events).toHaveLength(1);
    });
  });

  describe('simulateKey', () => {
    it('dispatches key bindings registered on the current app object', async () => {
      // arrange
      const ctl = createNull();
      let count = 0;

      ctl.simulateStart(() => ({
        onStart: () => {},
        actions: {
          ENTER: {
            action: () => {
              count += 1;
            },
            binding: {
              bindings: ['Enter'],
              description: 'Run enter action'
            }
          }
        }
      }));

      // act
      await ctl.simulateKey('Enter');

      // assert
      expect(count).toBe(1);
    });
  });

  describe('_destroy', () => {
    it('stops handling registered key bindings', async () => {
      // arrange
      const ctl = createNull();
      let count = 0;
      ctl.simulateStart(() => ({
        actions: {
          ENTER: {
            action: () => {
              count += 1;
            },
            binding: {
              bindings: ['Enter'],
              description: 'Run enter action'
            }
          }
        }
      }));

      // act
      ctl._destroy();
      await ctl.simulateKey('Enter');

      // assert
      expect(count).toBe(0);
    });
  });

  describe('onDestroy', () => {
    it('runs registered cleanups in order', () => {
      // arrange
      const ctl = Controller.createNull();
      const cleanups: string[] = [];
      ctl.onDestroy(() => cleanups.push('first'));
      ctl.onDestroy(() => cleanups.push('second'));

      // act
      ctl._destroy();

      // assert
      expect(cleanups).toEqual(['first', 'second']);
    });

    it('skips an unsubscribed cleanup', () => {
      // arrange
      const ctl = Controller.createNull();
      const cleanups: string[] = [];
      const unsubscribe = ctl.onDestroy(() => cleanups.push('removed'));
      ctl.onDestroy(() => cleanups.push('retained'));

      // act
      unsubscribe();
      ctl._destroy();

      // assert
      expect(cleanups).toEqual(['retained']);
    });

    it('runs cleanups before it releases the keys', () => {
      // arrange
      const ctl = Controller.createNull();
      ctl.keys.replaceBindings({
        ENTER: { bindings: ['Enter'], description: 'Run enter action', action: () => {} }
      });
      const bindingsDuringCleanup: string[] = [];
      ctl.onDestroy(() =>
        bindingsDuringCleanup.push(...Object.keys(ctl.keys.getCurrentBindings()))
      );

      // act
      ctl._destroy();

      // assert
      expect(bindingsDuringCleanup).toEqual(['ENTER']);
      expect(ctl.keys.getCurrentBindings()).toEqual({});
    });
  });

  describe('replaceBindings', () => {
    const modal = { OK: { bindings: ['Enter'], description: 'OK', action: () => {} } };
    const app = { SAVE: { bindings: ['$mod+s'], description: 'Save', action: () => {} } };
    const ctls: Controller[] = [];
    afterEach(() => ctls.splice(0).forEach((ctl) => ctl._destroy()));
    const createNull = () => {
      const ctl = Controller.createNull();
      ctls.push(ctl);
      return ctl;
    };

    it('keeps the modal keys when the app sets bindings', () => {
      // arrange
      const ctl = createNull();
      ctl.keys.replaceBindings(modal);

      // act
      ctl.keys.setBindings(app);

      // assert
      expect(Object.keys(ctl.keys.getCurrentBindings())).toEqual(['OK']);
    });

    it('restores the latest app bindings', () => {
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

    it('runs the modal action, not an app action with the same ID', async () => {
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

    it('restores the outer modal', () => {
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

  /**
   * ENTER_SEMANTICS (docs/CONCEPTS.md): who owns the Enter key.
   */
  describe('ENTER_SEMANTICS', () => {
    // tinykeys maps $mod to Meta on a mac and to Control elsewhere.
    const mod = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
      ? { metaKey: true }
      : { ctrlKey: true };

    function setup(
      settings: {
        enableMenuItemFocus?: boolean;
        enableNativeActivation?: boolean;
      } = {}
    ) {
      const ctl = createNull({ menuOpen: true });
      const actioned: string[] = [];
      const submitted: string[] = [];
      ctl.simulateStart(() => ({ onStart: () => {}, settings }));
      ctl.input.setSubmitHandler((value) => submitted.push(value ?? ''));
      ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'first',
        items: [
          stdMenuItem({
            id: 'toggle',
            textContent: 'Toggle',
            action: () => actioned.push('toggle')
          })
        ]
      });
      return { ctl, actioned, submitted };
    }

    it('menu item focus on - Enter does the focused menu action', async () => {
      // arrange
      const { ctl, actioned } = setup();

      // act
      await ctl.simulateKey('Enter');

      // assert
      expect(actioned).toEqual(['toggle']);
    });

    it('menu item focus off - Enter is free, and no row is focused', async () => {
      // arrange
      const { ctl, actioned } = setup({ enableMenuItemFocus: false });

      // act
      const event = await ctl.simulateKey('Enter');

      // assert — the declined action leaves the browser default alone
      expect(actioned).toEqual([]);
      expect(event.defaultPrevented).toBe(false);
      expect(ctl.currentProps.menuItemFocus).toEqual([-1, false]);
    });

    it('menu item focus on - Enter is taken from the browser', async () => {
      // arrange
      const { ctl } = setup();

      // act
      const event = await ctl.simulateKey('Enter');

      // assert
      expect(event.defaultPrevented).toBe(true);
    });

    it('menu item focus off - $mod+Enter still submits', async () => {
      // arrange
      const { ctl, submitted } = setup({ enableMenuItemFocus: false });
      await ctl.input.setInputValue('x^2');

      // act
      await ctl.simulateKey('Enter', mod);

      // assert
      expect(submitted).toEqual(['x^2']);
    });

    it('native activation on - Enter on a focused button is left to the browser', async () => {
      // arrange
      const { ctl, actioned } = setup();
      const button = document.createElement('button');
      document.body.append(button);

      // act
      await ctl.simulateKey('Enter', {}, button);

      // assert
      expect(actioned).toEqual([]);
    });

    it('native activation off - the binding wins even on a focused button', async () => {
      // arrange
      const { ctl, actioned } = setup({ enableNativeActivation: false });
      const button = document.createElement('button');
      document.body.append(button);

      // act
      await ctl.simulateKey('Enter', {}, button);

      // assert
      expect(actioned).toEqual(['toggle']);
    });
  });
});
