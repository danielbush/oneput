<script lang="ts">
	import '$lib/demo/styles.css';
	import '$lib/oneput/oneput-defaults.css';
	import Oneput from '$lib/oneput/Oneput.svelte';
	import * as data from '$lib/demo/visual/state.js';
	import * as ui from '$lib/demo/visual/ui.js';
	import { refreshIcons, setupDemoState } from '$lib/demo/visual/state.svelte.js';
	import VisualDebugControls from '$lib/demo/components/VisualDebugControls.svelte';
	import ForceDarkModeControls from '$lib/demo/components/ForceDarkMode.svelte';
	import { onMount } from 'svelte';

	setupDemoState();

	onMount(() => {
		refreshIcons();
	});
</script>

<svelte:head>
	<!-- IOS_CLICK_ZOOM -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

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
					{menuOpen}
					menuItems={ui.menuItems1()}
					menuUI={{
						header: ui.menuHeader1,
						footer: ui.menuFooter1(data.appState.zap)
					}}
					innerUI={ui.inner1}
					outerUI={ui.outer1(data.appState.zap)}
					inputUI={{
						left: ui.inputLeft1,
						right: ui.inputRight1,
						outerLeft: ui.inputOuterLeft1,
						outerRight: ui.inputOuterRight1
					}}
					placeholder="Placeholder..."
					inputValue=""
					onInputChange={() => {
						console.log('onInputChange');
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
					{menuOpen}
					menuItems={ui.menuItems1()}
					inputUI={{}}
					placeholder="Placeholder..."
					inputValue=""
					onInputChange={() => {
						console.log('onInputChange');
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
				menuOpen={true}
				menuItems={[
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
				]}
				inputUI={{
					left: ui.inputLeft1,
					right: ui.inputRight1,
					outerLeft: ui.inputOuterLeft1,
					outerRight: ui.inputOuterRight1
				}}
				placeholder="Type enter to continue..."
				inputValue=""
				onInputChange={() => {
					console.log('onInputChange');
				}}
			/>
		</section>
		<section class="demo-example">
			<h2>Confirm</h2>
			<Oneput
				menuOpen={true}
				menuItems={[
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
				]}
				inputUI={{
					left: ui.inputLeft1,
					right: ui.inputRight1,
					outerLeft: ui.inputOuterLeft1,
					outerRight: ui.inputOuterRight1
				}}
				placeholder="Type y or n..."
				inputValue=""
				onInputChange={() => {
					console.log('onInputChange');
				}}
			/>
		</section>
	</section>
</main>
