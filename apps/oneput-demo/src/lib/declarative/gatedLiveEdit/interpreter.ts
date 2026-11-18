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
import type { EventObject } from 'xstate';

type Text<Source extends string> = string | { from: Source };
type ViewSettings = Pick<UIFlags, 'enableFilter' | 'clearInputAfterAction' | 'clearInputAfterBack'>;

export type ViewDef<
  Source extends string,
  Action extends string,
  MenuEvent extends EventObject,
  Change extends string,
  Release extends string
> = {
  title: Text<Source>;
  menu: {
    id: string;
    focusBehaviour?: Menu['focusBehaviour'];
    items: readonly {
      id: string;
      text: Text<Source>;
      detail?: Text<Source>;
      icon?: string;
      showActionBinding?: boolean;
      action: Action;
    }[];
  };
  actions: Record<Action, MenuEvent>;
  input:
    | { kind: 'filter'; placeholder: Text<Source> }
    | {
        kind: 'claim';
        owner: Text<Source>;
        value: Text<Source>;
        placeholder: Text<Source>;
        change: Change;
        release: Release;
      };
  settings: ViewSettings;
};

export type OneputView = {
  layout: AppLayoutParams;
  menu: Menu;
  settings: ViewSettings;
  input: { kind: 'filter'; placeholder: string } | { kind: 'claim'; options: InputClaimOptions };
};

/**
 * Stub for the lifetime of one AppObject. Use Oneput's menu/layout refresh and
 * AppObject-scoped input claims. Clear and focus the filter input on start.
 * Retain a claim for the same row across refresh. Release with 'submit' on
 * repeat activation. Ignore writes and releases from stale claims.
 */
export type ApplyView = (ctl: Controller, view: OneputView) => void;

/** Resolve an active leaf view for Oneput's checked text, icon and input APIs. */
export function renderActiveView<
  Context,
  Source extends string,
  Action extends string,
  MenuEvent extends EventObject,
  Change extends string,
  Release extends string
>(
  ctl: Controller,
  actor: {
    getSnapshot(): {
      context: Context;
      getMeta(): Record<
        string,
        { view?: ViewDef<Source, Action, MenuEvent, Change, Release> } | undefined
      >;
    };
    send(
      event:
        | MenuEvent
        | { type: Change; value: string }
        | { type: Release; reason: InputClaimReleaseReason }
    ): void;
  },
  sources: Record<Source, (context: Context) => string>,
  apply: ApplyView
): Result<void, 'Expected one active view'> {
  const snapshot = actor.getSnapshot();
  const views = Object.values(snapshot.getMeta()).flatMap((meta) =>
    meta?.view ? [meta.view] : []
  );
  const [view] = views;
  if (views.length !== 1 || !view) return err('Expected one active view');

  const read = (text: Text<Source>, context = snapshot.context) =>
    typeof text === 'string' ? text : sources[text.from](context);

  const input = view.input;
  apply(ctl, {
    layout: { menuTitle: read(view.title) },
    menu: {
      id: view.menu.id,
      focusBehaviour: view.menu.focusBehaviour,
      items: view.menu.items.map((row) => {
        const icon = row.icon;
        return stdMenuItem({
          id: row.id,
          textContent: read(row.text),
          bottom: row.detail === undefined ? undefined : { textContent: read(row.detail) },
          left: icon === undefined ? undefined : (b) => [b.icon(icon)],
          bindingHint: row.showActionBinding
            ? ctl.keys.getCurrentBindings()[OneputAction.DO_ACTION]?.bindings[0]
            : undefined,
          action: () => actor.send(view.actions[row.action])
        });
      })
    },
    settings: view.settings,
    input:
      input.kind === 'filter'
        ? { kind: 'filter', placeholder: read(input.placeholder) }
        : {
            kind: 'claim',
            options: {
              owner: { type: 'menu-item', itemId: read(input.owner) },
              value: {
                read: () => read(input.value, actor.getSnapshot().context),
                write: (value) => actor.send({ type: input.change, value })
              },
              placeholder: read(input.placeholder),
              select: 'all',
              resumePrevious: (reason) => (reason === 'submit' ? 'clear' : 'restore'),
              release: {
                back: 'release-and-handle',
                menuFocusLeavesOwner: true,
                ownerRemoved: true
              },
              onRelease: (reason) => actor.send({ type: input.release, reason })
            }
          }
  });
  return ok(undefined);
}
