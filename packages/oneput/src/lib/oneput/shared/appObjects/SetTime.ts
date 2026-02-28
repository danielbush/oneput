import type { Controller } from '../../controllers/controller.js';
import type { AppObject, MenuItem } from '../../types.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import { TimeVal } from '../values/TimeVal.js';

export class SetTime implements AppObject {
  static create(ctl: Controller, params: { time?: TimeVal }) {
    return new SetTime(ctl, params.time);
  }

  #menuItems: MenuItem[] = [];

  private constructor(
    private ctl: Controller,
    private initialTime?: TimeVal
  ) {
    this.#menuItems = [];
    for (let minute = 0; minute <= 23 * 60 + 45; minute += 15) {
      const hour = Math.floor(minute / 60);
      this.#menuItems.push(
        stdMenuItem({
          id: `set-time-${minute}`,
          textContent: TimeVal.create(hour, minute % 60).timeString,
          action: () => {
            this.ctl.app.exit(new TimeVal(hour, minute % 60));
          },
          data: {
            hour,
            minute: minute % 60
          }
        })
      );
    }
  }

  onStart() {
    this.run();
  }

  run() {
    this.ctl.menu.setFillHandler((menuItem) => {
      if (!menuItem) {
        return;
      }
      const { hour, minute } = menuItem?.data as { hour: number; minute: number };
      this.ctl.input.setInputValue(TimeVal.create(hour, minute).timeString);
      this.ctl.input.focusInput();
    });
    this.ctl.ui.update({
      params: {
        menuTitle: 'Set a time...'
      }
    });
    this.ctl.input.setSubmitHandler((time) => {
      const [hour, minute] = time.split(':');
      const parsedHour = parseInt(hour);
      const parsedMinute = parseInt(minute);
      if (isNaN(parsedHour) || isNaN(parsedMinute)) {
        this.ctl.notify('Could not parse a number for hour or minute', { duration: 3000 });
        return;
      }
      this.ctl.app.exit(new TimeVal(parsedHour, parsedMinute));
    });
    this.ctl.input.setPlaceholder('Tab to fill input with a time or type in HH:MM...');
    this.ctl.menu.setMenuItems({ id: 'main', items: this.#menuItems });

    const currentHour = this.initialTime?.hour ?? new Date().getHours();
    const currentMinute = this.initialTime?.minute ?? new Date().getMinutes();
    this.ctl.menu.focusMenuItemByIndex(
      this.#menuItems.findIndex((item) => {
        const { hour, minute } = item.data as { hour: number; minute: number };
        if (hour === currentHour) {
          return currentMinute - minute < 15;
        }
      }) || 0,
      true
    );
  }
}
