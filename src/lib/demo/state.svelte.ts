// Some general controls used across demo pages.

const demoState = $state({
	visualDebug: false,
	forceDarkMode: false,
	toggleVisualDebug: () => {
		demoState.visualDebug = !demoState.visualDebug;
		if (demoState.visualDebug) {
			document.documentElement.classList.add('oneput__debug');
		} else {
			document.documentElement.classList.remove('oneput__debug');
		}
	},
	toggleForceDarkMode: () => {
		demoState.forceDarkMode = !demoState.forceDarkMode;
		if (demoState.forceDarkMode) {
			document.documentElement.classList.add('dark-mode');
		} else {
			document.documentElement.classList.remove('dark-mode');
		}
	}
});

export { demoState };
