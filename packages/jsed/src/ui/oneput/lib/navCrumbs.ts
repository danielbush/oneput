/**
 * FOCUS ancestor trail for Oneput `innerUI`.
 *
 * {@link JsedUI} installs this via `ctl.ui.setInnerUI` while editing.
 * Consumes {@link FocusAncestorStep} from {@link focusAncestorPath}.
 */

import type { FChildParams, FlexChildren, FlexParams } from '@oneput/oneput';
import type { FocusAncestorStep } from './focusAncestorPath.js';

type NavCrumb = {
  label: string;
  qualifier?: string;
  /** Omit for the current location or non-FOCUSABLE steps. */
  onSelect?: () => void;
  current?: boolean;
};

export type NavCrumbsOptions = {
  /** Called when a FOCUSABLE ancestor crumb is chosen. */
  onSelect?: (element: HTMLElement) => void;
};

const escapeHTML = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const qualifierFor = (step: FocusAncestorStep): string | undefined =>
  step.id ? `#${step.id}` : undefined;

const toNavCrumb = (
  step: FocusAncestorStep,
  onSelect?: NavCrumbsOptions['onSelect']
): NavCrumb => ({
  label: step.tag,
  qualifier: qualifierFor(step),
  current: step.current,
  ...(step.focusable && !step.current && onSelect ? { onSelect: () => onSelect(step.element) } : {})
});

const separator = (index: number): FChildParams => ({
  id: `nav-crumb-sep-${index}`,
  type: 'fchild',
  classes: ['jsed-nav-crumb-sep'],
  textContent: '›',
  attr: { 'aria-hidden': true }
});

const navCrumb = (c: NavCrumb, index: number): FChildParams => ({
  id: `nav-crumb-${index}`,
  type: 'fchild',
  tag: 'button',
  classes: ['jsed-nav-crumb', c.current && 'jsed-nav-crumb--current'],
  ...(c.qualifier
    ? {
        htmlContentUnsafe: `${escapeHTML(c.label)}<span class="jsed-nav-crumb-qual">${escapeHTML(c.qualifier)}</span>`
      }
    : { textContent: c.label }),
  attr: {
    type: 'button',
    ...(c.onSelect
      ? { onclick: () => c.onSelect?.() }
      : { disabled: true, ...(c.current ? { 'aria-current': 'page' } : {}) })
  }
});

/**
 * Scroll the live-FOCUS crumb into view; fade only edges that still hide content.
 */
const trackScrollEdges = (node: HTMLElement) => {
  const update = () => {
    const max = node.scrollWidth - node.clientWidth;
    node.dataset.atStart = String(node.scrollLeft <= 1);
    node.dataset.atEnd = String(node.scrollLeft >= max - 1);
  };

  const current = node.querySelector('.jsed-nav-crumb--current') as HTMLElement | null;
  if (current) {
    const center = current.offsetLeft + current.offsetWidth / 2 - node.clientWidth / 2;
    node.scrollLeft = Math.max(0, Math.min(center, node.scrollWidth - node.clientWidth));
  } else {
    node.scrollLeft = node.scrollWidth;
  }
  update();

  node.addEventListener('scroll', update, { passive: true });
  const resize = new ResizeObserver(update);
  resize.observe(node);

  return () => {
    node.removeEventListener('scroll', update);
    resize.disconnect();
  };
};

/** Build `innerUI` for the FOCUS ancestor trail. */
export function navCrumbsInner(
  steps: FocusAncestorStep[],
  options: NavCrumbsOptions = {}
): FlexParams {
  const crumbs = steps.map((step) => toNavCrumb(step, options.onSelect));
  const children: FlexChildren = [];

  crumbs.forEach((c, i) => {
    if (i > 0) children.push(separator(i));
    children.push(navCrumb(c, i));
  });

  return {
    id: 'nav-crumbs-row',
    type: 'hflex',
    classes: ['jsed-nav-crumbs-row'],
    children: [
      {
        id: 'nav-crumbs',
        type: 'hflex',
        tag: 'nav',
        classes: ['jsed-nav-crumbs', 'jsed-nav-crumbs--code'],
        attr: { 'aria-label': 'Focus path' },
        onMount: trackScrollEdges,
        children
      }
    ]
  };
}
