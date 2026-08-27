/**
 * Chat mockups: a transcript of `ignored` blocks plus actionable suggestions,
 * built ONLY from existing Oneput primitives.
 *
 * GROW-ONLY — messages are ignored rows in the list, so Up/Down skips the
 * prose and lands on the suggestions. Exposes scroll anchoring: the menu body
 * only scrolls when focus moves (see Oneput.svelte).
 *
 * SCROLLABLE ITEM — the transcript is ONE rich item with its own scroll pane
 * (nested scroll vs menu-body scroll), with a jump-to-latest button.
 */

import { randomId } from '$lib/oneput/lib/utils.js';
import type { FlexParams, MenuItemAny } from '$lib/oneput/types.js';
import { icons } from '../../_icons.js';

export const chatHeader: FlexParams = {
  id: 'chat-header',
  type: 'hflex',
  children: [
    {
      id: randomId(),
      type: 'fchild',
      tag: 'button',
      attr: { type: 'button', title: 'Back' },
      classes: ['oneput__icon-button'],
      icon: icons.ChevronLeft
    },
    {
      id: randomId(),
      type: 'fchild',
      classes: ['oneput__menu-item-header'],
      textContent: 'Release notes'
    },
    {
      id: randomId(),
      type: 'hflex',
      children: [
        {
          id: randomId(),
          type: 'fchild',
          tag: 'button',
          attr: { type: 'button', title: 'More' },
          classes: ['oneput__icon-button'],
          icon: icons.EllipsisVertical
        },
        {
          id: randomId(),
          type: 'fchild',
          tag: 'button',
          attr: { type: 'button', title: 'Close' },
          classes: ['oneput__icon-button'],
          icon: icons.X
        }
      ]
    }
  ]
};

type ChatTurn = { role: 'user' | 'agent'; text: string };

const transcript: ChatTurn[] = [
  { role: 'user', text: 'Can you summarise the release notes for me?' },
  {
    role: 'agent',
    text: 'Sure. There are three notable changes: composite undo, a public event for undo/redo, and DOM retention applied to a handful of operations.'
  },
  { role: 'user', text: 'Which one is most likely to break existing callers?' },
  {
    role: 'agent',
    text: 'The public undo/redo events. Anything that previously polled editor state to detect an undo will now receive a duplicate signal, so those call sites should switch to the event and drop the poll.'
  },
  { role: 'user', text: 'Got it, thanks.' }
];

const chatMessage = (turn: ChatTurn, index: number): MenuItemAny => ({
  id: `chat-message-${index}`,
  type: 'hflex',
  class: 'demo-chat-row',
  ignored: true,
  children: [
    {
      id: randomId(),
      type: 'fchild',
      classes: ['demo-chat-bubble', `demo-chat-bubble--${turn.role}`],
      textContent: turn.text
    }
  ]
});

/**
 * A transcript of `ignored` blocks, closed off by a genuinely actionable item
 * so we can see prose and affordances coexisting: Up/Down should skip straight
 * to the suggestion and ignore every message above it.
 */
export const chatMenuItems = (): MenuItemAny[] => [
  ...transcript.map(chatMessage),
  {
    id: 'chat-suggestion',
    type: 'hflex',
    tag: 'button',
    children: [
      { id: randomId(), type: 'fchild', classes: ['oneput__icon'], icon: icons.Search },
      { id: randomId(), type: 'fchild', textContent: 'Show me the affected call sites' },
      { id: randomId(), type: 'fchild', classes: ['oneput__icon'], icon: icons.ChevronRight }
    ],
    action: () => {
      console.log('chat suggestion selected');
    }
  }
];

/**
 * Spike shape for chat: grow ignored transcript rows in the list; suggestions
 * stay normal focusable items. No item-scoped bindings.
 */
export const richChatMenuItems = (): MenuItemAny[] => [
  ...transcript.map(chatMessage),
  {
    id: 'rich-chat-suggestion-1',
    type: 'hflex',
    tag: 'button',
    children: [
      { id: randomId(), type: 'fchild', classes: ['oneput__icon'], icon: icons.Search },
      { id: randomId(), type: 'fchild', textContent: 'Show me the affected call sites' },
      { id: randomId(), type: 'fchild', classes: ['oneput__icon'], icon: icons.ChevronRight }
    ],
    action: () => {
      console.log('rich chat suggestion 1');
    }
  },
  {
    id: 'rich-chat-suggestion-2',
    type: 'hflex',
    tag: 'button',
    children: [
      { id: randomId(), type: 'fchild', classes: ['oneput__icon'], icon: icons.Search },
      { id: randomId(), type: 'fchild', textContent: 'Draft a migration note' },
      { id: randomId(), type: 'fchild', classes: ['oneput__icon'], icon: icons.ChevronRight }
    ],
    action: () => {
      console.log('rich chat suggestion 2');
    }
  },
  {
    id: 'rich-chat-clear',
    type: 'hflex',
    tag: 'button',
    children: [
      { id: randomId(), type: 'fchild', classes: ['oneput__icon'], icon: icons.X },
      { id: randomId(), type: 'fchild', textContent: 'Clear chat' }
    ],
    action: () => {
      console.log('Clear chat');
    }
  }
];

const longTranscript: ChatTurn[] = [
  ...transcript,
  {
    role: 'agent',
    text: 'Want me to list the call sites that still poll, or sketch a before/after for one of them?'
  },
  { role: 'user', text: 'List the call sites first.' },
  {
    role: 'agent',
    text: 'Three stand out: the status bar undo indicator, the bindings editor dirty check, and a test helper that waits for undo by sampling history length.'
  },
  { role: 'user', text: 'And the migration for each?' },
  {
    role: 'agent',
    text: 'Subscribe to the undo/redo event, drop the poll, and treat the event as the source of truth. Keep any UI that only needs the latest label reading state once on the event.'
  },
  { role: 'user', text: 'Ok — draft that as a short checklist.' },
  {
    role: 'agent',
    text: '1) Find polls on history/undo. 2) Wire the public event. 3) Remove the poll. 4) Re-test focus restoration after undo. 5) Note the duplicate-signal footgun in the changelog.'
  }
];

const scrollBubble = (turn: ChatTurn, index: number) => ({
  id: `rich-chat-scroll-msg-${index}`,
  type: 'hflex' as const,
  classes: ['demo-chat-row'],
  children: [
    {
      id: randomId(),
      type: 'fchild' as const,
      classes: ['demo-chat-bubble', `demo-chat-bubble--${turn.role}`],
      textContent: turn.text
    }
  ]
});

/** Scroll pane for the rich chat mockup — set via onMount. */
let richChatScrollEl: HTMLElement | null = null;

/**
 * Same list shell, but the transcript is ONE rich item with its own scroll
 * pane (nested scroll vs menu-body scroll). Suggestions stay sibling items.
 * Jump-to-latest is a circular absolute button (top-right), not a list row.
 */
export const richChatScrollMenuItems = (): MenuItemAny[] => [
  {
    id: 'rich-chat-scroll-widget',
    type: 'vflex',
    classes: ['demo-chat-scroll-wrap'],
    canFilter: false,
    children: [
      {
        id: 'rich-chat-scroll-pane',
        type: 'vflex',
        classes: ['demo-chat-scroll'],
        onMount: (node) => {
          richChatScrollEl = node;
          return () => {
            if (richChatScrollEl === node) richChatScrollEl = null;
          };
        },
        children: longTranscript.map(scrollBubble)
      },
      {
        id: 'rich-chat-scroll-jump',
        type: 'fchild',
        tag: 'button',
        classes: ['demo-chat-jump', 'oneput__icon-button'],
        icon: icons.ChevronDown,
        attr: {
          type: 'button',
          title: 'Jump to latest',
          'aria-label': 'Jump to latest',
          onpointerup: (event: Event) => {
            event.stopPropagation();
          },
          onclick: () => {
            const el = richChatScrollEl;
            if (!el) return;
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
          }
        }
      }
    ]
  },
  {
    id: 'rich-chat-scroll-suggestion-1',
    type: 'hflex',
    tag: 'button',
    children: [
      { id: randomId(), type: 'fchild', classes: ['oneput__icon'], icon: icons.Search },
      { id: randomId(), type: 'fchild', textContent: 'Show me the affected call sites' },
      { id: randomId(), type: 'fchild', classes: ['oneput__icon'], icon: icons.ChevronRight }
    ],
    action: () => {
      console.log('rich chat scroll suggestion 1');
    }
  },
  {
    id: 'rich-chat-scroll-suggestion-2',
    type: 'hflex',
    tag: 'button',
    children: [
      { id: randomId(), type: 'fchild', classes: ['oneput__icon'], icon: icons.Search },
      { id: randomId(), type: 'fchild', textContent: 'Draft a migration note' },
      { id: randomId(), type: 'fchild', classes: ['oneput__icon'], icon: icons.ChevronRight }
    ],
    action: () => {
      console.log('rich chat scroll suggestion 2');
    }
  },
  // Extra rows so the menu body scrolls as well as the transcript pane.
  ...[
    'Open related PR',
    'Copy last agent reply',
    'Pin this thread',
    'Export transcript',
    'Mute notifications',
    'Clear chat'
  ].map((label, i) => ({
    id: `rich-chat-scroll-extra-${i}`,
    type: 'hflex' as const,
    tag: 'button',
    children: [
      { id: randomId(), type: 'fchild' as const, classes: ['oneput__icon'], icon: icons.Search },
      { id: randomId(), type: 'fchild' as const, textContent: label },
      {
        id: randomId(),
        type: 'fchild' as const,
        classes: ['oneput__icon'],
        icon: icons.ChevronRight
      }
    ],
    action: () => {
      console.log(label);
    }
  }))
];
