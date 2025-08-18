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

	return demoState;
}
