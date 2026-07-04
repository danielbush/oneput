import type { AppObject } from '../../types.js';

export class AppObjectWrapper {
  static create(app: AppObject) {
    return new AppObjectWrapper(app);
  }

  constructor(
    public app: AppObject,
    private lastMenuActionIds: Record<string, string> = {}
  ) {}

  setLastMenuActionId(menuId: string, menuActionId: string) {
    this.lastMenuActionIds[menuId] = menuActionId;
  }

  getLastMenuActionId(menuId: string) {
    return this.lastMenuActionIds[menuId];
  }
}
