import type { InputClaimReleaseReason } from '@oneput/oneput';
import type { Profile } from './profileStore.js';

export type Field = keyof Profile;
export type EditContext = {
  profile: Profile | null;
  draft: Profile | null;
  editField: Field | null;
  editValue: string;
  releaseReason: InputClaimReleaseReason;
};

export const saveId = 'live-edit-save';

export function fieldId(field: Field | null) {
  return field === null ? '' : `live-edit-mixed-${field}`;
}

export function fieldFor(id: string): Field | null {
  if (id === fieldId('name')) return 'name';
  if (id === fieldId('role')) return 'role';
  return null;
}

export function fieldValue({ draft, editField, editValue }: EditContext, field: Field) {
  return editField === field ? editValue : (draft?.[field] ?? '');
}

export function isDirty(context: EditContext) {
  const { profile } = context;
  return (
    profile !== null &&
    (fieldValue(context, 'name') !== profile.name || fieldValue(context, 'role') !== profile.role)
  );
}

function fieldHint({ editField }: EditContext, field: Field) {
  return editField === field
    ? 'Activate again to keep this change in the draft.'
    : 'Activate to edit this value.';
}

/** Supply the values that change while the profile menu stays in place. */
export const sources = {
  text: {
    nameLabel: (context: EditContext) => `Name: ${fieldValue(context, 'name') || '—'}`,
    roleLabel: (context: EditContext) => `Role: ${fieldValue(context, 'role') || '—'}`,
    nameHint: (context: EditContext) => fieldHint(context, 'name'),
    roleHint: (context: EditContext) => fieldHint(context, 'role'),
    editOwner: ({ editField }: EditContext) => fieldId(editField),
    editValue: ({ editValue }: EditContext) => editValue,
    editPlaceholder: ({ editField }: EditContext) => (editField ? `Edit ${editField}...` : '')
  },
  lists: {},
  release: { editRelease: ({ releaseReason }: EditContext) => releaseReason },
  enabled: { saveEnabled: isDirty }
};
