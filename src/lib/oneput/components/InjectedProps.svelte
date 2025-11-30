<script lang="ts" generics="P extends Record<string, unknown>">
	import type { SveltePropInjectorProps } from '../../demo/live/app/tomatoTimer/TomatoTimer.js';
	const { createProps, subscribe, Child }: SveltePropInjectorProps<P> = $props();

	let createdProps = $state(createProps());
	$effect(() => {
		subscribe();
		createdProps = createProps();
	});
</script>

<Child {...createdProps} />
