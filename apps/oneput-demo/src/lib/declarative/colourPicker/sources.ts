/** The picker has an always-ready list with stable IDs. */
const choices = [
  { id: 'red', text: 'Red' },
  { id: 'green', text: 'Green' },
  { id: 'blue', text: 'Blue' }
] as const;

export type Colour = (typeof choices)[number]['id'];
export type PickColour = { type: 'PICK_COLOUR'; colour: Colour };

export function isColour(value: unknown): value is Colour {
  return choices.some(({ id }) => id === value);
}

export const lists = {
  colours: () =>
    choices.map((row) => ({
      ...row,
      event: { type: 'PICK_COLOUR', colour: row.id } satisfies PickColour
    }))
};
