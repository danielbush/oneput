import { describe, expect, test } from 'vitest';
import { Online } from './online.js';

/** A browser stand-in that can fire its online and offline events. */
function createBrowser(onLine: boolean) {
  const listeners = new Map<string, () => void>();
  return {
    onLine,
    addEventListener: (type: 'online' | 'offline', listener: () => void) => {
      listeners.set(type, listener);
    },
    removeEventListener: (type: 'online' | 'offline', listener: () => void) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    listening: () => [...listeners.keys()],
    fire: (type: 'online' | 'offline') => listeners.get(type)?.()
  };
}

describe('Online', () => {
  test('follows the browser events', () => {
    // arrange
    const browser = createBrowser(true);
    const online = Online.create(browser);

    // act
    browser.fire('offline');
    const afterOffline = online.state.get();
    browser.fire('online');

    // assert
    expect(afterOffline).toBe(false);
    expect(online.state.get()).toBe(true);
  });

  test('starts from the browser state', () => {
    // arrange
    const browser = createBrowser(false);

    // act
    const online = Online.create(browser);

    // assert
    expect(online.state.get()).toBe(false);
  });

  test('dispose stops following the browser', () => {
    // arrange
    const browser = createBrowser(true);
    const online = Online.create(browser);
    const listeningBefore = browser.listening();

    // act
    online.dispose();
    browser.fire('offline');

    // assert
    expect(listeningBefore).toEqual(['online', 'offline']);
    expect(browser.listening()).toEqual([]);
    expect(online.state.get()).toBe(true);
  });
});
