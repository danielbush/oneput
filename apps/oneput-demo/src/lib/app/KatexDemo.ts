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
import { cell, divider, menuItem, type Cell } from '@oneput/oneput';
import { infoMenuItem } from '@oneput/oneput/shared/ui/menuItems/infoMenuItem.js';
import type { AppActions, AppLayoutParams, AppObject, OneputProps, UIFlags } from '@oneput/oneput';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import { icons } from './_icons.js';

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

/** The formula being edited, and inserting it. App logic: no Oneput. */
export class KatexFormula {
  /**
   * Display mode: a block formula, or an inline one in a paragraph. The
   * preview shows the same mode.
   *
   * A cell, because two things change it: the checkbox and a key binding.
   * `set` updates the checkbox in both cases.
   */
  readonly displayMode: Cell<boolean>;
  private source = '';
  private rendered = '';
  private parseError?: string;

  constructor(
    private doc: DemoDocument,
    displayMode = false
  ) {
    this.displayMode = cell(displayMode);
  }

  /** Set the katex source, then render it. */
  setSource(source: string) {
    this.source = source;
    this.render();
  }

  setDisplayMode(value: boolean) {
    this.displayMode.set(value);
    this.render();
  }

  /**
   * Rendered HTML of the formula. Empty when the source is empty. While the
   * source is invalid, it is the last valid render, so the preview does not
   * flicker as you type.
   */
  get preview() {
    return this.rendered;
  }

  /** The parse error of the current source, if any. */
  get error() {
    return this.parseError;
  }

  /** True when there is valid katex to insert. */
  canInsert() {
    return this.parseError === undefined && this.source.trim() !== '';
  }

  /**
   * Put the formula in the document, then start a new, empty one.
   *
   * Returns false, and does nothing, when `canInsert()` is false.
   *
   * Display mode gives a block formula in a `.katex-display` wrapper, which
   * katex.css puts on its own line and centers. Thus we do not put it in a
   * paragraph. Inline mode gives a formula that flows with text, so a
   * paragraph is correct.
   */
  insert(): boolean {
    if (!this.canInsert()) return false;
    this.doc.append(this.displayMode.get() ? this.rendered : `<p>${this.rendered}</p>`);
    this.setSource('');
    return true;
  }

  private render() {
    if (this.source.trim() === '') {
      this.rendered = '';
      this.parseError = undefined;
      return;
    }
    try {
      this.rendered = katex.renderToString(this.source, {
        displayMode: this.displayMode.get(),
        throwOnError: true
      });
      this.parseError = undefined;
    } catch (err) {
      // Keep the last valid render as the preview.
      this.parseError = (err as Error).message;
    }
  }
}

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
  private helpMessage = 'Type some katex...';

  constructor(
    private ctl: Controller,
    private dynamicPlaceholder: DynamicPlaceholder,
    private formula: KatexFormula
  ) {}

  layout = {
    params: {
      menuTitle: 'Katex Demo'
    } satisfies AppLayoutParams
  };

  /**
   * UI controls call these actions, and the actions call the model. Thus the
   * AppObject needs no method per action.
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
        this.show();
        return true;
      }
    },
    // From the key binding or the checkbox.
    TOGGLE_DISPLAY_MODE: {
      action: () => {
        this.formula.setDisplayMode(!this.formula.displayMode.get());
        // focusBehaviour 'none' keeps the focused index where it is.
        this.show({ focusBehaviour: 'none' });
      },
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
    // The menu is a preview pane with one incidental control, not a chooser.
    // Turning the synthetic focus off frees Enter for newlines in the textarea
    // and tells the user that the checkbox needs a click. See ENTER_SEMANTICS.
    enableMenuItemFocus: false
  } satisfies UIFlags;

  /** Declarative menu: built again from the formula on each invalidate. */
  menu = () => ({
    id: 'main',
    focusBehaviour: 'first' as const,
    items: [
      // The preview shows one isolated formula, thus it stays centered in both
      // modes. Display mode changes the katex itself: larger fractions, and sum
      // limits above and below the operator.
      menuItem({
        id: 'katex-preview-pane',
        type: 'vflex',
        ignored: true,
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
              fontSize: this.formula.preview ? '150%' : '100%',
              display: 'inline-block'
            },
            innerHTMLUnsafe: this.formula.preview || '(preview)'
          }
        ]
      }),
      infoMenuItem({ id: 'katex-instructions', msg: this.helpMessage, icon: icons.Info }),
      divider(),
      checkboxMenuItem({
        id: 'katex-display-mode-checkbox',
        // The checkbox is controlled, so its next value is always the toggle.
        action: () => this.actions.TOGGLE_DISPLAY_MODE.action(),
        textContent: 'Display mode',
        bindingHint: this.ctl.keys.getCurrentBindings().TOGGLE_DISPLAY_MODE?.bindings[0],
        source: this.formula.displayMode
      })
    ]
  });

  onExit = () => {
    this.unsubscribeBindingsChange?.();
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
    this.ctl.input.setPlaceholder(this.dynamicPlaceholder);
    this.ctl.input.focusInput();
    this.formula.setSource(this.ctl.input.getInputValue());
    // menu() is pulled by the framework after onStart (afterRun).
    this.syncChrome();
  }

  /**
   * The katex preview is part of menu()'s output, so typing is just another
   * invalidate trigger. Wired by the framework (sync-rebuild menu — no
   * menuItemsFn, which is the generative channel).
   */
  onInputChange = () => {
    this.formula.setSource(this.ctl.input.getInputValue());
    this.show();
  };

  /** Show the formula's state: input chrome, error notification and menu. */
  private show(opts?: Parameters<Controller['menu']['invalidate']>[0]) {
    this.syncChrome();
    const error = this.formula.error;
    if (error) {
      this.ctl.notify('Invalid katex: ' + error, { duration: 3000 });
    } else {
      this.ctl.clearNotifications();
    }
    void this.ctl.menu.invalidate(opts);
  }

  /**
   * Give insert to the layout as its `inputSend` affordance. Then set the
   * app's own input chrome again.
   *
   * Order matters: `ctl.ui.update` rebuilds `inputUI` from the layout, so
   * `setInputUI` must run after it.
   */
  private syncChrome() {
    this.ctl.ui.update({
      params: {
        inputSend: {
          run: () => this.actions[OneputAction.SUBMIT].action(),
          enabled: this.formula.canInsert()
        }
      } satisfies AppLayoutParams
    });
    this.ctl.ui.setInputUI((current) => {
      return {
        ...current,
        textArea: { rows: 5 }
      } satisfies OneputProps['inputUI'];
    });
  }
}
