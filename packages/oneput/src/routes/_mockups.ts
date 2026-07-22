/**
 * Exploratory mockups: shapes that are a departure from a plain list of menu
 * items. Both are built ONLY from existing Oneput primitives (hflex/vflex/
 * fchild + menu items) so we can see how far the current constructs stretch
 * before deciding whether new ones are warranted.
 *
 * CALENDAR — approach "week = menu item". Each week is one top-level menu item
 * containing seven day cells. This renders as a grid, but focus is still 1D:
 * Up/Down moves a whole week, and a single day can only be picked with the
 * pointer. That limitation is the point of the mockup.
 *
 * CHAT — a transcript of non-interactive (`ignored: true`) blocks, alternating
 * alignment via `alignSelf`. Needs no new focus machinery at all; what it
 * exposes instead is scroll anchoring (the menu body only scrolls in response
 * to focus moving, see Oneput.svelte scrollIntoView).
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
 * Six rows of seven, Monday-first, padded with the neighbouring months' days.
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
  for (let d = 1; cells.length < 42; d++) {
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

// #endregion
