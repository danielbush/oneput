/**
 * Exploratory mockups: shapes that are a departure from a plain list of menu
 * items. Both are built ONLY from existing Oneput primitives (hflex/vflex/
 * fchild + menu items) so we can see how far the current constructs stretch
 * before deciding whether new ones are warranted.
 *
 * CALENDAR (week = menu item) — each week is one top-level menu item with seven
 * day cells. Renders as a grid, but focus is still 1D: Up/Down moves a whole
 * week; a day is pointer-only.
 *
 * CALENDAR (rich item) — the whole month is ONE menu item between ordinary
 * rows. Day cells are nested buttons (pointer works). List `$mod+j/k` still
 * moves by row; day-key stealing is the spike, not this mockup.
 *
 * CHAT — transcript of `ignored` blocks + actionable suggestions. Exposes
 * scroll anchoring (menu body scrolls on focus move, see Oneput.svelte).
 *
 * CHAT (rich item) — same shape, framed as the spike alternative: grow the
 * transcript in the list; no inner focus / key stealing needed.
 */

import { randomId } from '$lib/oneput/lib/utils.js';
import type { FlexParams, MenuItemAny } from '$lib/oneput/types.js';
import { icons } from './_state.svelte.js';

// #region calendar

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

type DayCell = { day: number; inMonth: boolean };

/**
 * Monday-first weeks for the month. Leading/trailing cells are neighbouring
 * months' days. Only completes the final partial week — never adds a trailing
 * row of next-month-only days (old behaviour padded to a fixed 6×7).
 */
function monthGrid(year: number, month: number): DayCell[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  // getDay() is Sunday-first; shift so Monday === 0.
  const lead = (first.getDay() + 6) % 7;

  const cells: DayCell[] = [];
  for (let i = lead; i > 0; i--) {
    cells.push({ day: daysInPrev - i + 1, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true });
  }
  for (let d = 1; cells.length % 7 !== 0; d++) {
    cells.push({ day: d, inMonth: false });
  }

  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export const calendarHeader = (year: number, month: number): FlexParams => ({
  id: 'calendar-header',
  type: 'hflex',
  children: [
    {
      id: randomId(),
      type: 'fchild',
      tag: 'button',
      attr: { type: 'button', title: 'Previous month' },
      classes: ['oneput__icon-button'],
      icon: icons.ChevronLeft
    },
    {
      id: randomId(),
      type: 'fchild',
      classes: ['oneput__menu-item-header'],
      textContent: `${MONTH_LABELS[month]} ${year}`
    },
    {
      id: randomId(),
      type: 'fchild',
      tag: 'button',
      attr: { type: 'button', title: 'Next month' },
      classes: ['oneput__icon-button'],
      icon: icons.ChevronRight
    }
  ]
});

/**
 * @param selected day-of-month to render as picked, if it falls in this month.
 */
export const calendarMenuItems = (
  year: number,
  month: number,
  selected?: number
): MenuItemAny[] => {
  const weekdays: MenuItemAny = {
    id: 'calendar-weekdays',
    type: 'hflex',
    class: 'demo-calendar-row',
    ignored: true,
    children: DAY_LABELS.map((label) => ({
      id: `calendar-weekday-${label}`,
      type: 'fchild' as const,
      classes: ['demo-calendar-cell', 'demo-calendar-cell--label'],
      textContent: label
    }))
  };

  const weeks = monthGrid(year, month).map((week, w) => ({
    id: `calendar-week-${w}`,
    type: 'hflex' as const,
    tag: 'button',
    classes: ['demo-calendar-row'],
    children: week.map((cell, d) => ({
      id: `calendar-week-${w}-day-${d}`,
      type: 'fchild' as const,
      classes: [
        'demo-calendar-cell',
        !cell.inMonth && 'demo-calendar-cell--outside',
        cell.inMonth && cell.day === selected && 'demo-calendar-cell--selected'
      ],
      textContent: String(cell.day)
    })),
    action: () => {
      console.log(`week ${w} selected`);
    }
  }));

  return [weekdays, ...weeks];
};

/** Max pointer travel (px) between down and up still counted as a tap. */
const TAP_SLOP_PX = 10;

type TapPending = { x: number; y: number; pointerId: number };

/**
 * Nested control inside a scrollable menu: call `onSelect` only for a tap
 * (down→up under slop). Stops propagation on up so the parent menu row's
 * onMenuAction does not also fire. Spike helper — may graduate or die.
 */
function tapSelect(onSelect: () => void): Record<
  string,
  string | boolean | ((event: Event) => void)
> {
  let pending: TapPending | null = null;

  return {
    type: 'button',
    onpointerdown: (event: Event) => {
      const e = event as PointerEvent;
      pending = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    },
    onpointerup: (event: Event) => {
      event.stopPropagation();
      const e = event as PointerEvent;
      const start = pending;
      pending = null;
      if (!start || start.pointerId !== e.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (dx * dx + dy * dy > TAP_SLOP_PX * TAP_SLOP_PX) return;
      onSelect();
    },
    onpointercancel: () => {
      pending = null;
    }
  };
}

/**
 * Spike shape: ordinary items above/below a single calendar widget item.
 * Day cells are buttons (pointer select via {@link tapSelect}). Keyboard
 * day-nav is not wired here.
 */
export const richCalendarMenuItems = (
  year: number,
  month: number,
  selected?: number,
  onSelect?: (day: number) => void
): MenuItemAny[] => {
  const weeks = monthGrid(year, month);

  const calendarItem: MenuItemAny = {
    id: 'rich-calendar-widget',
    type: 'vflex',
    classes: ['demo-calendar-widget'],
    canFilter: false,
    action: () => {
      console.log('calendar widget activated (would enter inner focus)');
    },
    children: [
      {
        id: 'rich-calendar-weekdays',
        type: 'hflex',
        classes: ['demo-calendar-row'],
        children: DAY_LABELS.map((label) => ({
          id: `rich-calendar-weekday-${label}`,
          type: 'fchild' as const,
          classes: ['demo-calendar-cell', 'demo-calendar-cell--label'],
          textContent: label
        }))
      },
      ...weeks.map((week, w) => ({
        id: `rich-calendar-week-${w}`,
        type: 'hflex' as const,
        classes: ['demo-calendar-row'],
        children: week.map((cell, d) => {
          const isSelected = cell.inMonth && cell.day === selected;
          if (!cell.inMonth) {
            return {
              id: `rich-calendar-week-${w}-day-${d}`,
              type: 'fchild' as const,
              classes: ['demo-calendar-cell', 'demo-calendar-cell--outside'],
              textContent: String(cell.day)
            };
          }
          return {
            id: `rich-calendar-week-${w}-day-${d}`,
            type: 'fchild' as const,
            tag: 'button',
            attr: tapSelect(() => {
              onSelect?.(cell.day);
              console.log(`day ${cell.day} selected`);
            }),
            classes: [
              'demo-calendar-cell',
              'demo-calendar-cell--button',
              isSelected && 'demo-calendar-cell--selected'
            ],
            textContent: String(cell.day)
          };
        })
      }))
    ]
  };

  return [
    {
      id: 'rich-calendar-today',
      type: 'hflex',
      tag: 'button',
      children: [
        { id: randomId(), type: 'fchild', classes: ['oneput__icon'], icon: icons.Search },
        { id: randomId(), type: 'fchild', textContent: 'Today' }
      ],
      action: () => {
        console.log('Today');
      }
    },
    calendarItem,
    {
      id: 'rich-calendar-clear',
      type: 'hflex',
      tag: 'button',
      children: [
        { id: randomId(), type: 'fchild', classes: ['oneput__icon'], icon: icons.X },
        { id: randomId(), type: 'fchild', textContent: 'Clear date' }
      ],
      action: () => {
        console.log('Clear date');
      }
    }
  ];
};

// #endregion

// #region chat

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
      { id: randomId(), type: 'fchild' as const, classes: ['oneput__icon'], icon: icons.ChevronRight }
    ],
    action: () => {
      console.log(label);
    }
  }))
];

// #endregion
