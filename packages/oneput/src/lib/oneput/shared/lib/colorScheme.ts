/**
 * The class on `<html>` that turns on dark mode for Oneput and jsed.
 *
 * The page's CSS can use it too: `html.dark-mode { ... }`.
 */
export const DARK_MODE_CLASS = 'dark-mode';

/** The part of `MediaQueryList` that SystemColorScheme needs. */
type DarkQuery = Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>;

/**
 * The colour scheme the OS asks for, as `prefers-color-scheme` reports it.
 *
 * `createNull` makes one with no browser: `simulateChange` stands in for the
 * user changing the OS setting.
 */
export class SystemColorScheme {
  static create(win: Window = window): SystemColorScheme {
    return new SystemColorScheme(win.matchMedia('(prefers-color-scheme: dark)'));
  }

  static createNull({ dark = false }: { dark?: boolean } = {}): SystemColorScheme {
    return new SystemColorScheme(new NullDarkQuery(dark));
  }

  private constructor(private query: DarkQuery) {}

  isDark(): boolean {
    return this.query.matches;
  }

  /** Call `listener` each time the OS setting changes; returns a stop function. */
  onChange(listener: (dark: boolean) => void): () => void {
    const handle = () => listener(this.query.matches);
    this.query.addEventListener('change', handle);
    return () => this.query.removeEventListener('change', handle);
  }

  /** Null instances only: the user changes the OS setting. */
  simulateChange(dark: boolean): void {
    if (!(this.query instanceof NullDarkQuery)) {
      throw new Error('simulateChange needs SystemColorScheme.createNull()');
    }
    this.query.simulate(dark);
  }
}

/**
 * The Null stand-in for `matchMedia('(prefers-color-scheme: dark)')`, used by
 * `SystemColorScheme.createNull()`. It holds `matches`, and as an `EventTarget`
 * it sends a `change` event when `simulateChange` calls `simulate`, so tests
 * need no browser and no mocks.
 */
class NullDarkQuery extends EventTarget {
  constructor(public matches: boolean) {
    super();
  }

  simulate(dark: boolean) {
    this.matches = dark;
    this.dispatchEvent(new Event('change'));
  }
}

/**
 * Keep DARK_MODE_CLASS on `root` in step with the OS colour scheme.
 *
 * Returns a stop function. An app with its own light/dark toggle sets
 * DARK_MODE_CLASS itself instead.
 */
export function followSystemColorScheme(
  root: HTMLElement = document.documentElement,
  scheme: SystemColorScheme = SystemColorScheme.create()
): () => void {
  const apply = (dark: boolean) => root.classList.toggle(DARK_MODE_CLASS, dark);
  apply(scheme.isDark());
  return scheme.onChange(apply);
}
