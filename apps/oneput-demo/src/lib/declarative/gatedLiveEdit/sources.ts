import type { InputClaimReleaseReason } from '@oneput/oneput';

/** Named projections of the live-edit model. */
export type Field = 'name' | 'role';

export type EditContext = {
  values: Record<Field, string>;
  editing: Field | null;
  releaseReason: InputClaimReleaseReason;
};

export const initialValues = {
  name: 'Grace Hopper',
  role: 'Computer scientist'
} as const satisfies EditContext['values'];

const idleHint = 'Activate to edit this value.';
const editHint = 'Editing. Activate again, move focus, or go back to return to filtering.';

export function fieldId(field: Field | null) {
  return field === null ? '' : `live-edit-mixed-${field}`;
}

export function fieldFor(id: string): Field | null {
  if (id === fieldId('name')) return 'name';
  if (id === fieldId('role')) return 'role';
  return null;
}

export const sources = {
  text: {
    nameLabel: ({ values }: EditContext) => `Name: ${values.name || '—'}`,
    roleLabel: ({ values }: EditContext) => `Role: ${values.role || '—'}`,
    nameHint: ({ editing }: EditContext) => (editing === 'name' ? editHint : idleHint),
    roleHint: ({ editing }: EditContext) => (editing === 'role' ? editHint : idleHint),
    editOwner: ({ editing }: EditContext) => fieldId(editing),
    editValue: ({ values, editing }: EditContext) => (editing === null ? '' : values[editing]),
    editPlaceholder: ({ editing }: EditContext) => (editing === null ? '' : `Edit ${editing}...`)
  },
  lists: {},
  release: { editRelease: ({ releaseReason }: EditContext) => releaseReason }
};
