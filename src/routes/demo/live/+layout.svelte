<script lang="ts">
	import { Anchor, OneputCornerButton, OneputController, Controller } from '$oneput';
	let { children } = $props();
	let controller: Controller | null = null;
	function setController(ctl: Controller) {
		controller = ctl;
		console.log('controller', controller);
	}
	import { Command } from '@lucide/svelte';
	setTimeout(() => {
		window.dispatchEvent(new Event('oneput-toggle-hide'));
	}, 10);
</script>

{@render children()}
<Anchor>
	<OneputController controllerRef={setController} />
</Anchor>
<OneputCornerButton>
	{#snippet icon()}<Command />{/snippet}
</OneputCornerButton>
