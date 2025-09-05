<script lang="ts">
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		const vv = window.visualViewport;
		if (!vv) return;
		const fixed = document.getElementById('command-bar')!;
		if (!fixed) return;

		const layoutViewport = document.createElement('div');
		layoutViewport.style.position = 'fixed';
		layoutViewport.style.width = '100%';
		layoutViewport.style.height = '100%';
		layoutViewport.style.visibility = 'hidden';
		document.body.appendChild(layoutViewport);

		// See OSK_VISUAL_VIEWPORT
		function viewportHandler() {
			// Since the bar is position: fixed we need to offset it by the visual
			// viewport's offset from the layout viewport origin.
			var offsetX = vv!.offsetLeft;
			var offsetY = vv!.height - layoutViewport.getBoundingClientRect().height + vv!.offsetTop;

			// You could also do this by setting style.left and style.top if you
			// use width: 100% instead.
			fixed.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) ';
		}

		vv.onresize = viewportHandler;
		vv.onscroll = viewportHandler;
		// vv.onscrollend = ...; // too new
		window.onresize = viewportHandler;
		window.onscroll = viewportHandler;
		// window.onscrollend = ...
	});
</script>

<svelte:head>
	<!-- IOS_CLICK_ZOOM -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<div id="command-bar" class="command-bar">
	{@render children()}
</div>

<style>
	:global {
		body {
			margin: 0;
		}
	}

	.command-bar {
		position: fixed;
		left: 0;
		bottom: 0;
		width: 100%;
		display: flex;
		justify-content: center;
	}
</style>
