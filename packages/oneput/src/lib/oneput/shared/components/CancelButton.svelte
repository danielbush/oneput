<script lang="ts">
  import { renderIcon } from '../../lib/icons.js';
  const { onClick, isDisabled }: { onClick: (evt: Event) => void; isDisabled: () => boolean } =
    $props();
  let iconNode: HTMLButtonElement | null = $state(null);
  $effect(() => {
    if (iconNode) {
      renderIcon('X', iconNode);
    }
  });
</script>

<button
  title="Cancel"
  aria-label="Cancel"
  type="button"
  onclick={onClick}
  class={['oneput__icon-button', 'oneput__icon-cancel', isDisabled() && 'oneput__icon-disabled']}
  bind:this={iconNode}
></button>

<style>
</style>
