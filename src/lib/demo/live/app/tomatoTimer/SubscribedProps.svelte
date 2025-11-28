<script lang="ts" generics="P extends Record<string, unknown>">
	import type { SProps } from './TomatoTimer.js';
	const { createProps, subscribe, Child }: SProps<P> = $props();

	let createdProps = $state(createProps());
	$effect(() => {
		subscribe();
		createdProps = createProps();
	});
</script>

<Child {...createdProps} />
