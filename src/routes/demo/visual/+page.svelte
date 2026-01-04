<script lang="ts">
	import '$lib/demo/styles.css';
	import '$lib/oneput/shared/styles/oneput-defaults.css';
	import Oneput from '$lib/oneput/components/Oneput.svelte';
	import * as data from '$lib/demo/visual/state.js';
	import * as ui from '$lib/demo/visual/ui.js';
	import { refreshIcons, icons as iconsAlt } from '$lib/demo/visual/state.svelte.js';
	import VisualDebugControls from '$lib/demo/components/VisualDebugControls.svelte';
	import ForceDarkModeControls from '$lib/demo/components/ForceDarkMode.svelte';
	import { onMount } from 'svelte';
	import { randomId } from '$lib/oneput/lib/utils.js';
	import { stdMenuItem } from '$lib/oneput/shared/ui/menuItems/stdMenuItem.js';
	import { icons } from '$lib/demo/live/icons.js';
	import { tinykeys } from 'tinykeys';

	const oneputState = $state({
		menuOpen: false
	});

	onMount(() => {
		refreshIcons();
	});

	$effect(() => {
		if (oneputState.menuOpen) {
			refreshIcons();
		}
	});

	// Global keybindings

	$effect(() => {
		tinykeys(document.body, {
			'$mod+k': () => {
				oneputState.menuOpen = !oneputState.menuOpen;
			}
		});
	});

	// Oneput keybindings

	$effect(() => {
		tinykeys(document.body, {
			'control+n': () => {
				//
			}
		});
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
				replaceMenuUI={toggleAlert
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
				replaceMenuUI={toggleConfirm
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
										textContent: 'This is a notification'
									},
									{
										id: randomId(),
										type: 'fchild',
										classes: ['oneput__icon-button'],
										icon: icons.X,
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
					textArea: { rows: 5 },
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

	<hr />

	<section class="demo-grid">
		<section class="demo-example demo-buttons">
			<h2>stdMenuItem</h2>
			<p>
				This template function handles a wide variety of menu item appearances. It's just a
				convenience so you don't have to keep writing the same flex/child data-structures. You can
				of course build your own to suit your needs.
			</p>
			<Oneput
				menuOpen={true}
				menuItems={[stdMenuItem({ textContent: 'No left icons space...', left: false })]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						textContent:
							'No left+right space. This is a very long line that should get cut off with an ellipsis but does it, lets see.' +
							'This is a very long line that should get cut off with an ellipsis but does it, lets see.',
						left: false,
						right: false
					})
				]}
			/>
			<Oneput menuOpen={true} menuItems={[stdMenuItem({ textContent: 'No icons...' })]} />
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						textContent:
							'This is a very long line that should get cut off with an ellipsis but does it, lets see.' +
							'This is a very long line that should get cut off with an ellipsis but does it, lets see.'
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: (b) => [b.icon(iconsAlt.Search)],
						textContent: 'Left icon only...'
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: (b) => [b.icon(iconsAlt.Search)],
						textContent: 'Both left + right icons...',
						right: (b) => [b.icon(iconsAlt.ChevronRight)]
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: (b) => [b.icon(iconsAlt.Search)],
						textContent: 'Left + multiple right icons...',
						right: (b) => [
							b.iconButton(iconsAlt.Play, { title: 'Play' }),
							b.iconButton(iconsAlt.Pause, { title: 'Pause' }),
							b.iconButton(iconsAlt.Square, { title: 'Stop' })
						]
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: (b) => [b.icon(iconsAlt.Search)],
						textContent: 'Left + right (kbd) ...',
						right: (b) => [
							b.fchild({
								style: { flex: '0' },
								innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
								classes: ['oneput__kbd']
							}),
							b.icon(iconsAlt.ChevronRight)
						]
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: (b) => [b.icon(iconsAlt.Search)],
						textContent: 'Left + right + innerBottom section...',
						right: (b) => [b.icon(iconsAlt.ChevronRight)],
						bottom: {
							textContent: 'Here is a more detailed description.'
						}
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: (b) => [b.icon(iconsAlt.Search)],
						textContent: 'Left + right + right + bottom...',
						right: (b) => [
							b.iconButton(iconsAlt.Play, {
								title: 'Play',
								innerHTMLUnsafe: '<i data-lucide="play"></i>'
							}),
							b.iconButton(iconsAlt.Pause, {
								title: 'Pause',
								innerHTMLUnsafe: '<i data-lucide="pause"></i>'
							}),
							b.iconButton(iconsAlt.Square, {
								title: 'Stop',
								innerHTMLUnsafe: '<i data-lucide="square"></i>'
							}),
							b.icon(iconsAlt.ChevronRight)
						],
						bottom: {
							textContent: 'Here is a more detailed description.'
						}
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: (b) => [b.icon(iconsAlt.Search)],
						textContent: 'Left + right (kbd) + bottom...',
						right: (b) => [
							b.fchild({
								style: { flex: '0' },
								innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
								classes: ['oneput__kbd']
							}),
							b.icon(iconsAlt.ChevronRight)
						],
						bottom: {
							textContent:
								'This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item.'
						}
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: (b) => [b.icon(iconsAlt.Search)],
						textContent: 'Left + right + bottom (left)...',
						right: (b) => [
							b.fchild({
								style: { flex: '0' },
								innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
								classes: ['oneput__kbd']
							}),
							b.spacer()
						],
						bottom: {
							left: (b) => [b.icon(iconsAlt.Info)],
							textContent:
								'This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item.'
						}
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: (b) => [b.icon(iconsAlt.Search)],
						textContent: 'Left + right + bottom (left + right)...',
						right: (b) => [
							b.fchild({
								style: { flex: '0' },
								innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
								classes: ['oneput__kbd']
							}),
							b.spacer()
						],
						bottom: {
							left: (b) => [b.icon(iconsAlt.Info)],
							textContent:
								'This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item.',
							right: (b) => [
								b.iconButton(iconsAlt.EllipsisVertical, {
									title: 'More...'
								})
							]
						}
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: (b) => [b.icon(iconsAlt.Search)],
						textContent: 'No bottom (left + right)...',
						right: (b) => [
							b.fchild({
								style: { flex: '0' },
								innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
								classes: ['oneput__kbd']
							}),
							b.spacer()
						],
						bottom: {
							left: false,
							textContent:
								'This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item.',
							right: false
						}
					})
				]}
			/>
			<Oneput
				menuOpen={true}
				menuItems={[
					stdMenuItem({
						left: false,
						textContent: 'No Left + no bottom (left + right)...',
						right: (b) => [
							b.fchild({
								style: { flex: '0' },
								innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
								classes: ['oneput__kbd']
							})
						],
						bottom: {
							left: false,
							textContent:
								'This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item.',
							right: false
						}
					})
				]}
			/>
		</section>
	</section>
</main>
