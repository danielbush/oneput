import type { AppObject, Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import type { Send } from './flowMachine.js';

/** The confirm step finishes the form or returns to editing it. */
export class Confirm implements AppObject {
  static create(ctl: Controller, send: Send) {
    return new Confirm(ctl, send);
  }

  constructor(
    private ctl: Controller,
    private send: Send
  ) {}

  layout = { params: { menuTitle: 'Confirm' } };
  settings = { enableGoBack: false };

  onStart() {
    this.ctl.menu.setMenu({
      id: 'confirm',
      items: [
        stdMenuItem({
          id: 'next',
          textContent: 'Next: finish the form',
          action: () => this.send({ type: 'NEXT' })
        }),
        stdMenuItem({
          id: 'back',
          textContent: 'Back: edit the form',
          action: () => this.send({ type: 'BACK' })
        })
      ]
    });
  }
}
