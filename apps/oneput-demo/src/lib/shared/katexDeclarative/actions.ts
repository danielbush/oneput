import type { SafeHtml } from '@oneput/safe-html';
import type { ViewFor } from '@oneput/oneput/shared/declarative/interpreter.js';
import type { OneputEvent } from '@oneput/oneput/shared/declarative/oneputEvents.js';
import { assign, setup } from 'xstate';
import { viewLayouts } from '../../common/layout.js';
import { renderFormula, type DemoDocument } from '../katex/katex.js';
import { canInsert, previewRowId, type KatexContent, type KatexContext } from './content.js';

/** The events that the rows, the actions and the Send button send. */
export type KatexEvent = { type: 'INSERT' } | { type: 'TOGGLE_DISPLAY_MODE' };
type KatexView = ViewFor<KatexContent, typeof viewLayouts, KatexEvent>;

/** The formula with no source: nothing to show or insert. */
export const emptyFormula: KatexContext = {
  source: '',
  displayMode: false,
  preview: null,
  error: null
};

/**
 * Compile `source`. While it is invalid, the preview keeps the last valid
 * formula, so it does not flicker as the user types.
 */
function compile(
  doc: DemoDocument,
  source: string,
  displayMode: boolean,
  lastPreview: SafeHtml | null
): KatexContext {
  const result = renderFormula(source, displayMode, doc);
  if ('empty' in result) return { ...emptyFormula, source, displayMode };
  if ('html' in result) {
    return { source, displayMode, preview: result.html, error: null };
  }
  return { source, displayMode, preview: lastPreview, error: result.error };
}

/** Link the named operations to the page that accepted formulas go in. */
export function katexActions(doc: DemoDocument) {
  return setup({
    types: {
      context: {} as KatexContext,
      events: {} as OneputEvent | KatexEvent,
      meta: {} as { view?: KatexView }
    },
    guards: {
      canInsert: ({ context }) => canInsert(context),
      // Keyboard focus only: pointer hover and Oneput's own focus moves must
      // not take the input away while the user types.
      keyboardOnPreview: ({ event }) =>
        event.type === 'ITEM_FOCUSED' && event.cause === 'keyboard' && event.id === previewRowId,
      keyboardOnOtherRow: ({ event }) =>
        event.type === 'ITEM_FOCUSED' && event.cause === 'keyboard' && event.id !== previewRowId,
      inputFocused: ({ event }) => event.type === 'INPUT_FOCUS_CHANGED' && event.focused
    },
    actions: {
      writeSource: assign(({ context }, params: { value: string }) =>
        compile(doc, params.value, context.displayMode, context.preview)
      ),
      toggleDisplayMode: assign(({ context }) =>
        compile(doc, context.source, !context.displayMode, context.preview)
      ),
      // The `canInsert` guard runs first; the check narrows the type.
      insert: ({ context }) => {
        if (context.preview) doc.append(context.preview, context.displayMode);
      },
      clearSource: assign(({ context }) => ({ ...emptyFormula, displayMode: context.displayMode }))
    }
  });
}
