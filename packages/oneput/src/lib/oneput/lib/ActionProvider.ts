import type { AppAction, AppActionContext, AppActions, MenuItemAny } from '../types.js';
import type { ActionBinding, KeyBindingAction, KeyBindingMap } from './bindings.js';

export type ActionProviderMenuItem = MenuItemAny | undefined | null | '' | false;

export type ActionProviderBinding = Omit<ActionBinding, 'description'>;
export type ActionProviderMenuItemEntry<Context extends AppActionContext = AppActionContext> =
  AppAction<Context> & {
    description: string;
  };

export type ActionProviderEntry<Context extends AppActionContext = AppActionContext> = Omit<
  AppAction<Context>,
  'binding'
> & {
  description: string;
  binding?: ActionProviderBinding;
  canShowMenuItem?: () => boolean;
  menuItem?: (entry: ActionProviderMenuItemEntry<Context>) => ActionProviderMenuItem;
};

export type ActionProviderEntries<
  Id extends string,
  Context extends AppActionContext = AppActionContext
> = Partial<Record<Id, ActionProviderEntry<Context>>>;

export interface AppActionProvider<
  Id extends string,
  Context extends AppActionContext = AppActionContext
> {
  filter(ids: Id[]): AppActionProvider<Id, Context>;
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
  getMenuItems(ids: Id[]): ActionProviderMenuItem[];
}

/**
 * Reusable action provider for AppObjects.
 *
 * A provider defines actions once, then lets each AppObject select the active
 * action ids it exposes through `actions()` and hand-authored menu rows.
 *
 * The provider owns the action contract: what the action does; when it is
 * available; what menu row represents it; what binding, if any, triggers it.
 * But it does not own AppObject lifecycle stuff like menu id, focus behavior,
 * layout title, prompt, or child mode setup.
 *
 * `filter([...])` sets the available action set for that provider instance. It limits both:
 *
 * - `getActions()` — only filtered actions become dispatchable actions/bindings
 * - `getMenuItems([...])` — only filtered actions can render menu row presets
 *
 * Then `getMenuItems([...])` asks for menu rows by action id, in the order the AppObject wants them:
 *
 * ```ts
 * const provider = JsedActionProvider.create(ctl, editor).filter([
 *   JsedAction.PASTE_BEFORE,
 *   JsedAction.PASTE_AFTER,
 *   JsedAction.CANCEL_VIA_EXIT
 * ]);
 *
 * actions = () => provider.getActions();
 *
 * menu = () => ({
 *   items: provider.getMenuItems([
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
 * - `action id`: stable action identity used for provider lookup, filtering,
 *   dispatch, and bindings; see {@link AppActions}
 * - `menu item id`: rendered row identity, inside the actual menu item object
 *
 * `filter()` answers “what is this AppObject allowed to expose?”
 * `getMenuItems()` answers “which allowed action rows do I want to render here, and in what order?”
 */
export class ActionProvider<
  Id extends string,
  Context extends AppActionContext = AppActionContext
> implements AppActionProvider<Id, Context> {
  static create<Id extends string, Context extends AppActionContext = AppActionContext>(
    entries: ActionProviderEntries<Id, Context> | (() => ActionProviderEntries<Id, Context>)
  ) {
    return new ActionProvider(entries);
  }

  private constructor(
    private entries:
      | ActionProviderEntries<Id, Context>
      | (() => ActionProviderEntries<Id, Context>),
    private activeIds?: Set<Id>
  ) {}

  filter(ids: Id[]) {
    return new ActionProvider(this.entries, new Set(ids));
  }

  getBindings(): KeyBindingMap {
    const bindings: KeyBindingMap = {};
    const entries = this.getActiveEntries();
    for (const id of Object.keys(entries) as Id[]) {
      const entry = entries[id];
      if (!entry?.binding) continue;
      bindings[id] = {
        ...this.toActionBinding(entry),
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
        binding: entry.binding ? this.toActionBinding(entry) : undefined
      };
    }
    return actions;
  }

  getMenuItems(ids: Id[]): ActionProviderMenuItem[] {
    const entries = this.getActiveEntries();
    return ids.map((id) => {
      const entry = entries[id];
      if (!entry?.menuItem) return undefined;
      if (entry.canShowMenuItem && !entry.canShowMenuItem()) return undefined;
      return entry.menuItem({
        description: entry.description,
        action: entry.action,
        binding: entry.binding ? this.toActionBinding(entry) : undefined
      });
    });
  }

  private toActionBinding(entry: ActionProviderEntry<Context>): ActionBinding {
    if (!entry.binding) {
      throw new Error('ActionProvider entry has no binding');
    }

    return {
      ...entry.binding,
      description: entry.description
    };
  }

  private getActiveEntries(): ActionProviderEntries<Id, Context> {
    const entries = typeof this.entries === 'function' ? this.entries() : this.entries;
    if (!this.activeIds) return entries;

    const active: ActionProviderEntries<Id, Context> = {};
    for (const id of this.activeIds) {
      if (entries[id]) active[id] = entries[id];
    }
    return active;
  }
}
