import type { AppLayoutParams, AppObject, Controller, MenuItem, UIFlags } from '@oneput/oneput';
import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from '../_icons.js';
import {
  decideMixedLiveEdit,
  type MixedLiveEditEvent,
  type MixedLiveEditIntent,
  type MixedLiveEditState
} from './mixedLiveEdit.js';

type FieldId = 'name' | 'role';

const fields: Array<{ id: FieldId; label: string }> = [
  { id: 'name', label: 'Name' },
  { id: 'role', label: 'Role' }
];

/** Filtering owns the input until an editable row is activated. */
export class LiveEditMixedMenu implements AppObject {
  static create(ctl: Controller) {
    return new LiveEditMixedMenu(ctl);
  }

  private state: MixedLiveEditState<FieldId> = { type: 'filtering' };
  private values: Record<FieldId, string> = {
    name: 'Grace Hopper',
    role: 'Computer scientist'
  };

  private constructor(private ctl: Controller) {}

  layout = {
    params: { menuTitle: 'Live edit — mixed menu' } satisfies AppLayoutParams
  };

  settings = {
    enableFilter: true,
    clearInputAfterAction: false,
    clearInputAfterBack: false
  } satisfies UIFlags;

  menu = () => ({
    id: 'live-edit-mixed-menu',
    focusBehaviour: 'last-action,first' as const,
    items: [
      ...fields.map((field) =>
        stdMenuItem({
          id: this.menuItemId(field.id),
          left: (b) => [b.icon(icons.Pencil)],
          textContent: `${field.label}: ${this.values[field.id] || '—'}`,
          bindingHint: this.ctl.keys.getCurrentBindings()[OneputAction.DO_ACTION]?.bindings[0],
          bottom: {
            textContent:
              this.state.type === 'editing' && this.state.fieldId === field.id
                ? 'Editing. Activate again, move focus, or go back to return to filtering.'
                : 'Activate to edit this value.'
          },
          action: () => this.handle({ type: 'activate-field', fieldId: field.id })
        })
      ),
      stdMenuItem({
        id: 'live-edit-mixed-preview',
        textContent: 'Preview values',
        action: () =>
          this.ctl.notify(`${this.values.name} — ${this.values.role}`, { duration: 3000 })
      }),
      stdMenuItem({
        id: 'live-edit-mixed-reset',
        textContent: 'Reset example',
        action: () => {
          this.values = { name: 'Grace Hopper', role: 'Computer scientist' };
          void this.ctl.menu.invalidate({ focusBehaviour: 'none' });
        }
      })
    ]
  });

  onStart = () => {
    this.showFilterInput();
  };

  onBack = () => {
    this.handle({ type: 'back' });
  };

  onMenuItemFocus = ({ menuItem }: { menuItem: MenuItem | undefined }) => {
    this.handle({ type: 'focus-field', fieldId: this.fieldIdFromMenuItem(menuItem) });
  };

  onInputChange = ({ value }: { value: string }) => {
    if (this.state.type !== 'editing') {
      return;
    }
    this.values[this.state.fieldId] = value;
    void this.ctl.menu.invalidate({ focusBehaviour: 'none' });
  };

  private handle(event: MixedLiveEditEvent<FieldId>) {
    const intent = decideMixedLiveEdit(this.state, event);
    this.apply(intent);
  }

  private apply(intent: MixedLiveEditIntent<FieldId>) {
    switch (intent.type) {
      case 'none':
        return;
      case 'start-editing':
        this.startEditing(intent.fieldId);
        return;
      case 'stop-editing':
        this.stopEditing();
        return;
      case 'exit':
        this.ctl.app.exit();
    }
  }

  private startEditing(fieldId: FieldId) {
    this.state = { type: 'editing', fieldId };
    this.ctl.ui.update({ flags: { enableFilter: false } });
    const label = fields.find((field) => field.id === fieldId)?.label ?? 'value';
    this.ctl.input.setPlaceholder(`Edit ${label.toLowerCase()}...`);
    const inputReady = this.ctl.input.setInputValue(this.values[fieldId]);
    this.ctl.input.focusInput();
    void inputReady.then(() => this.ctl.input.selectAll());
    void this.ctl.menu.invalidate({ focusBehaviour: 'none' }).then(() => {
      this.ctl.menu.focusMenuItemById(this.menuItemId(fieldId));
    });
  }

  private stopEditing() {
    this.state = { type: 'filtering' };
    this.ctl.ui.update({ flags: { enableFilter: true } });
    this.showFilterInput();
    void this.ctl.menu.invalidate({ focusBehaviour: 'none' });
  }

  private showFilterInput() {
    this.ctl.input.setPlaceholder('Filter menu, then activate a field to edit...');
    void this.ctl.input.setInputValue('');
    this.ctl.input.focusInput();
  }

  private fieldIdFromMenuItem(menuItem: MenuItem | undefined): FieldId | undefined {
    return fields.find((field) => this.menuItemId(field.id) === menuItem?.id)?.id;
  }

  private menuItemId(fieldId: FieldId) {
    return `live-edit-mixed-${fieldId}`;
  }
}
