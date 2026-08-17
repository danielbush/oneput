import type { AppActions, AppLayoutParams, AppObject, SharedCtl, UIFlags } from '../../types.js';
import { OneputAction } from '../actions/OneputAction.js';
import { DateVal } from '../lib/time/DateVal.js';
import { calendarMenuItem } from '../ui/menuItems/calendarMenuItem.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import { hflex } from '../../lib/builder.js';

/** Tagged resume payload: exit-with-result uses this; cancel exits with no payload. */
export type PickDateResult = {
  type: 'pick-date';
  value: string;
};

export function isPickDateResult(payload: unknown): payload is PickDateResult {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as PickDateResult).type === 'pick-date' &&
    typeof (payload as PickDateResult).value === 'string'
  );
}

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export type SetDateIcons = {
  PreviousMonth: string;
  NextMonth: string;
  PreviousYear: string;
  NextYear: string;
  Cancel?: string;
};

export type SetDateParams = {
  icons: SetDateIcons;
  /** Initial selection; defaults to today. */
  date?: DateVal;
};

/**
 * Set a date via a reusable {@link calendarMenuItem} rich row.
 * Month/year navigation + Today live in the pinned menu footer
 * (`< << Today >> >`); month/year is the menu header title.
 * Tick / catalog SUBMIT keep the date. Back / Cancel discard; confirm if the
 * date changed from the value at open.
 *
 * Takes {@link SharedCtl} (hosts pass a full Controller).
 */
export class SetDate implements AppObject {
  static create(ctl: SharedCtl, params: SetDateParams) {
    const initial = params.date;
    const now = new Date();
    return new SetDate(
      ctl,
      params.icons,
      initial?.year ?? now.getFullYear(),
      initial?.jsmonth ?? now.getMonth(),
      initial?.day ?? now.getDate()
    );
  }

  private constructor(
    private ctl: SharedCtl,
    private icons: SetDateIcons,
    private year: number,
    private month: number,
    private day: number
  ) {
    this.initialYear = year;
    this.initialMonth = month;
    this.initialDay = day;
  }

  private initialYear: number;
  private initialMonth: number;
  private initialDay: number;

  layout = {
    params: {
      menuTitle: 'Set a date'
    } satisfies AppLayoutParams
  };

  settings = {
    enableMenuOpenClose: false,
    enableFilter: false,
    enableInputElement: false,
    focusInputOnStart: false,
    clearInputAfterBack: false
  } satisfies UIFlags;

  /** Back discards (same as Cancel). Confirm if the date changed. */
  onBack = () => {
    void this.discard();
  };

  actions = {
    PREV_MONTH: {
      action: () => this.shiftMonth(-1),
      binding: {
        bindings: ['$mod+['],
        description: 'Previous month',
        when: { menuOpen: true }
      }
    },
    NEXT_MONTH: {
      action: () => this.shiftMonth(1),
      binding: {
        bindings: ['$mod+]'],
        description: 'Next month',
        when: { menuOpen: true }
      }
    },
    PREV_YEAR: {
      action: () => this.shiftYear(-1),
      binding: {
        bindings: ['Alt+BracketLeft'],
        description: 'Previous year',
        when: { menuOpen: true }
      }
    },
    NEXT_YEAR: {
      action: () => this.shiftYear(1),
      binding: {
        bindings: ['Alt+BracketRight'],
        description: 'Next year',
        when: { menuOpen: true }
      }
    },
    DAY_LEFT: {
      action: () => this.shiftDay(-1),
      binding: {
        bindings: ['$mod+Shift+h'],
        description: 'Previous day',
        when: { menuOpen: true }
      }
    },
    DAY_RIGHT: {
      action: () => this.shiftDay(1),
      binding: {
        bindings: ['$mod+Shift+l'],
        description: 'Next day',
        when: { menuOpen: true }
      }
    },
    DAY_UP: {
      action: () => this.shiftDay(-7),
      binding: {
        bindings: ['$mod+Shift+k'],
        description: 'Previous week',
        when: { menuOpen: true }
      }
    },
    DAY_DOWN: {
      action: () => this.shiftDay(7),
      binding: {
        bindings: ['$mod+Shift+j'],
        description: 'Next week',
        when: { menuOpen: true }
      }
    }
  } satisfies AppActions;

  menu = () => {
    const cancelIcon = this.icons.Cancel;
    return {
      id: 'set-date',
      focusBehaviour: 'first' as const,
      items: [
        calendarMenuItem({
          id: 'set-date-grid',
          year: this.year,
          month: this.month,
          selected: this.day,
          onSelect: (day) => {
            this.day = day;
            this.syncInput();
            this.ctl.menu.invalidate();
          }
        }),
        stdMenuItem({
          id: 'set-date-cancel',
          textContent: 'Cancel',
          left: cancelIcon ? (b) => [b.icon(cancelIcon)] : false,
          bindingHint: this.ctl.keys.getCurrentBindings()[OneputAction.BACK]?.bindings[0],
          action: () => {
            this.ctl.app.goBack();
          }
        })
      ],
      // `< << Today >> >` — month outside, year (double chevron) within
      footer: hflex({
        id: 'set-date-footer',
        children: (b) => [
          b.fchild({
            tag: 'button',
            classes: ['oneput__icon-button'],
            icon: this.icons.PreviousMonth,
            attr: {
              type: 'button',
              title: 'Previous month',
              'aria-label': 'Previous month',
              onclick: () => this.shiftMonth(-1)
            }
          }),
          b.fchild({
            tag: 'button',
            classes: ['oneput__icon-button'],
            icon: this.icons.PreviousYear,
            attr: {
              type: 'button',
              title: 'Previous year',
              'aria-label': 'Previous year',
              onclick: () => this.shiftYear(-1)
            }
          }),
          b.fchild({
            tag: 'button',
            classes: ['oneput__secondary-button'],
            textContent: 'Today',
            attr: {
              type: 'button',
              title: 'Today',
              onclick: () => this.goToday()
            }
          }),
          b.fchild({
            tag: 'button',
            classes: ['oneput__icon-button'],
            icon: this.icons.NextYear,
            attr: {
              type: 'button',
              title: 'Next year',
              'aria-label': 'Next year',
              onclick: () => this.shiftYear(1)
            }
          }),
          b.fchild({
            tag: 'button',
            classes: ['oneput__icon-button'],
            icon: this.icons.NextMonth,
            attr: {
              type: 'button',
              title: 'Next month',
              'aria-label': 'Next month',
              onclick: () => this.shiftMonth(1)
            }
          })
        ]
      })
    };
  };

  onStart() {
    this.ctl.input.setSubmitHandler(() => this.submit());
    this.syncChrome();
    this.ctl.input.setPlaceholder('Selected date…');
    this.syncInput();
  }

  private submit() {
    this.ctl.app.exit(this.result());
  }

  private async discard() {
    if (
      this.year !== this.initialYear ||
      this.month !== this.initialMonth ||
      this.day !== this.initialDay
    ) {
      const confirm = this.ctl.confirm({
        message: 'Discard date changes?'
      });
      const yes = await confirm.userChooses();
      if (!yes) {
        return;
      }
    }
    this.ctl.app.exit();
  }

  private result(): PickDateResult {
    return {
      type: 'pick-date',
      value: isoDate(this.year, this.month, this.day)
    };
  }

  private syncChrome() {
    this.ctl.ui.update({
      params: {
        menuTitle: `${MONTH_LABELS[this.month]} ${this.year}`,
        inputAccept: {
          run: () => this.submit(),
          label: this.ctl.keys.getCurrentBindings()[OneputAction.SUBMIT]?.bindings[0]
        }
      } satisfies AppLayoutParams
    });
  }

  private refresh() {
    this.syncInput();
    this.syncChrome();
    this.ctl.menu.invalidate();
  }

  private shiftMonth(delta: number) {
    const d = new Date(this.year, this.month + delta, 1);
    this.year = d.getFullYear();
    this.month = d.getMonth();
    this.clampDay();
    this.refresh();
  }

  private shiftYear(delta: number) {
    this.year += delta;
    this.clampDay();
    this.refresh();
  }

  /** Move selection by calendar days (crosses month/year). */
  private shiftDay(delta: number) {
    const d = new Date(this.year, this.month, this.day + delta);
    this.year = d.getFullYear();
    this.month = d.getMonth();
    this.day = d.getDate();
    this.refresh();
  }

  private goToday() {
    const now = new Date();
    this.year = now.getFullYear();
    this.month = now.getMonth();
    this.day = now.getDate();
    this.refresh();
  }

  private clampDay() {
    const max = new Date(this.year, this.month + 1, 0).getDate();
    if (this.day > max) this.day = max;
  }

  private syncInput() {
    this.ctl.input.setInputValue(isoDate(this.year, this.month, this.day));
  }
}
