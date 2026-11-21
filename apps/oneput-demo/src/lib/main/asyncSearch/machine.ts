import { searchActions } from './actions.js';
import { SearchService } from './searchService.js';

/** Show the state of the current query and stop the request actor when the input changes. */
export function createAsyncSearchMachine(service = SearchService.create()) {
  return searchActions(service).createMachine({
    id: 'async-search',
    description: 'Search from the Oneput input and show the current response in the menu.',
    initial: 'empty',
    context: { query: null, results: [], error: null, selected: null },
    meta: {
      view: {
        layout: 'standard',
        slots: { title: { from: 'title' }, status: 'Ready' },
        menu: { id: 'async-search', focusBehaviour: 'last-action,first' },
        input: { kind: 'filter', placeholder: 'Start typing something...' },
        settings: { enableFilter: false, enableInputElement: true, clearInputAfterAction: false }
      }
    },
    on: {
      INPUT_CHANGED: [
        {
          guard: 'isBlankInput',
          actions: 'writeQuery',
          target: '.empty',
          description: 'Stop pending work and show the instructions for blank input.'
        },
        {
          actions: 'writeQuery',
          target: '.pending.debouncing',
          reenter: true,
          description: 'Stop any previous request and restart the debounce with the new input.'
        }
      ]
    },
    states: {
      empty: {
        description: 'Show the instructions. Blank input needs no request.',
        meta: {
          view: {
            slots: { status: { from: 'emptyStatus' } },
            menu: {
              items: [
                {
                  id: 'instructions',
                  kind: 'info',
                  icon: 'Info',
                  text: 'Start typing something and inspect the browser console. The latest input controls the results. The service fails 30% of the time.'
                }
              ]
            }
          }
        }
      },
      pending: {
        description: 'Keep the input available and show the busy icon while the query is pending.',
        initial: 'debouncing',
        meta: { view: { slots: { busyIcon: 'RefreshCw' } } },
        states: {
          debouncing: {
            description: 'Wait for a pause in typing before making the request.',
            meta: { view: { slots: { status: 'Debouncing...' } } },
            after: {
              debounce: {
                target: 'fetching',
                description: 'Start the request after the input has settled.'
              }
            }
          },
          fetching: {
            description: 'Run one request for the current query.',
            meta: { view: { slots: { status: 'Fetching data...' } } },
            entry: 'startFetch',
            invoke: { id: 'request', src: 'fetchResults' },
            on: {
              SEARCH_SUCCEEDED: [
                {
                  guard: 'hasResults',
                  target: '#async-search.results',
                  actions: 'storeResults',
                  description: 'Show the returned result rows.'
                },
                {
                  target: '#async-search.noResults',
                  description: 'Show an empty menu for a successful response with no results.'
                }
              ],
              SEARCH_FAILED: {
                target: '#async-search.error',
                actions: 'storeFailure',
                description: 'Show the error next to the input and offer a retry in the menu.'
              }
            }
          }
        }
      },
      results: {
        description: 'Show the current results and report a selection next to the input.',
        meta: {
          view: {
            menu: { from: 'results' },
            slots: { status: { from: 'resultStatus' } },
            settings: { clearInputAfterAction: true }
          }
        },
        on: {
          ITEM_ACTIVATED: {
            guard: 'resultExists',
            actions: 'selectResult',
            description: 'Show the selected result text if its row still exists.'
          }
        }
      },
      noResults: {
        description: 'Keep the ready status and empty menu for a response with no results.'
      },
      error: {
        description: 'Keep the input available and offer to search again with the same query.',
        meta: {
          view: {
            slots: { status: '⚠️ Error' },
            menu: {
              items: [
                {
                  id: 'retry-search',
                  text: 'Retry search',
                  detail: { from: 'searchError' },
                  icon: 'RefreshCw',
                  send: { type: 'RETRY_SEARCH' }
                }
              ]
            }
          }
        },
        on: {
          RETRY_SEARCH: {
            target: 'pending.debouncing',
            actions: 'clearFailure',
            description: 'Run the last query again through the same debounce.'
          }
        }
      }
    }
  });
}
