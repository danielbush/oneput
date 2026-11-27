import type { Controller } from '../../controllers/controller.js';
import type { ActionBinding } from '../../lib/bindings.js';
import type { Pull } from '../../lib/pull.js';
import type { AppLayoutParams, Menu, MenuItem, UIFlags, UILayout } from '../../types.js';
import { err, ok, Result } from 'neverthrow';

/** The names of the sources whose value fits `T`. */
type SourceFor<Source, T> = {
  [Name in keyof Source]: Source[Name] extends T ? Name : never;
}[keyof Source] &
  string;

/**
 * The members of `T` that can be literals: those with no `$from` key, not even
 * an optional one, which would read as a source name. A type with an index
 * signature can have any key, so it is not a literal; give it from a source.
 */
type Literal<T> = T extends unknown ? ('$from' extends keyof T ? never : T) : never;

/**
 * A value of type `T`: a literal, or `{ $from: name }` for a source whose value
 * fits `T`. The `$` keeps data with a `from` field, such as a chat message,
 * a literal.
 */
type Fill<T, Source> = Literal<T> | { $from: SourceFor<Source, T> };

/** Text: a string, or the name of a source whose value is a string. */
type Text<Source> = Fill<string, Source>;

/** True for `{ $from: name }`: the other values of a {@link Fill} are literals. */
function isFrom(value: unknown): value is { $from: string } {
  return typeof value === 'object' && value !== null && '$from' in value;
}
type RowEvent = { type: string };

/**
 * A view's action: what `AppObject.actions` declares, with an event in place
 * of the function. The adapter sends the event when the machine can take it
 * (`snapshot.can`); otherwise the action declines, so the key does what the
 * browser does by default.
 */
export type ViewAction<Event extends RowEvent> = {
  send: Event;
  /** The key. With no binding, the action uses the key its ID already has, such as SUBMIT's. */
  binding?: ActionBinding;
};
type ViewSettings = Pick<
  UIFlags,
  'enableFilter' | 'enableInputElement' | 'enableMenuItemFocus' | 'clearInputAfterAction'
>;

/** The row fields that the interpreter reads. The builder's params are apart, in `params`. */
type RowFields<Event extends RowEvent> = {
  id: string;
  /**
   * The row's event. The builder gets a function that sends it, and decides
   * which element raises it.
   */
  send?: Event;
};

/** The name of the row builder that draws each row with no `build` name. */
type DefaultRow = 'default';
const defaultRow: DefaultRow = 'default';

/** The names whose type allows `undefined`. */
type OptionalName<Types> = {
  [Name in keyof Types]: undefined extends Types[Name] ? Name : never;
}[keyof Types];

/** `Types` with a key optional where its type allows `undefined`, and required elsewhere. */
type OptionalUndefined<Types> = {
  [Name in Exclude<keyof Types, OptionalName<Types>>]: Types[Name];
} & { [Name in OptionalName<Types>]?: Types[Name] };

/**
 * Each param value of a row: a literal or `{ $from: name }` of the param's
 * type. A param is required unless its type allows `undefined`.
 */
type ParamValues<Types, Source> = OptionalUndefined<{
  [Name in keyof Types]: Fill<Types[Name], Source>;
}>;

/** A row's `params`: required when the builder has a required param. */
type ParamsField<Values> = {} extends Values ? { params?: Values } : { params: Values };

/**
 * A menu row: the builder that draws it (`build`), its activation, and the
 * builder's params in `params`. A row with no `build` uses the `default`
 * builder. `Rows` gives the param types of each builder by name (see
 * {@link RowParams}).
 */
export type ViewRow<Rows extends TypesByName, Source, Event extends RowEvent> =
  | {
      [Name in keyof Rows & string]: RowFields<Event> & { build: Name } & ParamsField<
          ParamValues<Rows[Name], Source>
        >;
    }[keyof Rows & string]
  | (DefaultRow extends keyof Rows
      ? RowFields<Event> & { build?: never } & ParamsField<
            ParamValues<Rows[DefaultRow], Source> & {
              [Name in Exclude<AllNames<Rows>, keyof Rows[DefaultRow]>]?: never;
            }
          >
      : never);

/**
 * The names in any entry of a registry: the param names of all builders, or
 * the slot names of all layouts. A row with no `build` cannot take the other
 * builders' params: with no builder name, TypeScript checks its params against
 * all the builders.
 */
type AllNames<Rows> = Rows[keyof Rows] extends infer Params
  ? Params extends unknown
    ? keyof Params
    : never
  : never;

/** A row as the interpreter merges and draws it: any builder name and params. */
type AnyRow<Event extends RowEvent> = RowFields<Event> & {
  build?: string;
  params?: Record<string, unknown>;
};

/**
 * Merge a later fixed row into the earlier fixed row with its ID. The row's
 * own fields merge key by key. Its params merge key by key while the later
 * row keeps the builder; when it names another builder (no `build` names the
 * default), the later row's params replace them.
 */
function mergeRow<Event extends RowEvent>(
  earlier: AnyRow<Event> | undefined,
  later: AnyRow<Event>
): AnyRow<Event> {
  if (earlier === undefined) return later;
  const builder = (row: AnyRow<Event>) => row.build ?? defaultRow;
  const params =
    builder(later) === builder(earlier) ? { ...earlier.params, ...later.params } : later.params;
  return { ...earlier, ...later, build: later.build, params };
}

type NameError = 'Expected a source for each name';
type ViewError =
  | NameError
  | ReadError
  | 'Expected a complete active view'
  | 'Expected only slots that the layout declares';

/** Slot values by slot name, with no prototype, so any slot name is safe as a key. */
function slotRecord<Value>(): Record<string, Value | undefined> {
  return Object.create(null) as Record<string, Value | undefined>;
}

/**
 * The values that are not `undefined`: a child gives `undefined` to clear a
 * value. Applied to read values, so a source that gives `undefined` clears it
 * as a literal `undefined` does.
 */
function filledOf(record: Record<string, unknown>) {
  const filled = slotRecord<unknown>();
  for (const name of Object.keys(record)) {
    if (record[name] !== undefined) filled[name] = record[name];
  }
  return filled;
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

/** The type of the value that one layout slot or row param takes. Make it with {@link slot}. */
export type Slot<T> = { readonly [slotType]?: T };

/**
 * Declare a layout slot or a row builder param that takes a value of type
 * `T`, for example `slot<string>()` for text, `slot<boolean>()` for a flag,
 * or a builder function type for any content. Only the type has an effect;
 * the value is empty.
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
 * `params` gets and the values that views can fill. Slots are for what this
 * layout adds; the params that every layout takes come from the view's
 * `params`:
 *
 * ```ts
 * viewLayout({
 *   slots: { status: slot<string>(), compact: slot<boolean>() },
 *   create: MyLayout.create,
 *   params: ({ status, compact }) => ({ statusText: status, compact })
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

/**
 * Code that draws one kind of menu row: its params and their types, and how
 * the resolved params become a menu item. Make one with {@link rowBuilder}
 * and register it in `sources.menuItem`.
 */
export type RowBuilder<Params extends SlotMap = SlotMap> = {
  params: Params;
  /**
   * Make the item from the row's ID and the values of its params. Return the
   * item with the row's ID. `activate`, present when the row has `send`,
   * sends the row's event; the builder decides which element raises it, for
   * example as the item's action, or none.
   */
  build(
    row: { id: string; params: OptionalUndefined<SlotTypes<Params>> },
    activate?: () => void
  ): MenuItem;
};

/**
 * Make a {@link RowBuilder}. The param declarations type the values that
 * `build` gets and the values that rows give, as slots do for a layout. A row
 * must give each param unless its type allows `undefined`
 * (`slot<string | undefined>()`):
 *
 * ```ts
 * rowBuilder({
 *   params: { label: slot<string>(), count: slot<number>() },
 *   build: ({ id, params: { label, count } }, activate) =>
 *     menuItem({ id, action: activate, children: (b) => [b.fchild({ textContent: `${label}: ${count}` })] })
 * });
 * ```
 *
 * Param names from `Object.prototype` are type errors. Any other name is
 * free: the params are apart from the row's own fields.
 */
export function rowBuilder<Params extends SlotMap>(
  builder: RowBuilder<Params> & {
    params: { [Name in keyof Params & InheritedName]: never };
  }
): RowBuilder<Params> {
  return builder;
}

/** Row builders by name. The `default` builder draws each row with no `build` name. */
export type RowBuilders = Record<string, RowBuilder>;

/** The value type of each param of each row builder in a registry, by builder name. */
export type RowParams<Builders extends RowBuilders> = {
  [Name in keyof Builders]: SlotTypes<Builders[Name]['params']>;
};

/** Value types by slot or param name, for each layout or row builder name. */
type TypesByName = Record<string, object>;

/**
 * Each slot's value: a literal or `{ $from: name }` of the slot's type, or
 * `undefined` (also from a source) to leave the slot to the layout. A layout
 * with no slots takes none.
 */
type SlotValues<Types, Source> = [keyof Types] extends [never]
  ? Record<string, never>
  : { [Name in keyof Types]?: Fill<Types[Name] | undefined, Source> };

/**
 * The type that fits slot `Name` in every layout that declares it: the
 * intersection of their types, `never` when they conflict.
 */
type InheritedType<Layouts extends TypesByName, Name> = {
  [Layout in keyof Layouts]: Name extends keyof Layouts[Layout]
    ? (value: Layouts[Layout][Name]) => void
    : never;
}[keyof Layouts] extends (value: infer T) => void
  ? T
  : never;

/**
 * The slots that a view with no layout can fill: any registered layout's,
 * each with a value that fits every layout declaring that slot, since a parent
 * may name any of them.
 */
type InheritedSlots<Layouts extends TypesByName, Source> = [AllNames<Layouts>] extends [never]
  ? Record<string, never>
  : { [Name in AllNames<Layouts>]?: Fill<InheritedType<Layouts, Name> | undefined, Source> };

/**
 * A view that names a layout fills only that layout's slots, each with a value
 * of the slot's type. A view that does not name one fills the slots of the
 * layout a parent names; the type allows the slots of any registered layout
 * there, each with a value that fits every layout that declares it, and
 * rendering checks the names.
 */
type LayoutChoice<Layouts extends TypesByName, Source> =
  | {
      [Name in keyof Layouts & string]: {
        layout: Name;
        slots?: SlotValues<Layouts[Name], Source>;
      };
    }[keyof Layouts & string]
  | { layout?: never; slots?: InheritedSlots<Layouts, Source> };

type NoLayouts = Record<never, never>;
type NoRows = Record<never, never>;
type NoSources = Record<never, never>;

/**
 * The layout params that every layout takes ({@link AppLayoutParams}), as a
 * view gives them. The affordances are left out, because their functions
 * cannot be in a machine config.
 */
type SharedParams = Omit<AppLayoutParams, 'inputSend' | 'inputAccept' | 'inputReject'>;

/**
 * Metadata for one state's contribution to the view. Use named sources for
 * changing data. `Source` gives the value type of each slot source by name
 * (see {@link SourceTypes}). `params` gives the layout params that every
 * layout takes, such as `menuTitle` and `busy`. `layout` names a registered
 * layout, and `slots` fill what that layout adds. `Rows` gives the param
 * types of each row builder by name (see {@link RowParams}).
 */
export type ViewDef<
  Source = NoSources,
  List extends string = never,
  Event extends RowEvent = never,
  Rows extends TypesByName = NoRows,
  Layouts extends TypesByName = NoLayouts
> = LayoutChoice<Layouts, Source> & {
  /** Each shared layout param: a literal or `{ $from: name }` of the param's type. */
  params?: { [Name in keyof SharedParams]?: Fill<SharedParams[Name], Source> };
  menu?: {
    id?: string;
    focusBehaviour?: Menu['focusBehaviour'];
    /** Fixed rows. A child can override a parent's fixed row with the same ID. */
    items?: readonly ViewRow<Rows, Source, Event>[];
    /**
     * The `menu` source whose rows to show, named with `$from` as every source is.
     * Its rows appear in source order before the fixed rows.
     */
    $from?: List;
  };
  /** The input placeholder: text, or a source that gives text. */
  placeholder?: Text<Source>;
  /**
   * The input text, when the machine controls it: text, or a source that
   * gives text. When it is not the input's text, the adapter sets the input. Keep it equal to the text that `INPUT_CHANGED` gives,
   * and change it to change the input, for example to clear it after a
   * submit. With no value, the user alone controls the input.
   */
  inputValue?: Text<Source>;
  /**
   * Actions by action ID, as `AppObject.actions` declares them. Merged by ID;
   * a child's action replaces its parent's.
   */
  actions?: { [actionId: string]: ViewAction<Event> };
  /**
   * The layout's send control (`inputSend`) and the event that it sends. It
   * is enabled while the machine can take the event.
   */
  inputSend?: { send: Event };
  settings?: ViewSettings;
};

/**
 * The {@link ViewDef} for an AppObject's content (its `slot`, `menu` and
 * `menuItem` registries, see {@link ViewSources}), its layouts and the events
 * that its rows, actions and `inputSend` send, for the machine's `meta` type:
 *
 * ```ts
 * type SearchView = ViewFor<SearchContent, typeof viewLayouts, RowEvent>;
 * ```
 */
export type ViewFor<
  Content extends { slot: object; menu: object; menuItem: RowBuilders },
  Layouts extends ViewLayouts,
  Event extends RowEvent = never
> = ViewDef<
  SourceTypes<Content['slot']>,
  keyof Content['menu'] & string,
  Event,
  RowParams<Content['menuItem']>,
  LayoutSlots<Layouts>
>;

/** The views in a snapshot's metadata. Views typed `any` give none, so they are not checked. */
type ViewsOf<Snapshot> = Snapshot extends { getMeta(): infer Meta }
  ? Meta[keyof Meta] extends infer Entry
    ? Entry extends { view?: infer View }
      ? 0 extends 1 & View
        ? never
        : NonNullable<View>
      : never
    : never
  : never;

/**
 * The slot names that a view fills and its layout does not declare, or that
 * no layout declares for a view with no layout. Slots typed with an index
 * signature name no slot, so they are not checked.
 */
type UndeclaredSlots<View, Layouts extends ViewLayouts> = View extends { slots?: infer Slots }
  ? string extends keyof NonNullable<Slots>
    ? never
    : Exclude<
        keyof NonNullable<Slots>,
        View extends { layout: infer Name extends keyof Layouts }
          ? keyof Layouts[Name]['slots']
          : AllNames<LayoutSlots<Layouts>>
      >
  : never;

/**
 * Nothing when the snapshot's views fill only declared slots. Otherwise a
 * field that names the others, which the layouts lack: TypeScript has no
 * exact object types, so a view inferred from a literal can carry a slot
 * beside the declared ones.
 */
export type DeclaredSlots<Snapshot, Layouts extends ViewLayouts> = [
  UndeclaredSlots<ViewsOf<Snapshot>, Layouts>
] extends [never]
  ? unknown
  : { 'Expected only slots that the layout declares': UndeclaredSlots<ViewsOf<Snapshot>, Layouts> };

/** The metadata read from an actor snapshot. */
export type ViewSnapshot<
  Source,
  List extends string,
  Event extends RowEvent,
  Rows extends TypesByName = NoRows,
  Layouts extends TypesByName = NoLayouts
> = {
  machine: { getStateNodeById(id: string): { path: readonly string[] } };
  getMeta(): Record<string, { view?: ViewDef<Source, List, Event, Rows, Layouts> } | undefined>;
};

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
 * `slot` gives changing values for slots and row params, `menu` gives
 * changing rows, and `menuItem` holds the row builders (see {@link rowBuilder}).
 * A `slot` source gives a value of the type that the slot or param declares,
 * and the input placeholder takes only sources that give a string. A row names
 * its builder in `build`; the `default` builder draws each row with no `build`.
 *
 * A plain function reads the actor snapshot: use it for data that the machine
 * owns in its context. A source marked with {@link readable} reads data that
 * something else owns. One registry can hold both kinds.
 */
export type ViewSources<
  Snapshot,
  Source,
  List extends string,
  Event extends RowEvent = never,
  Builders extends RowBuilders = NoRows
> = {
  slot: { [Name in keyof Source]: ((snapshot: Snapshot) => Source[Name]) | Readable<Source[Name]> };
  menu: Record<
    List,
    | ((snapshot: Snapshot) => readonly ViewRow<RowParams<Builders>, Source, Event>[])
    | Readable<readonly ViewRow<RowParams<Builders>, Source, Event>[]>
  >;
  menuItem: Builders;
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
}): ReadableSource<unknown>[] {
  return [sources.slot, sources.menu]
    .flatMap(sourcesOf)
    .filter(isReadable)
    .map(({ source }) => source);
}

export type OneputView<Event extends RowEvent = RowEvent> = {
  /** The named layout and its params. */
  layout: { name: string; create: ViewLayout['create']; params: AppLayoutParams };
  menu: Menu;
  settings: ViewSettings;
  placeholder?: string;
  inputValue?: string;
  actions: Record<string, ViewAction<Event>>;
  inputSend?: { send: Event };
};

/**
 * Resolve the active states' metadata, with parents first.
 * A child's `layout` replaces its parent's; when it names a different layout,
 * the parent's slots do not apply, and its `params` still do. Params, slots,
 * settings and menu fields merge by key, and a child clears a param with
 * `undefined`; a child's `input` param replaces its parent's whole input kind.
 * A child's `placeholder`, `inputValue` and `inputSend` replace its parent's,
 * and `undefined` clears them. Actions merge by ID. The layout gets the view's params over its own. List rows keep
 * their order and IDs, including repeats. Fixed rows follow in order of
 * first declaration, with same-ID overrides (see {@link mergeRow}).
 * A name with no source, builder or layout, or a slot that the active layout
 * does not declare, gives an error.
 *
 * The registry `layouts` types the layout names and slots that the views can
 * use, and `sources.menuItem` types the row builder names and params. The
 * snapshot's views are checked against them by the constraint on `Snapshot`,
 * not intersected with them: an intersection would let a view fill a slot
 * that the layout does not declare, such as a misspelt one, and
 * {@link DeclaredSlots} on `layouts` catches one beside declared slots. `snapshot`
 * decides `Snapshot` and `activate` decides `Event`; `NoInfer` keeps the
 * source functions' parameter types and the list rows' `send` from deciding
 * them. A layout
 * or row builder gets each filled value as the source or literal gives it,
 * and decides how to show it.
 */
export function renderActiveView<
  Source,
  List extends string,
  Event extends RowEvent,
  Builders extends RowBuilders,
  Layouts extends ViewLayouts,
  Snapshot extends ViewSnapshot<Source, List, Event, RowParams<Builders>, LayoutSlots<Layouts>>
>(
  snapshot: Snapshot,
  sources: ViewSources<NoInfer<Snapshot>, Source, List, NoInfer<Event>, Builders>,
  layouts: Layouts & DeclaredSlots<NoInfer<Snapshot>, NoInfer<Layouts>>,
  { activate }: { activate: (event: Event) => void }
): Result<OneputView<Event>, ViewError> {
  const views = Object.entries(snapshot.getMeta())
    .flatMap(([id, meta]) =>
      meta?.view
        ? [{ depth: snapshot.machine.getStateNodeById(id).path.length, view: meta.view }]
        : []
    )
    .sort((a, b) => a.depth - b.depth)
    .map(({ view }) => view);
  let layoutName: string | undefined;
  let placeholder: ViewDef<Source>['placeholder'];
  let inputValue: ViewDef<Source>['inputValue'];
  let inputSend: ViewDef<Source, List, Event>['inputSend'];
  let actions: Record<string, ViewAction<Event>> = {};
  // The rows are merged by ID below, not with the other menu fields.
  let menu: Omit<NonNullable<ViewDef<Source, List>['menu']>, 'items'> = {};
  let settings: ViewSettings = {};
  let slots = slotRecord<unknown>();
  const params = slotRecord<unknown>();
  for (const view of views) {
    if (view.layout !== undefined && view.layout !== layoutName) {
      layoutName = view.layout;
      slots = slotRecord();
    }
    if ('placeholder' in view) placeholder = view.placeholder;
    if ('inputValue' in view) inputValue = view.inputValue;
    if ('inputSend' in view) inputSend = view.inputSend;
    actions = { ...actions, ...view.actions };
    menu = { ...menu, ...view.menu };
    settings = { ...settings, ...view.settings };
    Object.assign(slots, view.slots);
    Object.assign(params, view.params);
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

  /**
   * A literal as it is, or the value of the named source. The view type names
   * only sources that fit, so the value is not checked; `named` checks the name.
   */
  const read = (value: unknown): Result<unknown, NameError | ReadError> =>
    isFrom(value)
      ? named(sources.slot, value.$from as keyof Source & string).andThen((source) =>
          attempt(() => (isReadable(source) ? source.source.get() : source(snapshot)))
        )
      : ok(value);

  /** Read each value of a record, keyed as the record is. */
  const readAll = (record: Record<string, unknown>) =>
    Result.combine(
      Object.keys(record).map((name) => read(record[name]).map((value) => [name, value] as const))
    ).map((entries) => {
      const values = slotRecord<unknown>();
      for (const [name, value] of entries) values[name] = value;
      return values;
    });

  // The rows that the view types allow, as the interpreter merges and draws them.
  let listRows: readonly AnyRow<Event>[] = [];
  if (menu.$from !== undefined) {
    const list = named(sources.menu, menu.$from).andThen((source) =>
      attempt(() => (isReadable(source) ? source.source.get() : source(snapshot)))
    );
    if (list.isErr()) return err(list.error);
    listRows = list.value as readonly AnyRow<Event>[];
  }
  const fixedRows = new Map<string, AnyRow<Event>>();
  for (const { menu } of views) {
    for (const row of (menu?.items ?? []) as readonly AnyRow<Event>[]) {
      fixedRows.set(row.id, mergeRow(fixedRows.get(row.id), row));
    }
  }

  const renderRow = (row: AnyRow<Event>): Result<MenuItem, ViewError> => {
    const { id, build = defaultRow, send, params = {} } = row;
    const raise = send === undefined ? undefined : () => activate(send);
    return Result.combine([named(sources.menuItem, build), readAll(params)]).andThen(
      ([builder, values]) => attempt(() => builder.build({ id, params: values }, raise))
    );
  };

  return Result.combine([
    Result.combine([...listRows, ...fixedRows.values()].map(renderRow)),
    readAll(slots).map(filledOf),
    // The view types give each param a value of its type.
    readAll(params).map(filledOf) as Result<SharedParams, NameError | ReadError>,
    read(placeholder) as Result<string | undefined, NameError | ReadError>,
    read(inputValue) as Result<string | undefined, NameError | ReadError>
  ]).map(([items, values, shared, text, value]) => ({
    layout: {
      name: layoutName,
      create: layout.create,
      params: { ...layout.params(values), ...shared }
    },
    menu: { id: menuId, focusBehaviour: menu.focusBehaviour, items },
    settings,
    placeholder: text,
    inputValue: value,
    actions,
    inputSend
  }));
}
