import type { Controller } from '@oneput/oneput';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { BindingsEditor } from '@oneput/oneput/shared/appObjects/BindingsEditor.js';
import { config } from '$lib/service/TestBindingsStore.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { FiltersUI } from './FiltersUI.js';
import { LocalBindingsService } from '@oneput/oneput/shared/bindings/LocalBindingsService.js';
import { icons } from '../icons.js';
import type { AppObject } from '@oneput/oneput';

export class SettingsUI implements AppObject {
  static create(ctl: Controller) {
    const createGlobalBindingsEditor = () => {
      const bindingsService = LocalBindingsService.create(ctl);
      return BindingsEditor.create(ctl, {
        isLocal: false,
        keyBindingMap: ctl.keys.getDefaultBindings(false),
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
    };
    const createLocalBindingsEditor = () => {
      const bindingsService = LocalBindingsService.create(ctl);
      return BindingsEditor.create(ctl, {
        isLocal: true,
        keyBindingMap: ctl.keys.getDefaultBindings(true),
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
    };
    const createFiltersUI = () => {
      return FiltersUI.create(ctl);
    };
    return new SettingsUI(
      ctl,
      createGlobalBindingsEditor,
      createLocalBindingsEditor,
      createFiltersUI
    );
  }

  constructor(
    private ctl: Controller,
    private createGlobalBindingsEditor: () => BindingsEditor,
    private createLocalBindingsEditor: () => BindingsEditor,
    private createFiltersUI: () => FiltersUI
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
            this.ctl.app.run(this.createFiltersUI());
          }
        }),
        stdMenuItem({
          id: 'global-keys',
          textContent: 'Set global default key bindings...',
          left: (b) => [b.icon(icons.Keyboard)],
          action: () => {
            this.ctl.app.run(this.createGlobalBindingsEditor());
          }
        }),
        stdMenuItem({
          id: 'local-keys',
          textContent: 'Set local default key bindings...',
          left: (b) => [b.icon(icons.Keyboard)],
          action: () => {
            this.ctl.app.run(this.createLocalBindingsEditor());
          }
        })
      ]
    });
  };
}
