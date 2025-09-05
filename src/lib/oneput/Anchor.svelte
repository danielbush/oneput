<script lang="ts">
	import type { Attachment } from 'svelte/attachments';

	let { children } = $props();

	const adjustPosition: Attachment<HTMLElement> = (fixed) => {
		const vv = window.visualViewport;
		if (!vv) return;

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
	};
</script>

<svelte:head>
	<!-- IOS_CLICK_ZOOM -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<div id="command-bar" class="command-bar" {@attach adjustPosition}>
	<div class="command-bar-inner">
		{@render children()}
	</div>
</div>

<style>
	.command-bar {
		position: fixed;
		left: 0;
		bottom: 0;
		width: 100%;
		height: 0;
	}

	.command-bar-inner {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		min-width: var(--oneput-min-width, 320px);
		max-width: var(--oneput-max-width, 500px);
	}
</style>
