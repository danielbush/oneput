<script lang="ts">
	import { onMount } from 'svelte';
	import { formatSecondsToHHMMSS } from './utils.js';
	import type { createSubscriber } from 'svelte/reactivity';

	const {
		initialSecondsLeft,
		subscribe
	}: {
		initialSecondsLeft: number;
		subscribe: ReturnType<typeof createSubscriber>;
	} = $props();

	let secondsRemaining = $state(initialSecondsLeft);
	let formattedSecondsRemaining = $derived(formatSecondsToHHMMSS(secondsRemaining));

	$effect(() => {
		subscribe();
		if (interval) {
			clearInterval(interval);
		}
	});

	let interval: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		interval = setInterval(() => {
			secondsRemaining -= 1;
		}, 1000);
		return () => clearInterval(interval);
	});
</script>

<div class={['timer', secondsRemaining < 0 ? 'negative' : '']}>{formattedSecondsRemaining}</div>

<style>
	.timer {
		font-size: 300%;
	}
	.negative {
		color: rgb(195 0 0 / 0.8);
	}
</style>
