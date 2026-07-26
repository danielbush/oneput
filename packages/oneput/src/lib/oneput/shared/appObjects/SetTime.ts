import type { Controller } from '../../controllers/controller.js';
import type { AppLayoutParams, AppObject, UIFlags } from '../../types.js';
import {
  adjustHour24,
  adjustMinute,
  stepQuarterClock,
  to12Hour,
  toggleAmPm
} from '../lib/time/timeAdjust.js';
import { TimeVal } from '../lib/time/TimeVal.js';
import { setTimeMenuItem } from '../ui/menuItems/setTimeMenuItem.js';

/** Tagged resume payload: exit-with-result uses this; cancel exits with no payload. */
export type PickTimeResult = {
  type: 'pick-time';
  value: string;
};

export function isPickTimeResult(payload: unknown): payload is PickTimeResult {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as PickTimeResult).type === 'pick-time' &&
    typeof (payload as PickTimeResult).value === 'string'
  );
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function hhmm(hour: number, minute: number) {
  return `${pad2(hour)}:${pad2(minute)}`;
}

export type SetTimeParams = {
  /** Initial selection; defaults to now. */
  time?: TimeVal;
};

/**
 * Pick a clock time via {@link setTimeMenuItem} (12h + AM/PM, wrap 24h).
 * Exit-with-result is advertised via `exitWithResult` for host layouts (tick);
 * cancel remains bare exit / goBack.
 */
export class SetTime implements AppObject {
  static create(ctl: Controller, params: SetTimeParams = {}) {
    const now = new Date();
    return new SetTime(
      ctl,
      params.time?.hour ?? now.getHours(),
      params.time?.minute ?? now.getMinutes()
    );
  }

  private constructor(
    private ctl: Controller,
    private hour: number,
    private minute: number
  ) {}

  layout = {
    params: {
      menuTitle: 'Set a time'
    } satisfies AppLayoutParams
  };

  settings = {
    enableMenuOpenClose: false,
    enableFilter: false,
    enableInputElement: false,
    focusInputOnStart: false
  } satisfies UIFlags;

  menu = () => {
    const { hour12, isPM } = to12Hour(this.hour);
    return {
      id: 'set-time',
      focusBehaviour: 'first' as const,
      items: [
        setTimeMenuItem({
          id: 'set-time-widget',
          hour: this.hour,
          minute: this.minute,
          hourLabel: String(hour12),
          amPm: {
            label: isPM ? 'PM' : 'AM',
            onToggle: () => {
              this.hour = toggleAmPm(this.hour);
              this.syncInput();
              this.ctl.menu.invalidate();
            }
          },
          adjustHour: adjustHour24,
          adjustMinute,
          stepQuarter: stepQuarterClock,
          onChange: ({ hour, minute }) => {
            this.hour = hour;
            this.minute = minute;
            this.syncInput();
            this.ctl.menu.invalidate();
          }
        })
      ]
    };
  };

  onStart() {
    this.syncChrome();
    this.ctl.input.setPlaceholder('Selected time…');
    this.syncInput();
  }

  private result(): PickTimeResult {
    return {
      type: 'pick-time',
      value: hhmm(this.hour, this.minute)
    };
  }

  private syncChrome() {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Set a time',
        exitWithResult: {
          run: () => this.ctl.app.exit(this.result())
        }
      } satisfies AppLayoutParams
    });
  }

  private syncInput() {
    this.ctl.input.setInputValue(hhmm(this.hour, this.minute));
  }
}
