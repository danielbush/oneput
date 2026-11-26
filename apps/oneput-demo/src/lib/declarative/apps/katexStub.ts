import type { AppObject, Controller } from '@oneput/oneput';
import { attachAppObjectActor } from '@oneput/oneput/shared/declarative/appObjectActor.js';
import type { ViewFor } from '@oneput/oneput/shared/declarative/interpreter.js';
import type { OneputEvent } from '@oneput/oneput/shared/declarative/oneputEvents.js';
import { infoRow, standardRow } from '@oneput/oneput/shared/declarative/standardRow.js';
import { setup, type ActorRefFrom } from 'xstate';
import { viewLayouts } from '../../common/layout.js';

/** The stub shows only fixed rows, so it has no slot or menu sources. */
const content = { slot: {}, menu: {}, menuItem: { default: standardRow, info: infoRow } };

type KatexStubView = ViewFor<typeof content, typeof viewLayouts, { type: 'BACK' }>;

/** A placeholder screen for the declarative KaTeX demo. Back finishes the machine. */
export function createKatexStubMachine() {
  return setup({
    types: { events: {} as OneputEvent, meta: {} as { view?: KatexStubView } }
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

export type KatexStubActor = ActorRefFrom<ReturnType<typeof createKatexStubMachine>>;

/** Attach an invoked KaTeX stub actor to a Oneput AppObject (`ROUTED_DECL`). */
export function attachKatexStubAppObject(ctl: Controller, actor: KatexStubActor): AppObject {
  return attachAppObjectActor(ctl, actor, content, viewLayouts);
}
