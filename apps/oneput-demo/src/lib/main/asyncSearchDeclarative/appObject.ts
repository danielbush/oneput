import type { AppObject, Controller } from '@oneput/oneput';
import { appObjectActor } from '@oneput/oneput/shared/declarative/appObjectActor.js';
import { createActor, type ActorOptions } from 'xstate';
import { viewLayouts } from '../../common/_layout.js';
import { createAsyncSearchMachine } from './machine.js';
import type { Online } from '../../common/online.js';
import type { SearchService } from './searchService.js';
import { createSources } from './sources.js';

/** Run the search machine as a Oneput AppObject. The host owns `online`. */
export function createAsyncSearchAppObject(
  ctl: Controller,
  online: Online,
  service?: SearchService,
  clock?: ActorOptions<ReturnType<typeof createAsyncSearchMachine>>['clock']
): AppObject {
  const actor = createActor(createAsyncSearchMachine(service), clock && { clock });
  return appObjectActor(ctl, actor, createSources(online), viewLayouts, {
    inputRequiresOpenMenu: true
  });
}
