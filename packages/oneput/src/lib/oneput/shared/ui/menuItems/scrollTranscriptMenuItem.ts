import { randomId } from '../../../lib/utils.js';
import type { MenuItem } from '../../../types.js';

export type TranscriptTurn = { role: 'user' | 'agent'; text: string };

export type ScrollTranscriptMenuItemParams = {
  id?: string;
  turns: TranscriptTurn[];
  /** Icon name registered with Oneput (e.g. ChevronDown). */
  jumpIcon?: string;
  jumpTitle?: string;
};

/** Stable pane element id for a transcript menu item root id. */
export function transcriptPaneId(itemId: string) {
  return `${itemId}-pane`;
}

/**
 * Scroll a transcript pane to the latest message. Call after
 * `await ctl.menu.invalidate()` so the DOM has the new turns.
 */
export function scrollTranscriptPaneToBottom(paneId: string) {
  const el = document.getElementById(paneId);
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

/**
 * One compound menu item: a scrollable transcript with an optional absolute
 * jump-to-latest control. Nest beside ordinary suggestion / action rows.
 */
export function scrollTranscriptMenuItem(params: ScrollTranscriptMenuItemParams): MenuItem {
  const id = params.id ?? randomId();
  const paneId = transcriptPaneId(id);

  return {
    id,
    type: 'vflex',
    classes: ['oneput__transcript-menu-item'],
    canFilter: false,
    children: [
      {
        id: paneId,
        type: 'vflex',
        classes: ['oneput__transcript-pane'],
        children: params.turns.map((turn, index) => ({
          id: `${id}-msg-${index}`,
          type: 'hflex' as const,
          classes: ['oneput__transcript-row'],
          children: [
            {
              id: `${id}-msg-${index}-bubble`,
              type: 'fchild' as const,
              classes: [
                'oneput__transcript-bubble',
                `oneput__transcript-bubble--${turn.role}`
              ],
              textContent: turn.text
            }
          ]
        }))
      },
      params.jumpIcon && {
        id: `${id}-jump`,
        type: 'fchild' as const,
        tag: 'button',
        classes: ['oneput__transcript-jump', 'oneput__icon-button'],
        icon: params.jumpIcon,
        attr: {
          type: 'button',
          title: params.jumpTitle ?? 'Jump to latest',
          'aria-label': params.jumpTitle ?? 'Jump to latest',
          onpointerup: (event: Event) => {
            event.stopPropagation();
          },
          onclick: () => {
            scrollTranscriptPaneToBottom(paneId);
          }
        }
      }
    ]
  };
}
