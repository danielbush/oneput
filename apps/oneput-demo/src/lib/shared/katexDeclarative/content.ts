import { menuItem } from '@oneput/oneput';
import { rowBuilder, slot } from '@oneput/oneput/shared/declarative/interpreter.js';
import { infoRow, standardRow } from '@oneput/oneput/shared/declarative/standardRow.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { toggleMenuItem } from '@oneput/oneput/shared/ui/menuItems/toggleMenuItem.js';
import type { SafeHtml } from '@oneput/safe-html';

export type KatexContext = {
  source: string;
  /** Display mode: a block formula, or an inline one in a paragraph. */
  displayMode: boolean;
  /**
   * The last valid formula. Null when the source is empty. While the source
   * is invalid, it is the formula before the error.
   */
  preview: SafeHtml | null;
  /** The error of the current source, if any. */
  error: string | null;
};

/** True when the current source is valid: a preview, and no error. */
export function canInsert(context: KatexContext) {
  return context.preview !== null && context.error === null;
}

type KatexSnapshot = { context: KatexContext };

/**
 * The preview row stands for the input (INPUT_ROW): it has no action, thus
 * while it has menu focus, Enter writes a newline in the textarea.
 */
export const previewRowId = 'katex-preview';

/**
 * The view sources for the declarative KaTeX demo. All of them read the
 * machine's snapshot. The row builders draw from the values they get, and the
 * menu rebuilds on each change, so no row keeps state of its own.
 */
export function createContent() {
  return {
    slot: {
      source: ({ context }: KatexSnapshot) => context.source,
      preview: ({ context }: KatexSnapshot) => context.preview,
      canInsert: ({ context }: KatexSnapshot) => canInsert(context),
      displayMode: ({ context }: KatexSnapshot) => context.displayMode,
      help: ({ context }: KatexSnapshot) =>
        context.error === null
          ? 'Type some katex, then insert it with Send...'
          : `Invalid katex: ${context.error}`,
      status: ({ context }: KatexSnapshot) => (context.error === null ? '' : '⚠️ Invalid katex')
    },
    menu: {},
    menuItem: {
      default: standardRow,
      info: infoRow,
      // One isolated formula, centered in both modes. `htmlContent` paints
      // again on each rebuild. See shared/katex/katex.css.
      preview: rowBuilder({
        params: { html: slot<SafeHtml | null>() },
        build: ({ id, params: { html } }) =>
          menuItem({
            id,
            type: 'vflex',
            class: 'katex-preview-pane',
            style: { overflow: 'auto', display: 'block', textAlign: 'center' },
            children: [
              {
                id: `${id}-formula`,
                type: 'fchild',
                style: {
                  padding: '1rem',
                  fontSize: html ? '150%' : '100%',
                  display: 'inline-block'
                },
                ...(html ? { htmlContent: html } : { textContent: '(preview)' })
              }
            ]
          })
      }),
      // Disabled while there is nothing valid to insert.
      insert: rowBuilder({
        params: { enabled: slot<boolean>() },
        build: ({ id, params: { enabled } }, activate) =>
          stdMenuItem({
            id,
            textContent: 'Insert',
            left: (b) => [b.icon('ArrowUp')],
            attr: { disabled: !enabled },
            closeMenuOnAction: false,
            action: activate
          })
      }),
      displayMode: rowBuilder({
        params: { on: slot<boolean>() },
        build: ({ id, params: { on } }, activate) =>
          toggleMenuItem({
            id,
            label: 'Display mode',
            values: ['Off', 'On'],
            index: on ? 1 : 0,
            onToggle: () => activate?.(),
            bottom: false
          })
      })
    }
  };
}

export type KatexContent = ReturnType<typeof createContent>;
