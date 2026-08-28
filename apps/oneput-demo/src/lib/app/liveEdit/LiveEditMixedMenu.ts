import type { AppLayoutParams, AppObject, Controller, UIFlags } from '@oneput/oneput';
import { MixedMenuLiveEdit } from '@oneput/oneput/shared/behaviors/MixedMenuLiveEdit.js';
import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from '../_icons.js';

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

  private readonly liveEdit: MixedMenuLiveEdit;
  private values: Record<FieldId, string> = {
    name: 'Grace Hopper',
    role: 'Computer scientist'
  };

  private constructor(private ctl: Controller) {
    this.liveEdit = MixedMenuLiveEdit.create(ctl);
  }

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
        this.liveEdit.item({
          id: this.menuItemId(field.id),
          value: {
            read: () => this.values[field.id],
            write: (value) => {
              this.values[field.id] = value;
            }
          },
          placeholder: `Edit ${field.label.toLowerCase()}...`,
          render: ({ value, editing }) =>
            stdMenuItem({
              id: this.menuItemId(field.id),
              left: (b) => [b.icon(icons.Pencil)],
              textContent: `${field.label}: ${value || '—'}`,
              bindingHint: this.ctl.keys.getCurrentBindings()[OneputAction.DO_ACTION]?.bindings[0],
              bottom: {
                textContent: editing
                  ? 'Editing. Activate again, move focus, or go back to return to filtering.'
                  : 'Activate to edit this value.'
              }
            })
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
    this.ctl.input.setPlaceholder('Filter menu, then activate a field to edit...');
    void this.ctl.input.setInputValue('');
    this.ctl.input.focusInput();
  };

  private menuItemId(fieldId: FieldId) {
    return `live-edit-mixed-${fieldId}`;
  }
}
