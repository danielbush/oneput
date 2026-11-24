import type { Controller } from '../../../controllers/controller.js';
import type { FlexChildBuilder } from '../../../lib/builder.js';
import type { AppLayoutParams, FChildParams, UILayout } from '../../../types.js';
import { menuItem } from '../../../lib/builder.js';
import {
  renderActiveView,
  rowBuilder,
  slot,
  viewLayout,
  type LayoutSlots,
  type Readable,
  type RowParams,
  type SourceTypes,
  type ViewDef,
  type ViewSources
} from '../interpreter.js';
import { infoRow, standardRow } from '../standardRow.js';

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

/** A row builder whose params are not text. */
const counter = rowBuilder({
  params: { count: slot<number>(), done: slot<boolean | undefined>() },
  build: ({ id, params: { count, done } }, activate) =>
    menuItem({
      id,
      action: activate,
      children: (b) => [b.fchild({ textContent: `${count} ${done}` })]
    })
});
const builders = { default: standardRow, info: infoRow, counter };
type Rows = RowParams<typeof builders>;
type Sources = { known: string; flag: boolean; footer: Footer; total: number };
type PlainView = ViewDef<Sources, never, never, Rows, Layouts>;
/** A view whose registry has no `default` builder. */
type NoDefaultView = ViewDef<Sources, never, never, Omit<Rows, 'default'>, Layouts>;

declare const footer: Footer;

const missing: PlainView = {
  // @ts-expect-error 'missing' is not a builder name.
  menu: { items: [{ id: 'row', build: 'missing' }] }
};
const otherParam: PlainView = {
  // @ts-expect-error 'counter' does not declare 'text'.
  menu: { items: [{ id: 'row', build: 'counter', params: { text: 'Standard' } }] }
};
const unknownParam: PlainView = {
  // @ts-expect-error The default builder does not declare 'colour'.
  menu: { items: [{ id: 'row', text: 'Row', colour: 'red' }] }
};
const otherBuilderParam: PlainView = {
  // @ts-expect-error The default builder does not declare 'count'; 'counter' does.
  menu: { items: [{ id: 'row', params: { text: 'Row', count: 1 } }] }
};
const noDefault: NoDefaultView = {
  // @ts-expect-error With no 'default' builder, each row names a builder.
  menu: { items: [{ id: 'row', params: { text: 'Row' } }] }
};

// Row params: a literal or a source must fit the type that the param declares.
const typedRows: PlainView = {
  menu: {
    items: [
      {
        id: 'a',
        params: { text: 'A', detail: { from: 'known' } },
        send: undefined
      },
      { id: 'b', build: 'counter', params: { count: 2, done: { from: 'flag' } } },
      { id: 'c', build: 'counter', params: { count: { from: 'total' } } },
      { id: 'd', build: 'default', params: { text: 'D' } },
      { id: 'e', build: 'info', params: { text: 'Info' } }
    ]
  }
};
const activateField: PlainView = {
  // @ts-expect-error A row activates only with send.
  menu: { items: [{ id: 'row', params: { text: 'Row' }, activate: true }] }
};
// A param is required unless its type allows undefined.
const missingParam: PlainView = {
  // @ts-expect-error 'counter' requires 'count'.
  menu: { items: [{ id: 'row', build: 'counter', params: { done: true } }] }
};
const noParams: PlainView = {
  // @ts-expect-error 'counter' requires 'count', so the row has params.
  menu: { items: [{ id: 'row', build: 'counter' }] }
};
const missingDefaultParam: PlainView = {
  // @ts-expect-error The default builder requires 'text'.
  menu: { items: [{ id: 'row', params: { detail: 'Detail' } }] }
};
// A builder gets each required param with its own type, and an optional one maybe undefined.
rowBuilder({
  params: { text: slot<string>(), note: slot<string | undefined>() },
  build: ({ id, params }) => {
    const text: string = params.text;
    // @ts-expect-error 'note' allows undefined.
    const note: string = params.note;
    return menuItem({ id, attr: { title: `${text} ${note}` } });
  }
});
const wrongParamLiteral: PlainView = {
  // @ts-expect-error 'count' takes a number, not text.
  menu: { items: [{ id: 'row', build: 'counter', params: { count: 'two' } }] }
};
const wrongParamSource: PlainView = {
  // @ts-expect-error 'known' gives text; 'done' takes a boolean.
  menu: { items: [{ id: 'row', build: 'counter', params: { count: 1, done: { from: 'known' } } }] }
};
const unknownParamSource: PlainView = {
  // @ts-expect-error 'gone' is not a source.
  menu: { items: [{ id: 'row', params: { text: { from: 'gone' } } }] }
};

// The params are apart from the row's own fields, so a param can take any of their names.
const rowFieldParams = rowBuilder({
  params: { id: slot<string>(), send: slot<string>() },
  build: ({ id, params }) => menuItem({ id, attr: { title: `${params.id} ${params.send}` } })
});
rowBuilder({
  // @ts-expect-error A param name from Object.prototype would clash with the inherited member.
  params: { toString: slot<string>() },
  build: ({ id }) => menuItem({ id })
});
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

// The shared layout params: a literal or a source of the param's type.
const sharedParams: PlainView = {
  params: { menuTitle: { from: 'known' }, busy: { from: 'flag' } }
};
// @ts-expect-error 'busy' takes a boolean, not text.
const textBusy: PlainView = { params: { busy: 'yes' } };
// @ts-expect-error 'flag' gives a boolean; 'menuTitle' takes text.
const flagTitle: PlainView = { params: { menuTitle: { from: 'flag' } } };
// @ts-expect-error An affordance is a function, so it is not a view param.
const affordance: PlainView = { params: { inputSend: { run: () => {} } } };

// Text params and the placeholder take only sources that give text.
const flagRowText: PlainView = {
  // @ts-expect-error 'flag' gives a boolean, not row text.
  menu: { items: [{ id: 'row', params: { text: { from: 'flag' } } }] }
};
const builderRowDetail: PlainView = {
  // @ts-expect-error 'footer' gives a builder, not row detail.
  menu: { items: [{ id: 'row', params: { text: 'Row', detail: { from: 'footer' } } }] }
};
// @ts-expect-error 'flag' gives a boolean, not a placeholder.
const flagPlaceholder: PlainView = { input: { placeholder: { from: 'flag' } } };
const textRow: PlainView = {
  menu: { items: [{ id: 'row', params: { text: { from: 'known' }, detail: 'Detail' } }] }
};

type Snapshot = { busy: boolean };
const registry = {
  slot: {
    known: () => 'Known',
    flag: ({ busy }: Snapshot) => busy,
    footer: () => footer,
    total: () => 3
  },
  menu: {},
  menuItem: builders
};
// A registry gives the source types of its views.
const registryTypes: Sources = {} as SourceTypes<typeof registry.slot>;
const wrongSource: ViewSources<Snapshot, Sources, never> = {
  // @ts-expect-error The 'flag' source must give a boolean.
  slot: { known: () => 'Known', flag: () => 'yes', footer: () => footer, total: () => 3 },
  menu: {},
  menuItem: {}
};
// List rows are rows of the same builders.
const listSources: ViewSources<Snapshot, Sources, 'rows', never, typeof builders> = {
  ...registry,
  menu: {
    rows: () => [
      { id: 'a', params: { text: 'A' } },
      { id: 'b', build: 'counter', params: { count: 1 } }
    ]
  }
};
const wrongListRow: ViewSources<Snapshot, Sources, 'rows', never, typeof builders> = {
  ...registry,
  // @ts-expect-error 'count' takes a number, not text.
  menu: { rows: () => [{ id: 'b', build: 'counter', params: { count: 'one' } }] }
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
  return renderActiveView(snapshot, sources, layouts, { activate: () => {} });
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

void [missing, otherParam, unknownParam, otherBuilderParam, noDefault, typedRows];
void [wrongParamLiteral, wrongParamSource, unknownParamSource, listSources, wrongListRow];
void [unknownLayout, wrongSlot, unknownSlot, unknownSource, inherited];
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
void [textRow, registryTypes, wrongSource, rowFieldParams];
void [missingParam, noParams, missingDefaultParam, activateField];
void [sharedParams, textBusy, flagTitle, affordance];
