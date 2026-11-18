import type { InputClaimReleaseReason } from '@oneput/oneput';
import type { Profile } from './profileStore.js';

export type Field = keyof Profile;
export type Draft = { field: Field; value: string };

export type EditContext = {
  profile: Profile | null;
  draft: Draft | null;
  nextField: Field | null;
  releaseReason: InputClaimReleaseReason;
};

const idleHint = 'Activate to edit this value.';
const editHint = 'Activate again to save. Moving focus or going back also saves.';
const fieldNames = { name: 'Name', role: 'Role' };

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

function fieldLabel(context: EditContext, field: Field) {
  return `${fieldNames[field]}: ${fieldValue(context, field) || '—'}`;
}

/** Project the saved profile and active draft into menu labels and input text. */
export const sources = {
  text: {
    nameLabel: (context: EditContext) => fieldLabel(context, 'name'),
    roleLabel: (context: EditContext) => fieldLabel(context, 'role'),
    nameHint: (context: EditContext) => fieldHint(context, 'name', editHint),
    roleHint: (context: EditContext) => fieldHint(context, 'role', editHint),
    nameSavingHint: (context: EditContext) => fieldHint(context, 'name', 'Saving…'),
    roleSavingHint: (context: EditContext) => fieldHint(context, 'role', 'Saving…'),
    editLabel: (context: EditContext) =>
      context.draft === null ? '' : fieldLabel(context, context.draft.field),
    discardLabel: ({ draft }: EditContext) => `Discard "${draft?.value ?? ''}"`,
    editOwner: ({ draft }: EditContext) => fieldId(draft?.field ?? null),
    editValue: ({ draft }: EditContext) => draft?.value ?? '',
    editPlaceholder: ({ draft }: EditContext) => (draft === null ? '' : `Edit ${draft.field}...`)
  },
  lists: {},
  release: { editRelease: ({ releaseReason }: EditContext) => releaseReason }
};
