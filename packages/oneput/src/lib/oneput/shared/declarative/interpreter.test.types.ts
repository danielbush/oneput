import type { Controller } from '../../controllers/controller.js';
import type { AppLayoutParams, UILayout } from '../../types.js';
import { renderActiveView, viewLayout, type LayoutSlots, type ViewDef } from './interpreter.js';

declare function component<Params extends AppLayoutParams>(
  ctl: Controller,
  params: Params
): UILayout<Params>;

type BannerParams = AppLayoutParams & { banner?: string };

const layouts = {
  plain: viewLayout({
    slots: ['heading'],
    create: component,
    params: ({ heading }) => ({ menuTitle: heading })
  }),
  other: viewLayout({
    slots: ['note'],
    create: component,
    params: ({ note }) => ({ menuTitle: note })
  }),
  // Params typed against its own component: custom fields only.
  banner: viewLayout({
    slots: ['banner'],
    create: (ctl, params: BannerParams) => component(ctl, params),
    params: ({ banner }): BannerParams => ({ banner })
  }),
  empty: viewLayout({ slots: [], create: component, params: () => ({}) })
};
type Layouts = LayoutSlots<typeof layouts>;
type BadgeView = ViewDef<never, never, never, 'badge'>;
type PlainView = ViewDef<'known', never, never, never, Layouts>;

const missing: BadgeView = {
  // @ts-expect-error 'missing' is not a builder name.
  menu: { items: [{ id: 'row', build: 'missing' }] }
};
const mixed: BadgeView = {
  // @ts-expect-error A built row has no standard fields.
  menu: { items: [{ id: 'row', build: 'badge', text: 'Standard' }] }
};
// @ts-expect-error 'gone' is not a registered layout.
const unknownLayout: PlainView = { layout: 'gone' };
const wrongSlot: PlainView = {
  layout: 'plain',
  // @ts-expect-error 'plain' does not declare 'note'.
  slots: { note: 'Note' }
};
const unknownSlot: PlainView = {
  // @ts-expect-error No registered layout declares 'missing'.
  slots: { missing: 'Text' }
};
const unknownSource: PlainView = {
  layout: 'plain',
  // @ts-expect-error 'gone' is not a text source.
  slots: { heading: { from: 'gone' } }
};
const inherited: PlainView = { slots: { note: { from: 'known' } } };
// @ts-expect-error A layout with no slots takes none.
const emptySlot: PlainView = { layout: 'empty', slots: { heading: 'Text' } };

/** A snapshot type inferred from its literal, as from a machine, names a layout that is not there. */
function inferredSnapshot() {
  const snapshot = {
    machine: { getStateNodeById: () => ({ path: [] }) },
    getMeta: () => ({ root: { view: { layout: 'gone' as const, menu: { id: 'menu' } } } })
  };
  const sources = { text: {}, lists: {}, items: {} };
  // @ts-expect-error The registry has no 'gone' layout.
  return renderActiveView(snapshot, sources, layouts, () => {});
}

viewLayout({
  // @ts-expect-error A slot name from Object.prototype would clash with the inherited member.
  slots: ['toString'],
  create: component,
  params: () => ({})
});
viewLayout({
  // @ts-expect-error '__proto__' would set the prototype, not a slot.
  slots: ['__proto__'],
  create: component,
  params: () => ({})
});
// A view that does not name a layout fills a slot of the layout its parent names.
const inheritedLiteral: PlainView = { slots: { heading: 'A' } };

void [missing, mixed, unknownLayout, wrongSlot, unknownSlot, unknownSource, inherited];
void inheritedLiteral;
void [emptySlot, inferredSnapshot];
