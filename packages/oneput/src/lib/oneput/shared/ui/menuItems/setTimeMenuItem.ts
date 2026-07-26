import './setTimeMenuItem.css'; // IMPORT_CSS_GOTCHA
import { randomId } from '../../../lib/utils.js';
import type { FChildParams, MenuItem } from '../../../types.js';
import { tapSelect } from './tapSelect.js';

export type SetTimeValue = {
  /** 0–23 */
  hour: number;
  /** 0–59 */
  minute: number;
};

export type SetTimeMenuItemParams = {
  id?: string;
  hour: number;
  minute: number;
  onChange?: (next: SetTimeValue) => void;
  /** List-row action (e.g. enter inner focus). Optional. */
  action?: () => void;
};

export function to12Hour(hour24: number): { hour12: number; isPM: boolean } {
  const h = ((hour24 % 24) + 24) % 24;
  const isPM = h >= 12;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12, isPM };
}

export function to24Hour(hour12: number, isPM: boolean): number {
  const h = ((hour12 - 1) % 12) + 1;
  if (h === 12) return isPM ? 12 : 0;
  return isPM ? h + 12 : h;
}

export function adjustHour24(hour: number, delta: number): number {
  return (((hour + delta) % 24) + 24) % 24;
}

export function adjustMinute(minute: number, delta: number): number {
  return (((minute + delta) % 60) + 60) % 60;
}

export function toggleAmPm(hour24: number): number {
  return adjustHour24(hour24, 12);
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function btn(
  id: string,
  classes: Array<string | false | undefined>,
  onSelect: () => void,
  extra?: Partial<FChildParams>
): FChildParams {
  return {
    id,
    type: 'fchild',
    tag: 'button',
    classes: ['oneput__set-time-btn', ...classes],
    attr: tapSelect(onSelect),
    ...extra
  };
}

/**
 * One compound menu item: 12h time picker (am/pm | hh | mm).
 * Parent owns hour/minute (24h) and rebuilds via invalidate on {@link SetTimeMenuItemParams.onChange}.
 *
 * Layout:
 * ```
 *          ▲           ▲
 *   AM    10     −    30    +
 *          ▼           ▼
 * ```
 * (mm: ±1 flank the value; solid arrows ±15 above/below)
 *
 * Styles live in `setTimeMenuItem.css`, loaded as a side-effect import from
 * this module (so hosts that only `@import` defaults do not hit nested CSS
 * `@import` violations). See IMPORT_CSS_GOTCHA.
 */
export function setTimeMenuItem(params: SetTimeMenuItemParams): MenuItem {
  const id = params.id ?? randomId();
  const hour = ((params.hour % 24) + 24) % 24;
  const minute = ((params.minute % 60) + 60) % 60;
  const { hour12, isPM } = to12Hour(hour);

  const emit = (next: SetTimeValue) => {
    params.onChange?.(next);
  };

  return {
    id,
    type: 'hflex',
    classes: ['oneput__set-time-menu-item'],
    canFilter: false,
    action: params.action,
    children: [
      {
        id: `${id}-ampm`,
        type: 'vflex',
        classes: ['oneput__set-time-col', 'oneput__set-time-col--ampm'],
        children: [
          btn(
            `${id}-ampm-toggle`,
            ['oneput__set-time-ampm'],
            () => emit({ hour: toggleAmPm(hour), minute }),
            { textContent: isPM ? 'PM' : 'AM' }
          )
        ]
      },
      {
        id: `${id}-hh`,
        type: 'vflex',
        classes: ['oneput__set-time-col', 'oneput__set-time-col--hh'],
        children: [
          btn(`${id}-hh-up`, ['oneput__set-time-arrow', 'oneput__set-time-arrow--up'], () =>
            emit({ hour: adjustHour24(hour, 1), minute })
          ),
          {
            id: `${id}-hh-value`,
            type: 'fchild',
            classes: ['oneput__set-time-value'],
            textContent: String(hour12)
          },
          btn(`${id}-hh-down`, ['oneput__set-time-arrow', 'oneput__set-time-arrow--down'], () =>
            emit({ hour: adjustHour24(hour, -1), minute })
          )
        ]
      },
      {
        id: `${id}-mm`,
        type: 'vflex',
        classes: ['oneput__set-time-col', 'oneput__set-time-col--mm'],
        children: [
          btn(`${id}-mm-plus15`, ['oneput__set-time-arrow', 'oneput__set-time-arrow--up'], () =>
            emit({ hour, minute: adjustMinute(minute, 15) })
          ),
          {
            id: `${id}-mm-row`,
            type: 'hflex',
            classes: ['oneput__set-time-mm-row'],
            children: [
              btn(`${id}-mm-minus1`, ['oneput__set-time-step'], () =>
                emit({ hour, minute: adjustMinute(minute, -1) }),
                { textContent: '−' }
              ),
              {
                id: `${id}-mm-value`,
                type: 'fchild',
                classes: ['oneput__set-time-value'],
                textContent: pad2(minute)
              },
              btn(`${id}-mm-plus1`, ['oneput__set-time-step'], () =>
                emit({ hour, minute: adjustMinute(minute, 1) }),
                { textContent: '+' }
              )
            ]
          },
          btn(`${id}-mm-minus15`, ['oneput__set-time-arrow', 'oneput__set-time-arrow--down'], () =>
            emit({ hour, minute: adjustMinute(minute, -15) })
          )
        ]
      }
    ]
  };
}
