import type { AppObject, Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from '../icons.js';
import type { LayoutSettings } from './_layout.js';
import { Actions } from './_actions.js';

export class Root implements AppObject {
  static create(ctl: Controller) {
    return new Root(ctl);
  }

  constructor(private ctl: Controller) {}

  onStart() {
    this.ctl.ui.update<LayoutSettings>({ params: { menuTitle: 'Root' } });
    this.ctl.menu.setMenuItems({
      id: 'root',
      items: [
        stdMenuItem({
          id: 'load-doc',
          textContent: 'Load test doc...',
          action: async () => {
            this.actions.LOAD_TEST_DOC();
          },
          left: (b) => [b.icon(icons.File)]
        })
      ]
    });
  }

  actions = {
    LOAD_TEST_DOC: async () => {
      const result = await Actions.create(this.ctl).loadTestDoc();
      if (result.isErr()) {
        switch (result.error.type) {
          case 'missing-element':
            this.ctl.notify(`Element #${result.error.id} not found`);
            break;
          case 'http':
            this.ctl.notify(
              `Failed to load doc: ${result.error.status} ${result.error.statusText}`
            );
            break;
          case 'network':
            this.ctl.notify('Network error loading doc');
            console.error(result.error.cause);
            break;
        }
      }
    }
  };
}
