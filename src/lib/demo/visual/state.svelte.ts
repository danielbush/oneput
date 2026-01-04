import * as lucide from 'lucide';
import { registerIcon, unsafeHTML } from '$lib/oneput/lib/icons.js';

const iconData = {
	ChevronUp: lucide.icons.ChevronUp,
	ChevronDown: lucide.icons.ChevronDown,
	Search: lucide.icons.Search,
	CircleSmall: lucide.icons.CircleSmall,
	ChevronRight: lucide.icons.ChevronRight,
	ChevronLeft: lucide.icons.ChevronLeft,
	Database: lucide.icons.Database,
	GitCommitVertical: lucide.icons.GitCommitVertical,
	Share2: lucide.icons.Share2,
	X: lucide.icons.X,
	Zap: lucide.icons.Zap,
	EllipsisVertical: lucide.icons.EllipsisVertical,
	Ellipsis: lucide.icons.Ellipsis,
	Mic: lucide.icons.Mic,
	Maximize2: lucide.icons.Maximize2,
	Info: lucide.icons.Info,
	Play: lucide.icons.Play,
	Pause: lucide.icons.Pause,
	Square: lucide.icons.Square
};

Object.entries(iconData).forEach(([name]) => {
	const snakeCaseName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
	registerIcon(name, unsafeHTML(`<i data-lucide="${snakeCaseName}"></i>`));
});

export const icons = Object.fromEntries(
	Object.keys(iconData).map((name) => [name, name])
) as Record<keyof typeof iconData, string>;

/**
 * Some icons such as lucide need to be called when the DOM changes (eg the menu
 * opens) in order to replace html placeholders with icons.
 */
export function refreshIcons() {
	lucide.createIcons({
		icons: iconData
	});
}
