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

type Text<Source extends string> = string | { from: Source };
type ViewSettings = Pick<
  UIFlags,
  | 'enableFilter'
  | 'enableGoBack'
  | 'enableInputElement'
  | 'clearInputAfterAction'
  | 'clearInputAfterBack'
>;

type Row<Label> = {
  id: string;
  text: Label;
  detail?: Label;
  icon?: string;
  showActionBinding?: boolean;
  activate?: boolean;
};

type Release<Source extends string> = InputClaimReleaseReason | { from: Source };

export type ViewDef<
  Source extends string = never,
  ListSource extends string = never,
  ReleaseSource extends string = never
> = {
  title: Text<Source>;
  menu: {
    id: string;
    focusBehaviour?: Menu['focusBehaviour'];
    rowOverride?: { id: Text<Source>; detail: Text<Source>; icon: string };
  } & (
    | { items: readonly Row<Text<Source>>[] }
    | { from: ListSource; empty?: { id: string; text: string } }
  );
  input?:
    | { kind: 'filter'; placeholder: Text<Source>; release?: Release<ReleaseSource> }
    | {
        kind: 'claim';
        owner: Text<Source>;
        value: Text<Source>;
        placeholder: Text<Source>;
      };
  settings: ViewSettings;
};

export type ViewSnapshot<
  Context,
  Source extends string,
  List extends string,
  ReleaseSource extends string
> = {
  context: Context;
  getMeta(): Record<string, { view?: ViewDef<Source, List, ReleaseSource> } | undefined>;
};

export type ViewSources<
  Context,
  Source extends string,
  List extends string,
  ReleaseSource extends string
> = {
  text: Record<Source, (context: Context) => string>;
  lists: Record<List, (context: Context) => readonly Row<string>[]>;
  release: Record<ReleaseSource, (context: Context) => InputClaimReleaseReason>;
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

/** Resolve one active view, including row overrides by ID, for Oneput's view APIs. */
export function renderActiveView<
  Context,
  Source extends string,
  List extends string,
  ReleaseSource extends string
>(
  ctl: Controller,
  snapshot: ViewSnapshot<Context, Source, List, ReleaseSource>,
  currentContext: () => Context,
  sources: ViewSources<Context, Source, List, ReleaseSource>,
  callbacks: ViewCallbacks
): Result<OneputView, 'Expected one active view'> {
  const views = Object.values(snapshot.getMeta()).flatMap((meta) =>
    meta?.view ? [meta.view] : []
  );
  const [view] = views;
  if (views.length !== 1 || !view) return err('Expected one active view');

  const read = (text: Text<Source>, context = snapshot.context) =>
    typeof text === 'string' ? text : sources.text[text.from](context);

  const menu = view.menu;
  const rows =
    'from' in menu
      ? sources.lists[menu.from](snapshot.context)
      : menu.items.map((row) => ({
          ...row,
          text: read(row.text),
          detail: row.detail === undefined ? undefined : read(row.detail)
        }));
  const visibleRows: readonly Row<string>[] =
    rows.length === 0 && 'from' in menu && menu.empty ? [menu.empty] : rows;

  const override = menu.rowOverride;
  const overrideId = override && read(override.id);
  const input = view.input;
  return ok({
    layout: { menuTitle: read(view.title) },
    menu: {
      id: menu.id,
      focusBehaviour: menu.focusBehaviour,
      items: visibleRows.map((row) => {
        const rowOverride = override && row.id === overrideId ? override : undefined;
        const detail = rowOverride ? read(rowOverride.detail) : row.detail;
        const icon = rowOverride?.icon ?? row.icon;
        return stdMenuItem({
          id: row.id,
          textContent: row.text,
          bottom: detail === undefined ? undefined : { textContent: detail },
          left: icon === undefined ? undefined : (b) => [b.icon(icon)],
          bindingHint: row.showActionBinding
            ? ctl.keys.getCurrentBindings()[OneputAction.DO_ACTION]?.bindings[0]
            : undefined,
          action: row.activate ? () => callbacks.activate(row.id) : undefined
        });
      })
    },
    settings: view.settings,
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
