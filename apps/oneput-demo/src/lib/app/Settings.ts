import type { Controller } from '@oneput/oneput';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { BindingsEditor } from '@oneput/oneput/shared/appObjects/BindingsEditor.js';
import { config } from '$lib/service/TestBindingsStore.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { FiltersUI } from './FiltersUI.js';
import { LocalBindingsService } from '@oneput/oneput/shared/bindings/LocalBindingsService.js';
import { icons } from '../icons.js';
import type { AppObject } from '@oneput/oneput';

export class Settings implements AppObject {
  static create(ctl: Controller) {
    return new Settings(ctl, {
      BindingsEditor: (isLocal: boolean) => {
        const bindingsService = LocalBindingsService.create(ctl);
        return BindingsEditor.create(ctl, {
          isLocal,
          keyBindingMap: ctl.keys.getDefaultBindings(isLocal),
          onUpdate: (keyBindingMap, isLocal) => {
            return bindingsService.update(keyBindingMap, isLocal);
          },
          icons: {
            Keyboard: icons.Keyboard,
            Close: icons.X,
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
      BindingsEditor: (isLocal: boolean) => BindingsEditor;
      FiltersUI: () => FiltersUI;
    }
  ) {}

  onStart = () => {
    this.run();
  };

  run = () => {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Settings'
      }
    });
    this.ctl.menu.setMenuItems({
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
          id: 'global-keys',
          textContent: 'Set global default key bindings...',
          left: (b) => [b.icon(icons.Keyboard)],
          action: () => {
            this.ctl.app.run(this.create.BindingsEditor(false));
          }
        }),
        stdMenuItem({
          id: 'local-keys',
          textContent: 'Set local default key bindings...',
          left: (b) => [b.icon(icons.Keyboard)],
          action: () => {
            this.ctl.app.run(this.create.BindingsEditor(true));
          }
        })
      ]
    });
  };
}
