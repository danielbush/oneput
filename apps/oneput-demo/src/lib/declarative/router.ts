import { createActorRouter } from '@oneput/oneput/shared/routing/xstate/actorRouter.js';
import { createActor } from 'xstate';
import type { Online } from '../common/online.js';
import type { SearchService } from '../service/SearchService.js';
import { createAsyncSearchApp } from '../shared/asyncSearchDeclarative/appObject.js';
import { katexStub } from './apps/katexStub.js';
import { rootMenu } from './apps/rootMenu.js';
import { createMachine } from './machine.js';

/**
 * Connect the declarative demo flow to Oneput. The host uses the returned
 * handle and owns `online`.
 */
export function createRouter({ search, online }: { search?: SearchService; online: Online }) {
  const asyncSearch = createAsyncSearchApp({ search, online });
  const machine = createMachine({
    rootMenu: rootMenu.machine,
    asyncSearch: asyncSearch.machine,
    katexStub: katexStub.machine
  });
  const { start, stop } = createActorRouter(createActor(machine), (ctl) => ({
    root: rootMenu.fromChild(ctl, 'root'),
    search: asyncSearch.fromChild(ctl, 'search'),
    katex: katexStub.fromChild(ctl, 'katex')
  }));

  return { start, stop };
}
