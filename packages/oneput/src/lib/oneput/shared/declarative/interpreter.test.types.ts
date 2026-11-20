import type { ViewDef } from './interpreter.js';

type BadgeView = ViewDef<never, never, never, 'badge'>;

const missing: BadgeView = {
  // @ts-expect-error 'missing' is not a builder name.
  menu: { items: [{ id: 'row', build: 'missing' }] }
};
const mixed: BadgeView = {
  // @ts-expect-error A built row has no standard fields.
  menu: { items: [{ id: 'row', build: 'badge', text: 'Standard' }] }
};
void [missing, mixed];
