import { removeAnchors } from './anchor.js';
import { removeFocusAll } from './focus.js';
import { removeImplicitLines } from './implicitLine.js';
import { removeIndicators } from './indicator.js';
import { removeIgnored } from './ignorable.js';
import { removeSelectionWrappers } from './selection.js';
import { detokenize } from './tokenize.js';

/**
 * Remove editor artifacts from an element in place.
 *
 * Use a clone for export, or the live root when an edit session ends.
 */
export function removeArtifacts(el: HTMLElement): void {
  removeIgnored(el);
  removeSelectionWrappers(el);
  removeAnchors(el);
  detokenize(el);
  removeImplicitLines(el);
  removeFocusAll(el);
  removeIndicators(el);
}
