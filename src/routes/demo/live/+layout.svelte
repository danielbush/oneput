<script lang="ts">
	// Pretend the code here could be something outside of svelte.
	// We create a layout and we add OneputWrapper eg as a web component.
	// We then get the controller from OneputWrapper and bootstrap our
	// oneput-based world.

	import '$lib/demo/styles.css';
	import '$lib/oneput/oneput-defaults.css';
	import '$lib/oneput/oneput-user-defined.css';
	import OneputController from '$lib/oneput/OneputController.svelte';
	import type { Controller } from '$lib/oneput/Controller.js';
	import { id as randomId, type FlexParams } from '$lib/oneput/lib.js';

	const piIcon =
		'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pi-icon lucide-pi"><line x1="9" x2="9" y1="4" y2="20"/><path d="M4 7c0-1.7 1.3-3 3-3h13"/><path d="M18 20c-1.7 0-3-1.3-3-3V4"/></svg>';

	const menuItemWithIcon = ({ id, icon, text }: { id: string; icon?: string; text: string }) => {
		return {
			id,
			type: 'hflex',
			tag: 'button',
			children: [
				{
					id: randomId(),
					classes: ['oneput__icon'],
					innerHTMLUnsafe: icon
				},
				{
					id: randomId(),
					classes: ['oneput__menu-item-body'],
					textContent: text
				}
			]
		} satisfies FlexParams;
	};

	// Our app starts in this callback.  We get the controller and we can set
	// keys and configure oneput.
	const setController = (c: Controller) => {
		c.update({
			globalKeys: {
				keys: {
					'$mod+k': () => {
						console.log('menuOpen', !c.menuOpen);
						c.update({ menuOpen: !c.menuOpen });
					}
				}
			},
			// Setting input will show the input part of Oneput.
			input: {},
			menu: {
				items: [
					menuItemWithIcon({ id: 'insert-katex', icon: piIcon, text: 'Insert katex...' }),
					menuItemWithIcon({ id: 'some-action-1', text: 'Some action 1...' }),
					menuItemWithIcon({ id: 'some-action-2', text: 'Some action 2...' }),
					menuItemWithIcon({ id: 'some-action-3', text: 'Some action 3...' }),
					menuItemWithIcon({ id: 'some-action-4', text: 'Some action 4...' })
				]
			}
		});
	};

	let { children } = $props();
</script>

<div class="app-container">
	<div class="content-area">
		{@render children()}
	</div>

	<div class="command-bar">
		<OneputController controllerRef={setController} />
	</div>
</div>

<style>
	:global {
		body {
			margin: 0;
		}
		.oneput__container {
			--oneput-max-width: 600px;
		}
	}

	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
		overflow: hidden;
	}

	.content-area {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.command-bar {
		width: 100%;
		position: absolute;
		bottom: 0;
		z-index: 1000;
		padding-bottom: 8px;
		display: flex;
		justify-content: center;
	}
</style>
