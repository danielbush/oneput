import type { Controller } from '@oneput/oneput';
import { createActor } from 'xstate';
import { appObjectActor, type ApplyView } from '../appObjectActor.js';
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
  actor.on('SELECT_PROVIDER', onSelect);
  const app = appObjectActor(ctl, actor, sources, applyView);

  return {
    app,
    rename(providerId: string, name: string) {
      actor.send({ type: 'RENAME_PROVIDER', providerId, name });
    }
  };
}
