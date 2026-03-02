import type { Controller } from '@oneput/oneput';
import katex from 'katex';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { divider, hflex, menuItem } from '@oneput/oneput';
import { infoMenuItem } from '@oneput/oneput/shared/ui/menuItems/infoMenuItem.js';
import type { AppObject, OneputProps } from '@oneput/oneput';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
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

  onExit = () => {
    this.unsubscribeBindingsChange?.();
  };

  private unsubscribeBindingsChange?: () => void;
  private helpMessage = 'Type some katex...';

  constructor(
    private ctl: Controller,
    private dynamicPlaceholder: DynamicPlaceholder,
    private previewDisplayMode: boolean = false
  ) {}

  onStart() {
    this.run();
  }

  run() {
    this.unsubscribeBindingsChange?.();
    this.unsubscribeBindingsChange = this.ctl.events.on('bindings-change', ({ isLocal }) => {
      if (!isLocal) {
        return;
      }
      const bindings = this.ctl.keys.getCurrentBindings(true);
      const binding = bindings['submit']?.bindings[0];
      this.helpMessage = binding
        ? `Type some katex and hit ${binding} to insert... `
        : 'Type some katex...';
      this.renderUI();
    });
    this.ctl.ui.update({
      params: {
        menuTitle: 'Katex Demo'
      },
      flags: {
        enableMenuOpenClose: false
      }
    });
    this.ctl.input.setPlaceholder(this.dynamicPlaceholder);
    this.ctl.input.focusInput();
    this.ctl.menu.fn.setMenuItemsFn(() => {
      this.renderUI();
    });
    this.ctl.input.setSubmitHandler(() => {
      this.insertKatex();
    });
    this.renderUI();
  }

  private renderUI(focusBehaviour: 'none' | 'first' | 'last' = 'first') {
    if (this.ctl.input.getInputValue().trim() === '') {
      this.renderInputUI(true);
      this.renderMenuItems(true, '', focusBehaviour);
      this.currentResult = '';
      return;
    }
    try {
      this.currentResult = katex.renderToString(this.ctl.input.getInputValue(), {
        displayMode: this.previewDisplayMode,
        throwOnError: true,
        output: 'mathml',
        errorColor: 'red'
      });
      this.ctl.clearNotifications();
      this.renderInputUI(true);
      this.renderMenuItems(true, this.currentResult, focusBehaviour);
    } catch (err) {
      this.renderInputUI(false);
      this.renderMenuItems(false, this.currentResult, focusBehaviour);
      this.ctl.notify('Invalid katex: ' + (err as Error).message, { duration: 3000 });
    }
  }

  private renderMenuItems(
    katexIsValid: boolean,
    katexResult?: string,
    focusBehaviour?: 'none' | 'first' | 'last'
  ): void {
    this.ctl.menu.setMenu({
      id: 'main',
      // This will ensure the menuItemFocus index won't change when we hit the
      // checkbox above or any other action.
      // { focusBehaviour: focusBehaviour ?? 'first' }
      focusBehaviour,
      items: [
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
                fontSize: katexResult ? '150%' : '100%',
                display: 'inline-block'
              },
              innerHTMLUnsafe: katexResult || '(preview)'
            }
          ]
        }),
        infoMenuItem({ id: 'katex-instructions', msg: this.helpMessage, icon: icons.Info }),
        divider(),
        stdMenuItem({
          id: 'insert-katex-btn',
          left: (b) => [b.icon(icons.Settings)],
          textContent: 'Insert...',
          attr: {
            disabled: !katexIsValid
          },
          action: () => {
            this.insertKatex();
          }
        }),
        checkboxMenuItem({
          id: 'katex-display-mode-checkbox',
          action: (_, checked) => {
            this.previewDisplayMode = checked;
            // TODO: a better solution is to mount the katex
            // previewer with a DOMUpdater or SveltePropInjector we
            // can trigger here.  See AsyncSearchExample for an
            // example.
            this.renderUI('none');
          },
          textContent: 'Display mode',
          checked: this.previewDisplayMode
        })
      ]
    });
  }

  private renderInputUI(katexIsValid: boolean) {
    this.ctl.ui.setInputUI((current) => {
      return {
        ...current,
        textArea: { rows: 5 },
        right: katexIsValid
          ? undefined
          : hflex({
              id: 'katex-indicator',
              children: (b) => [
                b.fchild({
                  classes: ['oneput__icon'],
                  style: {
                    color: '#c44'
                  },
                  icon: icons.CircleAlert
                })
              ]
            })
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
    this.renderUI();
  };
}
