<script lang="ts">
	import '../lib/oneput/oneput-defaults.css';
	import '../lib/oneput/oneput-user-defined.css';
	import * as lucide from 'lucide';
	import Oneput from '../lib/oneput/Oneput.svelte';
	import * as data from '../lib/oneput/examples/demo/index.js';
	$effect(() => {
		lucide.createIcons({
			icons: {
				ChevronUp: lucide.icons.ChevronUp,
				ChevronDown: lucide.icons.ChevronDown,
				Search: lucide.icons.Search,
				CircleSmall: lucide.icons.CircleSmall,
				ChevronRight: lucide.icons.ChevronRight,
				ChevronLeft: lucide.icons.ChevronLeft,
				Database: lucide.icons.Database,
				GitCommitVertical: lucide.icons.GitCommitVertical,
				Share2: lucide.icons.Share2,
				X: lucide.icons.X,
				Zap: lucide.icons.Zap,
				EllipsisVertical: lucide.icons.EllipsisVertical,
				Ellipsis: lucide.icons.Ellipsis,
				Mic: lucide.icons.Mic,
				Maximize2: lucide.icons.Maximize2,
				Info: lucide.icons.Info,
				Play: lucide.icons.Play,
				Pause: lucide.icons.Pause,
				Square: lucide.icons.Square
			}
		});
	});

	let visualDebug = $state(false);
	let forceDarkMode = $state(false);

	$effect(() => {
		if (forceDarkMode) {
			document.documentElement.classList.add('dark-mode');
		} else {
			document.documentElement.classList.remove('dark-mode');
		}
	});
</script>

<main>
	<h1>Oneput Visual States</h1>
	<p>Demo visual states for Oneput component</p>
	<fieldset>
		<button type="button" onclick={() => (visualDebug = !visualDebug)}>
			Toggle visual debug
		</button>
		<ul>
			<li>Highlights hflex, vflex and fchild</li>
			<li>
				You can adjust the debug styling in oneput-defaults.css - look for the
				<code>.oneput__debug</code> class.
			</li>
		</ul>
	</fieldset>
	<fieldset>
		<button type="button" onclick={() => (forceDarkMode = !forceDarkMode)}>
			Toggle force dark mode on page
		</button>
	</fieldset>

	<br />

	<section class={['grid', visualDebug && 'oneput__debug']}>
		<section class="example">
			<h2>Everything showing</h2>
			{#snippet demo1(menuOpen: boolean)}
				<Oneput
					{menuOpen}
					menu={{
						header: data.menuHeader1,
						items: data.menuItems1,
						footer: data.menuFooter1
					}}
					inner={data.inner1}
					outer={data.outer1}
					input={{
						left: data.inputLeft1,
						right: data.inputRight1,
						outerLeft: data.inputOuterLeft1,
						outerRight: data.inputOuterRight1
					}}
					placeholder="Placeholder..."
					inputValue={''}
					handleInputChange={() => {
						console.log('handleInputChange');
					}}
				/>
			{/snippet}
			{@render demo1(false)}
			<p>Menu open</p>
			{@render demo1(true)}
		</section>

		<section class="example">
			<h2>Minimal</h2>
			{#snippet demo1(menuOpen: boolean)}
				<Oneput
					{menuOpen}
					menu={{
						items: data.menuItems1
					}}
					placeholder="Placeholder..."
					inputValue={''}
					handleInputChange={() => {
						console.log('handleInputChange');
					}}
				/>
			{/snippet}
			{@render demo1(false)}
			<p>Menu open</p>
			{@render demo1(true)}
		</section>
	</section>
</main>

<style>
	:global(:root) {
		/* This just allows dark mode. */
		color-scheme: light dark;
		color-scheme: light;
	}
	h2 {
		margin: 0;
	}
	p {
		margin: 0;
	}
	section.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
		gap: 1rem;
		padding: 0;
	}
	section {
		padding: 1rem;
	}

	section.example {
		border: 0.5px solid #ccc;
		border-radius: 5px;
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
		box-shadow: 0px 0px 5px 0px rgba(0, 0, 0, 0.3);
	}
</style>
