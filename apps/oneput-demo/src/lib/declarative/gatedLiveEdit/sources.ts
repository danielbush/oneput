import type { InputClaimReleaseReason } from '@oneput/oneput';
import type { Profile, ProfileSaveError } from './profileStore.js';

export type Field = keyof Profile;
export type Draft = { field: Field; value: string; saveError: ProfileSaveError | null };

export type EditContext = {
  profile: Profile | null;
  draft: Draft | null;
  nextField: Field | null;
  releaseReason: InputClaimReleaseReason;
};

const idleHint = 'Activate to edit this value.';
const editHint = 'Activate again to save. Moving focus or going back also saves.';
const saveErrorHint = 'Could not save. Activate this row to retry.';

export function fieldId(field: Field | null) {
  return field === null ? '' : `live-edit-mixed-${field}`;
}

export function fieldFor(id: string): Field | null {
  if (id === fieldId('name')) return 'name';
  if (id === fieldId('role')) return 'role';
  return null;
}

export function fieldValue({ profile, draft }: EditContext, field: Field) {
  return draft?.field === field ? draft.value : (profile?.[field] ?? '');
}

function fieldHint({ draft }: EditContext, field: Field, activeHint: string) {
  return draft?.field === field ? activeHint : idleHint;
}

function editFieldHint(context: EditContext, field: Field) {
  return fieldHint(context, field, context.draft?.saveError ? saveErrorHint : editHint);
}

/** Project the saved profile and active draft into menu labels and input text. */
export const sources = {
  text: {
    nameLabel: (context: EditContext) => `Name: ${fieldValue(context, 'name') || '—'}`,
    roleLabel: (context: EditContext) => `Role: ${fieldValue(context, 'role') || '—'}`,
    nameHint: (context: EditContext) => editFieldHint(context, 'name'),
    roleHint: (context: EditContext) => editFieldHint(context, 'role'),
    nameSavingHint: (context: EditContext) => fieldHint(context, 'name', 'Saving…'),
    roleSavingHint: (context: EditContext) => fieldHint(context, 'role', 'Saving…'),
    editOwner: ({ draft }: EditContext) => fieldId(draft?.field ?? null),
    editValue: ({ draft }: EditContext) => draft?.value ?? '',
    editPlaceholder: ({ draft }: EditContext) => (draft === null ? '' : `Edit ${draft.field}...`)
  },
  lists: {},
  release: { editRelease: ({ releaseReason }: EditContext) => releaseReason }
};
