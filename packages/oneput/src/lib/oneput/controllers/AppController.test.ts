import { afterEach, describe, expect, it, test } from 'vitest';
import { Controller } from './controller.js';
import type { AppObject, UILayout } from '../types.js';
import { stdMenuItem } from '../shared/ui/menuItems/stdMenuItem.js';
import { WordFilter } from '../shared/filters/WordFilter.js';
import { OneputAction } from '../shared/actions/OneputAction.js';
import { notifier } from '../lib/pull.js';

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
  const replaces: boolean[] = [];
  let settings: Record<string, unknown> = {};
  const appLayout: UILayout = {
    configure: ({ params: nextParams, replace }) => {
      params.push(nextParams);
      replaces.push(!!replace);
      if (replace) {
        settings = { ...(nextParams ?? {}) };
      } else {
        settings = { ...settings, ...(nextParams ?? {}) };
      }
    },
    innerUI: {
      id,
      type: 'vflex'
    }
  };

  return { appLayout, params, replaces, getSettings: () => settings };
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

// tinykeys maps $mod to Meta on a mac and to Control elsewhere.
const mod = /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true };

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
      const { appLayout, params, replaces } = trackedLayout('app-layout');
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
      expect(replaces.at(-1)).toBe(true);
    });

    it('replaces layout params when resuming parent after child mid-flight update', () => {
      // arrange
      const ctl = Controller.createNull();
      const { appLayout, getSettings } = trackedLayout('app-layout');
      const parent: AppObject<unknown, { menuTitle: string }> = {
        layout: {
          layout: (_ctl, _params) => appLayout,
          params: { menuTitle: 'Home' }
        },
        onStart: () => {},
        onResume: () => {}
      };
      const child: AppObject<unknown, { menuTitle: string; inputAccept?: { run: () => void } }> = {
        layout: { params: { menuTitle: 'Child' } },
        onStart: () => {
          ctl.ui.update({
            params: {
              menuTitle: 'Child',
              inputAccept: { run: () => {} }
            }
          });
        }
      };

      ctl.app.run(parent);
      ctl.app.run(child);
      expect(getSettings().inputAccept).toBeTruthy();

      // act
      ctl.app.exit();

      // assert
      expect(getSettings()).toEqual({ menuTitle: 'Home' });
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

  describe('AppObject lifecycle', () => {
    it('keeps parent state when onResume is not defined', () => {
      // arrange
      const ctl = Controller.createNull();
      let parentState = 'initial';
      ctl.app.run({
        onStart: () => {
          parentState = 'started';
        }
      });
      parentState = 'changed';
      ctl.app.run({ onStart: () => {} });

      // act
      ctl.app.exit();

      // assert
      expect(parentState).toBe('changed');
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

    test('clearInputAfterAction - refreshes displayed menu after clearing stale filter', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.menu.setDefaultFilter(WordFilter.create().filter);
      ctl.app.run({
        menu: () => ({
          id: 'main',
          focusBehaviour: 'first',
          items: [
            stdMenuItem({
              id: 'action',
              textContent: 'Action',
              action: () => {
                ctl.menu.invalidate();
              }
            }),
            stdMenuItem({
              id: 'another',
              textContent: 'Another',
              action: () => {}
            })
          ]
        }),
        onStart: () => {}
      });
      await ctl.menu.invalidate();
      ctl.input.setInputValue('zzzz');
      expect(ctl.currentProps.menuItems?.map((item) => item.id)).toEqual(['action', 'another']);

      // act
      ctl.menu.doMenuAction();

      // assert
      expect(ctl.input.getInputValue()).toBe('');
      expect(ctl.currentProps.menuItems?.map((item) => item.id)).toEqual(['action', 'another']);
    });

    test('clearInputAfterBack - default - clears after handled back', async () => {
      // arrange
      const ctl = Controller.createNull();
      ctl.app.run({
        onBack: () => {},
        onStart: () => {}
      });
      ctl.input.setInputValue('query');

      // act
      ctl.app.goBack();

      // assert
      expect(ctl.input.getInputValue()).toBe('');
    });

    test('clearInputAfterBack - false', async () => {
      // arrange
      const ctl = Controller.createNull();
      ctl.app.run({
        settings: { clearInputAfterBack: false },
        onBack: () => {},
        onStart: () => {}
      });
      ctl.input.setInputValue('query');

      // act
      ctl.app.goBack();

      // assert
      expect(ctl.input.getInputValue()).toBe('query');
    });

    test('clearInputAfterBack - parent AppObject keeps its input', async () => {
      // arrange
      const ctl = Controller.createNull();
      ctl.app.run({
        onResume: () => {
          ctl.input.setInputValue('parent');
        },
        onStart: () => {}
      });
      ctl.app.run({ onStart: () => {} });
      ctl.input.setInputValue('child');

      // act
      ctl.app.goBack();

      // assert
      expect(ctl.input.getInputValue()).toBe('parent');
    });
  });

  describe('actions', () => {
    test('menu action - menu item action overrides AppObject action', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      const actions: string[] = [];
      ctl.app.run({
        actions: {
          action: {
            action: (_ctl, context) => {
              actions.push(`app:${context?.source}`);
            }
          }
        },
        onStart: () => {}
      });
      ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'first',
        items: [
          stdMenuItem({
            id: 'action',
            textContent: 'Action',
            action: () => {
              actions.push('menu');
            }
          })
        ]
      });

      // act
      ctl.menu.doMenuAction();

      // assert
      expect(actions).toEqual(['menu']);
    });

    test('menu action - runs menu item action', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      const actions: string[] = [];
      ctl.app.run({ onStart: () => {} });
      ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'first',
        items: [
          stdMenuItem({
            id: 'action',
            textContent: 'Action',
            action: () => {
              actions.push('menu');
            }
          })
        ]
      });

      // act
      ctl.menu.doMenuAction();

      // assert
      expect(actions).toEqual(['menu']);
    });

    test('menu action - no action does nothing', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      const actions: string[] = [];
      ctl.app.run({
        actions: {
          action: {
            action: (_ctl, context) => {
              actions.push(`app:${context?.source}`);
            }
          }
        },
        onStart: () => {}
      });
      ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'first',
        items: [stdMenuItem({ id: 'action', textContent: 'Action' })]
      });

      // act
      ctl.menu.doMenuAction();

      // assert
      expect(actions).toEqual([]);
    });

    test('keyboard action - receives keyboard context', async () => {
      // arrange
      const ctl = Controller.createNull();
      const sources: string[] = [];
      ctl.app.run({
        actions: {
          ENTER: {
            action: (_ctl, context) => {
              sources.push(context?.source ?? 'missing');
            },
            binding: {
              bindings: ['Enter'],
              description: 'Enter'
            }
          }
        },
        onStart: () => {}
      });

      // act
      await ctl.simulateKey('Enter');

      // assert
      expect(sources).toEqual(['keyboard']);
    });

    // SUBMIT_PATTERN in docs/CONCEPTS.md. These use the built-in SUBMIT
    // ($mod+Enter), which only fires while the menu is open.

    test('submit: default path - runs setSubmitHandler', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      const ran: string[] = [];
      ctl.app.run({
        onStart: () => {
          ctl.input.setSubmitHandler(() => ran.push('handler'));
        }
      });

      // act
      await ctl.simulateKey('Enter', mod);

      // assert
      expect(ran).toEqual(['handler']);
    });

    test('submit: no binding - default key runs app action', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      const ran: string[] = [];
      ctl.app.run({
        actions: {
          [OneputAction.SUBMIT]: {
            action: () => {
              ran.push('app');
            }
          }
        },
        onStart: () => {
          ctl.input.setSubmitHandler(() => ran.push('handler'));
        }
      });

      // act
      await ctl.simulateKey('Enter', mod);

      // assert
      expect(ran).toEqual(['app']);
    });

    test('submit: own binding ([OneputAction.SUBMIT]) - replaces default key', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      const ran: string[] = [];
      ctl.app.run({
        actions: {
          [OneputAction.SUBMIT]: {
            action: () => {
              ran.push('app');
            },
            binding: { bindings: ['x'], description: 'Submit' }
          }
        },
        onStart: () => {
          ctl.input.setSubmitHandler(() => ran.push('handler'));
        }
      });

      // act
      await ctl.simulateKey('x');
      await ctl.simulateKey('Enter', mod);

      // assert
      expect(ran).toEqual(['app']);
    });

    test('submit: own binding ([OneputAction.SUBMIT]) - default key back after exit', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      const ran: string[] = [];
      ctl.app.run({
        onStart: () => {
          ctl.input.setSubmitHandler(() => ran.push('parent'));
        },
        onResume: () => {
          ctl.input.setSubmitHandler(() => ran.push('parent'));
        }
      });
      ctl.app.run({
        actions: {
          [OneputAction.SUBMIT]: {
            action: () => {
              ran.push('child');
            },
            binding: { bindings: ['x'], description: 'Submit' }
          }
        },
        onStart: () => {}
      });

      // act
      ctl.app.exit();
      await ctl.simulateKey('x');
      await ctl.simulateKey('Enter', mod);

      // assert
      expect(ran).toEqual(['parent']);
    });
  });

  describe('AppObject.watch', () => {
    /** A watched AppObject that records each refresh. */
    function watchedApp(label = () => 'a') {
      const model = notifier();
      const refreshes: string[] = [];
      const app: AppObject = {
        watch: () => [model],
        onRefresh: () => refreshes.push(label()),
        menu: () => ({
          id: 'main',
          items: [stdMenuItem({ id: label(), textContent: label() })]
        }),
        onStart: () => {}
      };
      return { app, model, refreshes };
    }

    it('notify - onRefresh runs and the menu rebuilds', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      let label = 'a';
      const { app, model, refreshes } = watchedApp(() => label);
      ctl.app.run(app);
      await waitForFocus();
      refreshes.length = 0;

      // act
      label = 'b';
      model.notify();
      await waitForFocus();

      // assert
      expect(refreshes).toEqual(['b']);
      expect(ctl.currentProps.menuItems?.map((item) => item.id)).toEqual(['b']);
    });

    it('notify several times in one turn - one refresh', async () => {
      // arrange
      const ctl = Controller.createNull();
      const { app, model, refreshes } = watchedApp();
      ctl.app.run(app);
      await waitForFocus();
      refreshes.length = 0;

      // act
      model.notify();
      model.notify();
      model.notify();
      await waitForFocus();

      // assert
      expect(refreshes).toHaveLength(1);
    });

    it('suspended or exited - no refresh', async () => {
      // arrange
      const ctl = Controller.createNull();
      const suspended = watchedApp();
      const exited = watchedApp();
      ctl.app.run(suspended.app);
      ctl.app.run(exited.app);
      ctl.app.exit();
      ctl.app.run({ onStart: () => {} });
      await waitForFocus();
      suspended.refreshes.length = 0;
      exited.refreshes.length = 0;

      // act
      suspended.model.notify();
      exited.model.notify();
      await waitForFocus();

      // assert
      expect(suspended.refreshes).toEqual([]);
      expect(exited.refreshes).toEqual([]);
    });

    it('resume - one refresh with no notify', async () => {
      // arrange
      const ctl = Controller.createNull();
      const { app, refreshes } = watchedApp();
      ctl.app.run(app);
      ctl.app.run({ onStart: () => {} });
      await waitForFocus();
      refreshes.length = 0;

      // act
      ctl.app.exit();
      await waitForFocus();

      // assert
      expect(refreshes).toHaveLength(1);
    });
  });

  describe('app events', () => {
    test('events map: current AppObject - handler runs', () => {
      // arrange
      const ctl = Controller.createNull();
      const received: unknown[] = [];
      ctl.app.run({
        onStart: () => {},
        events: { 'host-event': (payload) => received.push(payload) }
      });

      // act
      ctl.appEvents.emit({ type: 'host-event', payload: { id: 'n1' } });

      // assert
      expect(received).toEqual([{ id: 'n1' }]);
    });

    test('events map: suspended AppObject - handler does not run', () => {
      // arrange
      const ctl = Controller.createNull();
      const received: unknown[] = [];
      ctl.app.run({
        onStart: () => {},
        events: { 'host-event': (payload) => received.push(payload) }
      });
      ctl.app.run({ onStart: () => {} });

      // act
      ctl.appEvents.emit({ type: 'host-event' });

      // assert
      expect(received).toEqual([]);
    });

    test('events map: another event name - handler does not run', () => {
      // arrange
      const ctl = Controller.createNull();
      const received: unknown[] = [];
      ctl.app.run({
        onStart: () => {},
        events: { 'host-event': (payload) => received.push(payload) }
      });

      // act
      ctl.appEvents.emit({ type: 'other-event' });

      // assert
      expect(received).toEqual([]);
    });

    test('subscriber: outside an AppObject - hears the event whichever screen is active', () => {
      // arrange
      const ctl = Controller.createNull();
      const received: unknown[] = [];
      ctl.appEvents.on('host-event', (payload) => received.push(payload));
      ctl.app.run({ onStart: () => {} });
      ctl.app.run({ onStart: () => {} });

      // act
      ctl.appEvents.emit({ type: 'host-event', payload: { id: 'n1' } });

      // assert
      expect(received).toEqual([{ id: 'n1' }]);
    });
  });

  describe('replacement and root exit', () => {
    test('replace: root - cleanup without root exit', () => {
      // arrange
      const ctl = Controller.createNull();
      const exits: unknown[] = [];
      let oldClosed = false;
      const original: AppObject = {
        layout: { layout: () => layout('root-layout'), params: {} },
        onExit: () => {
          oldClosed = true;
        }
      };
      const replacement: AppObject = {
        onStart: () => {
          ctl.input.setInputValue('replacement');
        }
      };
      ctl.app.setOnRootExit((exit) => exits.push(exit));
      ctl.app.run(original);
      const claim = ctl.input.claim({
        owner: { type: 'draft' },
        value: { read: () => '', write: () => {} }
      });
      const changes = ctl.trackAppChanges();

      // act
      ctl.app.replace(replacement);

      // assert
      expect(oldClosed).toBe(true);
      expect(claim.released).toBe(true);
      expect(ctl.input.getInputValue()).toBe('replacement');
      expect(ctl.ui.getLayout()?.innerUI?.id).toBe('root-layout');
      expect(changes.data).toEqual([{ previous: original, current: replacement }]);
      expect(exits).toEqual([]);
    });

    test('replace: root - exit has no old parent to resume', () => {
      // arrange
      const ctl = Controller.createNull();
      const exits: unknown[] = [];
      const original: AppObject = {};
      const replacement: AppObject = {};
      ctl.app.setOnRootExit((exit) => exits.push(exit));
      ctl.app.run(original);
      ctl.app.replace(replacement);
      const changes = ctl.trackAppChanges();

      // act
      ctl.app.exit();

      // assert
      expect(changes.data).toEqual([{ previous: replacement, current: null }]);
      expect(exits).toEqual([{ app: replacement, payload: undefined }]);
    });

    test('replace: child - resume original parent', () => {
      // arrange
      const ctl = Controller.createNull();
      const exits: unknown[] = [];
      const parent: AppObject = {
        onResume: () => {
          ctl.input.setInputValue('parent');
        }
      };
      const child: AppObject = {};
      const replacement: AppObject = {};
      ctl.app.setOnRootExit((exit) => exits.push(exit));
      ctl.app.run(parent);
      ctl.app.run(child);
      ctl.app.replace(replacement);
      const changes = ctl.trackAppChanges();

      // act
      ctl.app.exit('child result');

      // assert
      expect(changes.data).toEqual([{ previous: replacement, current: parent }]);
      expect(ctl.input.getInputValue()).toBe('parent');
      expect(exits).toEqual([]);
    });

    test('exit: root - notify after cleanup and start next root', () => {
      // arrange
      const ctl = Controller.createNull();
      let oldClosed = false;
      let closedWhenNotified = false;
      const exits: unknown[] = [];
      const original: AppObject = {
        layout: { layout: () => layout('root-layout'), params: {} },
        onExit: () => {
          oldClosed = true;
        }
      };
      const next: AppObject = {
        layout: { params: { menuTitle: 'Next' } },
        onStart: () => {
          ctl.input.setInputValue('next root');
        }
      };
      ctl.app.setOnRootExit((exit) => {
        exits.push(exit);
        closedWhenNotified = oldClosed && !ctl.input.hasActiveClaim && !ctl.app.getMenu();
        ctl.app.run(next);
      });
      ctl.app.run(original);
      ctl.input.claim({
        owner: { type: 'draft' },
        value: { read: () => '', write: () => {} }
      });
      const changes = ctl.trackAppChanges();

      // act
      ctl.app.exit('root result');

      // assert
      expect(closedWhenNotified).toBe(true);
      expect(exits).toEqual([{ app: original, payload: 'root result' }]);
      expect(changes.data).toEqual([
        { previous: original, current: null },
        { previous: null, current: next }
      ]);
      expect(ctl.input.getInputValue()).toBe('next root');
      expect(ctl.ui.getLayout()?.innerUI?.id).toBe('root-layout');
      expect(ctl.app.canGoBack()).toBe(true);
    });

    test('exit: root - clear app and notify once', () => {
      // arrange
      const ctl = Controller.createNull();
      const exits: unknown[] = [];
      const root: AppObject = {
        menu: () => ({ id: 'root', items: [] })
      };
      ctl.app.setOnRootExit((exit) => exits.push(exit));
      ctl.app.run(root);
      const changes = ctl.trackAppChanges();

      // act
      ctl.app.exit();
      ctl.app.exit();

      // assert
      expect(exits).toEqual([{ app: root, payload: undefined }]);
      expect(changes.data).toEqual([{ previous: root, current: null }]);
      expect(ctl.app.getMenu()).toBeUndefined();
      expect(ctl.app.canGoBack()).toBe(false);
    });

    test('back: root - handler and enableGoBack', () => {
      // arrange
      const ctl = Controller.createNull();
      const exits: unknown[] = [];
      const root: AppObject = { settings: { enableGoBack: false } };
      ctl.app.setOnRootExit((exit) => exits.push(exit));
      ctl.app.run(root);

      // act
      ctl.app.goBack();

      // assert
      expect(ctl.app.canGoBack()).toBe(false);
      expect(exits).toEqual([]);
      ctl.ui.update({ flags: { enableGoBack: true } });
      expect(ctl.app.canGoBack()).toBe(true);
      ctl.app.goBack();
      expect(exits).toEqual([{ app: root, payload: undefined }]);
    });

    test('back: root - keep app after handler is removed', () => {
      // arrange
      const ctl = Controller.createNull();
      const exits: unknown[] = [];
      const root: AppObject = {};
      ctl.app.setOnRootExit((exit) => exits.push(exit));
      ctl.app.run(root);
      ctl.app.setOnRootExit(undefined);
      const changes = ctl.trackAppChanges();

      // act
      ctl.app.goBack();

      // assert
      expect(ctl.app.canGoBack()).toBe(false);
      expect(changes.data).toEqual([]);
      expect(exits).toEqual([]);
    });

    test('canGoBack: root, onBack, no hasBackLevel - false', () => {
      // arrange
      const ctl = Controller.createNull();
      const root: AppObject = { onBack: () => {} };

      // act
      ctl.app.run(root);

      // assert
      expect(ctl.app.canGoBack()).toBe(false);
    });

    test('canGoBack: root, setOnBack, hasBackLevel - follows it', () => {
      // arrange
      const ctl = Controller.createNull();
      let level = true;
      const root: AppObject = { hasBackLevel: () => level };
      ctl.app.run(root);
      ctl.app.setOnBack(() => {});

      // act
      const atLevel = ctl.app.canGoBack();
      level = false;
      const atTop = ctl.app.canGoBack();

      // assert
      expect(atLevel).toBe(true);
      expect(atTop).toBe(false);
    });

    test('canGoBack: child, hasBackLevel false - true', () => {
      // arrange
      const ctl = Controller.createNull();
      ctl.app.run({});
      const child: AppObject = { hasBackLevel: () => false };

      // act
      ctl.app.run(child);

      // assert
      expect(ctl.app.canGoBack()).toBe(true);
    });

    test('canGoBack: hasBackLevel true, enableGoBack false - false', () => {
      // arrange
      const ctl = Controller.createNull();
      const root: AppObject = { hasBackLevel: () => true, settings: { enableGoBack: false } };

      // act
      ctl.app.run(root);

      // assert
      expect(ctl.app.canGoBack()).toBe(false);
    });

    test('exit: root - clear app without a handler', () => {
      // arrange
      const ctl = Controller.createNull();
      const root: AppObject = {};
      ctl.app.run(root);
      const changes = ctl.trackAppChanges();

      // act
      ctl.app.exit();

      // assert
      expect(changes.data).toEqual([{ previous: root, current: null }]);
      expect(ctl.app.canGoBack()).toBe(false);
    });

    test('exit: root - wait for menu outro', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      const exits: unknown[] = [];
      const root: AppObject = {};
      ctl.app.setOnRootExit((exit) => exits.push(exit));
      ctl.app.run(root);

      // act
      ctl.app.closeAndExit('result');

      // assert
      expect(exits).toEqual([]);
      await new Promise((resolve) => setTimeout(resolve));
      expect(exits).toEqual([{ app: root, payload: 'result' }]);
    });

    test('replace: queued exit - keep replacement after outro', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      const exits: unknown[] = [];
      const root: AppObject = {};
      const replacement: AppObject = {};
      ctl.app.setOnRootExit((exit) => exits.push(exit));
      ctl.app.run(root);
      ctl.app.closeAndExit();
      const changes = ctl.trackAppChanges();

      // act
      ctl.app.replace(replacement);
      await new Promise((resolve) => setTimeout(resolve));

      // assert
      expect(changes.data).toEqual([{ previous: root, current: replacement }]);
      expect(exits).toEqual([]);
    });
  });

  describe('exit during menu close', () => {
    it('pops immediately when the menu is already closed', () => {
      // arrange
      const ctl = Controller.createNull();
      let parentResumed = false;
      const parent: AppObject = {
        onStart: () => {},
        onResume: () => {
          parentResumed = true;
        }
      };
      const child: AppObject = { onStart: () => {} };
      ctl.app.run(parent);
      ctl.app.run(child);

      // act
      ctl.app.closeAndExit();

      // assert
      expect(parentResumed).toBe(true);
    });

    it('does not resume the parent until the menu outro ends after closeAndExit', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      let parentResumed = false;
      const parent: AppObject = {
        onStart: () => {},
        onResume: () => {
          parentResumed = true;
        }
      };
      const child: AppObject = { onStart: () => {} };
      ctl.app.run(parent);
      ctl.app.run(child);

      // act
      ctl.app.closeAndExit();

      // assert
      expect(parentResumed).toBe(false);

      await new Promise((resolve) => setTimeout(resolve));
      expect(parentResumed).toBe(true);
    });

    it('does not resume the parent from onMenuOpenChange until the menu outro ends', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      let parentResumed = false;
      let parentHadResumedDuringClose = true;
      const parent: AppObject = {
        onStart: () => {},
        onResume: () => {
          parentResumed = true;
        }
      };
      const child: AppObject = {
        onStart: () => {},
        onMenuOpenChange: ({ open }) => {
          if (open) return;
          parentHadResumedDuringClose = parentResumed;
          ctl.app.exit();
        }
      };
      ctl.app.run(parent);
      ctl.app.run(child);

      // act
      ctl.menu.closeMenu();
      await new Promise((resolve) => setTimeout(resolve));

      // assert
      expect(parentHadResumedDuringClose).toBe(false);
      expect(parentResumed).toBe(true);
    });

    it('does not run onMenuOpenChange on the exiting AppObject after closeAndExit', async () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      let closeHookCount = 0;
      let parentResumed = false;
      const parent: AppObject = {
        onStart: () => {},
        onResume: () => {
          parentResumed = true;
        }
      };
      const child: AppObject = {
        onStart: () => {},
        onMenuOpenChange: ({ open }) => {
          if (!open) closeHookCount += 1;
        }
      };
      ctl.app.run(parent);
      ctl.app.run(child);

      // act
      ctl.app.closeAndExit();
      await new Promise((resolve) => setTimeout(resolve));

      // assert
      expect(closeHookCount).toBe(0);
      expect(parentResumed).toBe(true);
    });
  });

  describe('enableModal', () => {
    it('restores AppObject enableFilter after modal closes', () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({
        settings: { enableFilter: false, enableMenuOpenClose: false },
        onStart: () => {}
      });

      // act — same flag pattern as Confirm / Alert
      ctl.ui.update({ flags: { enableModal: true, enableKeys: true } });
      ctl.ui.update({ flags: { enableModal: false } });

      // assert
      expect(ctl.app.flags.enableFilter).toBe(false);
      expect(ctl.app.flags.enableMenuOpenClose).toBe(false);
      expect(ctl.app.flags.enableKeys).toBe(true);
    });
  });
});
