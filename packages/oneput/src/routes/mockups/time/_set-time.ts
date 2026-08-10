/**
 * Set-time mockup: ordinary rows above and below a single set-time widget
 * item, built from existing primitives plus the shared `setTimeMenuItem`.
 *
 * Uses clock policy (12h + AM/PM, wrap 24h) like the SetTime app object. The
 * parent owns the 24h state and rebuilds the item on change.
 */

import { randomId } from '$lib/oneput/lib/utils.js';
import type { FlexParams, MenuItemAny } from '$lib/oneput/types.js';
import {
  adjustHour24,
  adjustMinute,
  stepQuarterClock,
  to12Hour,
  toggleAmPm,
  type SetTimeValue
} from '$lib/oneput/shared/lib/time/timeAdjust.js';
import { setTimeMenuItem } from '$lib/oneput/shared/ui/menuItems/setTimeMenuItem.js';

export const setTimeHeader: FlexParams = {
  id: 'set-time-header',
  type: 'hflex',
  children: [
    {
      id: randomId(),
      type: 'fchild',
      classes: ['oneput__menu-item-header'],
      textContent: 'Set time'
    }
  ]
};

/**
 * Ordinary rows above/below a single set-time widget (am/pm | hh | mm).
 * Uses clock policy (12h + AM/PM, wrap 24h) like {@link SetTime}.
 */
export const richSetTimeMenuItems = (
  hour: number,
  minute: number,
  onChange?: (next: SetTimeValue) => void
): MenuItemAny[] => {
  const { isPM } = to12Hour(hour);
  return [
    {
      id: 'set-time-above',
      type: 'hflex',
      children: [
        {
          id: 'set-time-above-label',
          type: 'fchild',
          textContent: 'Above the time widget'
        }
      ]
    },
    setTimeMenuItem({
      id: 'rich-set-time-widget',
      hour,
      minute,
      amPm: {
        label: isPM ? 'PM' : 'AM',
        onToggle: () => onChange?.({ hour: toggleAmPm(hour), minute })
      },
      adjustHour: adjustHour24,
      adjustMinute,
      stepQuarter: stepQuarterClock,
      onChange
    }),
    {
      id: 'set-time-below',
      type: 'hflex',
      children: [
        {
          id: 'set-time-below-label',
          type: 'fchild',
          textContent: 'Below the time widget'
        }
      ]
    }
  ];
};
