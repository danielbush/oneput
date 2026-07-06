import type { Controller } from '@oneput/oneput';
import { Root } from './Root.js';
import { WordFilter } from '@oneput/oneput/shared/filters/WordFilter.js';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { LocalBindingsService } from '@oneput/oneput/shared/bindings/LocalBindingsService.js';

export function init(ctl: Controller) {
  const dynamicPlaceholder = DynamicPlaceholder.create(ctl, (params) =>
    params.menuOpenBinding
      ? params.isMenuOpen
        ? `Close menu with ${params.menuOpenBinding}...`
        : `Open menu with ${params.menuOpenBinding}...`
      : 'Type here...'
  );

  // The idea here is maybe we load user's preferred bindings.
  //
  // TODO: we're going to load this async and not in sequence with Root.create
  // below.  We could pass the unresolved into Root.create if we need to track
  // it and have Root update based on the resolve or reject.
  //
  // const bindingsPromise = result.match(
  //   () => {},
  //   (err) => Promise.reject(err)
  // );
  //
  LocalBindingsService.create(ctl)
    .getBindings()
    .andTee((bindings) => {
      ctl.keys.setDefaultBindings(bindings); // user's preferred bindings
    })
    .orTee((err) => {
      ctl.alert({ message: 'Could not set default bindings!', additional: err.message });
    });

  ctl.input.setDefaultPlaceholder(dynamicPlaceholder);
  ctl.menu.setDefaultFilter(WordFilter.create().filter);
  ctl.menu.setDefaultFocusBehaviour('last-action,first');
  return Root.create(ctl);
}
