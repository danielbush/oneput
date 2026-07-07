import type { AppAction, AppActionContext, AppActions, MenuItemAny } from '../types.js';

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
  getActions(): AppActions<Context>;
  getMenuItems(ids: Id[]): ActionCatalogMenuItem[];
}

/**
 * Reusable command catalog for AppObjects.
 *
 * A catalog defines commands once, then lets each AppObject select the active
 * command ids it exposes through `actions()` and hand-authored menu rows.
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
