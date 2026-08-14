import type { Controller } from '@oneput/oneput';
import katex from 'katex';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { divider, menuItem } from '@oneput/oneput';
import { infoMenuItem } from '@oneput/oneput/shared/ui/menuItems/infoMenuItem.js';
import type { AppLayoutParams, AppObject, OneputProps, UIFlags } from '@oneput/oneput';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import { icons } from './_icons.js';

export class KatexDemo implements AppObject {
  static create(ctl: Controller) {
    return new KatexDemo(
      ctl,
      DynamicPlaceholder.create(ctl, (params) =>
        params.submitBinding
          ? `Type some katex and hit ${params.submitBinding}...`
          : 'Type some katex...'
      )
    );
  }

  private currentResult = '';
  private katexValid = true;
  private unsubscribeBindingsChange?: () => void;
  private helpMessage = 'Type some katex...';

  constructor(
    private ctl: Controller,
    private dynamicPlaceholder: DynamicPlaceholder,
    private previewDisplayMode: boolean = false
  ) {}

  layout = {
    params: {
      menuTitle: 'Katex Demo'
    } satisfies AppLayoutParams
  };

  settings = {
    enableMenuOpenClose: false,
    // The input is a katex editor, not a menu filter — this is a sync-rebuild
    // menu (menu() + invalidate), so disable the default filter channel.
    enableFilter: false
  } satisfies UIFlags;

  /**
   * Declarative menu: rebuilt from AppObject state whenever ctl.menu.invalidate()
   * is called (on input change, display-mode toggle, or bindings change).
   */
  menu = () => ({
    id: 'main',
    focusBehaviour: 'first' as const,
    items: this.buildMenuItems()
  });

  onExit = () => {
    this.unsubscribeBindingsChange?.();
  };

  /**
   * The katex preview is part of menu()'s output, so typing is just another
   * invalidate trigger: recompute state, then re-pull menu(). Wired by the
   * framework (sync-rebuild menu — no menuItemsFn, which is the generative channel).
   */
  onInputChange = () => {
    this.recompute();
    this.ctl.menu.invalidate();
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
        this.ctl.menu.invalidate();
      }
    );
    this.ctl.input.setPlaceholder(this.dynamicPlaceholder);
    this.ctl.input.focusInput();
    this.ctl.input.setSubmitHandler(() => {
      this.insertKatex();
    });
    // Set up katex state; menu() is pulled by the framework after onStart (afterRun).
    this.recompute();
  }

  /**
   * Recompute katex state from the current input and refresh the input UI.
   * Does NOT touch the menu — call ctl.menu.invalidate() to re-render items.
   */
  private recompute() {
    if (this.ctl.input.getInputValue().trim() === '') {
      this.currentResult = '';
      this.katexValid = true;
      this.syncChrome();
      return;
    }
    try {
      this.currentResult = katex.renderToString(this.ctl.input.getInputValue(), {
        displayMode: this.previewDisplayMode,
        throwOnError: true,
        output: 'mathml',
        errorColor: 'red'
      });
      this.katexValid = true;
      this.ctl.clearNotifications();
      this.syncChrome();
    } catch (err) {
      this.katexValid = false;
      this.syncChrome();
      this.ctl.notify('Invalid katex: ' + (err as Error).message, { duration: 3000 });
    }
  }

  /**
   * Give insert to the layout as its `inputSend` affordance. Then set the
   * app's own input chrome again.
   *
   * Order matters: `ctl.ui.update` rebuilds `inputUI` from the layout, so
   * `renderInputUI` must run after it.
   */
  private syncChrome() {
    this.ctl.ui.update({
      params: {
        inputSend: {
          run: () => this.insertKatex(),
          enabled: this.canInsert()
        }
      } satisfies AppLayoutParams
    });
    this.renderInputUI();
  }

  /** Insert needs valid katex and something to insert. */
  private canInsert() {
    return this.katexValid && this.ctl.input.getInputValue().trim() !== '';
  }

  /**
   * Build the menu items from current AppObject state. Pure with respect to the
   * menu: reads this.currentResult / katexValid / helpMessage / previewDisplayMode.
   */
  private buildMenuItems() {
    return [
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
              fontSize: this.currentResult ? '150%' : '100%',
              display: 'inline-block'
            },
            innerHTMLUnsafe: this.currentResult || '(preview)'
          }
        ]
      }),
      infoMenuItem({ id: 'katex-instructions', msg: this.helpMessage, icon: icons.Info }),
      divider(),
      checkboxMenuItem({
        id: 'katex-display-mode-checkbox',
        action: (_, checked) => {
          this.previewDisplayMode = checked;
          this.recompute();
          // focusBehaviour 'none' keeps the focused index on the checkbox.
          this.ctl.menu.invalidate({ focusBehaviour: 'none' });
        },
        textContent: 'Display mode',
        checked: this.previewDisplayMode
      })
    ];
  }

  /**
   * App-owned input chrome. `right` belongs to the layout (the send button),
   * so it stays untouched here — invalid katex shows as a disabled send.
   */
  private renderInputUI() {
    this.ctl.ui.setInputUI((current) => {
      return {
        ...current,
        textArea: { rows: 5 }
      } satisfies OneputProps['inputUI'];
    });
  }

  private insertKatex = () => {
    document.getElementById('katex-demo')!.innerHTML += `<p>${katex.renderToString(
      this.ctl.input.getInputValue(),
      {
        displayMode: false,
        throwOnError: true,
        output: 'mathml',
        errorColor: 'red'
      }
    )}</p>`;
    this.ctl.input.setInputValue('');
    this.recompute();
    this.ctl.menu.invalidate();
  };
}
