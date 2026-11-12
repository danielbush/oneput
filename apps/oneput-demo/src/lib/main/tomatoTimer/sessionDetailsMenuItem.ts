import { menuItem } from '@oneput/oneput';
import type { FinishedSessionRecord } from './idb.js';
import { formatSecondsToHHMMSS } from './utils.js';

/**
 * Returns a menu item that shows a finished session: its label and length as a
 * heading, then its start and end times. The label is written as text, so a
 * label such as `<b>x</b>` shows its tags.
 */
export function sessionDetailsMenuItem(session: FinishedSessionRecord, elapsed: number) {
  return menuItem({
    id: 'tomato-timer-session-details',
    ignored: true,
    style: { justifyContent: 'center' },
    children: (b) => [
      b.vflex({
        style: { justifyContent: 'center', flex: '0 0 100%' },
        children: (b) => [
          b.fchild({
            tag: 'h3',
            textContent: `${session.label ? session.label + ' - ' : ''}${formatSecondsToHHMMSS(elapsed / 60)}`
          }),
          b.fchild({
            textContent: `Start: ${new Date(session.startTime * 1000).toLocaleString()}`
          }),
          b.fchild({ textContent: `End: ${new Date(session.endTime * 1000).toLocaleString()}` })
        ]
      })
    ]
  });
}
