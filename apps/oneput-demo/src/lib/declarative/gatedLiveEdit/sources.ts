/** Named projections of the live-edit model. */
export type Field = 'name' | 'role';

export type EditContext = {
  values: Record<Field, string>;
  editing: Field | null;
};

export const initialValues = {
  name: 'Grace Hopper',
  role: 'Computer scientist'
} as const satisfies EditContext['values'];

const idleHint = 'Activate to edit this value.';
const editHint = 'Editing. Activate again, move focus, or go back to return to filtering.';

export const sources = {
  nameLabel: ({ values }: EditContext) => `Name: ${values.name || '—'}`,
  roleLabel: ({ values }: EditContext) => `Role: ${values.role || '—'}`,
  nameHint: ({ editing }: EditContext) => (editing === 'name' ? editHint : idleHint),
  roleHint: ({ editing }: EditContext) => (editing === 'role' ? editHint : idleHint),
  editOwner: ({ editing }: EditContext) => (editing === null ? '' : `live-edit-mixed-${editing}`),
  editValue: ({ values, editing }: EditContext) => (editing === null ? '' : values[editing]),
  editPlaceholder: ({ editing }: EditContext) => (editing === null ? '' : `Edit ${editing}...`)
};
