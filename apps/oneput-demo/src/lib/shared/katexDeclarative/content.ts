import { menuItem } from '@oneput/oneput';
import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import {
  rowBuilder,
  slot,
  type ViewContext
} from '@oneput/oneput/shared/declarative/interpreter.js';
import { dividerRow, infoRow, standardRow } from '@oneput/oneput/shared/declarative/standardRow.js';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
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
 * machine's snapshot; the key sources and hints also read the active keys from
 * the context, so a rebind redraws them. The row builders draw from the values they get, and the
 * menu rebuilds on each change, so no row keeps state of its own.
 */
export function createContent() {
  return {
    slot: {
      source: ({ context }: KatexSnapshot) => context.source,
      preview: ({ context }: KatexSnapshot) => context.preview,
      canInsert: ({ context }: KatexSnapshot) => canInsert(context),
      displayMode: ({ context }: KatexSnapshot) => context.displayMode,
      placeholder: (_: KatexSnapshot, { bindingOf }: ViewContext) => {
        const key = bindingOf(OneputAction.SUBMIT);
        return key ? `Type some katex and hit ${key}...` : 'Type some katex...';
      },
      help: ({ context }: KatexSnapshot, { bindingOf }: ViewContext) => {
        if (context.error !== null) return `Invalid katex: ${context.error}`;
        const key = bindingOf(OneputAction.SUBMIT);
        return key
          ? `Type some katex, then insert it with ${key} or Send...`
          : 'Type some katex, then insert it with Send...';
      },
      submitKey: (_: KatexSnapshot, { bindingOf }: ViewContext) => bindingOf(OneputAction.SUBMIT),
      displayModeKey: (_: KatexSnapshot, { bindingOf }: ViewContext) =>
        bindingOf('TOGGLE_DISPLAY_MODE'),
      status: ({ context }: KatexSnapshot) => (context.error === null ? '' : '⚠️ Invalid katex')
    },
    menuItem: {
      default: standardRow,
      info: infoRow,
      divider: dividerRow,
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
        params: { enabled: slot<boolean>(), hint: slot<string | undefined>() },
        build: ({ id, params: { enabled, hint } }, activate) =>
          stdMenuItem({
            id,
            textContent: 'Insert',
            left: (b) => [b.icon('ArrowUp')],
            bindingHint: hint,
            attr: { disabled: !enabled },
            closeMenuOnAction: false,
            action: activate
          })
      }),
      displayMode: rowBuilder({
        params: { on: slot<boolean>(), hint: slot<string | undefined>() },
        build: ({ id, params: { on, hint } }, activate) =>
          checkboxMenuItem({
            id,
            textContent: 'Display mode',
            checked: on,
            bindingHint: hint,
            action: () => activate?.()
          })
      })
    }
  };
}

export type KatexContent = ReturnType<typeof createContent>;
