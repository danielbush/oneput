import type { SearchFailure, SearchItem } from './searchService.js';

export type SearchContext = {
  query: string | null;
  results: readonly SearchItem[];
  error: SearchFailure | null;
  selected: string | null;
};

type SearchSnapshot = { context: SearchContext };

export function resultById(context: SearchContext, id: string) {
  return context.results.find((result) => result.id === id);
}

/** Read the changing status and derive the result rows from the current response. */
export const sources = {
  text: {
    emptyStatus: ({ context }: SearchSnapshot) => (context.query === null ? '' : 'Ready'),
    resultStatus: ({ context }: SearchSnapshot) =>
      context.selected === null ? 'Ready' : `Selected: ${context.selected}`,
    searchError: ({ context }: SearchSnapshot) => context.error?.message ?? ''
  },
  lists: {
    results: ({ context }: SearchSnapshot) =>
      context.results.map(({ id, text }) => ({
        id,
        text: `Result: '${text}'`,
        icon: 'Dot',
        activate: true
      }))
  },
  release: {}
};
