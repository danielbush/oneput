import type { Controller } from '$lib/oneput/controller.js';
import { mount } from 'svelte';
import MenuStatusDisplay from './MenuStatus.svelte';

/**
 * This example shows how to mount a svelte component into Oneput.
 *
 * We can access the reactivity of some variables in the Controller instance
 * such as the open/close state of the menu (these come from $state or $props
 * within OneputController.)
 *
 * This might make sense if you actually are a svelte project.
 * Not suggesting you want to do this.  Oneput was designed mostly to trigger
 * actions and allow form-like interactions.
 *
 * TODO: Not sure how this works if you are using Oneput as a webcomponent.  A
 * .svelte file gets converted into javascript that executes in the browser.  So
 * it might be possible to use .svelte files in your Oneput app and ensure you
 * build them into artifacts.  But if you're doing that then you might want to
 * consider running svelte.
 */
export class MenuStatus {
	static onMount = (node: HTMLElement, ctl: Controller) => {
		const td = new MenuStatus(node, ctl);
		return () => {
			td.destroy();
		};
	};

	constructor(
		private node: HTMLElement,
		private ctl: Controller
	) {
		mount(MenuStatusDisplay, { target: node, props: { controller: this.ctl } });
	}

	destroy = () => {
		// TODO: is there any way to ensure we've cleaned up?
	};
}
