import { randomId } from '../../../lib/utils.js';
import type { MenuItem } from '../../../types.js';
import { tapSelect } from './tapSelect.js';

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

type DayCell = { day: number; inMonth: boolean };

/**
 * Monday-first weeks for the month. Only completes the final partial week —
 * never adds a trailing next-month-only row.
 */
export function monthGrid(year: number, month: number): DayCell[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const lead = (first.getDay() + 6) % 7;

  const cells: DayCell[] = [];
  for (let i = lead; i > 0; i--) {
    cells.push({ day: daysInPrev - i + 1, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true });
  }
  for (let d = 1; cells.length % 7 !== 0; d++) {
    cells.push({ day: d, inMonth: false });
  }

  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export type CalendarMenuItemParams = {
  id?: string;
  year: number;
  /** 0-based month (Date semantics). */
  month: number;
  selected?: number;
  onSelect?: (day: number) => void;
  /** List-row action (e.g. enter inner focus). Optional. */
  action?: () => void;
};

/**
 * One compound menu item: a month day-grid. Day cells use {@link tapSelect}
 * so scrolling the menu does not pick a day. Sit beside ordinary items via
 * `setMenu` / `menu()`.
 */
export function calendarMenuItem(params: CalendarMenuItemParams): MenuItem {
  const id = params.id ?? randomId();
  const weeks = monthGrid(params.year, params.month);
  const now = new Date();
  const todayDay =
    now.getFullYear() === params.year && now.getMonth() === params.month
      ? now.getDate()
      : undefined;

  return {
    id,
    type: 'vflex',
    classes: ['oneput__calendar-menu-item'],
    canFilter: false,
    action: params.action,
    children: [
      {
        id: `${id}-weekdays`,
        type: 'hflex',
        classes: ['oneput__calendar-row'],
        children: DAY_LABELS.map((label) => ({
          id: `${id}-weekday-${label}`,
          type: 'fchild' as const,
          classes: ['oneput__calendar-cell', 'oneput__calendar-cell--label'],
          textContent: label
        }))
      },
      ...weeks.map((week, w) => ({
        id: `${id}-week-${w}`,
        type: 'hflex' as const,
        classes: ['oneput__calendar-row'],
        children: week.map((cell, d) => {
          const isSelected = cell.inMonth && cell.day === params.selected;
          const isToday = cell.inMonth && cell.day === todayDay;
          if (!cell.inMonth) {
            return {
              id: `${id}-week-${w}-day-${d}`,
              type: 'fchild' as const,
              classes: ['oneput__calendar-cell', 'oneput__calendar-cell--outside'],
              textContent: String(cell.day)
            };
          }
          return {
            id: `${id}-week-${w}-day-${d}`,
            type: 'fchild' as const,
            tag: 'button',
            attr: tapSelect(() => {
              params.onSelect?.(cell.day);
            }),
            classes: [
              'oneput__calendar-cell',
              'oneput__calendar-cell--button',
              isSelected && 'oneput__calendar-cell--selected',
              isToday && 'oneput__calendar-cell--today'
            ],
            textContent: String(cell.day)
          };
        })
      }))
    ]
  };
}
