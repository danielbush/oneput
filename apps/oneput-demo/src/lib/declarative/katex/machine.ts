import type { DemoDocument } from '../../main/FormulaMarkup.js';
import { formulaEditor } from './actions.js';

/** Edit a formula in the textarea, preview it, and insert accepted markup. */
export function createKatexMachine(doc: DemoDocument) {
  return formulaEditor(doc).createMachine({
    id: 'katex-demo',
    description: 'Edit, preview and insert a formula.',
    initial: 'ready',
    context: { source: '', displayMode: false, preview: null, error: null },
    states: {
      ready: {
        description: 'Keep the formula editor and its controls in view.',
        initial: 'previewing',
        meta: {
          view: {
            title: 'Katex Demo',
            menu: {
              id: 'main',
              focusBehaviour: 'none',
              items: [
                {
                  id: 'katex-preview-pane',
                  text: '(preview)',
                  html: { from: 'formulaPreview' }
                },
                {
                  id: 'katex-instructions',
                  text: 'Type some katex...',
                  kind: 'info',
                  icon: 'Info'
                },
                { id: 'katex-divider', kind: 'divider' },
                {
                  id: 'katex-insert',
                  text: 'Insert',
                  icon: 'ArrowUp',
                  binding: 'ONEPUT__SUBMIT',
                  send: { type: 'INSERT_FORMULA', focusInput: true },
                  enabled: { from: 'canInsert' }
                },
                {
                  id: 'katex-display-mode-checkbox',
                  text: 'Display mode',
                  binding: 'TOGGLE_DISPLAY_MODE',
                  checked: { from: 'displayMode' },
                  send: { type: 'TOGGLE_DISPLAY_MODE' }
                }
              ]
            },
            input: {
              kind: 'editor',
              layout: { kind: 'textarea', rows: 5 },
              value: { from: 'formulaSource' },
              placeholder: 'Type some katex...',
              submit: { send: { type: 'INSERT_FORMULA' }, enabled: { from: 'canInsert' } }
            },
            settings: {
              enableFilter: false,
              enableGoBack: true,
              enableInputElement: true,
              enableMenuOpenClose: false,
              enableMenuItemFocus: true,
              clearInputAfterAction: false
            }
          }
        },
        on: {
          STARTED: {
            actions: 'startInput',
            description: 'Read the starting input and focus the textarea.'
          },
          EXITED: {
            actions: 'stopInput',
            description: 'Stop listening for input focus.'
          },
          INPUT_CHANGED: {
            target: '.checking',
            actions: 'writeSource',
            description: 'Check the new formula text.'
          },
          TOGGLE_DISPLAY_MODE: {
            target: '.checking',
            actions: 'toggleDisplayMode',
            description: 'Render the formula in the other display mode.'
          },
          INSERT_FORMULA: {
            guard: 'canInsert',
            target: '.previewing',
            actions: ['insertFormula', 'clearFormula', 'reportInsertion'],
            description: 'Insert the accepted formula and clear the textarea.'
          },
          ITEM_FOCUSED: [
            {
              guard: 'keyboardFocusedPreview',
              actions: 'focusInput',
              description: 'Focus the textarea when the keyboard selects the preview.'
            },
            {
              guard: 'keyboardFocusedRow',
              actions: 'blurInput',
              description: 'Blur the textarea when the keyboard selects another row.'
            }
          ]
        },
        states: {
          previewing: {
            description: 'Show the accepted formula or the empty preview.'
          },
          checking: {
            description: 'Compile and check the formula before publishing a view.',
            entry: 'compileFormula',
            always: [
              {
                guard: 'hasError',
                target: 'invalid',
                description: 'Show the error on the preview row.'
              },
              {
                target: 'previewing',
                description: 'Show the current result.'
              }
            ]
          },
          invalid: {
            description: 'Keep the last accepted preview and show the error until the next edit.',
            meta: {
              view: {
                menu: {
                  items: [{ id: 'katex-preview-pane', detail: { from: 'formulaError' } }]
                }
              }
            }
          }
        }
      }
    }
  });
}
