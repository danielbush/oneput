import './setTimeMenuItem.css'; // IMPORT_CSS_GOTCHA
import { randomId } from '../../../lib/utils.js';
import type { FChildParams, MenuItem } from '../../../types.js';
import type { SetTimeValue } from '../../lib/time/timeAdjust.js';
import { tapSelect } from './tapSelect.js';

export type { SetTimeValue };

export type SetTimeMenuItemParams = {
  id?: string;
  hour: number;
  minute: number;
  /** Displayed hour (caller formats — 12h clock face or elapsed hours). */
  hourLabel: string;
  /** Displayed minute; defaults to zero-padded `minute`. */
  minuteLabel?: string;
  /**
   * Text between hour and minute columns. Defaults to `':'`.
   * Pass `''` to omit.
   */
  separator?: string;
  /**
   * When set, show an AM/PM column. Omitted for duration-style pickers.
   */
  amPm?: {
    label: string;
    onToggle: () => void;
  };
  /** Hour step policy (clock wrap, duration clamp, …). */
  adjustHour: (hour: number, delta: number) => number;
  /** Minute ±1 policy (usually wrap 0–59). */
  adjustMinute: (minute: number, delta: number) => number;
  /**
   * Minute ▲/▼ (±15) policy — typically snap to 0/15/30/45 with hour carry.
   * `direction` is `1` (next quarter) or `-1` (previous quarter).
   */
  stepQuarter: (hour: number, minute: number, direction: 1 | -1) => SetTimeValue;
  onChange?: (next: SetTimeValue) => void;
  /** List-row action (e.g. enter inner focus). Optional. */
  action?: () => void;
};

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
 * Policy (12h clock vs duration, wrap/clamp, quarter snap) lives in the caller
 * via `hourLabel`, `amPm`, `adjustHour`, `adjustMinute`, and `stepQuarter`.
 *
 * Layout:
 * ```
 *          ▲       ▲
 *  [AM]   10  :  − 30 +
 *          ▼       ▼
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
  const separator = params.separator ?? ':';

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
        btn(`${id}-ampm-toggle`, ['oneput__set-time-ampm'], () => amPm.onToggle(), {
          textContent: amPm.label
        })
      ]
    });
  }

  columns.push({
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
  });

  if (separator) {
    columns.push({
      id: `${id}-sep`,
      type: 'vflex' as const,
      classes: ['oneput__set-time-col', 'oneput__set-time-col--sep'],
      children: [
        {
          id: `${id}-sep-value`,
          type: 'fchild' as const,
          classes: ['oneput__set-time-sep'],
          textContent: separator
        }
      ]
    });
  }

  columns.push({
    id: `${id}-mm`,
    type: 'vflex' as const,
    classes: ['oneput__set-time-col', 'oneput__set-time-col--mm'],
    children: [
      btn(`${id}-mm-plus15`, ['oneput__set-time-arrow', 'oneput__set-time-arrow--up'], () =>
        emit(params.stepQuarter(hour, minute, 1))
      ),
      {
        id: `${id}-mm-row`,
        type: 'hflex' as const,
        classes: ['oneput__set-time-mm-row'],
        children: [
          btn(
            `${id}-mm-minus1`,
            ['oneput__set-time-step'],
            () => emit({ hour, minute: params.adjustMinute(minute, -1) }),
            { textContent: '−' }
          ),
          {
            id: `${id}-mm-value`,
            type: 'fchild' as const,
            classes: ['oneput__set-time-value'],
            textContent: minuteLabel
          },
          btn(
            `${id}-mm-plus1`,
            ['oneput__set-time-step'],
            () => emit({ hour, minute: params.adjustMinute(minute, 1) }),
            { textContent: '+' }
          )
        ]
      },
      btn(`${id}-mm-minus15`, ['oneput__set-time-arrow', 'oneput__set-time-arrow--down'], () =>
        emit(params.stepQuarter(hour, minute, -1))
      )
    ]
  });

  return {
    id,
    type: 'hflex',
    classes: ['oneput__set-time-menu-item'],
    canFilter: false,
    action: params.action,
    children: columns
  };
}
