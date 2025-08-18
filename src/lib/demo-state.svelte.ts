import * as lucide from "lucide";

export const demoState = $state({
	visualDebug: false,
	forceDarkMode: false,
	toggleVisualDebug: () => {
		demoState.visualDebug = !demoState.visualDebug;
	},
	toggleForceDarkMode: () => {
		demoState.forceDarkMode = !demoState.forceDarkMode;
	},
});

export function setupDemoState() {
	$effect(() => {
		if (demoState.forceDarkMode) {
			document.documentElement.classList.add("dark-mode");
		} else {
			document.documentElement.classList.remove("dark-mode");
		}
	});

	$effect(() => {
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
				Square: lucide.icons.Square,
			},
		});
	});

	return demoState;
}
