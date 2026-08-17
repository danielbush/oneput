import type { AppActions, AppLayoutParams, AppObject, SharedCtl, UIFlags } from '../../types.js';
import { OneputAction } from '../actions/OneputAction.js';
import {
  adjustHour24,
  adjustMinute,
  stepQuarterClock,
  to12Hour,
  toggleAmPm
} from '../lib/time/timeAdjust.js';
import { TimeVal } from '../lib/time/TimeVal.js';
import { setTimeMenuItem } from '../ui/menuItems/setTimeMenuItem.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';

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

export type SetTimeIcons = {
  Cancel: string;
};

export type SetTimeParams = {
  /** Initial selection; defaults to now. */
  time?: TimeVal;
  icons?: SetTimeIcons;
};

/**
 * Pick a clock time via {@link setTimeMenuItem} (12h + AM/PM, wrap 24h).
 * Tick / catalog SUBMIT keep the time. Back / Cancel discard; confirm if the
 * time changed from the value at open.
 *
 * Takes {@link SharedCtl} (hosts pass a full Controller).
 */
export class SetTime implements AppObject {
  static create(ctl: SharedCtl, params: SetTimeParams = {}) {
    const now = new Date();
    return new SetTime(
      ctl,
      params.time?.hour ?? now.getHours(),
      params.time?.minute ?? now.getMinutes(),
      params.icons
    );
  }

  private constructor(
    private ctl: SharedCtl,
    private hour: number,
    private minute: number,
    private icons?: SetTimeIcons
  ) {
    this.initialHour = hour;
    this.initialMinute = minute;
  }

  private initialHour: number;
  private initialMinute: number;

  layout = {
    params: {
      menuTitle: 'Set a time'
    } satisfies AppLayoutParams
  };

  settings = {
    enableMenuOpenClose: false,
    enableFilter: false,
    enableInputElement: false,
    focusInputOnStart: false,
    clearInputAfterBack: false
  } satisfies UIFlags;

  /** Back discards (same as Cancel). Confirm if the time changed. */
  onBack = () => {
    void this.discard();
  };

  actions = {
    TOGGLE_AM_PM: {
      action: () => {
        this.hour = toggleAmPm(this.hour);
        this.refresh();
      },
      binding: {
        bindings: ['$mod+Shift+a'],
        description: 'Toggle AM/PM',
        when: { menuOpen: true }
      }
    },
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
    }
  } satisfies AppActions;

  menu = () => {
    const { isPM } = to12Hour(this.hour);
    const cancelIcon = this.icons?.Cancel;
    return {
      id: 'set-time',
      focusBehaviour: 'first' as const,
      items: [
        setTimeMenuItem({
          id: 'set-time-widget',
          hour: this.hour,
          minute: this.minute,
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
        }),
        stdMenuItem({
          id: 'set-time-cancel',
          textContent: 'Cancel',
          left: cancelIcon ? (b) => [b.icon(cancelIcon)] : false,
          bindingHint: this.ctl.keys.getCurrentBindings()[OneputAction.BACK]?.bindings[0],
          action: () => {
            this.ctl.app.goBack();
          }
        })
      ]
    };
  };

  onStart() {
    this.ctl.input.setSubmitHandler(() => this.submit());
    this.syncChrome();
    this.ctl.input.setPlaceholder('Selected time…');
    this.syncInput();
  }

  private submit() {
    this.ctl.app.exit(this.result());
  }

  private async discard() {
    if (this.hour !== this.initialHour || this.minute !== this.initialMinute) {
      const confirm = this.ctl.confirm({
        message: 'Discard time changes?'
      });
      const yes = await confirm.userChooses();
      if (!yes) {
        return;
      }
    }
    this.ctl.app.exit();
  }

  private result(): PickTimeResult {
    return {
      type: 'pick-time',
      value: hhmm(this.hour, this.minute)
    };
  }

  private refresh() {
    this.syncInput();
    this.ctl.menu.invalidate();
  }

  private applyHour(delta: number) {
    this.hour = adjustHour24(this.hour, delta);
    this.refresh();
  }

  private applyMinute(delta: number) {
    this.minute = adjustMinute(this.minute, delta);
    this.refresh();
  }

  private applyQuarter(direction: 1 | -1) {
    const next = stepQuarterClock(this.hour, this.minute, direction);
    this.hour = next.hour;
    this.minute = next.minute;
    this.refresh();
  }

  private syncChrome() {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Set a time',
        inputAccept: {
          run: () => this.submit(),
          label: this.ctl.keys.getCurrentBindings()[OneputAction.SUBMIT]?.bindings[0]
        }
      } satisfies AppLayoutParams
    });
  }

  private syncInput() {
    this.ctl.input.setInputValue(hhmm(this.hour, this.minute));
  }
}
