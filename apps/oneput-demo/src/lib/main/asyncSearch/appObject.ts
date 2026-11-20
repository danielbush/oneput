import type { AppObject, Controller } from '@oneput/oneput';
import { appObjectActor } from '@oneput/oneput/shared/declarative/appObjectActor.js';
import { createActor, type ActorOptions } from 'xstate';
import { viewLayouts } from '../../common/_layout.js';
import { createAsyncSearchMachine } from './machine.js';
import type { SearchService } from './searchService.js';
import { sources } from './sources.js';

/** Run the search machine as a Oneput AppObject. */
export function createAsyncSearchAppObject(
  ctl: Controller,
  service?: SearchService,
  clock?: ActorOptions<ReturnType<typeof createAsyncSearchMachine>>['clock']
): AppObject {
  const actor = createActor(createAsyncSearchMachine(service), clock && { clock });
  return appObjectActor(ctl, actor, sources, viewLayouts, { inputRequiresOpenMenu: true });
}
