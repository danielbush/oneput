import type { Controller } from '../../controllers/controller.js';
import type { InternalEvent } from '../../controllers/InternalEventEmitter.js';

/** A named state that a test waits for, with what it saw instead for the failure message. */
export type NamedState = {
  /** What the state is, for the failure message. */
  name: string;
  reached: () => boolean;
  /** What the test saw instead, for the failure message. */
  seen: () => string;
};

/**
 * Wait for the first change after which the named state is reached. Set it up
 * before the step that leads to the state. `subscribe` is any change source,
 * for example a readable source.
 *
 * It fails after `timeoutMs`, before the test timeout, with the name of the
 * state and the last value seen, for example:
 * `Expected view to show status "Ready" (last: status "Fetching data...")`.
 */
export function waitFor(
  subscribe: (onChange: () => void) => () => void,
  state: NamedState,
  timeoutMs = 500
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let stop: (() => void) | undefined;
    const timeout = setTimeout(() => {
      settled = true;
      stop?.();
      reject(new Error(`Expected ${state.name} (last: ${state.seen()})`));
    }, timeoutMs);
    const check = () => {
      if (settled || !state.reached()) return;
      settled = true;
      clearTimeout(timeout);
      stop?.();
      resolve();
    };
    stop = subscribe(check);
    // A source can call back while it subscribes, before `stop` exists.
    if (settled) stop();
  });
}

/** Wait for the first controller `event` after which the named state is reached. */
export function waitForState<Name extends InternalEvent['type']>(
  ctl: Controller,
  event: Name,
  state: NamedState,
  timeoutMs = 500
): Promise<void> {
  return waitFor((onChange) => ctl.events.on(event, onChange), state, timeoutMs);
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

/**
 * Swap the input element as the view does when the input kind changes, for
 * example from `input` to `textarea`. A browser can blur the old element as
 * it removes it; this blurs it first, as such a browser does. The new element
 * is in the document, so it can get focus.
 */
export function swapInputElement(ctl: Controller, tagName: 'input' | 'textarea') {
  const previous = ctl.currentProps.inputElement;
  const next = document.createElement(tagName) as unknown as HTMLInputElement;
  (previous?.parentNode ?? document.body).appendChild(next);
  previous?.blur();
  previous?.remove();
  ctl.input.handleInputElementChange(next);
  ctl.currentProps.inputElement = next;
  ctl.onDestroy(() => next.remove());
  return next;
}
