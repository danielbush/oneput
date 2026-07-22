import { randomId } from '../../../lib/utils.js';
import type { MenuItem } from '../../../types.js';

export type ChatSessionTurn = { role: 'user' | 'agent'; text: string };

export type ChatSessionItemParams = {
  id?: string;
  turns: ChatSessionTurn[];
  /** Icon name registered with Oneput (e.g. ChevronDown). */
  jumpIcon?: string;
  jumpTitle?: string;
};

/** Stable pane element id for a chat session item root id. */
export function chatSessionPaneId(itemId: string) {
  return `${itemId}-pane`;
}

/**
 * Scroll a chat session pane to the latest message.
 */
export function scrollChatSessionPaneToBottom(paneId: string) {
  const el = document.getElementById(paneId);
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

/**
 * One compound menu item: a scrollable chat session with an optional absolute
 * jump-to-latest control. Nest beside ordinary suggestion / action rows.
 *
 * Stick-to-bottom is internal: a length-keyed FChild sentinel remounts when
 * `turns.length` changes and scrolls the pane from `onMount`.
 *
 * Styles live in `chatSessionItem.css` and are included when the host imports
 * `oneput-defaults.css`.
 */
export function chatSessionItem(params: ChatSessionItemParams): MenuItem {
  const id = params.id ?? randomId();
  const paneId = chatSessionPaneId(id);
  const turnCount = params.turns.length;

  return {
    id,
    type: 'vflex',
    classes: ['oneput__chat-session-item'],
    canFilter: false,
    children: [
      {
        id: paneId,
        type: 'vflex',
        classes: ['oneput__chat-session-pane'],
        children: [
          ...params.turns.map((turn, index) => ({
            id: `${id}-msg-${index}`,
            type: 'hflex' as const,
            classes: ['oneput__chat-session-row'],
            children: [
              {
                id: `${id}-msg-${index}-bubble`,
                type: 'fchild' as const,
                classes: [
                  'oneput__chat-session-bubble',
                  `oneput__chat-session-bubble--${turn.role}`
                ],
                textContent: turn.text
              }
            ]
          })),
          // Sentinel: remounts when turn count changes and scrolls to bottom.
          {
            id: `${id}-stick-${turnCount}`,
            type: 'fchild' as const,
            classes: ['oneput__chat-session-stick'],
            attr: {
              'aria-hidden': true
            },
            onMount: () => {
              scrollChatSessionPaneToBottom(paneId);
            }
          }
        ]
      },
      params.jumpIcon && {
        id: `${id}-jump`,
        type: 'fchild' as const,
        tag: 'button',
        classes: ['oneput__chat-session-jump', 'oneput__icon-button'],
        icon: params.jumpIcon,
        attr: {
          type: 'button',
          title: params.jumpTitle ?? 'Jump to latest',
          'aria-label': params.jumpTitle ?? 'Jump to latest',
          onpointerup: (event: Event) => {
            event.stopPropagation();
          },
          onclick: () => {
            scrollChatSessionPaneToBottom(paneId);
          }
        }
      }
    ]
  };
}
