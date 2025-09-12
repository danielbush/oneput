// Some fake app state.

export const appState = {
	/**
	 * Just demos how to control state that might be global relative to several
	 * different sections of oneput.
	 */
	zap: {
		on: false,
		add(node: HTMLElement) {
			this.nodes.push(node);
		},
		remove(node: HTMLElement) {
			this.nodes = this.nodes.filter((n) => n !== node);
		},
		toggle() {
			this.on = !this.on;
			if (this.on) {
				this.nodes.forEach((node) => {
					node.style.color = 'dodgerblue';
					// or set class
					// node.classList.add('oneput__icon-toggle-button--on');
				});
			} else {
				this.nodes.forEach((node) => {
					node.style.color = '';
					// or set class
					// node.classList.remove('oneput__icon-toggle-button--on');
				});
			}
		},
		nodes: [] as HTMLElement[]
	}
};
