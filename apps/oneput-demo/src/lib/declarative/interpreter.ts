import {
  divider,
  hflex,
  type AppLayoutParams,
  type Controller,
  type FlexParams,
  type InputClaimOptions,
  type InputClaimReleaseReason,
  type Menu,
  type UIFlags
} from '@oneput/oneput';
import type { SafeHtml } from '@oneput/safe-html';
import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { infoMenuItem } from '@oneput/oneput/shared/ui/menuItems/infoMenuItem.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import type { StandardLayoutParams } from '@oneput/oneput/shared/ui/layout/StandardLayout.js';
import { err, ok, type Result } from 'neverthrow';

type Binding<Value, Source extends string> = Value | { from: Source };
type Text<Source extends string> = Binding<string, Source>;
type ViewSettings = Pick<
  UIFlags,
  | 'enableFilter'
  | 'enableGoBack'
  | 'enableInputElement'
  | 'enableMenuItemFocus'
  | 'enableMenuOpenClose'
  | 'clearInputAfterAction'
  | 'clearInputAfterBack'
>;

type RowEvent = { type: string };

type Row<Label, Enabled = boolean, Event extends RowEvent = never, Html extends string = never> = {
  id: string;
  kind?: 'divider' | 'info';
  text: Label;
  detail?: Label;
  html?: { from: Html };
  icon?: string;
  showActionBinding?: boolean;
  binding?: string;
  checked?: Enabled;
  activate?: boolean;
  send?: Event;
  enabled?: Enabled;
  canFilter?: boolean;
};

type RowPatch<Label, Enabled, Event extends RowEvent, Html extends string> = Pick<
  Row<Label, Enabled, Event, Html>,
  'id'
> &
  Partial<Row<Label, Enabled, Event, Html>>;

type Release<Source extends string> = InputClaimReleaseReason | { from: Source };

export type ViewDef<
  Source extends string = never,
  ListSource extends string = never,
  ReleaseSource extends string = never,
  EnabledSource extends string = never,
  Event extends RowEvent = never,
  Html extends string = never
> = {
  title?: Text<Source>;
  inputStatus?: Text<Source>;
  inputBusyIcon?: string;
  menu?: {
    id?: string;
    focusBehaviour?: Menu['focusBehaviour'];
    items?: readonly RowPatch<Text<Source>, Binding<boolean, EnabledSource>, Event, Html>[];
    from?: ListSource;
    empty?: { id: string; text: string };
  };
  input?:
    | { kind: 'filter'; placeholder: Text<Source>; release?: Release<ReleaseSource> }
    | {
        kind: 'editor';
        layout: NonNullable<AppLayoutParams['input']>;
        value: Text<Source>;
        placeholder: Text<Source>;
        submit: { send: Event; enabled: Binding<boolean, EnabledSource> };
      }
    | {
        kind: 'claim';
        owner: Text<Source>;
        value: Text<Source>;
        placeholder: Text<Source>;
      };
  settings?: ViewSettings;
};

export type ViewSnapshot<
  Source extends string,
  List extends string,
  ReleaseSource extends string,
  EnabledSource extends string,
  Event extends RowEvent,
  Html extends string = never
> = {
  machine: { getStateNodeById(id: string): { path: readonly string[] } };
  getMeta(): Record<
    string,
    { view?: ViewDef<Source, List, ReleaseSource, EnabledSource, Event, Html> } | undefined
  >;
};

export type ViewSources<
  Snapshot,
  Source extends string,
  List extends string,
  ReleaseSource extends string,
  EnabledSource extends string,
  Html extends string = never,
  Event extends RowEvent = never
> = {
  text: Record<Source, (snapshot: Snapshot) => string>;
  html?: Record<Html, (snapshot: Snapshot) => SafeHtml | null>;
  lists: Record<List, (snapshot: Snapshot) => readonly Row<string, boolean, Event>[]>;
  release: Record<ReleaseSource, (snapshot: Snapshot) => InputClaimReleaseReason>;
  enabled?: Record<EnabledSource, (snapshot: Snapshot) => boolean>;
};

export type OneputView = {
  layout: StandardLayoutParams;
  inputRight?: FlexParams;
  menu: Menu;
  settings: ViewSettings;
  input?:
    | { kind: 'filter'; placeholder: string; release?: InputClaimReleaseReason }
    | { kind: 'editor'; value: string; placeholder: string }
    | { kind: 'claim'; options: InputClaimOptions };
};

type ViewCallbacks<Event extends RowEvent> = {
  activate(event: Event | { type: 'ITEM_ACTIVATED'; id: string }): void;
  change(value: string): void;
  release(id: string, reason: InputClaimReleaseReason): void;
};

/** Build a Oneput view from the metadata of the active states, with parents first.
 * Child view fields replace parent fields. Settings and menu fields merge by key.
 * A child row updates fields of the same ID and keeps its position in the menu.
 * A row with a send event or activate flag can run an action when enabled.
 * Rich rows take a SafeHtml token from a named source and fall back to text when it is empty.
 * Sources read the actor snapshot. Claim values and live controls read the latest snapshot.
 */
export function renderActiveView<
  Source extends string,
  List extends string,
  ReleaseSource extends string,
  EnabledSource extends string,
  Event extends RowEvent,
  Snapshot,
  Html extends string = never
>(
  ctl: Controller,
  snapshot: Snapshot & ViewSnapshot<Source, List, ReleaseSource, EnabledSource, Event, Html>,
  currentSnapshot: () => Snapshot,
  sources: ViewSources<NoInfer<Snapshot>, Source, List, ReleaseSource, EnabledSource, Html, Event>,
  callbacks: ViewCallbacks<Event>
): Result<OneputView, 'Expected a complete active view' | 'Expected text for each menu row'> {
  const views = Object.entries(snapshot.getMeta())
    .flatMap(([id, meta]) =>
      meta?.view
        ? [{ depth: snapshot.machine.getStateNodeById(id).path.length, view: meta.view }]
        : []
    )
    .sort((a, b) => a.depth - b.depth)
    .map(({ view }) => view);
  const view = views.reduce<ViewDef<Source, List, ReleaseSource, EnabledSource, Event, Html>>(
    (parent, child) => ({
      ...parent,
      ...child,
      settings: { ...parent.settings, ...child.settings },
      menu: { ...parent.menu, ...child.menu }
    }),
    {}
  );
  const { title, menu, input, inputStatus, inputBusyIcon } = view;
  if (title === undefined || menu?.id === undefined) return err('Expected a complete active view');

  const read = (text: Text<Source>, sourceSnapshot: Snapshot = snapshot) =>
    typeof text === 'string' ? text : sources.text[text.from](sourceSnapshot);

  const readFlag = (flag: Binding<boolean, EnabledSource>, sourceSnapshot: Snapshot = snapshot) =>
    typeof flag === 'object' ? sources.enabled?.[flag.from](sourceSnapshot) === true : flag;

  const rows = new Map<
    string,
    RowPatch<Text<Source>, Binding<boolean, EnabledSource>, Event, Html>
  >();
  if (menu.from !== undefined) {
    for (const row of sources.lists[menu.from](snapshot)) rows.set(row.id, row);
  }
  for (const { menu } of views) {
    for (const row of menu?.items ?? []) rows.set(row.id, { ...rows.get(row.id), ...row });
  }
  if (rows.size === 0 && menu.empty) rows.set(menu.empty.id, menu.empty);

  const items: Menu['items'] = [];
  for (const row of rows.values()) {
    if (row.kind === 'divider') {
      items.push(divider({ id: row.id }));
      continue;
    }
    if (row.text === undefined) return err('Expected text for each menu row');
    const { id, icon, enabled, checked } = row;
    const canActivate =
      (row.activate ?? row.send !== undefined) && (enabled === undefined || readFlag(enabled));
    const action = canActivate
      ? () => callbacks.activate(row.send ?? { type: 'ITEM_ACTIVATED', id })
      : undefined;
    const binding = row.binding ?? (row.showActionBinding ? OneputAction.DO_ACTION : undefined);
    const bindingHint = binding && ctl.keys.getCurrentBindings()[binding]?.bindings[0];
    const textContent = read(row.text);
    if (row.kind === 'info') {
      items.push(infoMenuItem({ id, msg: textContent, icon: icon ?? 'Info' }));
      continue;
    }
    if (checked !== undefined && action) {
      items.push(
        checkboxMenuItem({
          id,
          textContent,
          bindingHint,
          action,
          source: { get: () => readFlag(checked, currentSnapshot()) }
        })
      );
      continue;
    }
    items.push(
      stdMenuItem({
        id,
        canFilter: row.canFilter,
        attr: row.send && !action ? { role: 'button', 'aria-disabled': 'true' } : undefined,
        textContent,
        htmlContent: row.html && (sources.html?.[row.html.from](snapshot) ?? undefined),
        bottom: row.detail === undefined ? undefined : { textContent: read(row.detail) },
        left: icon === undefined ? undefined : (b) => [b.icon(icon)],
        bindingHint,
        action
      })
    );
  }
  const claimOwner = input?.kind === 'claim' ? read(input.owner) : '';
  const status = inputStatus === undefined ? undefined : read(inputStatus);
  return ok({
    layout: {
      menuTitle: read(title),
      ...(status !== undefined && { outerRight: (b) => b.fchild({ textContent: status }) }),
      ...(input?.kind === 'editor' && {
        input: input.layout,
        inputSend: {
          enabled: () => readFlag(input.submit.enabled, currentSnapshot()),
          run: () => callbacks.activate(input.submit.send)
        }
      })
    },
    ...(inputBusyIcon !== undefined && {
      inputRight: hflex({
        id: 'input-right-busy',
        children: (b) => [b.icon(inputBusyIcon, { classes: ['oneput__rotate'] })]
      })
    }),
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
              owner: { type: 'menu-item', itemId: claimOwner },
              value: {
                read: () => read(input.value, currentSnapshot()),
                write: callbacks.change
              },
              placeholder: read(input.placeholder),
              select: 'all',
              resumePrevious: (reason) => (reason === 'submit' ? 'clear' : 'restore'),
              release: { ownerRemoved: true },
              onRelease: (reason) => callbacks.release(claimOwner, reason)
            }
          }
        : input?.kind === 'editor'
          ? { kind: 'editor', value: read(input.value), placeholder: read(input.placeholder) }
          : input && {
              kind: 'filter',
              placeholder: read(input.placeholder),
              release:
                typeof input.release === 'object'
                  ? sources.release[input.release.from](snapshot)
                  : input.release
            }
  });
}
