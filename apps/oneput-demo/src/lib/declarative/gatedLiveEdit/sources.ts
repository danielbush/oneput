import type { InputClaimReleaseReason } from '@oneput/oneput';
import type { Profile } from './profileStore.js';

export type Field = keyof Profile;
export type AfterEdit = { type: 'EDIT_FIELD'; field: Field } | { type: 'SAVE' };
export type EditContext = {
  profile: Profile | null;
  draft: Profile | null;
  edit: { field: Field; value: string } | null;
  lastEditValue: string;
  afterEdit: AfterEdit | null;
  releaseReason: InputClaimReleaseReason;
};

export function fieldId(field: Field) {
  return `live-edit-mixed-${field}`;
}

export function fieldValue({ draft, edit }: EditContext, field: Field) {
  return edit?.field === field ? edit.value : (draft?.[field] ?? '');
}

export function isDirty(context: EditContext) {
  const { profile } = context;
  return (
    profile !== null &&
    (fieldValue(context, 'name') !== profile.name || fieldValue(context, 'role') !== profile.role)
  );
}

function fieldHint({ edit }: EditContext, field: Field) {
  return edit?.field === field
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
    editOwner: ({ edit }: EditContext) => (edit ? fieldId(edit.field) : ''),
    editValue: ({ edit }: EditContext) => edit?.value ?? '',
    editPlaceholder: ({ edit }: EditContext) => (edit ? `Edit ${edit.field}...` : ''),
    lastEditValue: ({ lastEditValue }: EditContext) => lastEditValue
  },
  lists: {},
  release: { editRelease: ({ releaseReason }: EditContext) => releaseReason },
  enabled: { saveEnabled: isDirty }
};
