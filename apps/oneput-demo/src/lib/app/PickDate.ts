import type { AppObject, Controller, UIFlags } from '@oneput/oneput';
import { calendarMenuItem } from '@oneput/oneput/shared/ui/menuItems/calendarMenuItem.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from './_icons.js';
import type { LayoutSettings } from './_layout.js';

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
 * Demo AppObject: pick a date via a reusable {@link calendarMenuItem} rich row.
 * Month navigation + Today live in the pinned menu footer; month/year is the
 * menu header title.
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
    } satisfies LayoutSettings
  };

  settings = {
    enableMenuOpenClose: false,
    enableFilter: false
  } satisfies UIFlags;

  menu = () => ({
    id: 'pick-date',
    focusBehaviour: 'first' as const,
    items: [
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
    this.syncChrome();
    this.ctl.input.setPlaceholder('Selected date…');
    this.syncInput();
    this.ctl.input.focusInput();
  }

  private syncChrome() {
    this.ctl.ui.update({
      params: {
        menuTitle: `${MONTH_LABELS[this.month]} ${this.year}`,
        menuFooter: (b) => [
          b.fchild({
            tag: 'button',
            classes: ['oneput__icon-button'],
            icon: icons.ChevronLeft,
            attr: {
              type: 'button',
              title: 'Previous month',
              'aria-label': 'Previous month',
              onclick: () => this.shiftMonth(-1)
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
            icon: icons.ChevronRight,
            attr: {
              type: 'button',
              title: 'Next month',
              'aria-label': 'Next month',
              onclick: () => this.shiftMonth(1)
            }
          })
        ]
      } satisfies Partial<LayoutSettings>
    });
  }

  private shiftMonth(delta: number) {
    const d = new Date(this.year, this.month + delta, 1);
    this.year = d.getFullYear();
    this.month = d.getMonth();
    this.clampDay();
    this.syncInput();
    this.syncChrome();
    this.ctl.menu.invalidate();
  }

  private goToday() {
    const now = new Date();
    this.year = now.getFullYear();
    this.month = now.getMonth();
    this.day = now.getDate();
    this.syncInput();
    this.syncChrome();
    this.ctl.menu.invalidate();
  }

  private clampDay() {
    const max = new Date(this.year, this.month + 1, 0).getDate();
    if (this.day > max) this.day = max;
  }

  private syncInput() {
    this.ctl.input.setInputValue(isoDate(this.year, this.month, this.day));
  }
}
