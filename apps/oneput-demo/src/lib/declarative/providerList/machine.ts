import { providers } from './actions.js';

/** The actor shows a view for each load state. Ready also covers an empty list. */
export const providerList = providers.createMachine({
  id: 'provider-list',
  description: 'Load providers and select a provider by ID.',
  initial: 'loading',
  context: { providers: [], fetchError: null },
  states: {
    loading: {
      description: 'Wait for the provider source.',
      invoke: { src: 'loadProviders' },
      meta: {
        view: {
          title: 'Providers',
          menu: {
            id: 'providers',
            items: [{ id: 'providers-loading', text: 'Loading providers…' }]
          },
          actions: { reload: { type: 'RELOAD' } },
          settings: { enableGoBack: false }
        }
      },
      on: {
        LOAD_SUCCEEDED: {
          target: 'ready',
          actions: 'storeProviders',
          description: 'Show the rows from this load.'
        },
        LOAD_FAILED: {
          target: 'failed',
          actions: 'storeFailure',
          description: 'Show the error and offer a retry.'
        }
      }
    },
    failed: {
      description: 'Show the load error and wait for Retry.',
      meta: {
        view: {
          title: 'Providers',
          menu: {
            id: 'providers',
            items: [
              {
                id: 'providers-failed',
                text: 'Providers unavailable',
                detail: { from: 'fetchMessage' }
              },
              { id: 'providers-retry', text: 'Retry', action: 'reload' }
            ]
          },
          actions: { reload: { type: 'RELOAD' } },
          settings: { enableGoBack: false }
        }
      },
      on: {
        RELOAD: {
          target: 'loading',
          description: 'Start a new load.'
        }
      }
    },
    ready: {
      description: 'Show the current provider rows or an empty list.',
      meta: {
        view: {
          title: 'Providers',
          menu: {
            id: 'providers',
            from: 'providers',
            empty: { id: 'providers-empty', text: 'No providers' }
          },
          actions: { reload: { type: 'RELOAD' } },
          settings: { enableGoBack: false }
        }
      },
      on: {
        RENAME_PROVIDER: {
          actions: 'renameProvider',
          description: 'Update the row label and keep its ID.'
        },
        SELECT_PROVIDER: {
          guard: 'providerExists',
          actions: 'selectProvider',
          description: 'Send the ID to the host if the provider is still in the list.'
        }
      }
    }
  }
});
