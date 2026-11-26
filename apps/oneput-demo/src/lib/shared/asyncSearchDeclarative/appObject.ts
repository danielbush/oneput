import type { AppObject, Controller } from '@oneput/oneput';
import { appObjectActor } from '@oneput/oneput/shared/declarative/appObjectActor.js';
import { createActor, type ActorOptions } from 'xstate';
import { declarativeAppWith } from '../../common/declarative.js';
import { viewLayouts } from '../../common/layout.js';
import { createAsyncSearchMachine } from './machine.js';
import type { Online } from '../../common/online.js';
import type { SearchService } from '../../service/SearchService.js';
import { createContent } from './content.js';

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

/**
 * The search machine as a child of a routed app (`ROUTED_DECL`), see
 * {@link declarativeAppWith}. The host owns `online`.
 */
export function createAsyncSearchApp({
  search,
  online
}: {
  search?: SearchService;
  online: Online;
}) {
  return declarativeAppWith(createAsyncSearchMachine(search), createContent(online));
}
