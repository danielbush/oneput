<script lang="ts">
	import '$lib/demo/styles.css';
	import '$lib/oneput/styles/oneput-defaults.css';
	import Oneput from '$lib/oneput/components/Oneput.svelte';
	import * as data from '$lib/demo/visual/state.js';
	import * as ui from '$lib/demo/visual/ui.js';
	import { refreshIcons, setupDemoState } from '$lib/demo/visual/state.svelte.js';
	import VisualDebugControls from '$lib/demo/components/VisualDebugControls.svelte';
	import ForceDarkModeControls from '$lib/demo/components/ForceDarkMode.svelte';
	import { onMount } from 'svelte';
	import { fchild, icon, iconButton, randomId, stdMenuItem } from '$lib/oneput/lib.js';
	import { xIcon } from '$lib/oneput/shared/icons.js';

	setupDemoState();

	onMount(() => {
		refreshIcons();
	});

	let toggleConfirm = $state(true);
	let toggleAlert = $state(true);
	let toggleNotification = $state(true);
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
			<button onclick={() => (toggleAlert = !toggleAlert)}>Toggle Alert</button>
			<Oneput
				menuOpen={true}
				menuItems={ui.menuItems1()}
				replaceUI={toggleAlert
					? undefined
					: {
							menu: {
								id: 'alert',
								type: 'vflex',
								classes: ['oneput__menu-body-content'],
								children: [
									{
										id: 'alert-title',
										type: 'fchild',
										htmlContentUnsafe: '<h2>Alert Title!</h2>'
									},
									{
										id: 'alert-message',
										type: 'fchild',
										htmlContentUnsafe: '<p>This is the sentence below the alert title.</p>'
									},
									{
										id: 'alert-button',
										type: 'fchild',
										tag: 'button',
										classes: ['oneput__primary-button'],
										textContent: 'OK',
										attr: {
											onclick: () => {
												toggleAlert = true;
											}
										}
									}
								]
							}
						}}
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
			<button onclick={() => (toggleConfirm = !toggleConfirm)}>Toggle Confirm</button>
			<Oneput
				menuOpen={true}
				menuItems={ui.menuItems1()}
				replaceUI={toggleConfirm
					? undefined
					: {
							menu: {
								id: 'alert',
								type: 'vflex',
								classes: ['oneput__menu-body-content'],
								children: [
									{
										id: 'alert-title',
										type: 'fchild',
										htmlContentUnsafe: '<h2>Confirm?</h2>'
									},
									{
										id: 'alert-message',
										type: 'fchild',
										htmlContentUnsafe: '<p>This is the sentence below the confirm title.</p>'
									},
									{
										id: 'confirm-button-group',
										type: 'hflex',
										style: { gap: '1rem' },
										children: [
											{
												id: 'confirm-yes-button',
												type: 'fchild',
												tag: 'button',
												classes: ['oneput__primary-button'],
												textContent: 'Yes',
												attr: {
													onclick: () => {
														toggleConfirm = true;
													}
												}
											},
											{
												id: 'confirm-no-button',
												type: 'fchild',
												tag: 'button',
												classes: ['oneput__primary-button'],
												textContent: 'No',
												attr: {
													onclick: () => {
														toggleConfirm = true;
													}
												}
											}
										]
									}
								]
							}
						}}
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
		<section class="demo-example">
			<h2>Notification</h2>
			<button onclick={() => (toggleNotification = !toggleNotification)}>Toggle Notification</button
			>
			<Oneput
				menuOpen={true}
				menuItems={ui.menuItems1()}
				injectUI={toggleNotification
					? undefined
					: {
							inner: {
								id: randomId(),
								type: 'hflex',
								classes: ['oneput__notification'],
								style: { width: '100%' },
								children: [
									{
										id: randomId(),
										type: 'fchild',
										classes: ['oneput__menu-item-body'],
										textContent: 'This is a notification'
									},
									{
										id: randomId(),
										type: 'fchild',
										classes: ['oneput__icon-button'],
										innerHTMLUnsafe: xIcon,
										attr: {
											onclick: () => {
												toggleNotification = true;
											}
										}
									}
								]
							}
						}}
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
		<section class="demo-example">
			<h2>Textarea (multiline)</h2>
			<Oneput
				menuOpen={false}
				menuItems={ui.menuItems1()}
				inputUI={{
					inputLines: 5,
					left: ui.inputLeft1,
					right: ui.inputRight1,
					outerLeft: ui.inputOuterLeft1,
					outerRight: ui.inputOuterRight1
				}}
				placeholder="Type multiple lines..."
				inputValue=""
				onInputChange={() => {
					console.log('onInputChange');
				}}
			/>
		</section>
	</section>

	<section class="demo-grid">
		<section class="demo-example demo-buttons">
			<h2>stdMenuItem</h2>
			<p>
				This template function handles a wide variety of menu item appearances. It's just a
				convenience so you don't have to keep writing the same flex/child data-structures. You can
				of course build your own to suit your needs.
			</p>
			<Oneput menuOpen={true} menuItems={[stdMenuItem({ textContent: 'No icons...' })]} />
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: icon({ innerHTMLUnsafe: '<i data-lucide="search"></i>' }),
						textContent: 'Left icon only...'
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: icon({ innerHTMLUnsafe: '<i data-lucide="search"></i>' }),
						textContent: 'Both left/right icons...',
						right: icon({ innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>' })
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: icon({ innerHTMLUnsafe: '<i data-lucide="search"></i>' }),
						textContent: 'Both left/right icons...',
						right: [
							iconButton({ title: 'Play', innerHTMLUnsafe: '<i data-lucide="play"></i>' }),
							iconButton({ title: 'Pause', innerHTMLUnsafe: '<i data-lucide="pause"></i>' }),
							iconButton({ title: 'Stop', innerHTMLUnsafe: '<i data-lucide="square"></i>' })
						]
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: icon({ innerHTMLUnsafe: '<i data-lucide="search"></i>' }),
						textContent: 'Both left/right icons + kbd...',
						innerRight: fchild({
							style: { flex: '0' },
							innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
							classes: ['oneput__kbd']
						}),

						right: icon({ innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>' })
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: icon({ innerHTMLUnsafe: '<i data-lucide="search"></i>' }),
						textContent: 'With bottom section...',
						bottom: {
							textContent: 'Here is a more detailed description.'
						},
						right: icon({ innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>' })
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: icon({ innerHTMLUnsafe: '<i data-lucide="search"></i>' }),
						textContent: 'Right + innerRight + bottom...',
						bottom: {
							textContent: 'Here is a more detailed description.'
						},
						right: icon({ innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>' }),
						innerRight: [
							iconButton({ title: 'Play', innerHTMLUnsafe: '<i data-lucide="play"></i>' }),
							iconButton({ title: 'Pause', innerHTMLUnsafe: '<i data-lucide="pause"></i>' }),
							iconButton({ title: 'Stop', innerHTMLUnsafe: '<i data-lucide="square"></i>' })
						]
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: icon({ innerHTMLUnsafe: '<i data-lucide="search"></i>' }),
						textContent: "hflex'd right content...",
						innerRight: fchild({
							style: { flex: '0' },
							innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
							classes: ['oneput__kbd']
						}),
						bottom: {
							textContent:
								'This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item.'
						},
						right: [icon({ innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>' })]
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: icon({ innerHTMLUnsafe: '<i data-lucide="search"></i>' }),
						textContent: "hflex'd right content...",
						innerRight: fchild({
							style: { flex: '0' },
							innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
							classes: ['oneput__kbd']
						}),
						bottom: {
							left: icon({ innerHTMLUnsafe: '<i data-lucide="info"></i>' }),
							textContent:
								'This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item.',
							right: [
								iconButton({
									title: 'More...',
									innerHTMLUnsafe: '<i data-lucide="ellipsis-vertical"></i>'
								})
							]
						},
						right: [icon({ innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>' })]
					})
				]}
			/>
		</section>
	</section>
</main>
