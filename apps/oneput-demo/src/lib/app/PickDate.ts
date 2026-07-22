import type { AppLayoutParams, AppObject, Controller, UIFlags } from '@oneput/oneput';
import { calendarMenuItem } from '@oneput/oneput/shared/ui/menuItems/calendarMenuItem.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from './_icons.js';

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

/**
 * Demo AppObject: pick a date via a reusable {@link calendarMenuItem} rich row
 * sitting between ordinary Today / Accept actions.
 */
export class PickDate implements AppObject {
  static create(ctl: Controller) {
    const now = new Date();
    return new PickDate(ctl, now.getFullYear(), now.getMonth(), now.getDate());
  }

  private constructor(
    private ctl: Controller,
    private year: number,
    private month: number,
    private day: number
  ) {}

  layout = {
    params: {
      menuTitle: 'Pick a date'
    } satisfies AppLayoutParams
  };

  settings = {
    enableMenuOpenClose: false,
    enableFilter: false
  } satisfies UIFlags;

  menu = () => ({
    id: 'pick-date',
    focusBehaviour: 'first' as const,
    items: [
      stdMenuItem({
        id: 'pick-date-today',
        textContent: 'Today',
        left: (b) => [b.icon(icons.CalendarCheck)],
        action: () => {
          const now = new Date();
          this.year = now.getFullYear();
          this.month = now.getMonth();
          this.day = now.getDate();
          this.syncInput();
          this.ctl.menu.invalidate();
        }
      }),
      calendarMenuItem({
        id: 'pick-date-grid',
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
        id: 'pick-date-prev',
        textContent: 'Previous month',
        left: (b) => [b.icon(icons.ArrowLeft)],
        action: () => {
          const d = new Date(this.year, this.month - 1, 1);
          this.year = d.getFullYear();
          this.month = d.getMonth();
          this.clampDay();
          this.syncInput();
          this.ctl.ui.update({
            params: { menuTitle: `${MONTH_LABELS[this.month]} ${this.year}` }
          });
          this.ctl.menu.invalidate();
        }
      }),
      stdMenuItem({
        id: 'pick-date-next',
        textContent: 'Next month',
        left: (b) => [b.icon(icons.ChevronRight)],
        action: () => {
          const d = new Date(this.year, this.month + 1, 1);
          this.year = d.getFullYear();
          this.month = d.getMonth();
          this.clampDay();
          this.syncInput();
          this.ctl.ui.update({
            params: { menuTitle: `${MONTH_LABELS[this.month]} ${this.year}` }
          });
          this.ctl.menu.invalidate();
        }
      }),
      stdMenuItem({
        id: 'pick-date-accept',
        textContent: 'Accept',
        left: (b) => [b.icon(icons.Check)],
        action: () => {
          const value = isoDate(this.year, this.month, this.day);
          this.ctl.notify(`Picked ${value}`, { duration: 3000 });
          this.ctl.app.exit({ payload: value });
        }
      })
    ]
  });

  onStart() {
    this.ctl.ui.update({
      params: { menuTitle: `${MONTH_LABELS[this.month]} ${this.year}` }
    });
    this.ctl.input.setPlaceholder('Selected date…');
    this.syncInput();
    this.ctl.input.focusInput();
  }

  private clampDay() {
    const max = new Date(this.year, this.month + 1, 0).getDate();
    if (this.day > max) this.day = max;
  }

  private syncInput() {
    this.ctl.input.setInputValue(isoDate(this.year, this.month, this.day));
  }
}
