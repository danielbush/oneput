import type { InputClaimReleaseReason } from '@oneput/oneput';
import type { ActorRefFrom } from 'xstate';
import type { createGatedFieldEdit } from '../patterns/gatedFieldEdit.js';
import type { Profile } from './profileStore.js';

export type Field = keyof Profile;
export type AfterEdit = { type: 'EDIT_FIELD'; field: Field } | { type: 'SAVE' };
export type EditContext = {
  profile: Profile | null;
  draft: Profile | null;
  lastEditedField: Field | null;
  afterEdit: AfterEdit | null;
  /** The value in the open field editor, copied here so guards can read it. */
  openEdit: ReturnType<typeof activeEdit>;
  releaseReason: InputClaimReleaseReason;
};

type EditChildren = {
  children: { gatedFieldEdit?: ActorRefFrom<ReturnType<typeof createGatedFieldEdit<Field>>> };
};
type FormSnapshot = EditChildren & { context: EditContext };

export function fieldId(field: Field) {
  return `live-edit-mixed-${field}`;
}

export function activeEdit({ children }: EditChildren) {
  const edit = children.gatedFieldEdit?.getSnapshot();
  return edit?.status === 'active' ? edit.context.edit : null;
}

export function fieldValue(
  { draft }: EditContext,
  edit: ReturnType<typeof activeEdit>,
  field: Field
) {
  return edit?.field === field ? edit.value : (draft?.[field] ?? '');
}

export function isDirty(context: EditContext, edit: ReturnType<typeof activeEdit>) {
  const { profile } = context;
  return (
    profile !== null &&
    (fieldValue(context, edit, 'name') !== profile.name ||
      fieldValue(context, edit, 'role') !== profile.role)
  );
}

function fieldHint(snapshot: FormSnapshot, field: Field) {
  return activeEdit(snapshot)?.field === field
    ? 'Activate again to keep this change in the draft.'
    : 'Activate to edit this value.';
}

/** Supply the values that change while the profile menu stays in place. */
export const sources = {
  text: {
    nameLabel: (snapshot: FormSnapshot) =>
      `Name: ${fieldValue(snapshot.context, activeEdit(snapshot), 'name') || '—'}`,
    roleLabel: (snapshot: FormSnapshot) =>
      `Role: ${fieldValue(snapshot.context, activeEdit(snapshot), 'role') || '—'}`,
    nameHint: (snapshot: FormSnapshot) => fieldHint(snapshot, 'name'),
    roleHint: (snapshot: FormSnapshot) => fieldHint(snapshot, 'role'),
    editOwner: (snapshot: FormSnapshot) => activeEdit(snapshot)?.owner ?? '',
    editValue: (snapshot: FormSnapshot) => activeEdit(snapshot)?.value ?? '',
    editPlaceholder: (snapshot: FormSnapshot) => {
      const edit = activeEdit(snapshot);
      return edit ? `Edit ${edit.field}...` : '';
    },
    lastEditValue: ({ context: { draft, lastEditedField } }: FormSnapshot) =>
      lastEditedField === null ? '' : (draft?.[lastEditedField] ?? '')
  },
  lists: {},
  release: { editRelease: ({ context: { releaseReason } }: FormSnapshot) => releaseReason },
  enabled: {
    saveEnabled: (snapshot: FormSnapshot) => isDirty(snapshot.context, activeEdit(snapshot))
  }
};
