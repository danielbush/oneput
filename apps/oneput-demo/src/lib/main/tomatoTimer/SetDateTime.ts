import type { AppLayoutParams, AppObject, Controller, UIFlags } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { DateVal } from '@oneput/oneput/shared/lib/time/DateVal.js';
import { TimeVal } from '@oneput/oneput/shared/lib/time/TimeVal.js';
import {
  isPickDateResult,
  SetDate,
  type SetDateIcons,
  type PickDateResult
} from '@oneput/oneput/shared/appObjects/SetDate.js';
import {
  isPickTimeResult,
  SetTime,
  type PickTimeResult
} from '@oneput/oneput/shared/appObjects/SetTime.js';

type SetDateTimeIcons = {
  Right: string;
  SetDateIcon: string;
  SetTimeIcon: string;
  Cancel: string;
} & SetDateIcons;

/** Tagged resume payload for Add Entry start-time. */
export type PickDateTimeResult = {
  type: 'pick-date-time';
  /** Unix seconds. */
  value: number;
};

export function isPickDateTimeResult(payload: unknown): payload is PickDateTimeResult {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as PickDateTimeResult).type === 'pick-date-time' &&
    typeof (payload as PickDateTimeResult).value === 'number'
  );
}

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

  private initialDate?: DateVal;
  private initialTime?: TimeVal;

  private constructor(
    private ctl: Controller,
    private icons: SetDateTimeIcons,
    private date?: DateVal,
    private time?: TimeVal
  ) {
    this.initialDate = date;
    this.initialTime = time;
  }

  layout = {
    params: {
      menuTitle: 'Set date and time...'
    } satisfies AppLayoutParams
  };

  settings = {
    enableFilter: false,
    enableMenuOpenClose: false,
    clearInputAfterBack: false
  } satisfies UIFlags;

  /**
   * Back keeps the current date+time when both are set.
   * Cancel discards; confirm if they changed from open.
   * Plain Enter stays catalog DO_ACTION (open focused date/time row).
   */
  onBack = () => {
    if (this.date && this.time) {
      this.submit();
      return;
    }
    this.ctl.app.exit();
  };

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
    this.ctl.input.setSubmitHandler(() => this.submit());
    this.syncChrome();
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
            this.ctl.app.run(SetDate.create(this.ctl, { date: this.date, icons: this.icons }));
          }
        }),
        stdMenuItem({
          id: 'set-time',
          textContent: this.time ? `Time: ${this.time.timeString}` : 'Set time...',
          left: (b) => [b.icon(this.icons.SetTimeIcon)],
          right: (b) => [b.icon(this.icons.Right)],
          action: () => {
            this.ctl.app.run(SetTime.create(this.ctl, { time: this.time, icons: this.icons }));
          }
        }),
        stdMenuItem({
          id: 'set-date-time-cancel',
          textContent: 'Cancel',
          left: (b) => [b.icon(this.icons.Cancel)],
          action: () => {
            void this.discard();
          }
        })
      ]
    });
  }

  private result(): PickDateTimeResult {
    const date = this.date!;
    const time = this.time!;
    const value =
      new Date(date.year, date.month - 1, date.day, time.hour, time.minute).getTime() / 1000;
    return { type: 'pick-date-time', value };
  }

  private submit() {
    if (!this.date || !this.time) return;
    this.ctl.app.exit(this.result());
  }

  private async discard() {
    if (this.isDirty()) {
      const confirm = this.ctl.confirm({
        message: 'Discard date and time changes?'
      });
      const yes = await confirm.userChooses();
      if (!yes) {
        return;
      }
    }
    this.ctl.app.exit();
  }

  private isDirty() {
    return (
      this.date?.year !== this.initialDate?.year ||
      this.date?.month !== this.initialDate?.month ||
      this.date?.day !== this.initialDate?.day ||
      this.time?.hour !== this.initialTime?.hour ||
      this.time?.minute !== this.initialTime?.minute
    );
  }

  private syncChrome() {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Set date and time...',
        inputAccept: undefined
      } satisfies AppLayoutParams
    });
  }
}
