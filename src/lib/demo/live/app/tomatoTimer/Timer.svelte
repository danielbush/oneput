<script lang="ts">
	import { onMount } from 'svelte';

	const { initialSecondsLeft }: { initialSecondsLeft: number } = $props();

	function formatSecondsToHHMMSS(totalSeconds: number): string {
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = Math.floor(totalSeconds % 60);

		const HH = hours.toString().padStart(2, '0');
		const MM = minutes.toString().padStart(2, '0');
		const SS = seconds.toString().padStart(2, '0');

		return `${HH}:${MM}:${SS}`;
	}

	let secondsRemaining = $state(initialSecondsLeft);
	let formattedSecondsRemaining = $derived(formatSecondsToHHMMSS(secondsRemaining));

	onMount(() => {
		const interval = setInterval(() => {
			secondsRemaining -= 1;
		}, 1000);
		return () => clearInterval(interval);
	});
</script>

<div class="timer">{formattedSecondsRemaining}</div>

<style>
	.timer {
		font-size: 300%;
	}
</style>
