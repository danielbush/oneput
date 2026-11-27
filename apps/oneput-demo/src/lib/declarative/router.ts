import { createActorRouter } from '@oneput/oneput/shared/routing/xstate/actorRouter.js';
import { createActor } from 'xstate';
import type { Online } from '../common/online.js';
import type { SearchService } from '../service/SearchService.js';
import type { DemoDocument } from '../shared/katex/katex.js';
import { createKatexApp } from '../shared/katexDeclarative/appObject.js';
import { createAsyncSearchApp } from '../shared/asyncSearchDeclarative/appObject.js';
import { rootMenu } from './apps/rootMenu.js';
import { createMachine } from './machine.js';

/**
 * Connect the declarative demo flow to Oneput. The host uses the returned
 * handle and owns `online`. Inserted formulas go in `doc`.
 */
export function createRouter({
  search,
  online,
  doc
}: {
  search?: SearchService;
  online: Online;
  doc: DemoDocument;
}) {
  const asyncSearch = createAsyncSearchApp({ search, online });
  const katex = createKatexApp({ doc });
  const machine = createMachine({
    rootMenu: rootMenu.machine,
    asyncSearch: asyncSearch.machine,
    katex: katex.machine
  });
  return createActorRouter(createActor(machine), (ctl) => ({
    root: rootMenu.fromChild(ctl, 'root'),
    search: asyncSearch.fromChild(ctl, 'search'),
    katex: katex.fromChild(ctl, 'katex')
  }));
}
