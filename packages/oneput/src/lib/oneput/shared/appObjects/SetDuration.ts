import type { AppActions, AppLayoutParams, AppObject, SharedCtl, UIFlags } from '../../types.js';
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
 * Accept is advertised via `submitAndExit` for host layouts;
 * cancel remains bare exit / goBack.
 *
 * Takes {@link SharedCtl} (hosts pass a full Controller).
 */
export class SetDuration implements AppObject {
  static create(ctl: SharedCtl, params: SetDurationParams = {}) {
    const initial = params.duration ?? TimeVal.create(0, 30);
    return new SetDuration(ctl, initial.hour, initial.minute);
  }

  private constructor(
    private ctl: SharedCtl,
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

  actions = {
    HOUR_UP: {
      action: () => this.applyHour(1),
      binding: {
        bindings: ['$mod+Shift+k'],
        description: 'Hour up',
        when: { menuOpen: true }
      }
    },
    HOUR_DOWN: {
      action: () => this.applyHour(-1),
      binding: {
        bindings: ['$mod+Shift+j'],
        description: 'Hour down',
        when: { menuOpen: true }
      }
    },
    MINUTE_MINUS_15: {
      action: () => this.applyQuarter(-1),
      binding: {
        bindings: ['$mod+Shift+h'],
        description: '−15 minutes',
        when: { menuOpen: true }
      }
    },
    MINUTE_PLUS_15: {
      action: () => this.applyQuarter(1),
      binding: {
        bindings: ['$mod+Shift+l'],
        description: '+15 minutes',
        when: { menuOpen: true }
      }
    },
    MINUTE_MINUS_1: {
      action: () => this.applyMinute(-1),
      binding: {
        bindings: ['$mod+['],
        description: '−1 minute',
        when: { menuOpen: true }
      }
    },
    MINUTE_PLUS_1: {
      action: () => this.applyMinute(1),
      binding: {
        bindings: ['$mod+]'],
        description: '+1 minute',
        when: { menuOpen: true }
      }
    },
    ACCEPT: {
      action: () => this.ctl.app.exit(this.result()),
      binding: {
        bindings: ['Enter'],
        description: 'Accept duration',
        when: { menuOpen: true }
      }
    }
  } satisfies AppActions;

  menu = () => ({
    id: 'set-duration',
    focusBehaviour: 'first' as const,
    items: [
      setTimeMenuItem({
        id: 'set-duration-widget',
        hour: this.hour,
        minute: this.minute,
        hourLabel: 'h',
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

  private refresh() {
    this.syncInput();
    this.ctl.menu.invalidate();
  }

  private applyHour(delta: number) {
    this.hour = adjustHourClamped(this.hour, delta);
    this.refresh();
  }

  private applyMinute(delta: number) {
    this.minute = adjustMinute(this.minute, delta);
    this.refresh();
  }

  private applyQuarter(direction: 1 | -1) {
    const next = stepQuarterClamped(this.hour, this.minute, direction);
    this.hour = next.hour;
    this.minute = next.minute;
    this.refresh();
  }

  private syncChrome() {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Set duration',
        submitAndExit: {
          run: () => this.ctl.app.exit(this.result())
        }
      } satisfies AppLayoutParams
    });
  }

  private syncInput() {
    this.ctl.input.setInputValue(`${pad2(this.hour)}:${pad2(this.minute)}`);
  }
}
