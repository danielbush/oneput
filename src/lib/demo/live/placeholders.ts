import type { KeyBindingMap } from '$lib/oneput/lib/bindings.js';

export const submitPlaceholder = (bindings: KeyBindingMap) => {
	const submitBinding = bindings['submit'];
	const binding = submitBinding?.bindings[0];
	if (binding) {
		return `Type a label and/or hit ${binding}...`;
	} else {
		return `Type a label...`;
	}
};
