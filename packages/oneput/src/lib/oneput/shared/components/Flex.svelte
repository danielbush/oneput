<script lang="ts">
  /**
   * Renders a builder `hflex` or `vflex` and its children. Each element's tag,
   * attributes and styles pass through `checkedElement`, and its attachments
   * through `checkedAttachments`, before Svelte writes them.
   */
  import FChild from './FChild.svelte';
  import { checkedElement, checkedAttachments } from '../../lib/domSafety.js';
  import { defaultVoidElements } from '../../lib/defaultVoidElements.js';
  import { onMount } from 'svelte';
  import {
    isFlexRealChild,
    type FChildParams,
    type FlexParams,
    type MountContext
  } from '../../types.js';
  import { getMountContext } from './mountContext.js';

  type Props = { class: string } & FlexParams;
  let { class: topLevelClass, ...props }: Props = $props();

  type Mountables = Map<
    string,
    { node: HTMLElement; onMount?: (node: HTMLElement, ctx: MountContext) => void | (() => void) }
  >;
  const mountContext = getMountContext();
  const mounts: Mountables = new Map();
  onMount(() => {
    const unmounts: (() => void)[] = [];
    mounts.forEach(({ node, onMount }) => {
      if (onMount) {
        const cleanup = onMount(node, mountContext);
        if (typeof cleanup === 'function') {
          unmounts.push(cleanup);
        }
      }
    });
    return () => {
      unmounts.forEach((cleanup) => cleanup());
    };
  });
</script>

{#snippet flex(params: FlexParams, nested: boolean = false)}
  {@const checked = checkedElement(params)}
  {#if defaultVoidElements.has(checked.tag)}
    <svelte:element
      this={checked.tag}
      id={params.id}
      style={checked.style || undefined}
      class={[
        !nested && topLevelClass,
        params.type == 'hflex' ? 'oneput__hflex' : 'oneput__vflex',
        ...(params.classes || [])
      ]}
      {...checked.attr}
    />
  {:else}
    <svelte:element
      this={checked.tag}
      bind:this={
        () => this,
        (n) => {
          mounts.set(params.id, {
            node: n,
            onMount: params.onMount
          });
        }
      }
      id={params.id}
      style={checked.style || undefined}
      class={[
        !nested && topLevelClass,
        params.type == 'hflex' ? 'oneput__hflex' : 'oneput__vflex',
        ...(params.classes || [])
      ]}
      {...checked.attr}
      {...checkedAttachments(params.attachments)}
    >
      {#if params.children}
        {#each params.children.filter(isFlexRealChild) as child (child.id)}
          {#if child}
            {#if child.type === 'hflex'}
              {@render flex(child, true)}
            {:else if child.type === 'vflex'}
              {@render flex(child, true)}
            {:else}
              <FChild {...child as FChildParams} />
            {/if}
          {/if}
        {/each}
      {/if}
    </svelte:element>
  {/if}
{/snippet}

{@render flex(props)}
