import type { Controller } from '@oneput/oneput';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { BindingsEditor } from '@oneput/oneput/shared/appObjects/BindingsEditor.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { FiltersUI } from './FiltersUI.js';
import { LocalBindingsService } from '@oneput/oneput/shared/bindings/LocalBindingsService.js';
import { TestBindingsService } from '@oneput/oneput/shared/bindings/TestBindingsService.js';
import { icons } from './_icons.js';
import type { AppObject } from '@oneput/oneput';

export class Settings implements AppObject {
  static create(ctl: Controller) {
    const localStore = LocalBindingsService.create(ctl);
    const testStore = TestBindingsService.create();
    return new Settings(ctl, {
      BindingsEditor: ({ useTestService }: { useTestService: boolean }) => {
        const store = useTestService ? testStore : localStore;
        return BindingsEditor.create(ctl, {
          keyBindingMap: ctl.keys.getDefaultBindings(),
          store,
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

  private useTestService = false;

  constructor(
    private ctl: Controller,
    private create: {
      BindingsEditor: (params: { useTestService: boolean }) => BindingsEditor;
      FiltersUI: () => FiltersUI;
    }
  ) {}

  onStart = () => {
    this.run();
  };

  menu = {
    id: 'main',
    items: [
      checkboxMenuItem({
        id: 'simulate-error',
        textContent: 'Use test bindings service (always errors)',
        checked: false,
        action: (_, checked) => {
          this.useTestService = checked;
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
          this.ctl.app.run(this.create.BindingsEditor({ useTestService: this.useTestService }));
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
