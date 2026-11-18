import type {
  AppLayoutParams,
  Controller,
  InputClaimOptions,
  InputClaimReleaseReason,
  Menu,
  UIFlags
} from '@oneput/oneput';
import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { err, ok, type Result } from 'neverthrow';

type Binding<Value, Source extends string> = Value | { from: Source };
type Text<Source extends string> = Binding<string, Source>;
type ViewSettings = Pick<
  UIFlags,
  | 'enableFilter'
  | 'enableGoBack'
  | 'enableInputElement'
  | 'clearInputAfterAction'
  | 'clearInputAfterBack'
>;

type Row<Label, Enabled = boolean> = {
  id: string;
  text: Label;
  detail?: Label;
  icon?: string;
  showActionBinding?: boolean;
  activate?: boolean;
  enabled?: Enabled;
  canFilter?: boolean;
};

type RowPatch<Label, Enabled> = Pick<Row<Label, Enabled>, 'id'> & Partial<Row<Label, Enabled>>;

type Release<Source extends string> = InputClaimReleaseReason | { from: Source };

export type ViewDef<
  Source extends string = never,
  ListSource extends string = never,
  ReleaseSource extends string = never,
  EnabledSource extends string = never
> = {
  title?: Text<Source>;
  menu?: {
    id?: string;
    focusBehaviour?: Menu['focusBehaviour'];
    items?: readonly RowPatch<Text<Source>, Binding<boolean, EnabledSource>>[];
    from?: ListSource;
    empty?: { id: string; text: string };
  };
  input?:
    | { kind: 'filter'; placeholder: Text<Source>; release?: Release<ReleaseSource> }
    | {
        kind: 'claim';
        owner: Text<Source>;
        value: Text<Source>;
        placeholder: Text<Source>;
      };
  settings?: ViewSettings;
};

export type ViewSnapshot<
  Context,
  Source extends string,
  List extends string,
  ReleaseSource extends string,
  EnabledSource extends string
> = {
  context: Context;
  machine: { getStateNodeById(id: string): { path: readonly string[] } };
  getMeta(): Record<
    string,
    { view?: ViewDef<Source, List, ReleaseSource, EnabledSource> } | undefined
  >;
};

export type ViewSources<
  Context,
  Source extends string,
  List extends string,
  ReleaseSource extends string,
  EnabledSource extends string
> = {
  text: Record<Source, (context: Context) => string>;
  lists: Record<List, (context: Context) => readonly Row<string>[]>;
  release: Record<ReleaseSource, (context: Context) => InputClaimReleaseReason>;
  enabled?: Record<EnabledSource, (context: Context) => boolean>;
};

export type OneputView = {
  layout: AppLayoutParams;
  menu: Menu;
  settings: ViewSettings;
  input?:
    | { kind: 'filter'; placeholder: string; release?: InputClaimReleaseReason }
    | { kind: 'claim'; options: InputClaimOptions };
};

type ViewCallbacks = {
  activate(id: string): void;
  change(value: string): void;
  release(id: string, reason: InputClaimReleaseReason): void;
};

/** Build a Oneput view from the metadata of the active states, with parents first.
 * Child view fields replace parent fields. Settings and menu fields merge by key.
 * A child row updates fields of the same ID and keeps its position in the menu.
 */
export function renderActiveView<
  Context,
  Source extends string,
  List extends string,
  ReleaseSource extends string,
  EnabledSource extends string
>(
  ctl: Controller,
  snapshot: ViewSnapshot<Context, Source, List, ReleaseSource, EnabledSource>,
  currentContext: () => Context,
  sources: ViewSources<Context, Source, List, ReleaseSource, EnabledSource>,
  callbacks: ViewCallbacks
): Result<OneputView, 'Expected a complete active view' | 'Expected text for each menu row'> {
  const views = Object.entries(snapshot.getMeta())
    .flatMap(([id, meta]) =>
      meta?.view
        ? [{ depth: snapshot.machine.getStateNodeById(id).path.length, view: meta.view }]
        : []
    )
    .sort((a, b) => a.depth - b.depth)
    .map(({ view }) => view);
  const view = views.reduce<ViewDef<Source, List, ReleaseSource, EnabledSource>>(
    (parent, child) => ({
      ...parent,
      ...child,
      settings: { ...parent.settings, ...child.settings },
      menu: { ...parent.menu, ...child.menu }
    }),
    {}
  );
  const { title, menu, input } = view;
  if (title === undefined || menu?.id === undefined) return err('Expected a complete active view');

  const read = (text: Text<Source>, context = snapshot.context) =>
    typeof text === 'string' ? text : sources.text[text.from](context);

  const rows = new Map<string, RowPatch<Text<Source>, Binding<boolean, EnabledSource>>>();
  if (menu.from !== undefined) {
    for (const row of sources.lists[menu.from](snapshot.context)) rows.set(row.id, row);
  }
  for (const { menu } of views) {
    for (const row of menu?.items ?? []) rows.set(row.id, { ...rows.get(row.id), ...row });
  }
  if (rows.size === 0 && menu.empty) rows.set(menu.empty.id, menu.empty);

  const items: Menu['items'] = [];
  for (const row of rows.values()) {
    if (row.text === undefined) return err('Expected text for each menu row');
    const { id, icon, enabled } = row;
    const canActivate =
      row.activate &&
      (typeof enabled === 'object'
        ? sources.enabled?.[enabled.from](snapshot.context)
        : enabled !== false);
    items.push(
      stdMenuItem({
        id,
        canFilter: row.canFilter,
        textContent: read(row.text),
        bottom: row.detail === undefined ? undefined : { textContent: read(row.detail) },
        left: icon === undefined ? undefined : (b) => [b.icon(icon)],
        bindingHint: row.showActionBinding
          ? ctl.keys.getCurrentBindings()[OneputAction.DO_ACTION]?.bindings[0]
          : undefined,
        action: canActivate ? () => callbacks.activate(id) : undefined
      })
    );
  }
  return ok({
    layout: { menuTitle: read(title) },
    menu: {
      id: menu.id,
      focusBehaviour: menu.focusBehaviour,
      items
    },
    settings: view.settings ?? {},
    input:
      input?.kind === 'claim'
        ? {
            kind: 'claim',
            options: {
              owner: { type: 'menu-item', itemId: read(input.owner) },
              value: {
                read: () => read(input.value, currentContext()),
                write: callbacks.change
              },
              placeholder: read(input.placeholder),
              select: 'all',
              resumePrevious: (reason) => (reason === 'submit' ? 'clear' : 'restore'),
              release: { ownerRemoved: true },
              onRelease: (reason) => callbacks.release(read(input.owner), reason)
            }
          }
        : input && {
            kind: 'filter',
            placeholder: read(input.placeholder),
            release:
              typeof input.release === 'object'
                ? sources.release[input.release.from](snapshot.context)
                : input.release
          }
  });
}
