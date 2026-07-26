import './setTimeMenuItem.css'; // IMPORT_CSS_GOTCHA
import { randomId } from '../../../lib/utils.js';
import type { FChildParams, MenuItem } from '../../../types.js';
import { tapSelect } from './tapSelect.js';

export type SetTimeValue = {
  hour: number;
  minute: number;
};

export type SetTimeMenuItemParams = {
  id?: string;
  hour: number;
  minute: number;
  /** Displayed hour (caller formats — 12h clock face or elapsed hours). */
  hourLabel: string;
  /** Displayed minute; defaults to zero-padded `minute`. */
  minuteLabel?: string;
  /**
   * When set, show an AM/PM column. Omitted for duration-style pickers.
   */
  amPm?: {
    label: string;
    onToggle: () => void;
  };
  /** Hour step policy (clock wrap, duration clamp, …). */
  adjustHour: (hour: number, delta: number) => number;
  /** Minute step policy (usually wrap 0–59). */
  adjustMinute: (minute: number, delta: number) => number;
  onChange?: (next: SetTimeValue) => void;
  /** List-row action (e.g. enter inner focus). Optional. */
  action?: () => void;
};

/** Clock helpers — used by {@link SetTime}, not by the dumb menu item itself. */

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

/** Duration helpers — used by {@link SetDuration}. */

export function adjustHourDuration(hour: number, delta: number, maxHour = 99): number {
  return Math.min(maxHour, Math.max(0, hour + delta));
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
 * Compound menu item: optional am/pm | hh | mm controls.
 * Policy (12h clock vs duration, wrap/clamp) lives in the caller via
 * `hourLabel`, `amPm`, `adjustHour`, and `adjustMinute`.
 *
 * Layout:
 * ```
 *          ▲           ▲
 *  [AM]   10     −    30    +
 *          ▼           ▼
 * ```
 *
 * Styles live in `setTimeMenuItem.css`, loaded as a side-effect import from
 * this module. See IMPORT_CSS_GOTCHA.
 */
export function setTimeMenuItem(params: SetTimeMenuItemParams): MenuItem {
  const id = params.id ?? randomId();
  const hour = params.hour;
  const minute = params.minute;
  const minuteLabel = params.minuteLabel ?? pad2(minute);

  const emit = (next: SetTimeValue) => {
    params.onChange?.(next);
  };

  const columns = [];

  if (params.amPm) {
    const amPm = params.amPm;
    columns.push({
      id: `${id}-ampm`,
      type: 'vflex' as const,
      classes: ['oneput__set-time-col', 'oneput__set-time-col--ampm'],
      children: [
        btn(
          `${id}-ampm-toggle`,
          ['oneput__set-time-ampm'],
          () => amPm.onToggle(),
          { textContent: amPm.label }
        )
      ]
    });
  }

  columns.push(
    {
      id: `${id}-hh`,
      type: 'vflex' as const,
      classes: ['oneput__set-time-col', 'oneput__set-time-col--hh'],
      children: [
        btn(`${id}-hh-up`, ['oneput__set-time-arrow', 'oneput__set-time-arrow--up'], () =>
          emit({ hour: params.adjustHour(hour, 1), minute })
        ),
        {
          id: `${id}-hh-value`,
          type: 'fchild' as const,
          classes: ['oneput__set-time-value'],
          textContent: params.hourLabel
        },
        btn(`${id}-hh-down`, ['oneput__set-time-arrow', 'oneput__set-time-arrow--down'], () =>
          emit({ hour: params.adjustHour(hour, -1), minute })
        )
      ]
    },
    {
      id: `${id}-mm`,
      type: 'vflex' as const,
      classes: ['oneput__set-time-col', 'oneput__set-time-col--mm'],
      children: [
        btn(`${id}-mm-plus15`, ['oneput__set-time-arrow', 'oneput__set-time-arrow--up'], () =>
          emit({ hour, minute: params.adjustMinute(minute, 15) })
        ),
        {
          id: `${id}-mm-row`,
          type: 'hflex' as const,
          classes: ['oneput__set-time-mm-row'],
          children: [
            btn(`${id}-mm-minus1`, ['oneput__set-time-step'], () =>
              emit({ hour, minute: params.adjustMinute(minute, -1) }),
              { textContent: '−' }
            ),
            {
              id: `${id}-mm-value`,
              type: 'fchild' as const,
              classes: ['oneput__set-time-value'],
              textContent: minuteLabel
            },
            btn(`${id}-mm-plus1`, ['oneput__set-time-step'], () =>
              emit({ hour, minute: params.adjustMinute(minute, 1) }),
              { textContent: '+' }
            )
          ]
        },
        btn(`${id}-mm-minus15`, ['oneput__set-time-arrow', 'oneput__set-time-arrow--down'], () =>
          emit({ hour, minute: params.adjustMinute(minute, -15) })
        )
      ]
    }
  );

  return {
    id,
    type: 'hflex',
    classes: ['oneput__set-time-menu-item'],
    canFilter: false,
    action: params.action,
    children: columns
  };
}
