<script lang="ts">
  import { renderIcon } from '../../lib/icons.js';
  const { onClick, isHidden }: { onClick: (evt: Event) => void; isHidden: () => boolean } =
    $props();
  let iconNode: HTMLButtonElement | null = $state(null);
  $effect(() => {
    if (iconNode) {
      renderIcon('Check', iconNode);
    }
  });
</script>

{#if !isHidden()}
  <button
    title="Accept"
    aria-label="Accept"
    type="button"
    onclick={onClick}
    class="oneput__icon-button oneput__icon-accept"
    bind:this={iconNode}
  ></button>
{/if}
