import type { AppObject, Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';

/** Close this child to return to the same form. */
export class ColourPicker implements AppObject {
  static create(ctl: Controller) {
    return new ColourPicker(ctl);
  }

  constructor(private ctl: Controller) {}

  layout = { params: { menuTitle: 'Pick a colour' } };
  settings = { enableGoBack: true };

  onStart() {
    this.ctl.menu.setMenu({
      id: 'colours',
      items: ['Red', 'Green', 'Blue'].map((colour) =>
        stdMenuItem({
          id: colour,
          textContent: colour,
          action: () => {
            this.ctl.notify(`Picked ${colour}`, { duration: 2000 });
            this.ctl.app.goBack();
          }
        })
      )
    });
  }
}
