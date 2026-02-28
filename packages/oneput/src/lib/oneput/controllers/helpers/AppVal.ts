import type { AppObject } from '../../types.js';

export class AppVal {
  static create(app: AppObject) {
    return new AppVal(app);
  }

  constructor(app: AppObject) {
    this.app = app;
  }

  app: AppObject;
  lastMenuActions: Record<string, string> = {};
  menuId?: string;

  setLastMenuActionId(menuId: string, menuActionId: string) {
    this.lastMenuActions[menuId] = menuActionId;
  }

  setMenuId(menuId: string) {
    this.menuId = menuId;
  }

  getLastMenuActionId(menuId: string) {
    return this.lastMenuActions[menuId];
  }

  menuExists(menuId: string) {
    return Object.keys(this.lastMenuActions).includes(menuId);
  }
}
