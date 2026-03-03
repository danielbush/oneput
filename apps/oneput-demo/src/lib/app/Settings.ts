import type { Controller } from '@oneput/oneput';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { BindingsEditor } from '@oneput/oneput/shared/appObjects/BindingsEditor.js';
import { config } from '$lib/service/TestBindingsStore.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { FiltersUI } from './FiltersUI.js';
import { LocalBindingsService } from '@oneput/oneput/shared/bindings/LocalBindingsService.js';
import { icons } from './_icons.js';
import type { AppObject } from '@oneput/oneput';

export class Settings implements AppObject {
  static create(ctl: Controller) {
    return new Settings(ctl, {
      BindingsEditor: () => {
        const bindingsService = LocalBindingsService.create(ctl);
        return BindingsEditor.create(ctl, {
          keyBindingMap: ctl.keys.getDefaultBindings(),
          onUpdate: (keyBindingMap) => {
            return bindingsService.update(keyBindingMap);
          },
          icons: {
            Keyboard: icons.Keyboard,
            Close: icons.X,
            OK: icons.Check,
            Cancel: icons.X,
            WhenFlag: icons.Flag,
            Action: icons.SquareFunction,
            Right: icons.ChevronRight
          }
        });
      },
      FiltersUI: () => FiltersUI.create(ctl)
    });
  }

  constructor(
    private ctl: Controller,
    private create: {
      BindingsEditor: () => BindingsEditor;
      FiltersUI: () => FiltersUI;
    }
  ) {}

  onStart = () => {
    this.run();
  };

  // Example of declarative menu.
  menu = {
    id: 'main',
    items: [
      checkboxMenuItem({
        id: 'simulate-error',
        textContent: 'Toggle simulate error storing bindings',
        checked: config.simulateError,
        action: (_, checked) => {
          config.toggleSimulateError(checked);
        }
      }),
      stdMenuItem({
        id: 'default-filter',
        left: (b) => [b.icon(icons.ListFilter)],
        textContent: 'Set default typing filter...',
        action: () => {
          this.ctl.app.run(this.create.FiltersUI());
        }
      }),
      stdMenuItem({
        id: 'key-bindings',
        textContent: 'Set default key bindings...',
        left: (b) => [b.icon(icons.Keyboard)],
        action: () => {
          this.ctl.app.run(this.create.BindingsEditor());
        }
      })
    ]
  };

  run = () => {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Settings'
      }
    });
  };
}
