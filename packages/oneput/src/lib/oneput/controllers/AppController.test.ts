import { afterEach, describe, expect, it, test } from 'vitest';
import { Controller } from './controller.js';
import type { AppObject, UILayout } from '../types.js';
import { stdMenuItem } from '../shared/ui/menuItems/stdMenuItem.js';

function layout(id: string): UILayout {
  return {
    configure: () => {},
    innerUI: {
      id,
      type: 'vflex'
    }
  };
}

function trackedLayout(id: string) {
  const params: Array<Record<string, unknown> | undefined> = [];
  const appLayout: UILayout = {
    configure: ({ params: nextParams }) => {
      params.push(nextParams);
    },
    innerUI: {
      id,
      type: 'vflex'
    }
  };

  return { appLayout, params };
}

function layoutFactory(id: string) {
  const params: Array<Record<string, unknown>> = [];
  const appLayout = layout(id);

  return {
    appLayout,
    params,
    create: (_ctl: Controller, nextParams: Record<string, unknown>) => {
      params.push(nextParams);
      return appLayout;
    }
  };
}

async function waitForFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitForMenuOpenFocus() {
  await waitForFocus();
  await waitForFocus();
}

describe('AppController', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('AppObject.layout', () => {
    it('INHERIT_LAYOUT - restore inherited parent layout', () => {
      // arrange
      const ctl = Controller.createNull();
      const appLayout = layoutFactory('app-layout');
      const childLayout = layoutFactory('child-layout');
      // Grandparent.
      const appObject: AppObject = {
        layout: { layout: appLayout.create, params: {} },
        onStart: () => {}
      };
      // Parent doesn't define a layout, inherits grandparent
      const parent: AppObject = {
        onStart: () => {}
      };
      // Child defines its own layout.
      const child: AppObject = {
        layout: { layout: childLayout.create, params: {} },
        onStart: () => {}
      };

      ctl.app.run(appObject);
      ctl.app.run(parent);
      ctl.app.run(child);

      // act
      ctl.app.exit();

      // assert
      expect(ctl.ui.getLayout()).toBe(appLayout.appLayout);
    });

    it('configures an inherited layout before starting an app object', () => {
      // arrange
      const ctl = Controller.createNull();
      const { appLayout, params } = trackedLayout('app-layout');
      const appObject: AppObject = {
        layout: {
          layout: (_ctl, _params) => appLayout,
          params: {}
        },
        onStart: () => {}
      };
      const child: AppObject<unknown, { menuTitle: string }> = {
        layout: { params: { menuTitle: 'Child' } },
        onStart: () => {}
      };

      ctl.app.run(appObject);

      // act
      ctl.app.run(child);

      // assert
      expect(ctl.ui.getLayout()).toBe(appLayout);
      expect(params).toContainEqual({ menuTitle: 'Child' });
    });

    it('passes params to an installed layout factory', () => {
      // arrange
      const ctl = Controller.createNull();
      const { appLayout, params, create } = layoutFactory('app-layout');
      const appObject: AppObject<unknown, { menuTitle: string }> = {
        layout: {
          layout: create,
          params: { menuTitle: 'Home' }
        },
        onStart: () => {}
      };

      // act
      ctl.app.run(appObject);

      // assert
      expect(ctl.ui.getLayout()).toBe(appLayout);
      expect(params).toEqual([{ menuTitle: 'Home' }]);
    });
  });

  describe('AppObject.settings', () => {
    test('focusInputOnStart - default - focuses', async () => {
      // arrange
      const ctl = Controller.createNull();
      const input = ctl.currentProps.inputElement as HTMLInputElement;
      const before = document.createElement('button');
      document.body.append(before, input);
      before.focus();

      // act
      ctl.app.run({ onStart: () => {} });
      await waitForFocus();

      // assert
      expect(document.activeElement).toBe(input);
    });

    test('focusInputOnStart  - false', async () => {
      // arrange
      const ctl = Controller.createNull();
      const input = ctl.currentProps.inputElement as HTMLInputElement;
      const before = document.createElement('button');
      document.body.append(before, input);
      before.focus();

      const appObject: AppObject = {
        settings: { focusInputOnStart: false },
        onStart: () => {}
      };

      // act
      ctl.app.run(appObject);
      await waitForFocus();

      // assert
      expect(document.activeElement).toBe(before);
    });

    test('focusInputOnMenuOpen - default - focuses', async () => {
      // arrange
      const ctl = Controller.createNull();
      const input = ctl.currentProps.inputElement as HTMLInputElement;
      const before = document.createElement('button');
      document.body.append(before, input);

      ctl.app.run({
        settings: { focusInputOnStart: false },
        onStart: () => {}
      });
      await waitForFocus();
      before.focus();

      // act
      ctl.menu.openMenu();
      await waitForMenuOpenFocus();

      // assert
      expect(document.activeElement).toBe(input);
    });

    test('focusInputOnMenuOpen - false', async () => {
      // arrange
      const ctl = Controller.createNull();
      const input = ctl.currentProps.inputElement as HTMLInputElement;
      const before = document.createElement('button');
      document.body.append(before, input);

      const appObject: AppObject = {
        settings: {
          focusInputOnStart: false,
          focusInputOnMenuOpen: false
        },
        onStart: () => {}
      };
      ctl.app.run(appObject);
      await waitForFocus();
      before.focus();

      // act
      ctl.menu.openMenu();
      await waitForMenuOpenFocus();

      // assert
      expect(document.activeElement).toBe(before);
    });

    test('clearInputAfterAction - default - clears after a menu action', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({ onStart: () => {} });
      ctl.input.setInputValue('query');
      ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'first',
        items: [stdMenuItem({ id: 'action', textContent: 'Action', action: () => {} })]
      });

      // act
      ctl.menu.doMenuAction();

      // assert
      expect(ctl.input.getInputValue()).toBe('');
    });

    test('clearInputAfterAction - false', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({
        settings: { clearInputAfterAction: false },
        onStart: () => {}
      });
      ctl.input.setInputValue('query');
      ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'first',
        items: [stdMenuItem({ id: 'action', textContent: 'Action', action: () => {} })]
      });

      // act
      ctl.menu.doMenuAction();

      // assert
      expect(ctl.input.getInputValue()).toBe('query');
    });

    test('clearInputAfterAction - child AppObject keeps its input', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({ onStart: () => {} });
      ctl.input.setInputValue('query');
      ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'first',
        items: [
          stdMenuItem({
            id: 'run-child',
            textContent: 'Run child',
            action: () => {
              ctl.app.run({
                onStart: () => {
                  ctl.input.setInputValue('child');
                }
              });
            }
          })
        ]
      });

      // act
      ctl.menu.doMenuAction();

      // assert
      expect(ctl.input.getInputValue()).toBe('child');
    });
  });
});
