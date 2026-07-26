import type { AppObject, Controller, UIFlags } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { DateVal } from '@oneput/oneput/shared/lib/time/DateVal.js';
import { TimeVal } from '@oneput/oneput/shared/lib/time/TimeVal.js';
import {
  isPickDateResult,
  PickDate,
  type PickDateIcons,
  type PickDateResult
} from '@oneput/oneput/shared/appObjects/PickDate.js';
import {
  isPickTimeResult,
  SetTime,
  type PickTimeResult
} from '@oneput/oneput/shared/appObjects/SetTime.js';

type SetDateTimeIcons = {
  Right: string;
  SetDateIcon: string;
  SetTimeIcon: string;
} & PickDateIcons;

export class SetDateTime implements AppObject<PickDateResult | PickTimeResult> {
  static create(
    ctl: Controller,
    params: {
      date?: DateVal;
      time?: TimeVal;
      icons: SetDateTimeIcons;
    }
  ) {
    return new SetDateTime(ctl, params.icons, params.date, params.time);
  }

  private constructor(
    private ctl: Controller,
    private icons: SetDateTimeIcons,
    private date?: DateVal,
    private time?: TimeVal
  ) {}

  settings = {
    enableFilter: false
  } satisfies UIFlags;

  onStart() {
    this.run();
  }

  onResume = (result?: { payload?: PickDateResult | PickTimeResult }) => {
    if (result?.payload) {
      if (isPickDateResult(result.payload)) {
        const [y, m, d] = result.payload.value.split('-').map(Number);
        this.date = DateVal.create(y, m, d);
        this.ctl.menu.focusNextMenuItem();
        this.run();
        return;
      }
      if (isPickTimeResult(result.payload)) {
        const [h, min] = result.payload.value.split(':').map(Number);
        this.time = TimeVal.create(h, min);
        this.ctl.menu.focusNextMenuItem();
        this.run();
        return;
      }
    }
    this.run();
  };

  run() {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Set date and time...'
      }
    });
    this.ctl.menu.clearGenerative();
    this.ctl.menu.setMenu({
      id: 'main',
      items: [
        stdMenuItem({
          id: 'set-date',
          textContent: this.date ? `Date: ${this.date.dateString}` : 'Set date...',
          left: (b) => [b.icon(this.icons.SetDateIcon)],
          right: (b) => [b.icon(this.icons.Right)],
          action: () => {
            this.ctl.app.run(
              PickDate.create(this.ctl, { date: this.date, icons: this.icons })
            );
          }
        }),
        stdMenuItem({
          id: 'set-time',
          textContent: this.time ? `Time: ${this.time.timeString}` : 'Set time...',
          left: (b) => [b.icon(this.icons.SetTimeIcon)],
          right: (b) => [b.icon(this.icons.Right)],
          action: () => {
            this.ctl.app.run(SetTime.create(this.ctl, { time: this.time }));
          }
        })
      ]
    });
  }
}
