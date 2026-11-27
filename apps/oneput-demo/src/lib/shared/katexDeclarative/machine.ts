import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import type { DemoDocument } from '../katex/katex.js';
import { emptyFormula, katexActions } from './actions.js';

/**
 * Type katex, see a preview, and insert the formula in the page. Insert is
 * the SUBMIT action ($mod+Enter), the Send button and the Insert row; it runs
 * only while the formula is valid. The machine controls the input text, so it
 * clears the input after an insert.
 */
export function createKatexMachine(doc: DemoDocument) {
  return katexActions(doc).createMachine({
    id: 'katex',
    description: 'Edit a katex formula and insert it in the page.',
    initial: 'editing',
    context: emptyFormula,
    meta: {
      view: {
        layout: 'standard',
        params: { menuTitle: 'KaTeX (declarative)', input: { kind: 'textarea', rows: 5 } },
        placeholder: 'Type some katex...',
        inputValue: { $from: 'source' },
        slots: { status: { $from: 'status' } },
        // No binding for SUBMIT: it keeps the key that SUBMIT already has.
        actions: {
          [OneputAction.SUBMIT]: { send: { type: 'INSERT' } },
          TOGGLE_DISPLAY_MODE: {
            send: { type: 'TOGGLE_DISPLAY_MODE' },
            binding: { bindings: ['$mod+d'], description: 'Toggle katex display mode' }
          }
        },
        inputSend: { send: { type: 'INSERT' } },
        menu: {
          id: 'katex',
          items: [
            { id: 'katex-preview', build: 'preview', params: { html: { $from: 'preview' } } },
            { id: 'katex-instructions', build: 'info', params: { text: { $from: 'help' } } },
            {
              id: 'katex-insert',
              build: 'insert',
              params: { enabled: { $from: 'canInsert' } },
              send: { type: 'INSERT' }
            },
            {
              id: 'katex-display-mode',
              build: 'displayMode',
              params: { on: { $from: 'displayMode' } },
              send: { type: 'TOGGLE_DISPLAY_MODE' }
            }
          ]
        },
        // The input is a katex editor, not a menu filter. With no menu item
        // focus, Enter writes a newline in the textarea.
        settings: {
          enableFilter: false,
          enableInputElement: true,
          enableMenuItemFocus: false,
          clearInputAfterAction: false
        }
      }
    },
    on: {
      BACK: { target: '.done', description: 'Leave the KaTeX demo.' },
      INPUT_CHANGED: {
        actions: { type: 'writeSource', params: ({ event }) => ({ value: event.value }) },
        description: 'Compile the typed source.'
      },
      TOGGLE_DISPLAY_MODE: {
        actions: 'toggleDisplayMode',
        description: 'Switch between inline and display mode.'
      },
      INSERT: {
        guard: 'canInsert',
        actions: ['insert', 'clearSource'],
        description: 'Put the valid formula in the page, then start a new one.'
      }
    },
    states: {
      editing: { description: 'Edit the formula.' },
      done: { type: 'final', description: 'The KaTeX demo finished.' }
    }
  });
}
