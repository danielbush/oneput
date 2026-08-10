import { fchild } from '../../lib/builder.js';
import type { FChildParams } from '../../types.js';

/**
 * Reusable icon buttons for Oneput chrome.
 *
 * Callers pass `onClick` / `enabled` / registered icon names.
 * Hosts register icons; Oneput does not.
 */

export type IconButtonOpts = {
  icon: string;
  onClick: () => void;
  /** Defaults to true. */
  enabled?: boolean;
  title?: string;
  id?: string;
};

/**
 * Generic enabled/disabled icon button.
 */
export function iconActionButton(opts: {
  icon: string;
  title: string;
  onClick: () => void;
  enabled?: boolean;
  classes?: string[];
  id?: string;
}): FChildParams {
  const enabled = opts.enabled !== false;
  return fchild({
    id: opts.id,
    tag: 'button',
    classes: [
      'oneput__icon-button',
      ...(opts.classes ?? []),
      ...(enabled ? [] : ['oneput__icon-disabled'])
    ],
    icon: opts.icon,
    attr: {
      type: 'button',
      title: opts.title,
      'aria-label': opts.title,
      disabled: !enabled,
      ...(enabled
        ? {
            onclick: (e: Event) => {
              e.preventDefault();
              opts.onClick();
            }
          }
        : {})
    }
  });
}

/** Done / send control — same chrome as submit/reject. */
export function doneButton(opts: IconButtonOpts): FChildParams {
  return iconActionButton({
    id: opts.id,
    icon: opts.icon,
    title: opts.title ?? 'Done',
    onClick: opts.onClick,
    enabled: opts.enabled
  });
}

/** In-flow submit control. */
export function submitButton(opts: IconButtonOpts): FChildParams {
  return iconActionButton({
    id: opts.id,
    icon: opts.icon,
    title: opts.title ?? 'Submit',
    onClick: opts.onClick,
    enabled: opts.enabled
  });
}

/** In-flow reject / dismiss control. */
export function rejectButton(opts: IconButtonOpts): FChildParams {
  return iconActionButton({
    id: opts.id,
    icon: opts.icon,
    title: opts.title ?? 'Reject',
    onClick: opts.onClick,
    enabled: opts.enabled
  });
}
