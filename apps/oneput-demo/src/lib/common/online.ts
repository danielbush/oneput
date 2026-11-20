import { Signal } from 'signal-polyfill';

type OnlineEvents = {
  readonly onLine: boolean;
  addEventListener(type: 'online' | 'offline', listener: () => void): void;
  removeEventListener(type: 'online' | 'offline', listener: () => void): void;
};

/**
 * Whether the browser is online, as a signal that the demo host owns. The
 * browser's `online` and `offline` events set it; AppObjects only read it.
 * The host that creates it calls {@link dispose} when it unmounts.
 */
export class Online {
  /** Follow the browser until {@link dispose}. */
  static create(
    browser: OnlineEvents = {
      onLine: navigator.onLine,
      addEventListener: (type, listener) => window.addEventListener(type, listener),
      removeEventListener: (type, listener) => window.removeEventListener(type, listener)
    }
  ) {
    const goOnline = () => online.state.set(true);
    const goOffline = () => online.state.set(false);
    const online = new Online(browser.onLine, () => {
      browser.removeEventListener('online', goOnline);
      browser.removeEventListener('offline', goOffline);
    });
    browser.addEventListener('online', goOnline);
    browser.addEventListener('offline', goOffline);
    return online;
  }

  /** Start online, with no browser. Use {@link simulate} to change it. */
  static createNull(initial = true) {
    return new Online(initial, () => {});
  }

  readonly state: Signal.State<boolean>;

  private constructor(
    initial: boolean,
    private readonly stopFollowing: () => void
  ) {
    this.state = new Signal.State(initial);
  }

  /** Stop following the browser. */
  dispose() {
    this.stopFollowing();
  }

  /** Simulate the browser going online or offline. */
  simulate(online: boolean) {
    this.state.set(online);
  }
}
