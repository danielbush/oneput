import type { AppLayoutParams, AppObject, Controller, UIFlags } from '@oneput/oneput';
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

  private constructor(
    private ctl: Controller,
    private icons: SetDateTimeIcons,
    private date?: DateVal,
    private time?: TimeVal
  ) {}

  settings = {
    enableFilter: false
  } satisfies UIFlags;

  /**
   * $mod+Enter submits when both date and time are set (same as Done).
   * Plain Enter stays catalog DO_ACTION (open focused date/time row).
   */
  actions = {
    ACCEPT: {
      action: () => {
        this.submit();
      },
      binding: {
        bindings: ['$mod+Enter'],
        description: 'Accept date and time',
        when: { menuOpen: true }
      }
    }
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
            this.ctl.app.run(PickDate.create(this.ctl, { date: this.date, icons: this.icons }));
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

  private syncChrome() {
    const canSubmit = Boolean(this.date && this.time);
    this.ctl.ui.update({
      params: {
        menuTitle: 'Set date and time...',
        inputAccept: {
          run: () => this.submit(),
          enabled: canSubmit
        }
      } satisfies AppLayoutParams
    });
  }
}
