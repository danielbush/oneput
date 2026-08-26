import type {
  AppLayoutParams,
  AppObject,
  Controller,
  MenuItem,
  MenuUpdateCause,
  UIFlags
} from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from '../_icons.js';

type FieldId = 'name' | 'role' | 'location';

const fields: Array<{ id: FieldId; label: string }> = [
  { id: 'name', label: 'Name' },
  { id: 'role', label: 'Role' },
  { id: 'location', label: 'Location' }
];

/** Every row is editable, so the focused row owns the shared input. */
export class LiveEditWholeMenu implements AppObject {
  static create(ctl: Controller) {
    return new LiveEditWholeMenu(ctl);
  }

  private values: Record<FieldId, string> = {
    name: 'Ada Lovelace',
    role: 'Programmer',
    location: 'London'
  };
  private activeFieldId?: FieldId;

  private constructor(private ctl: Controller) {}

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
      stdMenuItem({
        id: this.menuItemId(field.id),
        left: (b) => [b.icon(icons.Pencil)],
        textContent: `${field.label}: ${this.values[field.id] || '—'}`,
        bottom: { textContent: 'Type in the shared input to edit this value.' },
        action: () => this.selectField(field.id, true)
      })
    )
  });

  onStart = () => {
    this.ctl.input.setPlaceholder('Move menu focus to edit a field...');
  };

  onMenuItemFocus = ({ menuItem }: { menuItem: MenuItem | undefined }) => {
    this.selectMenuItem(menuItem, true);
  };

  onMenuUpdate = ({
    cause,
    menuItem
  }: {
    cause: MenuUpdateCause;
    menuItem: MenuItem | undefined;
  }) => {
    if (cause !== 'input-change') {
      this.selectMenuItem(menuItem, false);
    }
  };

  onInputChange = ({ value }: { value: string }) => {
    if (!this.activeFieldId) {
      return;
    }
    this.values[this.activeFieldId] = value;
    void this.ctl.menu.invalidate({ focusBehaviour: 'none' });
  };

  private selectMenuItem(menuItem: MenuItem | undefined, selectAll: boolean) {
    const fieldId = this.fieldIdFromMenuItem(menuItem);
    if (fieldId) {
      this.selectField(fieldId, selectAll);
    }
  }

  private selectField(fieldId: FieldId, selectAll: boolean) {
    const changed = fieldId !== this.activeFieldId;
    this.activeFieldId = fieldId;
    const label = fields.find((field) => field.id === fieldId)?.label ?? 'value';
    this.ctl.input.setPlaceholder(`Edit ${label.toLowerCase()}...`);
    this.ctl.input.focusInput();
    if (changed) {
      const inputReady = this.ctl.input.setInputValue(this.values[fieldId]);
      if (selectAll) {
        void inputReady.then(() => this.ctl.input.selectAll());
      }
    } else if (selectAll) {
      this.ctl.input.selectAll();
    }
  }

  private fieldIdFromMenuItem(menuItem: MenuItem | undefined): FieldId | undefined {
    return fields.find((field) => this.menuItemId(field.id) === menuItem?.id)?.id;
  }

  private menuItemId(fieldId: FieldId) {
    return `live-edit-whole-${fieldId}`;
  }
}
