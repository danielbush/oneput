<script lang="ts">
  import FChild from './FChild.svelte';
  import { createStyleAttribute } from '../../lib/utils.js';
  import { onMount } from 'svelte';
  import { isFlexRealChild, type FChildParams, type FlexParams } from '../../types.js';

  type Props = { class: string } & FlexParams;
  let { class: topLevelClass, ...props }: Props = $props();

  type Mountables = Map<string, { node: HTMLElement; onMount?: (node: HTMLElement) => void }>;
  let mounts = $state<Mountables>(new Map());
  onMount(() => {
    const unmounts: (() => void)[] = [];
    mounts.forEach(({ node, onMount }) => {
      if (onMount) {
        const cleanup = onMount(node);
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
  {#if props.tag === 'hr'}
    <svelte:element
      this={params.tag}
      id={params.id}
      style={params.style && createStyleAttribute(params.style)}
      class={[
        !nested && topLevelClass,
        params.type == 'hflex' ? 'oneput__hflex' : 'oneput__vflex',
        ...(params.classes || [])
      ]}
      {...params.attr}
    />
  {:else}
    <svelte:element
      this={params.tag || 'div'}
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
      style={params.style && createStyleAttribute(params.style)}
      class={[
        !nested && topLevelClass,
        params.type == 'hflex' ? 'oneput__hflex' : 'oneput__vflex',
        ...(params.classes || [])
      ]}
      {...params.attr}
      {...params.attachments}
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
