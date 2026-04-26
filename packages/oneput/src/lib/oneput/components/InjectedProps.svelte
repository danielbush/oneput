<script lang="ts" generics="P extends Record<string, unknown>">
  import type { SveltePropInjectorProps } from '../lib/SveltePropInjector.js';

  const { createProps, subscribe, Child }: SveltePropInjectorProps<P> = $props();

  let createdProps = $derived(createProps());
  $effect(() => {
    subscribe();
    createdProps = createProps();
  });
</script>

<Child {...createdProps} />
