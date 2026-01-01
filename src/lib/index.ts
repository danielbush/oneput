// Reexport your entry components here
import Oneput from './oneput/components/Oneput.svelte';
import OneputController from './oneput/components/OneputController.svelte';
import OneputCornerButton from './oneput/components/OneputCornerButton.svelte';
import Anchor from './oneput/components/Anchor.svelte';
import { Controller } from './oneput/controller.js';
import type { UILayout } from './oneput/types.js';

// Icon registry exports
export {
	registerIcon,
	registerIcons,
	getIconRenderer,
	renderIcon,
	lucide,
	element,
	svg,
	missingIcon
} from './oneput/lib/icons.js';
export type { IconRenderer } from './oneput/lib/icons.js';

export { Oneput, OneputController, OneputCornerButton, Anchor, Controller };
export type { UILayout };
