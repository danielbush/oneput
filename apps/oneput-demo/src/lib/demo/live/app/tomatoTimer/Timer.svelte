<script lang="ts">
  import { onMount } from 'svelte';
  import { formatSecondsToHHMMSS } from './utils.js';
  import { icons } from '@lucide/svelte';

  interface Props {
    initialSecondsRemaining: number;
    isPaused: boolean;
    isFinished: boolean;
  }

  const { initialSecondsRemaining, isPaused, isFinished }: Props = $props();

  let secondsRemaining = $state(initialSecondsRemaining);
  let interval: ReturnType<typeof setInterval> | undefined;

  const stopTimer = () => {
    if (interval) {
      clearInterval(interval);
    }
    interval = undefined;
  };

  const startTimer = () => {
    interval = setInterval(() => {
      secondsRemaining -= 1;
    }, 1000);
  };

  $effect(() => {
    if (isPaused || isFinished) {
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

<div class={['timer', secondsRemaining < 0 ? 'negative' : '']}>
  {formatSecondsToHHMMSS(secondsRemaining)}

  {#if isPaused}
    <div class="pause">
      <icons.Pause />
    </div>
  {/if}
</div>

<style>
  .pause {
    position: absolute;
    right: -0.75em;
    top: -0.1em;
  }
  .timer {
    position: relative;
    font-size: 300%;
    display: flex;
  }
  .negative {
    color: rgb(195 0 0 / 0.8);
  }
</style>
