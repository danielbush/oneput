import type { InputClaimReleaseReason } from '@oneput/oneput';
import type { Profile } from './profileStore.js';

export type Field = keyof Profile;
export type EditContext = {
  profile: Profile | null;
  draft: Profile | null;
  edit: { field: Field; value: string } | null;
  releaseReason: InputClaimReleaseReason;
};

export const saveId = 'live-edit-save';

const fields = { name: 'Name', role: 'Role' };
const idleHint = 'Activate to edit this value.';
const editHint = 'Activate again to keep this change in the draft.';

export function fieldId(field: Field | null) {
  return field === null ? '' : `live-edit-mixed-${field}`;
}

export function fieldFor(id: string): Field | null {
  if (id === fieldId('name')) return 'name';
  if (id === fieldId('role')) return 'role';
  return null;
}

export function fieldValue({ draft, edit }: EditContext, field: Field) {
  return edit?.field === field ? edit.value : (draft?.[field] ?? '');
}

export function draftIsDirty({ profile, draft }: EditContext) {
  return (
    profile !== null &&
    draft !== null &&
    (draft.name !== profile.name || draft.role !== profile.role)
  );
}

function profileRows(context: EditContext, enableSave: boolean, editing = false) {
  function fieldRow(field: Field) {
    return {
      id: fieldId(field),
      text: `${fields[field]}: ${fieldValue(context, field) || '—'}`,
      detail: editing && context.edit?.field === field ? editHint : idleHint,
      icon: 'Pencil',
      showActionBinding: true,
      activate: true
    };
  }

  return [
    fieldRow('name'),
    fieldRow('role'),
    { id: 'live-edit-mixed-preview', text: 'Preview values', activate: true },
    { id: saveId, text: 'Save', activate: enableSave, canFilter: false }
  ];
}

/** Project the profile draft and edit buffer into the menu and shared input. */
export const sources = {
  text: {
    editOwner: ({ edit }: EditContext) => fieldId(edit?.field ?? null),
    editValue: ({ edit }: EditContext) => edit?.value ?? '',
    editPlaceholder: ({ edit }: EditContext) => (edit ? `Edit ${edit.field}...` : '')
  },
  lists: {
    cleanRows: (context: EditContext) => profileRows(context, false),
    dirtyRows: (context: EditContext) => profileRows(context, true),
    editRows: (context: EditContext) => profileRows(context, draftIsDirty(context), true)
  },
  release: { editRelease: ({ releaseReason }: EditContext) => releaseReason }
};
