import { JSED_IGNORE_CLASS } from '../core/taxonomy';

/**
 * Most editing artifacts (like deleted tokens or delete placeholdres) are
 * flagged with jsed-ignore.  So we'll just remove these.
 *
 * Other dangling things we might want to consider: jsed-selection
 */
export function removeIgnored(el: HTMLElement) {
  const ignores = el.querySelectorAll(`.${JSED_IGNORE_CLASS}`);
  for (const i of ignores) {
    i.remove();
  }
}
