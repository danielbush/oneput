import type { Controller } from '@oneput/oneput';
import { FuzzyFilter } from '@oneput/oneput/shared/filters/FuzzyFilter.js';
import { WordFilter } from '@oneput/oneput/shared/filters/WordFilter.js';

export class SettingsManager {
  static create(ctl: Controller) {
    return new SettingsManager(ctl);
  }

  constructor(private ctl: Controller) {}

  FILTER_TYPE = {
    FUZZY: 'fuzzy',
    WORD: 'word'
  } as const;

  setFilter(filter: string) {
    switch (filter) {
      case this.FILTER_TYPE.FUZZY:
        this.ctl.menu.fn.setDefaultMenuItemsFn(FuzzyFilter.create().menuItemsFn);
        break;
      case this.FILTER_TYPE.WORD:
        this.ctl.menu.fn.setDefaultMenuItemsFn(WordFilter.create().menuItemsFn);
        break;
    }
  }
}
