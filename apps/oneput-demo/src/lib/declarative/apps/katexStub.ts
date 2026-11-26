import type { OneputEvent } from '@oneput/oneput/shared/declarative/oneputEvents.js';
import { setup } from 'xstate';
import { declarativeApp, type DefaultView } from '../../common/declarative.js';

/** A placeholder screen for the declarative KaTeX demo. Back finishes the machine. */
function createKatexStubMachine() {
  return setup({
    types: { events: {} as OneputEvent, meta: {} as { view?: DefaultView<{ type: 'BACK' }> } }
  }).createMachine({
    id: 'katex-stub',
    description: 'Show a placeholder for the declarative KaTeX demo.',
    initial: 'ready',
    meta: {
      view: {
        layout: 'standard',
        params: { menuTitle: 'KaTeX (stub)' },
        slots: { status: 'Stub' },
        menu: {
          id: 'katex-stub',
          items: [
            {
              id: 'info',
              build: 'info',
              params: { text: 'This is a placeholder for the declarative KaTeX demo.' }
            },
            { id: 'back', params: { text: 'Back', icon: 'ArrowLeft' }, send: { type: 'BACK' } }
          ]
        }
      }
    },
    on: { BACK: { target: '.done', description: 'Leave the stub.' } },
    states: {
      ready: { description: 'Show the placeholder.' },
      done: { type: 'final', description: 'The stub finished.' }
    }
  });
}

/** The KaTeX stub: its machine, and how to show an invoked actor of it (`ROUTED_DECL`). */
export const katexStub = declarativeApp(createKatexStubMachine());
