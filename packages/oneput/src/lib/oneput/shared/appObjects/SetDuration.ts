import type { Controller } from '../../controllers/controller.js';
import type { AppLayoutParams, AppObject, UIFlags } from '../../types.js';
import {
  adjustHourClamped,
  adjustMinute,
  stepQuarterClamped
} from '../lib/time/timeAdjust.js';
import { TimeVal } from '../lib/time/TimeVal.js';
import { setTimeMenuItem } from '../ui/menuItems/setTimeMenuItem.js';

/** Tagged resume payload: exit-with-result uses this; cancel exits with no payload. */
export type PickDurationResult = {
  type: 'pick-duration';
  /** Total duration in seconds. */
  value: number;
};

export function isPickDurationResult(payload: unknown): payload is PickDurationResult {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as PickDurationResult).type === 'pick-duration' &&
    typeof (payload as PickDurationResult).value === 'number'
  );
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export type SetDurationParams = {
  /** Initial duration; defaults to 30 minutes. */
  duration?: TimeVal;
};

/**
 * Pick an elapsed duration via {@link setTimeMenuItem} (no AM/PM; hours clamp at 100).
 * Exit-with-result is advertised via `exitWithResult` for host layouts (tick);
 * cancel remains bare exit / goBack.
 */
export class SetDuration implements AppObject {
  static create(ctl: Controller, params: SetDurationParams = {}) {
    const initial = params.duration ?? TimeVal.create(0, 30);
    return new SetDuration(ctl, initial.hour, initial.minute);
  }

  private constructor(
    private ctl: Controller,
    private hour: number,
    private minute: number
  ) {}

  layout = {
    params: {
      menuTitle: 'Set duration'
    } satisfies AppLayoutParams
  };

  settings = {
    enableMenuOpenClose: false,
    enableFilter: false,
    enableInputElement: false,
    focusInputOnStart: false
  } satisfies UIFlags;

  menu = () => ({
    id: 'set-duration',
    focusBehaviour: 'first' as const,
    items: [
      setTimeMenuItem({
        id: 'set-duration-widget',
        hour: this.hour,
        minute: this.minute,
        hourLabel: String(this.hour),
        adjustHour: adjustHourClamped,
        adjustMinute,
        stepQuarter: stepQuarterClamped,
        onChange: ({ hour, minute }) => {
          this.hour = hour;
          this.minute = minute;
          this.syncInput();
          this.ctl.menu.invalidate();
        }
      })
    ]
  });

  onStart() {
    this.syncChrome();
    this.ctl.input.setPlaceholder('Duration (hh:mm)…');
    this.syncInput();
  }

  private result(): PickDurationResult {
    return {
      type: 'pick-duration',
      value: TimeVal.create(this.hour, this.minute).totalSeconds
    };
  }

  private syncChrome() {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Set duration',
        exitWithResult: {
          run: () => this.ctl.app.exit(this.result())
        }
      } satisfies AppLayoutParams
    });
  }

  private syncInput() {
    this.ctl.input.setInputValue(`${pad2(this.hour)}:${pad2(this.minute)}`);
  }
}
