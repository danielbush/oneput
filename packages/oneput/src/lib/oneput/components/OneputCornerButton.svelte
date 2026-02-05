<script lang="ts">
  import { hideShowListener } from '../lib/utils.js';
  import { renderIcon } from '../lib/icons.js';

  const handleClick = () => {
    window.dispatchEvent(new Event('oneput-toggle-hide'));
  };

  let { icon }: { icon: string } = $props();
  let node: HTMLButtonElement | null = $state(null);

  $effect(() => {
    if (node) {
      renderIcon(icon, node);
    }
  });
</script>

<button
  id="oneput__corner-button"
  title="Hide Oneput"
  aria-label="Hide Oneput"
  type="button"
  onclick={handleClick}
  bind:this={node}
  {@attach hideShowListener(false)}
>
</button>

<style>
  #oneput__corner-button {
    position: fixed;
    bottom: 0;
    right: 0;
    margin: 10px;

    border-radius: 100%;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    color: rgb(100 100 100 / 1);
    background: rgb(240 240 240 / 1);
    border: 1px solid rgb(0 0 0 / 0.3);
    box-shadow: var(--oneput-box-shadow);
    box-shadow: 0px 0px 20px 4px rgb(0 0 0 / 0.3);

    &:hover {
      background: rgb(230 230 230 / 1);
    }
    &:active {
      background: rgb(210 210 210 / 1);
      outline: 3px solid rgb(255 179 2 / 0.5);
    }
    &:focus {
      outline: 3px solid rgb(255 179 2 / 0.5);
    }
  }
</style>
