<script lang="ts">
	import type { SubscribedPropsProps } from './TomatoTimer.js';
	const { createProps, subscribe, Child }: SubscribedPropsProps = $props();

	let createdProps = $state(createProps());
	$effect(() => {
		subscribe();
		createdProps = createProps();
	});
</script>

<Child {...createdProps} />
