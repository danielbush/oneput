/** The picker has an always-ready list with stable IDs. */
const choices = [
  { id: 'red', text: 'Red' },
  { id: 'green', text: 'Green' },
  { id: 'blue', text: 'Blue' }
] as const;

export type Colour = (typeof choices)[number]['id'];
export type FormContext = { colour: Colour | null };

export function isColour(value: unknown): value is Colour {
  return choices.some(({ id }) => id === value);
}

export const pickerSources = {
  text: {},
  lists: { colours: () => choices.map((row) => ({ ...row, activate: true })) },
  release: {}
};

export const formSources = {
  text: { colourLabel: ({ colour }: FormContext) => colour ?? 'No colour selected' },
  lists: {},
  release: {}
};
