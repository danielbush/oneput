import * as lucide from 'lucide';
import { tinykeys } from 'tinykeys';
import { onMount } from 'svelte';

export const demoState = $state({
	visualDebug: false,
	forceDarkMode: false,
	toggleVisualDebug: () => {
		demoState.visualDebug = !demoState.visualDebug;
	},
	toggleForceDarkMode: () => {
		demoState.forceDarkMode = !demoState.forceDarkMode;
	}
});

/**
 * Some icons such as lucide need to be called when the DOM changes (eg the menu
 * opens) in order to replace html placeholders with icons.
 */
export function refreshIcons() {
	lucide.createIcons({
		icons: {
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
		}
	});
}

export function setupDemoState() {
	const oneputState = $state({
		menuOpen: false
	});

	onMount(() => {
		refreshIcons();
	});

	$effect(() => {
		if (oneputState.menuOpen) {
			refreshIcons();
		}
	});

	// Global keybindings

	$effect(() => {
		tinykeys(document.body, {
			'$mod+k': () => {
				oneputState.menuOpen = !oneputState.menuOpen;
			}
		});
	});

	// Oneput keybindings

	$effect(() => {
		tinykeys(document.body, {
			'control+n': () => {
				//
			}
		});
	});

	$effect(() => {
		if (demoState.forceDarkMode) {
			document.documentElement.classList.add('dark-mode');
		} else {
			document.documentElement.classList.remove('dark-mode');
		}
	});

	$effect(() => {
		if (demoState.visualDebug) {
			document.documentElement.classList.add('oneput__debug');
		} else {
			document.documentElement.classList.remove('oneput__debug');
		}
	});

	return oneputState;
}
