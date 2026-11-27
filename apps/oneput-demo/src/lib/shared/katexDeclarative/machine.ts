import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import type { DemoDocument } from '../katex/katex.js';
import { emptyFormula, katexActions } from './actions.js';
import { previewRowId } from './content.js';

/**
 * Type katex, see a preview, and insert the formula in the page. Insert is
 * the SUBMIT action ($mod+Enter), the Send button and the Insert row; it runs
 * only while the formula is valid. The machine controls the input text, so it
 * clears the input after an insert.
 *
 * Focus is in the states (INPUT_ROW): `typing` focuses the textarea and the
 * preview row, and Enter writes a newline; `browsingMenu` blurs the textarea,
 * so Enter runs the focused row. `typing` stays on a blur: a blur can come
 * from the browser, not the user. A command such as an insert from the
 * Insert row ends in `typing`, and the adapter applies the state's focus
 * again after each command, thus the textarea gets focus again.
 */
export function createKatexMachine(doc: DemoDocument) {
  return katexActions(doc).createMachine({
    id: 'katex',
    description: 'Edit a katex formula and insert it in the page.',
    initial: 'typing',
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
            { id: previewRowId, build: 'preview', params: { html: { $from: 'preview' } } },
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
        // The input is a katex editor, not a menu filter.
        settings: {
          enableFilter: false,
          enableInputElement: true,
          enableMenuItemFocus: true,
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
        target: '.typing',
        actions: ['insert', 'clearSource'],
        description: 'Put the valid formula in the page, then type a new one.'
      }
    },
    states: {
      typing: {
        description: 'Type the formula: the textarea and the preview row have focus.',
        meta: {
          view: {
            inputFocus: 'focused',
            menu: { focusItem: previewRowId },
            // Enter declines, thus the textarea writes a newline, also when
            // pointer hover moved menu focus to a row.
            actions: { [OneputAction.DO_ACTION]: {} }
          }
        },
        on: {
          ITEM_FOCUSED: {
            guard: 'keyboardOnOtherRow',
            target: 'browsingMenu',
            description: 'The keyboard moved to a row with an action.'
          }
          // No transition on a blur: the browser also blurs the textarea when
          // the window loses focus, or when the input element changes from
          // `input` to `textarea` as this demo starts.
        }
      },
      browsingMenu: {
        description: 'Use the rows: the textarea is blurred, so Enter runs the focused row.',
        meta: { view: { inputFocus: 'blurred' } },
        on: {
          ITEM_FOCUSED: {
            guard: 'keyboardOnPreview',
            target: 'typing',
            description: 'The keyboard moved back to the preview row.'
          },
          INPUT_FOCUS_CHANGED: {
            guard: 'inputFocused',
            target: 'typing',
            description: 'The user focused the textarea.'
          }
        }
      },
      done: { type: 'final', description: 'The KaTeX demo finished.' }
    }
  });
}
