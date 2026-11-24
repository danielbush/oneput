import { assign, fromCallback, sendTo, setup } from 'xstate';
import type { ViewFor } from '@oneput/oneput/shared/declarative/interpreter.js';
import type { OneputEvent } from '@oneput/oneput/shared/declarative/oneputEvents.js';
import { viewLayouts } from '../../common/layout.js';
import { SearchService, type SearchFailure, type SearchItem } from '../../service/SearchService.js';
import type { SearchContext, SearchContent } from './content.js';

type RowEvent = { type: 'RETRY_SEARCH' } | { type: 'RESULT_ACTIVATED'; id: string };
type FetchEvent =
  | { type: 'SEARCH_SUCCEEDED'; results: readonly SearchItem[] }
  | { type: 'SEARCH_FAILED'; error: SearchFailure };
type SearchView = ViewFor<SearchContent, typeof viewLayouts, RowEvent>;

function resultById(context: SearchContext, id: string) {
  return context.results.find((result) => result.id === id);
}

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
        event.type === 'RESULT_ACTIVATED' && resultById(context, event.id) !== undefined
    },
    actions: {
      writeQuery: assign((_, params: { value: string }) => ({
        query: params.value,
        results: [],
        selected: null,
        error: null
      })),
      startFetch: sendTo('request', ({ context }) => ({
        type: 'SEARCH',
        query: context.query ?? ''
      })),
      storeResults: assign((_, params: { results: readonly SearchItem[] }) => ({
        results: params.results
      })),
      storeFailure: assign((_, params: { error: SearchFailure }) => ({ error: params.error })),
      clearFailure: assign({ error: null }),
      selectResult: assign(({ context }, params: { id: string }) => ({
        selected: resultById(context, params.id)?.text ?? null
      }))
    }
  });
}
