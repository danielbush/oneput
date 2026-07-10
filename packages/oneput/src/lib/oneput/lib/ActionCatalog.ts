import type { AppAction, AppActionContext, AppActions, MenuItemAny } from '../types.js';
import type { KeyBindingAction, KeyBindingMap } from './bindings.js';

export type ActionCatalogMenuItem = MenuItemAny | undefined | null | '' | false;

export type ActionCatalogEntry<Context extends AppActionContext = AppActionContext> =
  AppAction<Context> & {
    canShowMenuItem?: () => boolean;
    menuItem?: (entry: AppAction<Context>) => ActionCatalogMenuItem;
  };

export type ActionCatalogEntries<
  Id extends string,
  Context extends AppActionContext = AppActionContext
> = Partial<Record<Id, ActionCatalogEntry<Context>>>;

export interface AppActionCatalog<
  Id extends string,
  Context extends AppActionContext = AppActionContext
> {
  filter(ids: Id[]): AppActionCatalog<Id, Context>;
  /**
   * Key bindings with actions attached, suitable for KeysController.
   */
  getBindings(): KeyBindingMap;
  /**
   * Actions + bindings as used by an AppObject.
   */
  getActions(): AppActions<Context>;
  /**
   * Menu items as used by .menu in AppObject's and setMenu.
   *
   * @param ids Use this to select one or more menu items when creating groups of items in a menu.
   */
  getMenuItems(ids: Id[]): ActionCatalogMenuItem[];
}

/**
 * Reusable action catalog for AppObjects.
 *
 * A catalog defines actions once, then lets each AppObject select the active
 * action ids it exposes through `actions()` and hand-authored menu rows.
 *
 * The catalog owns the action contract: what the action does; when it is
 * available; what menu row represents it; what binding, if any, triggers it.
 * But it does not own AppObject lifecycle stuff like menu id, focus behavior,
 * layout title, prompt, or child mode setup.
 *
 * `filter([...])` sets the available action set for that catalog instance. It limits both:
 *
 * - `getActions()` — only filtered actions become dispatchable actions/bindings
 * - `getMenuItems([...])` — only filtered actions can render menu row presets
 *
 * Then `getMenuItems([...])` asks for menu rows by action id, in the order the AppObject wants them:
 *
 * ```ts
 * const catalog = JsedCatalog.create(ctl, editor).filter([
 *   JsedAction.PASTE_BEFORE,
 *   JsedAction.PASTE_AFTER,
 *   JsedAction.CANCEL_VIA_EXIT
 * ]);
 *
 * actions = () => catalog.getActions();
 *
 * menu = () => ({
 *   items: catalog.getMenuItems([
 *     JsedAction.PASTE_BEFORE,
 *     JsedAction.PASTE_AFTER,
 *     JsedAction.CANCEL_VIA_EXIT
 *   ])
 * });
 * ```
 *
 * If you ask for a menu item whose action was filtered out, you get `undefined`. If the action exists but its `canShowMenuItem()` predicate is false, you also get `undefined`.
 *
 * Identity distinction:
 *
 * - `action id`: stable action identity used for catalog lookup, filtering,
 *   dispatch, and bindings; see {@link AppActions}
 * - `menu item id`: rendered row identity, inside the actual menu item object
 *
 * `filter()` answers “what is this AppObject allowed to expose?”
 * `getMenuItems()` answers “which allowed action rows do I want to render here, and in what order?”
 */
export class ActionCatalog<
  Id extends string,
  Context extends AppActionContext = AppActionContext
> implements AppActionCatalog<Id, Context> {
  static create<Id extends string, Context extends AppActionContext = AppActionContext>(
    entries: ActionCatalogEntries<Id, Context> | (() => ActionCatalogEntries<Id, Context>)
  ) {
    return new ActionCatalog(entries);
  }

  private constructor(
    private entries: ActionCatalogEntries<Id, Context> | (() => ActionCatalogEntries<Id, Context>),
    private activeIds?: Set<Id>
  ) {}

  filter(ids: Id[]) {
    return new ActionCatalog(this.entries, new Set(ids));
  }

  getBindings(): KeyBindingMap {
    const bindings: KeyBindingMap = {};
    const entries = this.getActiveEntries();
    for (const id of Object.keys(entries) as Id[]) {
      const entry = entries[id];
      if (!entry?.binding) continue;
      bindings[id] = {
        ...entry.binding,
        action: entry.action as KeyBindingAction
      };
    }
    return bindings;
  }

  getActions(): AppActions<Context> {
    const actions: AppActions<Context> = {};
    const entries = this.getActiveEntries();
    for (const id of Object.keys(entries) as Id[]) {
      const entry = entries[id];
      if (!entry) continue;
      actions[id] = {
        action: entry.action,
        binding: entry.binding
      };
    }
    return actions;
  }

  getMenuItems(ids: Id[]): ActionCatalogMenuItem[] {
    const entries = this.getActiveEntries();
    return ids.map((id) => {
      const entry = entries[id];
      if (!entry?.menuItem) return undefined;
      if (entry.canShowMenuItem && !entry.canShowMenuItem()) return undefined;
      return entry.menuItem(entry);
    });
  }

  private getActiveEntries(): ActionCatalogEntries<Id, Context> {
    const entries = typeof this.entries === 'function' ? this.entries() : this.entries;
    if (!this.activeIds) return entries;

    const active: ActionCatalogEntries<Id, Context> = {};
    for (const id of this.activeIds) {
      if (entries[id]) active[id] = entries[id];
    }
    return active;
  }
}
