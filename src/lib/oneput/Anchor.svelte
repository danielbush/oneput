<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { hideShowListener } from './lib.js';

	let { children, id = 'oneput__command-bar' } = $props();

	/**
	 * VISUAL_VIEWPORT_ZOOM
	 */
	const ensureScaleInvariance: Attachment<HTMLElement> = (fixed) => {
		const fn = () => {
			const vv = window.visualViewport;
			if (!vv) return;
			fixed.style.transform = `scale(${1 / vv!.scale})`;
			fixed.style.transformOrigin = 'bottom left';
		};
		document.addEventListener('touchend', fn);
		document.addEventListener('scroll', fn);
		document.addEventListener('resize', fn);
		return () => {
			document.removeEventListener('touchend', fn);
			document.removeEventListener('scroll', fn);
			document.removeEventListener('resize', fn);
		};
	};

	/**
	 * OSK_VISUAL_VIEWPORT
	 */
	const adjustPosition: Attachment<HTMLElement> = (fixed) => {
		const vv = window.visualViewport;
		if (!vv) return;

		const layoutViewport = document.createElement('div');
		layoutViewport.style.position = 'fixed';
		layoutViewport.style.width = '100%';
		layoutViewport.style.height = '100%';
		layoutViewport.style.visibility = 'hidden';
		document.body.appendChild(layoutViewport);

		function viewportHandler() {
			// Since the bar is position: fixed we need to offset it by the visual
			// viewport's offset from the layout viewport origin.
			var offsetX = vv!.offsetLeft;
			var offsetY = vv!.height - layoutViewport.getBoundingClientRect().height + vv!.offsetTop;

			// You could also do this by setting style.left and style.top if you
			// use width: 100% instead.
			fixed.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) ';
		}

		vv.addEventListener('resize', viewportHandler);
		vv.addEventListener('scroll', viewportHandler);
		// onscrollend = ...; // too new
		window.addEventListener('resize', viewportHandler);
		window.addEventListener('scroll', viewportHandler);
		// onscrollend = ...

		return () => {
			vv.removeEventListener('resize', viewportHandler);
			vv.removeEventListener('scroll', viewportHandler);
			window.removeEventListener('resize', viewportHandler);
			window.removeEventListener('scroll', viewportHandler);
		};
	};
</script>

<svelte:head>
	<!-- IOS_CLICK_ZOOM -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<div {id} class="oneput__command-bar" {@attach adjustPosition} {@attach hideShowListener(true)}>
	<div class="oneput__command-bar-inner">
		<div {@attach ensureScaleInvariance}>
			<!-- Oneput goes here -->
			{@render children()}
		</div>
	</div>
</div>

<style>
	.oneput__command-bar {
		position: fixed;
		left: 0;
		bottom: 0;
		width: 100%;
		height: 0;
	}

	.oneput__command-bar-inner {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		min-width: var(--oneput-min-width, 320px);
		max-width: var(--oneput-max-width, 500px);
	}
</style>
