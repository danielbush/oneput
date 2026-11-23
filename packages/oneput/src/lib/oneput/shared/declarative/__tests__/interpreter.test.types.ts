import type { Controller } from '../../../controllers/controller.js';
import type { FlexChildBuilder } from '../../../lib/builder.js';
import type { AppLayoutParams, FChildParams, UILayout } from '../../../types.js';
import {
  renderActiveView,
  slot,
  viewLayout,
  type LayoutSlots,
  type Readable,
  type SourceTypes,
  type ViewDef,
  type ViewSources
} from '../interpreter.js';
import { standardRow } from '../standardRow.js';

declare function component<Params extends AppLayoutParams>(
  ctl: Controller,
  params: Params
): UILayout<Params>;

type BannerParams = AppLayoutParams & { banner?: string };
/** Content that a layout builds in place. */
type Footer = (b: FlexChildBuilder) => FChildParams;
type TypedParams = AppLayoutParams & { busy?: boolean; footer?: Footer };

const layouts = {
  plain: viewLayout({
    slots: { heading: slot<string>() },
    create: component,
    params: ({ heading }) => ({ menuTitle: heading })
  }),
  other: viewLayout({
    slots: { note: slot<string>() },
    create: component,
    params: ({ note }) => ({ menuTitle: note })
  }),
  // Params typed against its own component: custom fields only.
  banner: viewLayout({
    slots: { banner: slot<string>() },
    create: (ctl, params: BannerParams) => component(ctl, params),
    params: ({ banner }): BannerParams => ({ banner })
  }),
  // Slots that are not text: the layout decides how to show them.
  typed: viewLayout({
    slots: { busy: slot<boolean>(), footer: slot<Footer>() },
    create: (ctl, params: TypedParams) => component(ctl, params),
    params: ({ busy, footer }): TypedParams => ({ busy, footer })
  }),
  empty: viewLayout({ slots: {}, create: component, params: () => ({}) })
};
type Layouts = LayoutSlots<typeof layouts>;
type BadgeView = ViewDef<Record<never, never>, never, never, 'badge'>;
type Sources = { known: string; flag: boolean; footer: Footer };
type PlainView = ViewDef<Sources, never, never, never, Layouts>;

declare const footer: Footer;

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
  // @ts-expect-error 'gone' is not a source.
  slots: { heading: { from: 'gone' } }
};

// Slot types: a literal or a source must fit the type that the slot declares.
const typedValues: PlainView[] = [
  { layout: 'typed', slots: { busy: true, footer } },
  { layout: 'typed', slots: { busy: { from: 'flag' }, footer: { from: 'footer' } } },
  { layout: 'plain', slots: { heading: { from: 'known' } } },
  // A view that does not name a layout fills a typed slot of a registered layout.
  { slots: { busy: false } }
];
const wrongLiteral: PlainView = {
  layout: 'typed',
  // @ts-expect-error 'busy' takes a boolean, not text.
  slots: { busy: 'yes' }
};
const textForBuilder: PlainView = {
  layout: 'typed',
  // @ts-expect-error 'footer' takes a builder, not text.
  slots: { footer: 'Footer' }
};
const flagForText: PlainView = {
  layout: 'plain',
  // @ts-expect-error 'heading' takes text, not a boolean.
  slots: { heading: true }
};
const textSourceForFlag: PlainView = {
  layout: 'typed',
  // @ts-expect-error 'known' gives text; 'busy' takes a boolean.
  slots: { busy: { from: 'known' } }
};
const flagSourceForText: PlainView = {
  layout: 'plain',
  // @ts-expect-error 'flag' gives a boolean; 'heading' takes text.
  slots: { heading: { from: 'flag' } }
};
const inheritedWrongLiteral: PlainView = {
  // @ts-expect-error No registered layout has a text 'busy' slot.
  slots: { busy: 'yes' }
};

// Row text, row detail and the placeholder take only sources that give text.
const flagRowText: PlainView = {
  // @ts-expect-error 'flag' gives a boolean, not row text.
  menu: { items: [{ id: 'row', text: { from: 'flag' } }] }
};
const builderRowDetail: PlainView = {
  // @ts-expect-error 'footer' gives a builder, not row detail.
  menu: { items: [{ id: 'row', text: 'Row', detail: { from: 'footer' } }] }
};
// @ts-expect-error 'flag' gives a boolean, not a placeholder.
const flagPlaceholder: PlainView = { input: { placeholder: { from: 'flag' } } };
const textRow: PlainView = {
  menu: { items: [{ id: 'row', text: { from: 'known' }, detail: 'Detail' }] }
};

type Snapshot = { busy: boolean };
const registry = {
  slot: { known: () => 'Known', flag: ({ busy }: Snapshot) => busy, footer: () => footer },
  menu: {},
  menuItem: {}
};
// A registry gives the source types of its views.
const registryTypes: Sources = {} as SourceTypes<typeof registry.slot>;
const wrongSource: ViewSources<Snapshot, Sources, never> = {
  // @ts-expect-error The 'flag' source must give a boolean.
  slot: { known: () => 'Known', flag: () => 'yes', footer: () => footer },
  menu: {},
  menuItem: {}
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
  const sources = { slot: {}, menu: {}, menuItem: {} };
  // @ts-expect-error The registry has no 'gone' layout.
  return renderActiveView(snapshot, sources, layouts, {
    defaultRow: standardRow,
    activate: () => {}
  });
}

viewLayout({
  // @ts-expect-error A slot name from Object.prototype would clash with the inherited member.
  slots: { toString: slot<string>() },
  create: component,
  params: () => ({})
});
viewLayout({
  // @ts-expect-error '__proto__' would set the prototype, not a slot.
  slots: { ['__proto__']: slot<string>() },
  create: component,
  params: () => ({})
});
// A view that does not name a layout fills a slot of the layout its parent names.
const inheritedLiteral: PlainView = { slots: { heading: 'A' } };

void [missing, mixed, unknownLayout, wrongSlot, unknownSlot, unknownSource, inherited];
// @ts-expect-error Only readable() makes a Readable.
const forged: Readable<string> = { source: { get: () => '', subscribe: () => () => {} } };

// @ts-expect-error A view's input is Oneput's InputKind; there is no 'filter' kind.
const filterInput: PlainView = { input: { kind: 'filter' } };
// @ts-expect-error Only a textarea has rows.
const textRows: PlainView = { input: { kind: 'text', rows: 3 } };
const textarea: PlainView = {
  input: { kind: 'textarea', rows: 3, placeholder: { from: 'known' } }
};

void inheritedLiteral;
void [filterInput, textRows, textarea];
void forged;
void [emptySlot, inferredSnapshot];
void [typedValues, wrongLiteral, textForBuilder, flagForText, textSourceForFlag];
void [flagSourceForText, inheritedWrongLiteral, flagRowText, builderRowDetail, flagPlaceholder];
void [textRow, registryTypes, wrongSource];
