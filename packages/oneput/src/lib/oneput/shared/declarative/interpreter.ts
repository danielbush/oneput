import { hflex } from '../../lib/builder.js';
import type { Menu, MenuItem, UIFlags } from '../../types.js';
import type { StandardLayoutParams } from '../ui/layout/StandardLayout.js';
import { infoMenuItem } from '../ui/menuItems/infoMenuItem.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
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
 * Merge a later row into the earlier row with its ID, key by key.
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

/** Find a named source. A widened view type can name a source that is not there. */
function named<Name extends string, Source>(
  registry: Record<Name, Source>,
  name: Name
): Result<Source, NameError> {
  return Object.hasOwn(registry, name)
    ? ok(registry[name])
    : err('Expected a source for each name');
}

/** Metadata for one state's contribution to the view. Use named sources for changing data. */
export type ViewDef<
  Source extends string = never,
  List extends string = never,
  Event extends RowEvent = never,
  Item extends string = never
> = {
  title?: Text<Source>;
  inputStatus?: Text<Source>;
  inputBusyIcon?: string;
  menu?: {
    id?: string;
    focusBehaviour?: Menu['focusBehaviour'];
    items?: readonly ViewRow<Text<Source>, Event, Item>[];
    from?: List;
  };
  input?: { kind: 'filter'; placeholder: Text<Source> };
  settings?: ViewSettings;
};

/** The metadata read from an actor snapshot. */
export type ViewSnapshot<
  Source extends string,
  List extends string,
  Event extends RowEvent,
  Item extends string = never
> = {
  machine: { getStateNodeById(id: string): { path: readonly string[] } };
  getMeta(): Record<string, { view?: ViewDef<Source, List, Event, Item> } | undefined>;
};

/**
 * Named code that a view refers to by name, so the view stays data.
 * `text` gives changing text, `lists` gives changing rows, and `items` builds
 * a row that names it in `build`. The interpreter sets the built item's ID to
 * the row's ID. The builder's `activate` sends the row's event (`send`, else
 * `ITEM_ACTIVATED`) to the actor; use it as the item's action.
 */
export type ViewSources<
  Snapshot,
  Source extends string,
  List extends string,
  Event extends RowEvent = never,
  Item extends string = never
> = {
  text: Record<Source, (snapshot: Snapshot) => string>;
  lists: Record<
    List,
    (snapshot: Snapshot) => readonly (Row<string, Event> | BuiltRow<Item, Event>)[]
  >;
  items: Record<
    Item,
    (snapshot: Snapshot, row: BuiltRow<Item, Event>, activate: () => void) => MenuItem
  >;
};

export type OneputView = {
  layout: StandardLayoutParams;
  menu: Menu;
  settings: ViewSettings;
  placeholder?: string;
};

type Activation<Event extends RowEvent> = Event | { type: 'ITEM_ACTIVATED'; id: string };

/**
 * Resolve the active states' metadata, with parents first.
 * Child settings and menu fields merge by key. Rows merge by ID in the same
 * order (see {@link mergeRow}). A name with no source gives an error.
 */
export function renderActiveView<
  Source extends string,
  List extends string,
  Event extends RowEvent,
  Item extends string,
  Snapshot
>(
  snapshot: Snapshot & ViewSnapshot<Source, List, Event, Item>,
  sources: ViewSources<NoInfer<Snapshot>, Source, List, Event, Item>,
  activate: (event: Activation<Event>) => void
): Result<
  OneputView,
  'Expected a complete active view' | 'Expected text for each menu row' | NameError
> {
  const views = Object.entries(snapshot.getMeta())
    .flatMap(([id, meta]) =>
      meta?.view
        ? [{ depth: snapshot.machine.getStateNodeById(id).path.length, view: meta.view }]
        : []
    )
    .sort((a, b) => a.depth - b.depth)
    .map(({ view }) => view);
  const view = views.reduce<ViewDef<Source, List, Event, Item>>(
    (parent, child) => ({
      ...parent,
      ...child,
      settings: { ...parent.settings, ...child.settings },
      menu: { ...parent.menu, ...child.menu }
    }),
    {}
  );
  const { title, menu, input, inputStatus, inputBusyIcon } = view;
  const menuId = menu?.id;
  if (title === undefined || menu === undefined || menuId === undefined) {
    return err('Expected a complete active view');
  }

  const read = (text: Text<Source>): Result<string, NameError> =>
    typeof text === 'string'
      ? ok(text)
      : named(sources.text, text.from).map((source) => source(snapshot));
  const readOptional = (text: Text<Source> | undefined): Result<string | undefined, NameError> =>
    text === undefined ? ok(undefined) : read(text);

  const rows = new Map<string, ViewRow<Text<Source>, Event, Item>>();
  if (menu.from !== undefined) {
    const list = named(sources.lists, menu.from);
    if (list.isErr()) return err(list.error);
    for (const row of list.value(snapshot)) rows.set(row.id, row);
  }
  for (const { menu } of views) {
    for (const row of menu?.items ?? []) rows.set(row.id, mergeRow(rows.get(row.id), row));
  }

  const renderRow = (
    row: ViewRow<Text<Source>, Event, Item>
  ): Result<MenuItem, NameError | 'Expected text for each menu row'> => {
    const { id, send } = row;
    const raise = () => activate(send ?? { type: 'ITEM_ACTIVATED', id });
    if (isBuilt(row)) {
      return named(sources.items, row.build).map((build) => ({
        ...build(snapshot, row, raise),
        id
      }));
    }
    const { text, detail, icon } = row;
    if (text === undefined) return err('Expected text for each menu row');
    if (row.kind === 'info') {
      return read(text).map((msg) => infoMenuItem({ id, msg, icon: icon ?? 'Info' }));
    }
    const canActivate = row.activate ?? send !== undefined;
    return Result.combine([read(text), readOptional(detail)]).map(([textContent, detailText]) =>
      stdMenuItem({
        id,
        textContent,
        bottom: detailText === undefined ? undefined : { textContent: detailText },
        left: icon === undefined ? undefined : (b) => [b.icon(icon)],
        action: canActivate ? raise : undefined
      })
    );
  };

  return Result.combine([
    Result.combine([...rows.values()].map(renderRow)),
    read(title),
    readOptional(inputStatus),
    readOptional(input?.placeholder)
  ]).map(([items, menuTitle, status, placeholder]) => ({
    layout: {
      menuTitle,
      outerRight: status === undefined ? undefined : (b) => b.fchild({ textContent: status }),
      inputRight:
        inputBusyIcon === undefined
          ? undefined
          : hflex({
              id: 'input-right-busy',
              children: (b) => [b.icon(inputBusyIcon, { classes: ['oneput__rotate'] })]
            })
    },
    menu: { id: menuId, focusBehaviour: menu.focusBehaviour, items },
    settings: view.settings ?? {},
    placeholder
  }));
}
