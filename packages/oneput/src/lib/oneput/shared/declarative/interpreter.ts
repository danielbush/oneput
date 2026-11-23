import type { Controller } from '../../controllers/controller.js';
import type { Pull } from '../../lib/pull.js';
import type { AppLayoutParams, InputKind, Menu, MenuItem, UIFlags, UILayout } from '../../types.js';
import { err, ok, Result } from 'neverthrow';

type Text<Source extends string> = string | { from: Source };
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
 * A row that a named builder in `sources.items` makes. Use it when the standard
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
function withInput<Source extends string>(
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

/**
 * A layout that a view names: its slot names, the layout component that shows
 * it, and how the resolved slot values become that component's params. Make
 * one with {@link viewLayout}. Register layouts once and share them across
 * AppObjects.
 */
export type ViewLayout<Slot extends string, Params extends AppLayoutParams = AppLayoutParams> = {
  slots: readonly Slot[];
  create(ctl: Controller, params: Params): UILayout<Params>;
  params(values: Partial<Record<Slot, string>>): Params;
};

/** A slot name that an object inherits, such as `toString`, would clash with it. */
type OwnSlot<Slot extends string> = Slot extends keyof typeof Object.prototype | '__proto__'
  ? never
  : Slot;

/**
 * Make a {@link ViewLayout}. The slot names type the values that `params` gets.
 * Slot names from `Object.prototype` are type errors.
 */
export function viewLayout<const Slot extends string, Params extends AppLayoutParams>(
  layout: ViewLayout<Slot, Params> & { slots: readonly OwnSlot<Slot>[] }
): ViewLayout<Slot, Params> {
  return layout;
}

/** Layouts by name. */
export type ViewLayouts = Record<string, ViewLayout<string>>;

/** The slot names of each layout in a registry, by layout name. */
export type LayoutSlots<Layouts extends ViewLayouts> = {
  [Name in keyof Layouts]: Layouts[Name]['slots'][number];
};

/** A layout with no slots takes none. */
type SlotValues<Slot extends string, Source extends string> = [Slot] extends [never]
  ? Record<string, never>
  : { [Name in Slot]?: Text<Source> };

/**
 * A view that names a layout fills only that layout's slots. A view that does
 * not name one fills the slots of the layout a parent names; the type allows
 * any registered slot there, and rendering checks it.
 */
type LayoutChoice<Layouts extends Record<string, string>, Source extends string> =
  | {
      [Name in keyof Layouts & string]: {
        layout: Name;
        slots?: SlotValues<Layouts[Name], Source>;
      };
    }[keyof Layouts & string]
  | { layout?: never; slots?: SlotValues<Layouts[keyof Layouts & string], Source> };

type NoLayouts = Record<never, never>;

/**
 * The input for a view: Oneput's {@link InputKind}, with no `kind` meaning a
 * text input, and an optional placeholder. A child's `input` replaces its
 * parent's whole input, so a `textarea`'s `rows` never stays on a text input.
 */
export type ViewInput<Source extends string = never> = (
  | { kind?: 'text' }
  | { kind: 'password' }
  | { kind: 'textarea'; rows?: number }
) & { placeholder?: Text<Source> };

/**
 * Metadata for one state's contribution to the view. Use named sources for
 * changing data. `layout` names a registered layout, and `slots` fill it.
 */
export type ViewDef<
  Source extends string = never,
  List extends string = never,
  Event extends RowEvent = never,
  Item extends string = never,
  Layouts extends Record<string, string> = NoLayouts
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
  Source extends string,
  List extends string,
  Event extends RowEvent,
  Item extends string = never,
  Layouts extends Record<string, string> = NoLayouts
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
 * `text` gives changing text, `lists` gives changing rows, and `items` builds
 * a row that names it in `build`. Return the item with the row's ID. The
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
  Source extends string,
  List extends string,
  Event extends RowEvent = never,
  Item extends string = never
> = {
  text: Record<Source, ((snapshot: Snapshot) => string) | Readable<string>>;
  lists: Record<
    List,
    | ((snapshot: Snapshot) => readonly ListRow<Event, Item>[])
    | Readable<readonly ListRow<Event, Item>[]>
  >;
  items: Record<
    Item,
    | ((snapshot: Snapshot, row: BuiltRow<Item, Event>, activate: () => void) => MenuItem)
    | Readable<Builder<Event, Item>>
  >;
};

/** The readable sources in a registry, to subscribe to, so that their changes redraw the view. */
export function sourceSubscriptions(sources: {
  text: object;
  lists: object;
  items: object;
}): ReadableSource<unknown>[] {
  return [sources.text, sources.lists, sources.items]
    .flatMap(sourcesOf)
    .filter(isReadable)
    .map(({ source }) => source);
}

export type OneputView = {
  /** The named layout and its params. */
  layout: { name: string; create: ViewLayout<string>['create']; params: AppLayoutParams };
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
 * use. `defaultRow` makes each item whose row has no `build` name.
 */
export function renderActiveView<
  Source extends string,
  List extends string,
  Event extends RowEvent,
  Item extends string,
  Layouts extends ViewLayouts,
  Snapshot
>(
  snapshot: Snapshot & ViewSnapshot<Source, List, Event, Item, NoInfer<LayoutSlots<Layouts>>>,
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
  let slots = slotRecord<Text<Source>>();
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
  const layout: ViewLayout<string> = found.value;
  if (Object.keys(slots).some((slot) => !layout.slots.includes(slot))) {
    return err('Expected only slots that the layout declares');
  }
  const filled = Object.keys(slots).filter((slot) => slots[slot] !== undefined);

  const read = (text: Text<Source>): Result<string, NameError | ReadError> =>
    typeof text === 'string'
      ? ok(text)
      : named(sources.text, text.from).andThen((source) =>
          attempt(() => (isReadable(source) ? source.source.get() : source(snapshot)))
        );
  const readOptional = (
    text: Text<Source> | undefined
  ): Result<string | undefined, NameError | ReadError> =>
    text === undefined ? ok(undefined) : read(text);

  let listRows: readonly ListRow<Event, Item>[] = [];
  if (menu.from !== undefined) {
    const list = named(sources.lists, menu.from).andThen((source) =>
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
      return named(sources.items, row.build).andThen((build) =>
        attempt(() =>
          isReadable(build) ? build.source.get()(row, raise) : build(snapshot, row, raise)
        )
      );
    }
    const { kind, text, detail, icon } = row;
    if (text === undefined) return err('Expected text for each menu row');
    const canActivate = kind !== 'info' && (row.activate ?? send !== undefined);
    return Result.combine([read(text), readOptional(kind === 'info' ? undefined : detail)]).andThen(
      ([text, detail]) =>
        attempt(() => defaultRow({ id, kind, text, detail, icon }, canActivate ? raise : undefined))
    );
  };

  const slotValues = Result.combine(
    filled.map((slot) => readOptional(slots[slot]).map((value) => [slot, value] as const))
  ).map((entries) => {
    const values = slotRecord<string>();
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
