import type { AppObject, Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { ColourPicker } from './ColourPicker.js';
import type { Send } from './flowMachine.js';

/** The picker is a child on the stack. It does not change the machine state. */
export class Form implements AppObject {
  static create(ctl: Controller, send: Send) {
    return new Form(ctl, send);
  }

  constructor(
    private ctl: Controller,
    private send: Send
  ) {}

  layout = { params: { menuTitle: 'Form' } };
  settings = { enableGoBack: false };
  onResume = () => this.onStart();

  onStart() {
    this.ctl.menu.setMenu({
      id: 'form',
      items: [
        stdMenuItem({
          id: 'pick-colour',
          textContent: 'Pick a colour…',
          action: () => this.ctl.app.run(ColourPicker.create(this.ctl))
        }),
        stdMenuItem({
          id: 'next',
          textContent: 'Next: confirm the form',
          action: () => this.send({ type: 'NEXT' })
        }),
        stdMenuItem({
          id: 'back',
          textContent: 'Back: welcome',
          action: () => this.send({ type: 'BACK' })
        })
      ]
    });
  }
}
