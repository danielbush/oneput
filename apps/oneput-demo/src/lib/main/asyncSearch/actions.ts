import { assertEvent, assign, fromCallback, sendTo, setup } from 'xstate';
import type { LayoutSlots, ViewDef } from '@oneput/oneput/shared/declarative/interpreter.js';
import type { OneputEvent } from '@oneput/oneput/shared/declarative/oneputEvents.js';
import { viewLayouts } from '../../common/_layout.js';
import { SearchService, type SearchFailure, type SearchItem } from './searchService.js';
import { resultById, sources, type SearchContext } from './sources.js';

type RowEvent = { type: 'RETRY_SEARCH' };
type FetchEvent =
  | { type: 'SEARCH_SUCCEEDED'; results: readonly SearchItem[] }
  | { type: 'SEARCH_FAILED'; error: SearchFailure };
type SearchView = ViewDef<
  keyof typeof sources.text,
  keyof typeof sources.lists,
  RowEvent,
  keyof typeof sources.items,
  LayoutSlots<typeof viewLayouts>
>;

function fetchResults(service: SearchService) {
  return fromCallback<{ type: 'SEARCH'; query: string }>(({ receive, sendBack }) => {
    receive(({ query }) => {
      void service.search(query).then((result) => {
        const event: FetchEvent = result.isOk()
          ? { type: 'SEARCH_SUCCEEDED', results: result.value }
          : { type: 'SEARCH_FAILED', error: result.error };
        sendBack(event);
      });
    });
  });
}

/** Link the named operations to a search service. A stopped invocation cannot report back. */
export function searchActions(service: SearchService) {
  return setup({
    types: {
      context: {} as SearchContext,
      events: {} as OneputEvent | RowEvent | FetchEvent,
      meta: {} as { view?: SearchView }
    },
    actors: { fetchResults: fetchResults(service) },
    delays: { debounce: 500 },
    guards: {
      isBlankInput: ({ event }) => event.type === 'INPUT_CHANGED' && !/\S/.test(event.value),
      hasResults: ({ event }) => event.type === 'SEARCH_SUCCEEDED' && event.results.length > 0,
      resultExists: ({ context, event }) =>
        event.type === 'ITEM_ACTIVATED' && resultById(context, event.id) !== undefined
    },
    actions: {
      writeQuery: assign(({ event }) => {
        assertEvent(event, 'INPUT_CHANGED');
        return { query: event.value, results: [], selected: null, error: null };
      }),
      startFetch: sendTo('request', ({ context }) => ({
        type: 'SEARCH',
        query: context.query ?? ''
      })),
      storeResults: assign(({ event }) => {
        assertEvent(event, 'SEARCH_SUCCEEDED');
        return { results: event.results };
      }),
      storeFailure: assign(({ event }) => {
        assertEvent(event, 'SEARCH_FAILED');
        return { error: event.error };
      }),
      clearFailure: assign({ error: null }),
      selectResult: assign(({ context, event }) => {
        assertEvent(event, 'ITEM_ACTIVATED');
        return { selected: resultById(context, event.id)?.text ?? null };
      })
    }
  });
}
