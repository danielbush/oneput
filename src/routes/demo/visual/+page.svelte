<script lang="ts">
	import '$lib/demo/styles.css';
	import '$lib/oneput/oneput-defaults.css';
	import '$lib/oneput/oneput-user-defined.css';
	import Oneput from '$lib/oneput/Oneput.svelte';
	import * as data from '$lib/demo/visual/state.js';
	import * as ui from '$lib/demo/ui.js';
	import { refreshIcons, setupDemoState } from '$lib/demo/visual/state.svelte.js';
	import VisualDebugControls from '$lib/demo/components/VisualDebugControls.svelte';
	import ForceDarkModeControls from '$lib/demo/components/ForceDarkMode.svelte';
	import { onMount } from 'svelte';
	import { NullController } from '$lib/oneput/controller.js';

	setupDemoState();

	onMount(() => {
		refreshIcons();
	});
</script>

<main>
	<h1>Oneput Visual States</h1>
	<p>Demo visual states for Oneput component</p>
	<VisualDebugControls />
	<ForceDarkModeControls />

	<br />

	<section class="demo-grid">
		<section class="demo-example">
			<h2>Everything showing</h2>
			{#snippet demo1(menuOpen: boolean)}
				<Oneput
					controller={new NullController()}
					{menuOpen}
					menu={{
						header: ui.menuHeader1,
						items: ui.menuItems1(),
						footer: ui.menuFooter1(data.appState.zap)
					}}
					inner={ui.inner1}
					outer={ui.outer1(data.appState.zap)}
					input={{
						left: ui.inputLeft1,
						right: ui.inputRight1,
						outerLeft: ui.inputOuterLeft1,
						outerRight: ui.inputOuterRight1
					}}
					placeholder="Placeholder..."
					inputValue=""
					handleInputChange={() => {
						console.log('handleInputChange');
					}}
				/>
			{/snippet}
			{@render demo1(false)}
			<p>Menu open</p>
			{@render demo1(true)}
		</section>

		<section class="demo-example">
			<h2>Minimal</h2>
			{#snippet demo1(menuOpen: boolean)}
				<Oneput
					controller={new NullController()}
					{menuOpen}
					menu={{
						items: ui.menuItems1()
					}}
					input={{}}
					placeholder="Placeholder..."
					inputValue=""
					handleInputChange={() => {
						console.log('handleInputChange');
					}}
				/>
			{/snippet}
			{@render demo1(false)}
			<p>Menu open</p>
			{@render demo1(true)}
		</section>
		<section class="demo-example">
			<h2>Alert</h2>
			<Oneput
				controller={new NullController()}
				menuOpen={true}
				menu={{
					items: [
						{
							id: 'alert',
							type: 'vflex',
							classes: ['oneput__menu-body-content'],
							children: [
								{
									id: 'alert-title',
									innerHTMLUnsafe: '<h2>Alert Title!</h2>'
								},
								{
									id: 'alert-message',
									innerHTMLUnsafe: '<p>This is the sentence below the alert title.</p>'
								},
								{
									id: 'alert-button',
									tag: 'button',
									classes: ['oneput__primary-button'],
									textContent: 'OK'
								}
							]
						}
					]
				}}
				input={{
					left: ui.inputLeft1,
					right: ui.inputRight1,
					outerLeft: ui.inputOuterLeft1,
					outerRight: ui.inputOuterRight1
				}}
				placeholder="Type enter to continue..."
				inputValue=""
				handleInputChange={() => {
					console.log('handleInputChange');
				}}
			/>
		</section>
		<section class="demo-example">
			<h2>Confirm</h2>
			<Oneput
				controller={new NullController()}
				menuOpen={true}
				menu={{
					items: [
						{
							id: 'alert',
							type: 'vflex',
							classes: ['oneput__menu-body-content'],
							children: [
								{
									id: 'alert-title',
									innerHTMLUnsafe: '<h2>Confirm?</h2>'
								},
								{
									id: 'alert-message',
									innerHTMLUnsafe: '<p>This is the sentence below the confirm title.</p>'
								},
								{
									id: 'confirm-button-group',
									type: 'hflex',
									style: { gap: '1rem' },
									children: [
										{
											id: 'confirm-yes-button',
											tag: 'button',
											classes: ['oneput__primary-button'],
											textContent: 'Yes'
										},
										{
											id: 'confirm-no-button',
											tag: 'button',
											classes: ['oneput__primary-button'],
											textContent: 'No'
										}
									]
								}
							]
						}
					]
				}}
				input={{
					left: ui.inputLeft1,
					right: ui.inputRight1,
					outerLeft: ui.inputOuterLeft1,
					outerRight: ui.inputOuterRight1
				}}
				placeholder="Type y or n..."
				inputValue=""
				handleInputChange={() => {
					console.log('handleInputChange');
				}}
			/>
		</section>
	</section>
</main>
