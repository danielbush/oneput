/**
 * Exploratory breadcrumb mockups. A breadcrumb sits in the `innerUI` slot,
 * which Oneput renders as `.oneput__inner-area` — directly above the input.
 *
 * A crumb is a button when it has an `onSelect`, and a plain disabled label
 * when it does not. The last crumb is the current location, so it is normally
 * a label.
 *
 * A long trail is handled by one horizontal scroller, auto-scrolled to the end
 * on mount so the current location is what you see first. An edge fades only
 * while content is hidden behind it. Nothing is hidden and there is no expand
 * button, but the root can be several swipes away.
 *
 * Two sets of trails are mocked, because they stress the shape differently:
 *
 * PLACE trails (Home › Projects › Oneput) — few crumbs, long labels. Overflow
 * comes from label length, so a single crumb can fill the widget.
 *
 * ELEMENT trails (body › main › ul › li › a) — the DOM path an editor like
 * jsed would show. Many crumbs, short labels, and repeated names, so position
 * carries the meaning. Each crumb can also take a qualifier (`#id`, `.class`)
 * to tell siblings apart, which is where the width goes.
 */

import type { FChildParams, FlexChildren, FlexParams } from '$lib/oneput/types.js';

export type Crumb = {
  label: string;
  /**
   * Optional detail after the label, shown muted — an `#id` or `.class` that
   * tells repeated element names apart.
   */
  qualifier?: string;
  /** Omit to render a disabled label — used for the current location. */
  onSelect?: () => void;
};

export type BreadcrumbOptions = {
  onMore?: () => void;
  /** Render the labels as code. Used by the element trails. */
  code?: boolean;
};

/** A short trail that fits without any overflow handling. */
export const shortTrail = (onSelect: (label: string) => void): Crumb[] => [
  { label: 'Home', onSelect: () => onSelect('Home') },
  { label: 'Projects', onSelect: () => onSelect('Projects') },
  { label: 'Oneput' }
];

/** A trail long enough to overflow the widget. */
export const longTrail = (onSelect: (label: string) => void): Crumb[] => [
  { label: 'Home', onSelect: () => onSelect('Home') },
  { label: 'Workspaces', onSelect: () => onSelect('Workspaces') },
  { label: 'Acme Corporation', onSelect: () => onSelect('Acme Corporation') },
  { label: 'Engineering', onSelect: () => onSelect('Engineering') },
  { label: 'Platform', onSelect: () => onSelect('Platform') },
  { label: 'Oneput', onSelect: () => onSelect('Oneput') },
  { label: 'packages', onSelect: () => onSelect('packages') },
  { label: 'shared', onSelect: () => onSelect('shared') },
  { label: 'menuItems', onSelect: () => onSelect('menuItems') },
  { label: 'stdMenuItem.ts' }
];

type ElementStep = [tag: string, qualifier?: string];

const elementTrail = (steps: ElementStep[], onSelect: (label: string) => void): Crumb[] =>
  steps.map(([label, qualifier], i) => ({
    label,
    qualifier,
    // The deepest element is where the caret is: shown, not navigable.
    ...(i === steps.length - 1 ? {} : { onSelect: () => onSelect(label + (qualifier ?? '')) })
  }));

/** A shallow DOM path that fits. */
export const shortElementTrail = (onSelect: (label: string) => void): Crumb[] =>
  elementTrail([['body'], ['main'], ['p']], onSelect);

/**
 * A deep DOM path. Repeated `div` and `li` names are why the qualifiers earn
 * their space — without them the trail says almost nothing.
 */
export const longElementTrail = (onSelect: (label: string) => void): Crumb[] =>
  elementTrail(
    [
      ['html'],
      ['body'],
      ['div', '#app'],
      ['main', '.layout'],
      ['article'],
      ['section', '.prose'],
      ['div'],
      ['ul', '.toc'],
      ['li'],
      ['a', '.link']
    ],
    onSelect
  );

const escapeHTML = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const separator = (index: number): FChildParams => ({
  id: `crumb-sep-${index}`,
  type: 'fchild',
  classes: ['demo-crumb-sep'],
  textContent: '›',
  attr: { 'aria-hidden': true }
});

const crumb = (c: Crumb, index: number): FChildParams => ({
  id: `crumb-${index}`,
  type: 'fchild',
  tag: 'button',
  classes: ['demo-crumb', !c.onSelect && 'demo-crumb--current'],
  // A qualifier needs its own element to be styled down, so build the markup
  // rather than setting textContent.
  ...(c.qualifier
    ? {
        htmlContentUnsafe: `${escapeHTML(c.label)}<span class="demo-crumb-qual">${escapeHTML(c.qualifier)}</span>`
      }
    : { textContent: c.label }),
  attr: {
    type: 'button',
    // A crumb with no target is the current location: shown, not actionable.
    ...(c.onSelect ? { onclick: () => c.onSelect?.() } : { disabled: true, 'aria-current': 'page' })
  }
});

/**
 * Land on the current location, then keep `data-at-start` / `data-at-end` in
 * step with the scroll position so the CSS can fade only the edge that has
 * something hidden behind it. A fade over an edge you have already reached
 * reads as truncation, not as "there is more this way".
 */
const trackScrollEdges = (node: HTMLElement) => {
  const update = () => {
    // Sub-pixel widths mean the ends are never exactly 0 / scrollWidth.
    const max = node.scrollWidth - node.clientWidth;
    node.dataset.atStart = String(node.scrollLeft <= 1);
    node.dataset.atEnd = String(node.scrollLeft >= max - 1);
  };

  node.scrollLeft = node.scrollWidth;
  update();

  node.addEventListener('scroll', update, { passive: true });
  // The trail can start fitting (or stop fitting) when the widget resizes.
  const resize = new ResizeObserver(update);
  resize.observe(node);

  return () => {
    node.removeEventListener('scroll', update);
    resize.disconnect();
  };
};

/**
 * Build the `innerUI` flex for a breadcrumb.
 *
 * The trail is a nested scroller so that a trailing icon button can sit
 * outside it and stay put while the crumbs scroll under it.
 */
export const breadcrumbInner = (crumbs: Crumb[], options: BreadcrumbOptions = {}): FlexParams => {
  const children: FlexChildren = [];

  crumbs.forEach((c, i) => {
    if (i > 0) children.push(separator(i));
    children.push(crumb(c, i));
  });

  return {
    id: 'breadcrumb-row',
    type: 'hflex',
    classes: ['demo-crumbs-row'],
    children: [
      {
        id: 'breadcrumb',
        type: 'hflex',
        tag: 'nav',
        classes: ['demo-crumbs', options.code && 'demo-crumbs--code'],
        attr: { 'aria-label': 'Breadcrumb' },
        onMount: trackScrollEdges,
        children
      },
      {
        id: 'breadcrumb-more',
        type: 'fchild',
        tag: 'button',
        classes: ['oneput__icon-button', 'oneput__icon-button--small'],
        icon: 'EllipsisVertical',
        attr: {
          type: 'button',
          title: 'More…',
          'aria-label': 'More actions',
          onclick: () => options.onMore?.()
        }
      }
    ]
  };
};
