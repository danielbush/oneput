import type { Controller } from '@oneput/oneput';
import { Root } from './Root.js';
import { WordFilter } from '@oneput/oneput/shared/filters/WordFilter.js';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { defaultKeys } from '@oneput/oneput/shared/bindings/defaultBindings.js';

export function init(ctl: Controller) {
  const dynamicPlaceholder = DynamicPlaceholder.create(ctl, (params) =>
    params.menuOpenBinding
      ? params.isMenuOpen
        ? `Close menu with ${params.menuOpenBinding}...`
        : `Open menu with ${params.menuOpenBinding}...`
      : 'Type here...'
  );

  ctl.menu.setDefaultFilter(WordFilter.create().filter);
  ctl.menu.setDefaultFocusBehaviour('last-action,first');
  ctl.keys.setDefaultBindings(defaultKeys);
  ctl.input.setDefaultPlaceholder(dynamicPlaceholder);

  return Root.create(ctl);
}
