import { menuItem } from '@oneput/oneput';
import type { SearchFailure, SearchItem } from './searchService.js';

export type SearchContext = {
  query: string | null;
  results: readonly SearchItem[];
  error: SearchFailure | null;
  selected: string | null;
};

type SearchSnapshot = { context: SearchContext };

/** Find the last result with the ID, as the menu keeps the last row with an ID. */
export function resultById(context: SearchContext, id: string) {
  return context.results.findLast((result) => result.id === id);
}

/** Read the changing status, derive the result rows, and build each result row. */
export const sources = {
  text: {
    emptyStatus: ({ context }: SearchSnapshot) => (context.query === null ? '' : 'Ready'),
    resultStatus: ({ context }: SearchSnapshot) =>
      context.selected === null ? 'Ready' : `Selected: ${context.selected}`,
    searchError: ({ context }: SearchSnapshot) => context.error?.message ?? ''
  },
  lists: {
    results: ({ context }: SearchSnapshot) =>
      context.results.map(({ id }) => ({ id, build: 'result' as const }))
  },
  items: {
    // Built with menuItem, not stdMenuItem, to show a custom builder.
    result: ({ context }: SearchSnapshot, row: { id: string }, activate: () => void) =>
      menuItem({
        id: row.id,
        tag: 'button',
        attr: { type: 'button' },
        action: activate,
        children: (b) => [
          b.icon('Dot'),
          b.fchild({ textContent: `Result: '${resultById(context, row.id)?.text ?? ''}'` })
        ]
      })
  }
};
