// Components
// These import .svelte and will break projects that can't handle .svelte files.
export { default as Oneput } from './oneput/components/Oneput.svelte';
export { default as OneputController } from './oneput/components/OneputController.svelte';
export { default as OneputCornerButton } from './oneput/components/OneputCornerButton.svelte';
export { default as Anchor } from './oneput/components/Anchor.svelte';
export { SveltePropInjector } from './oneput/lib/SveltePropInjector.js';

// Controllers
export { Controller } from './oneput/controllers/controller.js';

// Types
export type * from './oneput/types.js';
export type * from './oneput/lib/bindings.js';
export type * from './oneput/lib/icons.js';
export type * from './oneput/lib/builder.js';

// Lib
export * as utils from './oneput/lib/utils.js';
export * as bindings from './oneput/lib/bindings.js';
export { mountSvelte, randomId } from './oneput/lib/utils.js';
export { registerIcon, registerIcons, element, unsafeHTML } from './oneput/lib/icons.js';
export { DOMUpdater } from './oneput/lib/DOMUpdater.js';
export {
  FlexChildBuilder,
  hflex,
  vflex,
  fchild,
  menuItem,
  icon,
  spacer,
  iconButton,
  button,
  divider
} from './oneput/lib/builder.js';

// Shared
// This is exposed under shared/ as individual paths -- see "exports" in package.json.
