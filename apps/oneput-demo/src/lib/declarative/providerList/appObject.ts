import type { AppObject, Controller } from '@oneput/oneput';
import { createActor } from 'xstate';
import { renderActiveView, type ApplyView } from '../interpreter.js';
import { loadProviders } from './actions.js';
import { providerList } from './machine.js';
import {
  simulateProviderLoad,
  sources,
  type LoadProviders,
  type SelectProvider
} from './sources.js';

/** Give Oneput a refresh source and keep the producer in this AppObject's actor. */
export function createProviderList(
  ctl: Controller,
  applyView: ApplyView,
  onSelect: (event: SelectProvider) => void,
  load: LoadProviders = simulateProviderLoad()
) {
  const actor = createActor(
    providerList.provide({ actors: { loadProviders: loadProviders(load) } })
  );
  const refresh = () => {
    const result = renderActiveView(ctl, actor, sources, applyView);
    if (result.isErr()) ctl.notify(result.error);
  };

  const app: AppObject = {
    onStart() {
      actor.start();
      refresh();
    },
    watch: () => [
      {
        subscribe(onChange) {
          const subscription = actor.subscribe(onChange);
          return () => subscription.unsubscribe();
        }
      }
    ],
    onRefresh: refresh,
    onExit() {
      selected.unsubscribe();
      actor.stop();
    }
  };
  const selected = actor.on('SELECT_PROVIDER', onSelect);

  return {
    app,
    rename(providerId: string, name: string) {
      actor.send({ type: 'RENAME_PROVIDER', providerId, name });
    }
  };
}
