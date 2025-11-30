<script lang="ts" generics="P extends Record<string, unknown>">
	import type { SveltePropInjectorProps } from './TomatoTimer.js';
	const { createProps, subscribe, Child }: SveltePropInjectorProps<P> = $props();

	let createdProps = $state(createProps());
	$effect(() => {
		subscribe();
		createdProps = createProps();
	});
</script>

<Child {...createdProps} />
