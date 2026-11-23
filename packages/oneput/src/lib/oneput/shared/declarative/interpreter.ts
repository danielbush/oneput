import type { Controller } from '../../controllers/controller.js';
import type { Pull } from '../../lib/pull.js';
import type { AppLayoutParams, InputKind, Menu, MenuItem, UIFlags, UILayout } from '../../types.js';
import { err, ok, Result } from 'neverthrow';

/** The names of the sources whose value fits `T`. */
type SourceFor<Source, T> = {
  [Name in keyof Source]: Source[Name] extends T ? Name : never;
}[keyof Source] &
  string;

/**
 * A value of type `T`: a literal, or `{ from: name }` for a source whose value
 * fits `T`. A literal object with `from` would read as a source name, so it is
 * not a literal.
 */
type Fill<T, Source> = Exclude<T, { from: unknown }> | { from: SourceFor<Source, T> };

/** Text: a string, or the name of a source whose value is a string. */
type Text<Source> = Fill<string, Source>;

/** True for `{ from: name }`: the other values of a {@link Fill} are literals. */
function isFrom(value: unknown): value is { from: string } {
  return typeof value === 'object' && value !== null && 'from' in value;
}
type RowEvent = { type: string };
type ViewSettings = Pick<
  UIFlags,
  'enableFilter' | 'enableInputElement' | 'enableMenuItemFocus' | 'clearInputAfterAction'
>;

type Row<Label, Event extends RowEvent> = {
  id: string;
  kind?: 'info';
  text: Label;
  detail?: Label;
  icon?: string;
  activate?: boolean;
  send?: Event;
  build?: never;
};
type RowPatch<Label, Event extends RowEvent> = Pick<Row<Label, Event>, 'id'> &
  Partial<Row<Label, Event>>;

/**
 * Make a menu item from a plain row after the interpreter resolves its text.
 * Return the item with the row's ID. Use `activate` as the item's action when
 * it is present.
 */
export type PlainRowBuilder = (
  row: Pick<Row<string, never>, 'id' | 'kind' | 'text' | 'detail' | 'icon'>,
  activate?: () => void
) => MenuItem;

/**
 * A row that a named builder in `sources.menuItem` makes. Use it when the standard
 * fields cannot show the row. The row keeps only data: its ID, the builder name
 * and its event.
 */
export type BuiltRow<Item extends string, Event extends RowEvent> = {
  id: string;
  build: Item;
  send?: Event;
} & { [Field in Exclude<keyof Row<unknown, Event>, 'id' | 'send' | 'build'>]?: never };

type ViewRow<Label, Event extends RowEvent, Item extends string> =
  | RowPatch<Label, Event>
  | BuiltRow<Item, Event>;

function isBuilt<Label, Event extends RowEvent, Item extends string>(
  row: ViewRow<Label, Event, Item> | undefined
): row is BuiltRow<Item, Event> {
  return row?.build !== undefined;
}

function hasStandardFields<Label, Event extends RowEvent>(row: RowPatch<Label, Event>) {
  return [row.kind, row.text, row.detail, row.icon, row.activate].some(
    (field) => field !== undefined
  );
}

/**
 * Merge a later fixed row into the earlier fixed row with its ID, key by key.
 * `build` and the standard fields exclude each other: the later row's choice
 * wins, and a row with only `id` and `send` keeps the earlier choice.
 */
function mergeRow<Label, Event extends RowEvent, Item extends string>(
  earlier: ViewRow<Label, Event, Item> | undefined,
  later: ViewRow<Label, Event, Item>
): ViewRow<Label, Event, Item> {
  const send = later.send ?? earlier?.send;
  if (isBuilt(later)) return { id: later.id, build: later.build, send };
  if (isBuilt(earlier)) {
    return hasStandardFields(later) ? { ...later, send } : { ...earlier, send };
  }
  return { ...earlier, ...later, send };
}

type NameError = 'Expected a source for each name';
type ViewError =
  | NameError
  | ReadError
  | 'Expected a complete active view'
  | 'Expected text for each menu row'
  | 'Expected only slots that the layout declares';

/** Slot values by slot name, with no prototype, so any slot name is safe as a key. */
function slotRecord<Value>(): Record<string, Value | undefined> {
  return Object.create(null) as Record<string, Value | undefined>;
}

/**
 * Put the view's input kind in the layout params, as `AppLayoutParams.input`,
 * the param through which Oneput sets the input. With no view input, the
 * layout's own `input` stays (no value is a text input).
 */
function withInput<Source>(
  params: AppLayoutParams,
  input: ViewInput<Source> | undefined
): AppLayoutParams {
  if (input === undefined) return params;
  const kind: InputKind =
    input.kind === 'textarea'
      ? { kind: 'textarea', rows: input.rows }
      : input.kind === 'password'
        ? { kind: 'password' }
        : { kind: 'text' };
  return { ...params, input: kind };
}

/** Find a named source. A widened view type can name a source that is not there. */
function named<Name extends string, Source>(
  registry: Record<Name, Source>,
  name: Name
): Result<Source, NameError> {
  // Own enumerable names only, as Object.keys lists them.
  return Object.prototype.propertyIsEnumerable.call(registry, name)
    ? ok(registry[name])
    : err('Expected a source for each name');
}

declare const slotType: unique symbol;

/** The type of the value that one slot takes. Make it with {@link slot}. */
export type Slot<T> = { readonly [slotType]?: T };

/**
 * Declare a slot that takes a value of type `T`, for example `slot<string>()`
 * for text, `slot<boolean>()` for a flag, or a builder function type for any
 * content. Only the type has an effect; the value is empty.
 */
export function slot<T>(): Slot<T> {
  return {};
}

/** Slot declarations by slot name. */
type SlotMap = Record<string, Slot<unknown>>;

/** The value type of each slot in a slot map. */
type SlotTypes<Slots> = { [Name in keyof Slots]: Slots[Name] extends Slot<infer T> ? T : never };

/**
 * A layout that a view names: its slots and their types, the layout component
 * that shows it, and how the resolved slot values become that component's
 * params. Make one with {@link viewLayout}. Register layouts once and share
 * them across AppObjects.
 */
export type ViewLayout<
  Slots extends SlotMap = SlotMap,
  Params extends AppLayoutParams = AppLayoutParams
> = {
  slots: Slots;
  create(ctl: Controller, params: Params): UILayout<Params>;
  /** Make the params from the values of the filled slots. The layout decides how to show them. */
  params(values: Partial<SlotTypes<Slots>>): Params;
};

/** A slot name that an object inherits, such as `toString`, would clash with it. */
type InheritedName = keyof typeof Object.prototype | '__proto__';

/**
 * Make a {@link ViewLayout}. The slot declarations type the values that
 * `params` gets and the values that views can fill:
 *
 * ```ts
 * viewLayout({
 *   slots: { title: slot<string>(), busy: slot<boolean>() },
 *   create: MyLayout.create,
 *   params: ({ title, busy }) => ({ menuTitle: title, inputRight: busy ? spinner : undefined })
 * });
 * ```
 *
 * Slot names from `Object.prototype` are type errors.
 */
export function viewLayout<Slots extends SlotMap, Params extends AppLayoutParams>(
  layout: ViewLayout<Slots, Params> & {
    slots: { [Name in keyof Slots & InheritedName]: never };
  }
): ViewLayout<Slots, Params> {
  return layout;
}

/** Layouts by name. */
export type ViewLayouts = Record<string, ViewLayout>;

/** The value type of each slot of each layout in a registry, by layout name. */
export type LayoutSlots<Layouts extends ViewLayouts> = {
  [Name in keyof Layouts]: SlotTypes<Layouts[Name]['slots']>;
};

/** Slot value types by slot name, for each layout name. */
type LayoutTypes = Record<string, object>;

/** A layout with no slots takes none. */
type SlotValues<Types, Source> = [keyof Types] extends [never]
  ? Record<string, never>
  : { [Name in keyof Types]?: Fill<Types[Name], Source> };

/** The slots of any one layout that has slots. */
type AnyLayoutSlots<Layouts extends LayoutTypes, Source> = {
  [Name in keyof Layouts]: [keyof Layouts[Name]] extends [never]
    ? never
    : SlotValues<Layouts[Name], Source>;
}[keyof Layouts];

/**
 * A view that names a layout fills only that layout's slots, each with a value
 * of the slot's type. A view that does not name one fills the slots of the
 * layout a parent names; the type allows the slots of any registered layout
 * there, and rendering checks the names.
 */
type LayoutChoice<Layouts extends LayoutTypes, Source> =
  | {
      [Name in keyof Layouts & string]: {
        layout: Name;
        slots?: SlotValues<Layouts[Name], Source>;
      };
    }[keyof Layouts & string]
  | { layout?: never; slots?: AnyLayoutSlots<Layouts, Source> };

type NoLayouts = Record<never, never>;
type NoSources = Record<never, never>;

/**
 * The input for a view: Oneput's {@link InputKind}, with no `kind` meaning a
 * text input, and an optional placeholder. A child's `input` replaces its
 * parent's whole input, so a `textarea`'s `rows` never stays on a text input.
 */
export type ViewInput<Source = NoSources> = (
  | { kind?: 'text' }
  | { kind: 'password' }
  | { kind: 'textarea'; rows?: number }
) & { placeholder?: Text<Source> };

/**
 * Metadata for one state's contribution to the view. Use named sources for
 * changing data. `Source` gives the value type of each slot source by name
 * (see {@link SourceTypes}). `layout` names a registered layout, and `slots`
 * fill it.
 */
export type ViewDef<
  Source = NoSources,
  List extends string = never,
  Event extends RowEvent = never,
  Item extends string = never,
  Layouts extends LayoutTypes = NoLayouts
> = LayoutChoice<Layouts, Source> & {
  menu?: {
    id?: string;
    focusBehaviour?: Menu['focusBehaviour'];
    /** Fixed rows. A child can override a parent's fixed row with the same ID. */
    items?: readonly ViewRow<Text<Source>, Event, Item>[];
    /** The list source. Its rows appear in source order before the fixed rows. */
    from?: List;
  };
  input?: ViewInput<Source>;
  settings?: ViewSettings;
};

/** The metadata read from an actor snapshot. */
export type ViewSnapshot<
  Source,
  List extends string,
  Event extends RowEvent,
  Item extends string = never,
  Layouts extends LayoutTypes = NoLayouts
> = {
  machine: { getStateNodeById(id: string): { path: readonly string[] } };
  getMeta(): Record<string, { view?: ViewDef<Source, List, Event, Item, Layouts> } | undefined>;
};

type ListRow<Event extends RowEvent, Item extends string> =
  | Row<string, Event>
  | BuiltRow<Item, Event>;
type Builder<Event extends RowEvent, Item extends string> = (
  row: BuiltRow<Item, Event>,
  activate: () => void
) => MenuItem;

/**
 * A value that a source reads, and a way to hear that it changed. A computed
 * from a signals library fits through a small adapter.
 */
export type ReadableSource<T> = Required<Pull<T>>;

/**
 * A source marked as readable. Only {@link readable} makes one: the private
 * field means no other object has this type.
 */
export class Readable<T> {
  readonly #source: ReadableSource<T>;

  private constructor(source: ReadableSource<T>) {
    this.#source = source;
  }

  /** Use {@link readable}. */
  static mark<T>(source: ReadableSource<T>): Readable<T> {
    return new Readable(source);
  }

  get source(): ReadableSource<T> {
    return this.#source;
  }
}

/**
 * Mark a source as readable: data that something else owns, for example a
 * signal of the host. The interpreter reads it with `get`, and the adapter
 * subscribes to it, so a change redraws the view with no new snapshot.
 */
export function readable<T>(source: ReadableSource<T>): Readable<T> {
  return Readable.mark(source);
}

/**
 * True for a source made by {@link readable} around a source with `get` and
 * `subscribe`. Reads and subscriptions both use it, so they always agree.
 */
function isReadable(source: unknown): source is Readable<unknown> {
  return (
    source instanceof Readable &&
    typeof source.source.get === 'function' &&
    typeof source.source.subscribe === 'function'
  );
}

/** Each registry's sources, in the same way that {@link named} finds them. */
function sourcesOf(registry: object): unknown[] {
  return Object.keys(registry).map((name) => (registry as Record<string, unknown>)[name]);
}

type ReadError = 'Expected each source to read without an error';

/** Read a source. A source that throws gives the typed error, not an exception. */
function attempt<T>(read: () => T): Result<T, ReadError> {
  return Result.fromThrowable(
    read,
    (): ReadError => 'Expected each source to read without an error'
  )();
}

/**
 * Named code that a view refers to by name, so the view stays data.
 * `slot` gives changing values for slots and text, `menu` gives changing rows,
 * and `menuItem` builds a row that names it in `build`. A `slot` source gives a
 * value of the type that the slot declares; row text, row detail and the input
 * placeholder take only sources that give a string. Return the item with the row's ID. The
 * builder's `activate` sends the row's event (`send`, else `ITEM_ACTIVATED`) to
 * the actor; use it as the item's action.
 *
 * A plain function reads the actor snapshot: use it for data that the machine
 * owns in its context. A source marked with {@link readable} reads data that
 * something else owns. One registry can hold both kinds. A readable builder
 * gives the builder that fits the current state.
 */
export type ViewSources<
  Snapshot,
  Source,
  List extends string,
  Event extends RowEvent = never,
  Item extends string = never
> = {
  slot: { [Name in keyof Source]: ((snapshot: Snapshot) => Source[Name]) | Readable<Source[Name]> };
  menu: Record<
    List,
    | ((snapshot: Snapshot) => readonly ListRow<Event, Item>[])
    | Readable<readonly ListRow<Event, Item>[]>
  >;
  menuItem: Record<
    Item,
    | ((snapshot: Snapshot, row: BuiltRow<Item, Event>, activate: () => void) => MenuItem)
    | Readable<Builder<Event, Item>>
  >;
};

/**
 * The value type of each source in a `slot` registry, by name: the `Source`
 * of a {@link ViewDef}. For example `SourceTypes<typeof content.slot>`.
 */
export type SourceTypes<Sources> = {
  [Name in keyof Sources]: Sources[Name] extends Readable<infer T>
    ? T
    : Sources[Name] extends (snapshot: never) => infer T
      ? T
      : never;
};

/** The readable sources in a registry, to subscribe to, so that their changes redraw the view. */
export function sourceSubscriptions(sources: {
  slot: object;
  menu: object;
  menuItem: object;
}): ReadableSource<unknown>[] {
  return [sources.slot, sources.menu, sources.menuItem]
    .flatMap(sourcesOf)
    .filter(isReadable)
    .map(({ source }) => source);
}

export type OneputView = {
  /** The named layout and its params. */
  layout: { name: string; create: ViewLayout['create']; params: AppLayoutParams };
  menu: Menu;
  settings: ViewSettings;
  placeholder?: string;
};

type Activation<Event extends RowEvent> = Event | { type: 'ITEM_ACTIVATED'; id: string };

/**
 * Resolve the active states' metadata, with parents first.
 * A child's `layout` replaces its parent's; when it names a different layout,
 * the parent's slots do not apply. Slots, settings and menu fields merge by
 * key, and a child can clear `input` with `input: undefined`. List rows keep
 * their order and IDs, including repeats. Fixed rows follow in order of
 * first declaration, with same-ID overrides (see {@link mergeRow}).
 * A name with no source or layout, or a slot that the active layout does
 * not declare, gives an error.
 *
 * The registry `layouts` types the layout names and slots that the views can
 * use. The layout gets each filled slot's value as the source or literal
 * gives it, and decides how to show it. `defaultRow` makes each item whose row
 * has no `build` name.
 */
export function renderActiveView<
  Source,
  List extends string,
  Event extends RowEvent,
  Item extends string,
  Layouts extends ViewLayouts,
  Snapshot
>(
  snapshot: Snapshot &
    ViewSnapshot<NoInfer<Source>, List, Event, Item, NoInfer<LayoutSlots<Layouts>>>,
  sources: ViewSources<NoInfer<Snapshot>, Source, List, Event, Item>,
  layouts: Layouts,
  {
    defaultRow,
    activate
  }: { defaultRow: PlainRowBuilder; activate: (event: Activation<Event>) => void }
): Result<OneputView, ViewError> {
  const views = Object.entries(snapshot.getMeta())
    .flatMap(([id, meta]) =>
      meta?.view
        ? [{ depth: snapshot.machine.getStateNodeById(id).path.length, view: meta.view }]
        : []
    )
    .sort((a, b) => a.depth - b.depth)
    .map(({ view }) => view);
  let layoutName: string | undefined;
  let input: ViewDef<Source>['input'];
  let menu: NonNullable<ViewDef<Source, List, Event, Item>['menu']> = {};
  let settings: ViewSettings = {};
  let slots = slotRecord<unknown>();
  for (const view of views) {
    if (view.layout !== undefined && view.layout !== layoutName) {
      layoutName = view.layout;
      slots = slotRecord();
    }
    if ('input' in view) input = view.input;
    menu = { ...menu, ...view.menu };
    settings = { ...settings, ...view.settings };
    Object.assign(slots, view.slots);
  }
  const menuId = menu.id;
  if (layoutName === undefined || menuId === undefined) {
    return err('Expected a complete active view');
  }
  const found = named(layouts, layoutName);
  if (found.isErr()) return err(found.error);
  // The values come from the merged slots, so they are keyed by any slot name.
  const layout: ViewLayout = found.value;
  const declared = Object.keys(layout.slots);
  if (Object.keys(slots).some((slot) => !declared.includes(slot))) {
    return err('Expected only slots that the layout declares');
  }
  const filled = Object.keys(slots).filter((slot) => slots[slot] !== undefined);

  /**
   * A literal as it is, or the value of the named source. The view type names
   * only sources that fit, so the value is not checked; `named` checks the name.
   */
  const read = (value: unknown): Result<unknown, NameError | ReadError> =>
    isFrom(value)
      ? named(sources.slot, value.from as keyof Source & string).andThen((source) =>
          attempt(() => (isReadable(source) ? source.source.get() : source(snapshot)))
        )
      : ok(value);
  // The type of `from` names only sources that give a string.
  const readText = (text: Text<Source>) => read(text) as Result<string, NameError | ReadError>;
  const readOptional = (
    text: Text<Source> | undefined
  ): Result<string | undefined, NameError | ReadError> =>
    text === undefined ? ok(undefined) : readText(text);

  let listRows: readonly ListRow<Event, Item>[] = [];
  if (menu.from !== undefined) {
    const list = named(sources.menu, menu.from).andThen((source) =>
      attempt(() => (isReadable(source) ? source.source.get() : source(snapshot)))
    );
    if (list.isErr()) return err(list.error);
    listRows = list.value;
  }
  const fixedRows = new Map<string, ViewRow<Text<Source>, Event, Item>>();
  for (const { menu } of views) {
    for (const row of menu?.items ?? []) {
      fixedRows.set(row.id, mergeRow(fixedRows.get(row.id), row));
    }
  }

  const renderRow = (row: ViewRow<Text<Source>, Event, Item>): Result<MenuItem, ViewError> => {
    const { id, send } = row;
    const raise = () => activate(send ?? { type: 'ITEM_ACTIVATED', id });
    if (isBuilt(row)) {
      return named(sources.menuItem, row.build).andThen((build) =>
        attempt(() =>
          isReadable(build) ? build.source.get()(row, raise) : build(snapshot, row, raise)
        )
      );
    }
    const { kind, text, detail, icon } = row;
    if (text === undefined) return err('Expected text for each menu row');
    const canActivate = kind !== 'info' && (row.activate ?? send !== undefined);
    return Result.combine([
      readText(text),
      readOptional(kind === 'info' ? undefined : detail)
    ]).andThen(([text, detail]) =>
      attempt(() => defaultRow({ id, kind, text, detail, icon }, canActivate ? raise : undefined))
    );
  };

  const slotValues = Result.combine(
    filled.map((slot) => read(slots[slot]).map((value) => [slot, value] as const))
  ).map((entries) => {
    const values = slotRecord<unknown>();
    for (const [slot, value] of entries) values[slot] = value;
    return values;
  });

  return Result.combine([
    Result.combine([...listRows, ...fixedRows.values()].map(renderRow)),
    slotValues,
    readOptional(input?.placeholder)
  ]).map(([items, values, placeholder]) => ({
    layout: {
      name: layoutName,
      create: layout.create,
      params: withInput(layout.params(values), input)
    },
    menu: { id: menuId, focusBehaviour: menu.focusBehaviour, items },
    settings,
    placeholder
  }));
}
