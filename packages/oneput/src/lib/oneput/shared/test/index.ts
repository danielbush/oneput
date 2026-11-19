import type { Controller } from '../../controllers/controller.js';
import type { InternalEvent } from '../../controllers/InternalEventEmitter.js';

/**
 * Wait for the first `event` after which the named state is reached, as read
 * from the controller. Set it up before the step that leads to the state.
 *
 * It fails after `timeoutMs`, before the test timeout, with the name of the
 * state and the last value seen, for example:
 * `Expected view to show status "Ready" (last: status "Fetching data...")`.
 */
export function waitForState<Name extends InternalEvent['type']>(
  ctl: Controller,
  event: Name,
  state: {
    /** What the state is, for the failure message. */
    name: string;
    reached: () => boolean;
    /** What the test saw instead, for the failure message. */
    seen: () => string;
  },
  timeoutMs = 500
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      stop();
      reject(new Error(`Expected ${state.name} (last: ${state.seen()})`));
    }, timeoutMs);
    const stop = ctl.events.on(event, () => {
      if (!state.reached()) return;
      clearTimeout(timeout);
      stop();
      resolve();
    });
  });
}

/** Wait for the next menu-items event with the expected menu ID. */
export function assertMenuId(ctl: Controller, expectedMenuId: string): Promise<void> {
  let last: string | undefined;
  // Registered first, so it records the menu ID before the wait checks it.
  const stopRecording = ctl.events.on('set-menu-items', ({ menuId }) => {
    last = menuId;
  });
  return waitForState(ctl, 'set-menu-items', {
    name: `menu "${expectedMenuId}" to publish its items`,
    reached: () => last === expectedMenuId,
    seen: () => (last === undefined ? 'no menu items' : `menu "${last}"`)
  }).finally(stopRecording);
}
