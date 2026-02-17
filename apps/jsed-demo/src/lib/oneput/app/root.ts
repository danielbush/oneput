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
      await Actions.create(this.ctl).loadTestDoc();
    }
  };
}
