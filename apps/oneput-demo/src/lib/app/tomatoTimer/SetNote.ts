import type { AppLayoutParams, AppObject, Controller, OneputProps, UIFlags } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import { icons } from '../_icons.js';

/** Tagged resume payload when Note compose accepts. Cancel exits with no payload. */
export type SetNoteResult = {
  type: 'set-note';
  value: string;
};

export function isSetNoteResult(payload: unknown): payload is SetNoteResult {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as SetNoteResult).type === 'set-note' &&
    typeof (payload as SetNoteResult).value === 'string'
  );
}

/**
 * Dedicated note compose: textarea; tick / catalog SUBMIT keep the draft.
 * Back / Cancel discard; if the text changed, confirm first.
 * Menu item focus is off so Enter inserts a newline.
 */
export class SetNote implements AppObject {
  static create(ctl: Controller, params: { note?: string } = {}) {
    return new SetNote(ctl, params.note ?? '');
  }

  private constructor(
    private ctl: Controller,
    private initial: string
  ) {}

  settings = {
    enableFilter: false,
    enableMenuOpenClose: false,
    clearInputAfterAction: false,
    clearInputAfterBack: false,
    enableMenuItemFocus: false
  } satisfies UIFlags;

  /** Back discards (same as Cancel). Confirm if the textarea changed. */
  onBack = () => {
    void this.discard();
  };

  menu = () => ({
    id: 'set-note',
    items: [
      stdMenuItem({
        id: 'set-note-cancel',
        textContent: 'Cancel',
        left: (b) => [b.icon(icons.CircleX)],
        bindingHint: this.ctl.keys.getCurrentBindings()[OneputAction.BACK]?.bindings[0],
        action: () => {
          this.ctl.app.goBack();
        }
      })
    ]
  });

  onStart() {
    this.ctl.input.setPlaceholder('Enter note...');
    this.ctl.input.setInputValue(this.initial);
    this.ctl.input.setSubmitHandler(() => this.submit());
    this.syncChrome();
  }

  private submit() {
    this.ctl.app.exit(this.result());
  }

  private async discard() {
    if (this.ctl.input.getInputValue() !== this.initial) {
      const confirm = this.ctl.confirm({
        message: 'Discard note changes?'
      });
      const yes = await confirm.userChooses();
      if (!yes) {
        return;
      }
    }
    this.ctl.app.exit();
  }

  private result(): SetNoteResult {
    return {
      type: 'set-note',
      value: this.ctl.input.getInputValue()
    };
  }

  private syncChrome() {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Note',
        inputAccept: {
          run: () => this.submit(),
          label: this.ctl.keys.getCurrentBindings()[OneputAction.SUBMIT]?.bindings[0]
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
