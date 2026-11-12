<script lang="ts">
  import '@oneput/oneput/demo/styles.css';
  import '@oneput/oneput/shared/styles/oneput-defaults.css';
  // KatexDemo uses katex's default output (html + mathml), which needs these
  // styles and the katex fonts.
  import 'katex/dist/katex.css';
  let { children } = $props();
</script>

{@render children()}
