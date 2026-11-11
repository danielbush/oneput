import type { AppObject, Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import type { Send } from './flowMachine.js';

/** The last screen can return to the form or start again. */
export class Done implements AppObject {
  static create(ctl: Controller, send: Send) {
    return new Done(ctl, send);
  }

  constructor(
    private ctl: Controller,
    private send: Send
  ) {}

  layout = { params: { menuTitle: 'Done' } };
  settings = { enableGoBack: false };

  onStart() {
    this.ctl.menu.setMenu({
      id: 'done',
      items: [
        stdMenuItem({
          id: 'restart',
          textContent: 'Restart: welcome',
          action: () => this.send({ type: 'RESTART' })
        }),
        stdMenuItem({
          id: 'back',
          textContent: 'Back: confirm',
          action: () => this.send({ type: 'BACK' })
        })
      ]
    });
  }
}
