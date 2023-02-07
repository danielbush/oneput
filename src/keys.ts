import hotkeys from 'hotkeys-js';
import { getCurrentFocus } from './focus';
import {
  getNextSiblingElement,
  getPreviousSiblingElement,
  walkIter,
  walkIterReverse,
} from './walk';

function withActiveElement(fn: (active: HTMLElement) => void): () => void {
  return () => {
    const active = getCurrentFocus();
    if (!active) return;
    fn(active);
  };
}

export function loadKeys(ROOT: HTMLElement): () => void {
  hotkeys(
    'j',
    withActiveElement((active: HTMLElement) => {
      for (const next of walkIter(active, ROOT)) {
        next.focus();
        break;
      }
      return;
    }),
  );
  hotkeys(
    'k',
    withActiveElement((active: HTMLElement) => {
      for (const next of walkIterReverse(active, ROOT)) {
        next.focus();
        break;
      }
      return;
    }),
  );
  hotkeys(
    'ctrl+j',
    withActiveElement((active: HTMLElement) => {
      const next = getNextSiblingElement(active);
      if (next) {
        next.focus();
      }
      return;
    }),
  );
  hotkeys(
    'ctrl+k',
    withActiveElement((active: HTMLElement) => {
      const next = getPreviousSiblingElement(active);
      if (next) {
        next.focus();
      }
      return;
    }),
  );
  return () => {
    // Unbind everything
    hotkeys.unbind();
  };
}
