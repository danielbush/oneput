<script lang="ts">
  /**
   * Renders one builder child (`FChildParams`). Its tag, attributes and styles
   * pass through `checkedElement` before Svelte writes them, on the server and
   * in the browser. It shows the first content that is set: `icon`,
   * `textSegments`, `htmlContent`,
   * `textContent`.
   */
  import { onMount } from 'svelte';
  import { checkedElement, checkedRichContent } from '../../lib/domSafety.js';
  import { defaultVoidElements } from '../../lib/defaultVoidElements.js';
  import { renderIcon } from '../../lib/icons.js';
  import type { FChildParams } from '../../types.js';
  import { getMountContext } from './mountContext.js';

  type Props = FChildParams;
  let node: HTMLElement | null = $state(null);
  let props: Props = $props();
  let checked = $derived(checkedElement(props));
  const mountContext = getMountContext();

  onMount(() => {
    if (props.onMount) {
      return props.onMount(node!, mountContext);
    }
  });

  // Render icon if specified (takes precedence over all other content)
  // Use $effect, not onMount because fchild with same id in an array may
  // conditionally render an icon or spacer etc.
  $effect(() => {
    if (props.icon && node) {
      renderIcon(props.icon, node);
    }
  });
</script>

{#if defaultVoidElements.has(checked.tag)}
  <svelte:element
    this={checked.tag}
    id={props.id}
    bind:this={node}
    style={checked.style || undefined}
    class={['oneput__fchild', ...(props.classes || [])]}
    {...checked.attr}
  />
{:else}
  <svelte:element
    this={checked.tag}
    id={props.id}
    bind:this={node}
    style={checked.style || undefined}
    class={['oneput__fchild', ...(props.classes || [])]}
    {...checked.attr}
  >
    {#if props.icon}
      <!-- Icon is rendered via $effect using renderIcon() -->
    {:else if props.textSegments}
      <span>
        {#each props.textSegments as segment, index (index)}{#if segment.emphasis}<b
              >{segment.text}</b
            >{:else}<span class={segment.classes}>{segment.text}</span>{/if}{/each}
      </span>
    {:else if props.htmlContent !== undefined}
      <!-- sanitiseHtml cleaned this HTML inside a div, so it must go in a div. -->
      <div class="oneput__rich-content">{@html checkedRichContent(props.htmlContent)}</div>
    {:else if props.textContent}
      {props.textContent}
    {/if}
  </svelte:element>
{/if}
