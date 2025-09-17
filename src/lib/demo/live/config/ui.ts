import type { Controller } from '$lib/oneput/controller.js';
import type { FlexParams } from '$lib/oneput/lib.js';
import type { DefaultUI } from '$lib/oneput/UIController.js';
import { inputUI, menuHeaderUI } from '$lib/ui.js';
import { DateDisplay } from '../plugins/ui/DateDisplay.js';
import { SvelteExample } from '../plugins/ui/SvelteDisplay/SvelteExample.js';
import { TimeDisplay } from '../plugins/ui/TimeDisplay.js';

export type MyDefaultUIValues = { exit?: () => void; menuHeader?: string };

export class MyDefaultUI implements DefaultUI<MyDefaultUIValues> {
	constructor(private c: Controller) {}
	values = {
		exit: () => {
			this.c.menu.closeMenu();
		},
		menuHeader: 'Menu'
	};

	get input() {
		return inputUI(this.c);
	}
	get menu() {
		return {
			header: menuHeaderUI({
				title: this.values.menuHeader || 'Menu',
				exit:
					this.values.exit ||
					(() => {
						this.c.menu.closeMenu();
					})
			})
		};
	}

	get inner() {
		return {
			id: 'root-inner',
			type: 'hflex' as const,
			children: [
				{
					id: 'root-inner-left',
					type: 'fchild' as const,
					style: { flex: '1' }
				},
				{
					id: 'root-inner-middle',
					type: 'fchild' as const,
					style: { justifyContent: 'center' },
					onMount: TimeDisplay.onMount
				},
				{
					id: 'root-inner-right',
					type: 'fchild' as const,
					style: { flex: '1' }
				}
			]
		};
	}

	get outer() {
		return {
			id: 'root-outer',
			type: 'hflex' as const,
			children: [
				{
					id: 'root-outer-left',
					type: 'fchild' as const,
					style: { flex: '1', position: 'relative' },
					onMount: (node) => SvelteExample.onMount(node, this.c)
				},
				{
					id: 'root-outer-right',
					type: 'fchild' as const,
					style: { flex: '1', justifyContent: 'flex-end' },
					onMount: DateDisplay.onMount
				}
			]
		} as FlexParams;
	}
}
