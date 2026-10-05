/**
 * Katex demo: type katex, see a preview, insert it in the page.
 *
 * This file shows how to structure an app that does not need a PROVIDER (see
 * PROVIDER_WHEN in `packages/oneput/docs/CONCEPTS.md`):
 *
 * - `KatexFormula` is the model: the app logic. It does not know about Oneput.
 *   It writes to the page only through `DemoDocument`.
 * - `DemoDocument` is the infrastructure wrapper for the page (nullables).
 * - `KatexDemo` is the AppObject: the UI adapter. It shows the model's state
 *   and calls the model on user events. It holds no rules.
 *
 * Both are in one file because the demo is small.
 */
import type { Controller } from '@oneput/oneput';
import katex from 'katex';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { divider, menuItem } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { infoMenuItem } from '@oneput/oneput/shared/ui/menuItems/infoMenuItem.js';
import type { AppActions, AppLayoutParams, AppObject, UIFlags } from '@oneput/oneput';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import { icons } from './_icons.js';
import { derived, get, writable, type Readable, type Writable } from 'svelte/store';
import './KatexDemo.css';

/**
 * The page that the demo inserts formulas into.
 *
 * Infrastructure wrapper: `create()` appends to `#katex-demo`. `createNull()`
 * appends to nothing, and `trackAppends()` shows what was appended.
 */
export class DemoDocument {
  static create() {
    return new DemoDocument((html) => {
      document.getElementById('katex-demo')!.innerHTML += html;
    });
  }

  static createNull() {
    return new DemoDocument();
  }

  private appended: string[] = [];

  private constructor(private write?: (html: string) => void) {}

  append(html: string) {
    this.appended.push(html);
    this.write?.(html);
  }

  trackAppends() {
    return { data: this.appended };
  }
}

/** The result of compiling katex source. */
type RenderResult =
  | { empty: true } // nothing typed
  | { html: string } // valid katex
  | { error: string }; // invalid katex

/**
 * Turn katex source into HTML. Pure: it sets no fields and does not touch the
 * page.
 */
function renderToString(source: string, displayMode: boolean): RenderResult {
  if (source.trim() === '') return { empty: true };
  try {
    return { html: katex.renderToString(source, { displayMode, throwOnError: true }) };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

type FormulaState = { source: string; displayMode: boolean };

/** What the UI reads from the formula. */
export type FormulaView = {
  source: string;
  /**
   * Display mode: a block formula, or an inline one in a paragraph. The
   * preview shows the same mode.
   */
  displayMode: boolean;
  /**
   * Rendered HTML of the formula. Empty when the source is empty. While the
   * source is invalid, it is the last valid render, so the preview does not
   * flicker as you type.
   */
  preview: string;
  /** The parse error of the current source, if any. */
  error?: string;
  /** True when there is valid katex to insert. */
  canInsert: boolean;
};

/**
 * The formula being edited, and inserting it. App logic: no Oneput.
 *
 * The state is one Svelte store (plain JS, no Svelte compiler). Every change
 * notifies `subscribe`, and the listener reads `current`. See REFRESH_PATTERN
 * in `packages/oneput/docs/CONCEPTS.md`.
 */
export class KatexFormula {
  private state: Writable<FormulaState>;
  private lastValid = '';
  private view: Readable<FormulaView>;
  /** The current view. */
  get current(): FormulaView {
    return get(this.view);
  }

  constructor(
    private doc: DemoDocument,
    displayMode = false
  ) {
    this.state = writable({ source: '', displayMode });
    this.view = derived(this.state, ({ source, displayMode }) => {
      const compiled = renderToString(source, displayMode);
      if ('empty' in compiled) this.lastValid = '';
      else if ('html' in compiled) this.lastValid = compiled.html;
      return {
        source,
        displayMode,
        preview: this.lastValid,
        error: 'error' in compiled ? compiled.error : undefined,
        canInsert: 'html' in compiled
      };
    });
  }

  /**
   * Call `onChange` on each change. Like all Svelte stores, it also calls it
   * once at once.
   */
  subscribe = (onChange: () => void) => this.view.subscribe(() => onChange());

  setSource(source: string) {
    this.state.update((s) => ({ ...s, source }));
  }

  toggleDisplayMode() {
    this.state.update((s) => ({ ...s, displayMode: !s.displayMode }));
  }

  /**
   * Put the formula in the document, then start a new, empty one.
   *
   * Returns false, and does nothing, when `canInsert` is false.
   *
   * Display mode gives a block formula in a `.katex-display` wrapper, which
   * katex.css puts on its own line and centers. Thus we do not put it in a
   * paragraph. Inline mode gives a formula that flows with text, so a
   * paragraph is correct.
   */
  insert(): boolean {
    const { canInsert, displayMode, preview } = this.current;
    if (!canInsert) return false;
    this.doc.append(displayMode ? preview : `<p>${preview}</p>`);
    this.setSource('');
    return true;
  }
}

const PREVIEW_ID = 'katex-preview-pane';

/** The UI adapter over `KatexFormula`. */
export class KatexDemo implements AppObject {
  static create(ctl: Controller) {
    return new KatexDemo(
      ctl,
      DynamicPlaceholder.create(ctl, (params) =>
        params.submitBinding
          ? `Type some katex and hit ${params.submitBinding}...`
          : 'Type some katex...'
      ),
      new KatexFormula(DemoDocument.create())
    );
  }

  private unsubscribeBindingsChange?: () => void;
  private unsubscribeInputFocus?: () => void;
  private helpMessage = 'Type some katex...';

  constructor(
    private ctl: Controller,
    private dynamicPlaceholder: DynamicPlaceholder,
    private formula: KatexFormula
  ) {}

  layout = {
    params: {
      menuTitle: 'Katex Demo',
      inputTextArea: { rows: 5 },
      // The Send button runs the SUBMIT action. `enabled` is read each time
      // the layout builds, so a change only needs `ctl.ui.invalidate()`.
      inputSend: {
        run: () => this.actions[OneputAction.SUBMIT].action(),
        enabled: () => this.formula.current.canInsert
      }
    } satisfies AppLayoutParams
  };

  /**
   * UI controls call these actions, and the actions call the model. The model
   * notifies, and Oneput refreshes the UI (`watch`). Thus the AppObject needs no method
   * per action, and no action refreshes the UI itself.
   */
  actions = {
    // SUBMIT_PATTERN
    // No binding: this replaces what the default SUBMIT binding ($mod+Enter)
    // does while this app runs. The binding itself stays, so a rebind in the
    // BindingsEditor still works, and the placeholder still shows it.
    //
    // From the submit key or the Send button. Returns false when there is
    // nothing to insert. For the key, that declines it, so the browser keeps
    // its default.
    [OneputAction.SUBMIT]: {
      action: () => {
        if (!this.formula.insert()) return false;
        this.ctl.input.setInputValue('');
        return true;
      }
    },
    // From the key binding or the checkbox.
    TOGGLE_DISPLAY_MODE: {
      action: () => this.formula.toggleDisplayMode(),
      binding: {
        bindings: ['$mod+d'],
        description: 'Toggle katex display mode'
      }
    }
  } satisfies AppActions;

  settings = {
    enableMenuOpenClose: false,
    // The input is a katex editor, not a menu filter — this is a sync-rebuild
    // menu (menu() + invalidate), so disable the default filter channel.
    enableFilter: false,
    clearInputAfterAction: false,
    // Menu item focus stays on. The preview row stands for the input: it has
    // no action, thus while it has focus, Enter falls through to the textarea
    // and writes a newline. On the checkbox row, Enter toggles it. See
    // INPUT_ROW in ENTER_SEMANTICS.
    enableMenuItemFocus: true
  } satisfies UIFlags;

  /**
   * Oneput refreshes the UI on each change to the formula: it calls
   * `onRefresh`, then reads the layout, `menu()` and actions again. See
   * REFRESH_PATTERN .
   */
  watch = () => [this.formula];

  /** The only part of the UI that Oneput cannot derive: the error notification. */
  onRefresh = () => {
    const { error } = this.formula.current;
    if (error) {
      this.ctl.notify('Invalid katex: ' + error, { duration: 3000 });
    } else {
      this.ctl.clearNotifications();
    }
  };

  /** Declarative menu: built again from the formula on each invalidate. */
  menu = () => {
    const { preview, canInsert } = this.formula.current;
    return {
      id: 'main',
      focusBehaviour: 'first' as const,
      items: [
        // The preview shows one isolated formula, thus it stays centered in both
        // modes. Display mode changes the katex itself: larger fractions, and sum
        // limits above and below the operator.
        // INPUT_ROW: focusable, with no action (see onMenuItemFocus). Its own
        // `class` gives it its own focus style (CUSTOM_ROW_FOCUS, see
        // KatexDemo.css).
        menuItem({
          id: PREVIEW_ID,
          type: 'vflex',
          class: 'katex-preview-pane',
          style: {
            overflow: 'auto',
            display: 'block',
            textAlign: 'center'
          },
          children: [
            {
              id: 'katex-preview',
              type: 'fchild',
              style: {
                padding: '1rem',
                fontSize: preview ? '150%' : '100%',
                display: 'inline-block'
              },
              innerHTMLUnsafe: preview || '(preview)'
            }
          ]
        }),
        infoMenuItem({ id: 'katex-instructions', msg: this.helpMessage, icon: icons.Info }),
        divider(),
        stdMenuItem({
          id: 'katex-insert',
          textContent: 'Insert',
          left: (b) => [b.icon(icons.ArrowUp)],
          bindingHint: this.ctl.keys.getCurrentBindings()[OneputAction.SUBMIT]?.bindings[0],
          // Disabled rows cannot get menu focus, and a refresh builds the
          // row again when `canInsert` changes.
          attr: { disabled: !canInsert },
          closeMenuOnAction: false,
          action: () => {
            this.actions[OneputAction.SUBMIT].action();
            // Back to typing: rule 3 then puts menu focus on the preview.
            this.ctl.input.focus();
          }
        }),
        checkboxMenuItem({
          id: 'katex-display-mode-checkbox',
          // The checkbox is controlled, so its next value is always the toggle.
          action: () => this.actions.TOGGLE_DISPLAY_MODE.action(),
          textContent: 'Display mode',
          bindingHint: this.ctl.keys.getCurrentBindings().TOGGLE_DISPLAY_MODE?.bindings[0],
          source: {
            get: () => this.formula.current.displayMode,
            subscribe: this.formula.subscribe
          }
        })
      ]
    };
  };

  /**
   * INPUT_ROW rules 1 and 2, for keyboard focus only. Pointer hover and
   * invalidate also move menu focus, and they must not take the input away
   * while the user types.
   *
   * 1. The preview row focuses the input.
   * 2. Every other row blurs the input.
   */
  onMenuItemFocus: AppObject['onMenuItemFocus'] = ({ menuItem, cause }) => {
    if (cause !== 'keyboard') return;
    if (menuItem?.id === PREVIEW_ID) this.ctl.input.focus();
    else this.ctl.input.blur();
  };

  onExit = () => {
    this.unsubscribeBindingsChange?.();
    this.unsubscribeInputFocus?.();
  };

  onStart() {
    this.unsubscribeBindingsChange?.();
    this.unsubscribeBindingsChange = this.ctl.events.on(
      'bindings-change',
      ({ bindings: currentBindings }) => {
        const binding = currentBindings[OneputAction.SUBMIT]?.bindings[0];
        this.helpMessage = binding
          ? `Type some katex and hit ${binding} to insert... `
          : 'Type some katex...';
        void this.ctl.menu.invalidate();
      }
    );
    // INPUT_ROW rule 3: focus on the input puts menu focus on the preview.
    // onMenuItemFocus ignores this programmatic cause, thus no loop.
    this.unsubscribeInputFocus?.();
    this.unsubscribeInputFocus = this.ctl.input.subscribeFocusChange((focused) => {
      if (focused) this.ctl.menu.focusMenuItemById(PREVIEW_ID);
    });
    this.ctl.input.setPlaceholder(this.dynamicPlaceholder);
    this.ctl.input.focusInput();
    this.formula.setSource(this.ctl.input.getInputValue());
  }

  /**
   * Typing changes the model, and the model notifies. Wired by the framework
   * (sync-rebuild menu — no menuItemsFn, which is the generative channel).
   */
  onInputChange = () => {
    this.formula.setSource(this.ctl.input.getInputValue());
  };
}
