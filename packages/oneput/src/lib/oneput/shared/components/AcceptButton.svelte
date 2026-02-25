<script lang="ts">
  import { renderIcon } from '../../lib/icons.js';
  import type { Controller } from '../../controllers/controller.js';
  const { controller, onClick }: { controller: Controller; onClick: (evt: Event) => void } =
    $props();
  let iconNode: HTMLButtonElement | null = $state(null);
  $effect(() => {
    if (iconNode) {
      renderIcon('Check', iconNode);
    }
  });
</script>

{#if controller.input.getInputValue()}
  <button
    title="Accept"
    aria-label="Accept"
    type="button"
    onclick={onClick}
    class="oneput__icon-button enabled"
    bind:this={iconNode}
  ></button>
{/if}

<style>
  .enabled {
    background-color: rgb(0 128 0 / 0.8);
    color: white;
  }
  .enabled:hover {
    background-color: rgb(0 128 0 / 1);
  }
</style>
