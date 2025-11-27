<script lang="ts">
	import { onMount } from 'svelte';
	import { formatSecondsToHHMMSS } from './utils.js';
	import type { TomatoTimerValue } from './value.js';

	const {
		timerValue,
		subscribeTimerChanges
	}: {
		timerValue: TomatoTimerValue;
		subscribeTimerChanges: () => TomatoTimerValue | null;
	} = $props();

	let secondsRemaining = $state(timerValue.secondsRemaining);
	let formattedSecondsRemaining = $derived(formatSecondsToHHMMSS(secondsRemaining));
	let interval: ReturnType<typeof setInterval> | undefined;

	const stopTimer = () => {
		if (interval) {
			clearInterval(interval);
		}
	};

	const startTimer = () => {
		interval = setInterval(() => {
			secondsRemaining -= 1;
		}, 1000);
	};

	$effect(() => {
		subscribeTimerChanges();

		if (timerValue.isPaused || timerValue.isFinished) {
			stopTimer();
			return;
		}

		if (!interval) {
			startTimer();
		}
	});

	onMount(() => {
		return stopTimer;
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
