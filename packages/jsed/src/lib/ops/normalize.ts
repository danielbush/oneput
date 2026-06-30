import { anchorize } from './anchor.js';
import { wrapInterstitials } from './implicitLine.js';

/**
 * Re-assert the derived structure on a region a mutation just touched.
 *
 * Both IMPLICIT_LINE's and ANCHOR's are derived (not authored): established at
 * load, stripped on save, and idempotent to rebuild. After a structural change
 * we re-derive them on the affected container so the INTERSTITIAL_INVARIANT and
 * ANCHOR_RULES hold without each op having to be careful by construction.
 *
 * Order matters: wrap loose INTERSTITIAL_TEXT into IMPLICIT_LINE's first, then
 * anchorize — `anchorize` is IMPLICIT_LINE-aware (it anchors inside a wrapper,
 * not around it).
 */
export function normalize(el: HTMLElement): void {
  wrapInterstitials(el);
  anchorize(el);
}
