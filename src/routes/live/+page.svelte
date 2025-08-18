<script lang="ts">
	import '../../lib/oneput/oneput-defaults.css';
	import '../../lib/oneput/oneput-user-defined.css';
	import * as lucide from 'lucide';
	import Oneput from '../../lib/oneput/Oneput.svelte';
	import * as data from '../../lib/oneput/examples/demo/index.js';
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

<main class={[visualDebug && 'oneput__debug']}>
	<h1>Oneput Demo</h1>
	<div class="demo-controls">
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
	</div>

	<br />

	<Oneput
		menuOpen={true}
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
</main>
