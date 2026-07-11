import { KeyEventBindings, type Controller } from '@oneput/oneput';
import { Root } from './Root.js';
import { WordFilter } from '@oneput/oneput/shared/filters/WordFilter.js';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { BindingsIDB } from '@oneput/oneput/shared/bindings/BindingsIDB.js';
import { OneputCatalog } from '@oneput/oneput/shared/actions/OneputCatalog.js';

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
  BindingsIDB.create()
    .getBindings()
    .map((userBindings) => {
      const bindings = KeyEventBindings.create(OneputCatalog.create(ctl).getBindings());
      bindings.applyBindings(userBindings);
      ctl.keys.setDefaultBindings(bindings.keyBindingMap);
    })
    .orTee((err) => {
      ctl.alert({ message: 'Could not set default bindings!', additional: err.message });
    });

  ctl.input.setDefaultPlaceholder(dynamicPlaceholder);
  ctl.menu.setDefaultFilter(WordFilter.create().filter);
  ctl.menu.setDefaultFocusBehaviour('last-action,first');
  return Root.create(ctl);
}
