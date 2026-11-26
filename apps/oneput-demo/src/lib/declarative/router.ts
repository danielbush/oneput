import type { Controller } from '@oneput/oneput';
import { routeMachine } from '@oneput/oneput/shared/routing/xstate/routeMachine.js';
import { setup, type ActorRefFrom } from 'xstate';
import type { Online } from '../common/online.js';
import { createAsyncSearchApp } from '../shared/asyncSearchDeclarative/appObject.js';
import type { SearchService } from '../service/SearchService.js';
import { katexStub } from './apps/katexStub.js';
import { rootMenu } from './apps/rootMenu.js';

/**
 * The declarative demo flow. `machine` is only a router: it has no views.
 * Each screen is an invoked declarative child. The root menu finishes with the
 * demo to open. Each demo returns to the root when it finishes. `route` maps
 * each state to a declarative AppObject. The host owns `online`.
 */
export function createDeclarativeRouter({
  search,
  online
}: {
  search?: SearchService;
  online: Online;
}) {
  const asyncSearch = createAsyncSearchApp({ search, online });
  const machine = setup({
    actors: {
      rootMenu: rootMenu.machine,
      asyncSearch: asyncSearch.machine,
      katexStub: katexStub.machine
    }
  }).createMachine({
    id: 'declarative-demo',
    initial: 'root',
    states: {
      root: {
        description: 'Show the root menu.',
        invoke: {
          id: 'root',
          src: 'rootMenu',
          onDone: [
            {
              guard: ({ event }) => event.output === 'search',
              target: 'search',
              description: 'Open declarative async search.'
            },
            {
              guard: ({ event }) => event.output === 'katex',
              target: 'katex',
              description: 'Open the KaTeX stub.'
            }
          ]
        }
      },
      search: {
        description: 'Run declarative async search.',
        invoke: {
          id: 'search',
          src: 'asyncSearch',
          onDone: { target: 'root', description: 'Return to the root when search finishes.' }
        }
      },
      katex: {
        description: 'Show the KaTeX stub.',
        invoke: {
          id: 'katex',
          src: 'katexStub',
          onDone: { target: 'root', description: 'Return to the root when the stub finishes.' }
        }
      }
    }
  });

  return {
    machine,
    route: (ctl: Controller, actor: ActorRefFrom<typeof machine>) =>
      routeMachine(ctl, actor, {
        root: rootMenu.fromChild(ctl, 'root'),
        search: asyncSearch.fromChild(ctl, 'search'),
        katex: katexStub.fromChild(ctl, 'katex')
      })
  };
}
