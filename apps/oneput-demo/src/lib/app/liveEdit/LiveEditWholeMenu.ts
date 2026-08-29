import type { AppLayoutParams, AppObject, Controller, UIFlags } from '@oneput/oneput';
import { FocusedMenuLiveEdit } from '@oneput/oneput/shared/behaviors/FocusedMenuLiveEdit.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from '../_icons.js';

type FieldId = 'name' | 'role' | 'location';

const fields: Array<{ id: FieldId; label: string }> = [
  { id: 'name', label: 'Name' },
  { id: 'role', label: 'Role' },
  { id: 'location', label: 'Location' }
];

/** Every row is editable: focus claims the shared input (FOCUSED_LIVE_EDIT). */
export class LiveEditWholeMenu implements AppObject {
  static create(ctl: Controller) {
    return new LiveEditWholeMenu(ctl);
  }

  private readonly liveEdit: FocusedMenuLiveEdit;
  private values: Record<FieldId, string> = {
    name: 'Ada Lovelace',
    role: 'Programmer',
    location: 'London'
  };

  private constructor(private ctl: Controller) {
    this.liveEdit = FocusedMenuLiveEdit.create(ctl);
  }

  layout = {
    params: { menuTitle: 'Live edit — whole menu' } satisfies AppLayoutParams
  };

  settings = {
    enableFilter: false,
    clearInputAfterAction: false
  } satisfies UIFlags;

  menu = () => ({
    id: 'live-edit-whole-menu',
    focusBehaviour: 'first' as const,
    items: fields.map((field) =>
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
            bottom: {
              textContent: editing ? 'Editing.' : 'Move focus here to edit.'
            }
          })
      })
    )
  });

  onStart = () => {
    this.ctl.input.setPlaceholder('Move menu focus to edit a field...');
  };

  private menuItemId(fieldId: FieldId) {
    return `live-edit-whole-${fieldId}`;
  }
}
