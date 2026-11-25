import type { AppObject, Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import type { Send } from './flowMachine.js';

/** The first screen asks the machine to open the form. */
export class Welcome implements AppObject {
  static create(ctl: Controller, send: Send) {
    return new Welcome(ctl, send);
  }

  constructor(
    private ctl: Controller,
    private send: Send
  ) {}

  layout = { params: { menuTitle: 'Welcome' } };
  settings = { enableGoBack: false };

  onStart() {
    this.ctl.menu.setMenu({
      id: 'welcome',
      items: [
        stdMenuItem({
          id: 'next',
          textContent: 'Form demo...',
          action: () => this.send({ type: 'NEXT' })
        }),
        stdMenuItem({
          id: 'search',
          textContent: 'Async search (declarative)...',
          action: () => this.send({ type: 'SEARCH' })
        })
      ]
    });
  }
}
