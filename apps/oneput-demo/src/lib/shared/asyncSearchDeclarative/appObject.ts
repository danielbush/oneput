import type { AppObject, Controller } from '@oneput/oneput';
import {
  appObjectActor,
  attachAppObjectActor
} from '@oneput/oneput/shared/declarative/appObjectActor.js';
import { createActor, type ActorOptions, type ActorRefFrom } from 'xstate';
import { viewLayouts } from '../../common/layout.js';
import { createAsyncSearchMachine } from './machine.js';
import type { Online } from '../../common/online.js';
import type { SearchService } from '../../service/SearchService.js';
import { createContent } from './content.js';

export type AsyncSearchActor = ActorRefFrom<ReturnType<typeof createAsyncSearchMachine>>;

/** Run the search machine as a Oneput AppObject (`STACK_MODE`). The host owns `online`. */
export function createAsyncSearchAppObject(
  ctl: Controller,
  online: Online,
  service?: SearchService,
  clock?: ActorOptions<ReturnType<typeof createAsyncSearchMachine>>['clock']
): AppObject {
  const actor = createActor(createAsyncSearchMachine(service), clock && { clock });
  return appObjectActor(ctl, actor, createContent(online), viewLayouts);
}

/** Attach an invoked search actor to a Oneput AppObject (`ROUTED_MODE`). The host owns `online`. */
export function attachAsyncSearchAppObject(
  ctl: Controller,
  actor: AsyncSearchActor,
  online: Online
): AppObject {
  return attachAppObjectActor(ctl, actor, createContent(online), viewLayouts);
}
