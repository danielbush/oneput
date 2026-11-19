import { assign, enqueueActions, fromCallback, setup } from 'xstate';
import type { ViewDef } from '../interpreter.js';
import type { OneputEvent } from '@oneput/oneput/shared/declarative/oneputEvents.js';
import {
  simulateProviderLoad,
  sources,
  type LoadProviders,
  type ProviderContext,
  type SelectProvider
} from './sources.js';

type Retry = { type: 'RETRY_LOAD' };
type ProviderEvent =
  | OneputEvent
  | Retry
  | { type: 'LOAD_SUCCEEDED'; providers: ProviderContext['providers'] }
  | { type: 'LOAD_FAILED'; error: NonNullable<ProviderContext['fetchError']> }
  | { type: 'RENAME_PROVIDER'; providerId: string; name: string };

type ProviderView = ViewDef<
  keyof typeof sources.text,
  keyof typeof sources.lists,
  never,
  never,
  Retry
>;

/** Bridge the source into the machine. XState stops it when loading ends. */
export const loadProviders = (load: LoadProviders) =>
  fromCallback(({ sendBack }) =>
    load((result) => {
      const event: ProviderEvent = result.isOk()
        ? { type: 'LOAD_SUCCEEDED', providers: result.value }
        : { type: 'LOAD_FAILED', error: result.error };
      sendBack(event);
    })
  );

/** XState implementations for the names in the machine document. */
export const providers = setup({
  types: {
    context: {} as ProviderContext,
    events: {} as ProviderEvent,
    emitted: {} as SelectProvider,
    meta: {} as { view?: ProviderView }
  },
  actors: {
    loadProviders: loadProviders(simulateProviderLoad())
  },
  guards: {
    providerExists: ({ context, event }) =>
      event.type === 'ITEM_ACTIVATED' &&
      context.providers.some((provider) => provider.id === event.id)
  },
  actions: {
    storeProviders: assign(({ event }) =>
      event.type === 'LOAD_SUCCEEDED' ? { providers: event.providers, fetchError: null } : {}
    ),
    storeFailure: assign(({ event }) =>
      event.type === 'LOAD_FAILED' ? { fetchError: event.error } : {}
    ),
    renameProvider: assign(({ context, event }) =>
      event.type === 'RENAME_PROVIDER'
        ? {
            providers: context.providers.map((provider) =>
              provider.id === event.providerId ? { ...provider, name: event.name } : provider
            )
          }
        : {}
    ),
    selectProvider: enqueueActions(({ event, enqueue }) => {
      if (event.type === 'ITEM_ACTIVATED') {
        enqueue.emit({ type: 'SELECT_PROVIDER', providerId: event.id });
      }
    })
  }
});
