<script lang="ts">
  import { tokenizeLine } from '@oneput/jsed';

  const markerClasses = [
    'jsed-crs-append',
    'jsed-crs-prepend',
    'jsed-crs-insert-after',
    'jsed-crs-insert-before'
  ] as const;

  const cursorStates = [
    'overwrite',
    'append',
    'prepend',
    'insert-after',
    'insert-before',
    'collapsed-append'
  ] as const;

  type CursorState = (typeof cursorStates)[number];
  type FlashMode = 'pulse' | 'underline';

  type Sample = {
    group: string;
    label: string;
    className: string;
    html: string;
    element: HTMLParagraphElement | null;
    didTokenize: boolean;
    tokenCount: number;
  };

  let cursorState = $state<CursorState>('overwrite');
  let tokenIndex = $state(1);
  let flashEnabled = $state(true);
  let flashMode = $state<FlashMode>('underline');

  let samples = $state<Sample[]>([
    {
      group: 'Sans',
      label: 'Small',
      className: 'sample-sans sample-sm',
      html: 'This <em>sample</em> sentence lets us compare the cursor around <u>underlined</u> and <strong>weighted</strong> words while it moves through a longer stretch of readable text.',
      element: null,
      didTokenize: false,
      tokenCount: 0
    },
    {
      group: 'Sans',
      label: 'Medium',
      className: 'sample-sans sample-md',
      html: 'This <strong>sample</strong> sentence lets us compare the cursor around <em>emphasized</em> and <u>underlined</u> words while it moves through a longer stretch of readable text.',
      element: null,
      didTokenize: false,
      tokenCount: 0
    },
    {
      group: 'Sans',
      label: 'Large',
      className: 'sample-sans sample-lg',
      html: 'This <u>sample</u> sentence lets us compare the cursor around <em>emphasized</em> and <strong>weighted</strong> words while it moves through a longer stretch of readable text.',
      element: null,
      didTokenize: false,
      tokenCount: 0
    },
    {
      group: 'Serif',
      label: 'Small',
      className: 'sample-serif sample-sm',
      html: 'This <strong>sample</strong> sentence lets us compare the cursor around <u>underlined</u> and <em>emphasized</em> words while it moves through a longer stretch of readable text.',
      element: null,
      didTokenize: false,
      tokenCount: 0
    },
    {
      group: 'Serif',
      label: 'Medium',
      className: 'sample-serif sample-md',
      html: 'This <em>sample</em> sentence lets us compare the cursor around <strong>weighted</strong> and <u>underlined</u> words while it moves through a longer stretch of readable text.',
      element: null,
      didTokenize: false,
      tokenCount: 0
    },
    {
      group: 'Serif',
      label: 'Large',
      className: 'sample-serif sample-lg',
      html: 'This <u>sample</u> sentence lets us compare the cursor around <strong>weighted</strong> and <em>emphasized</em> words while it moves through a longer stretch of readable text.',
      element: null,
      didTokenize: false,
      tokenCount: 0
    }
  ]);

  function getTokens(sample: Sample) {
    return Array.from(sample.element?.querySelectorAll<HTMLElement>('.jsed-token') ?? []);
  }

  function applyFakeCursor(sample: Sample) {
    const tokens = getTokens(sample);
    sample.tokenCount = tokens.length;

    for (const token of tokens) {
      token.classList.remove('jsed-token-focus', 'jsed-token-collapsed', ...markerClasses);
    }

    if (tokens.length === 0) return;

    const safeIndex = Math.min(tokenIndex, tokens.length - 1);
    const current = tokens[safeIndex];
    current.classList.add('jsed-token-focus');

    switch (cursorState) {
      case 'append':
        current.classList.add('jsed-crs-append');
        break;
      case 'prepend':
        current.classList.add('jsed-crs-prepend');
        break;
      case 'insert-after':
        current.classList.add('jsed-crs-insert-after');
        break;
      case 'insert-before':
        current.classList.add('jsed-crs-insert-before');
        break;
      case 'collapsed-append':
        current.classList.add('jsed-crs-append', 'jsed-token-collapsed');
        break;
    }
  }

  function moveCursor(offset: number) {
    const maxTokens = Math.max(...samples.map((sample) => sample.tokenCount), 1);
    tokenIndex = Math.max(0, Math.min(tokenIndex + offset, maxTokens - 1));
  }

  // Tokenize each demo LINE once after its paragraph has mounted.
  $effect(() => {
    for (const sample of samples) {
      if (!sample.element || sample.didTokenize) continue;

      tokenizeLine(sample.element);
      sample.didTokenize = true;
      applyFakeCursor(sample);
    }
  });

  // After tokenization, keep the DOM cursor classes in sync with local control state.
  $effect(() => {
    for (const sample of samples) {
      if (!sample.didTokenize) continue;
      applyFakeCursor(sample);
    }
  });

  const groupedSamples = $derived.by(() => {
    const groups = new Map<string, Sample[]>();

    for (const sample of samples) {
      const existing = groups.get(sample.group);
      if (existing) {
        existing.push(sample);
      } else {
        groups.set(sample.group, [sample]);
      }
    }

    return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
  });
</script>

<svelte:head>
  <title>Cursor Lab</title>
</svelte:head>

<div class="page">
  <h1>Cursor lab</h1>
  <p class="intro">
    This page tokenizes a few real paragraphs with different fonts and sizes, then draws the fake
    cursor with a shifted `::before` highlight so the background can sit slightly left and stop
    short of the trailing space.
  </p>

  <section class="underline-lab">
    <h2>Underline spacing experiment</h2>
    <p class="underline-note">
      The first example uses a literal trailing space inside the underlined span. The second moves
      that space to a pseudo-element and explicitly disables text decoration on the generated space.
    </p>
    <p class="underline-demo">
      <span class="underline-label">literal space</span>
      <u><span class="underline-token">underlined </span></u>
      <span>next</span>
    </p>
    <p class="underline-demo">
      <span class="underline-label">pseudo space</span>
      <u><span class="underline-token underline-token-pseudo">underlined</span></u>
      <span>next</span>
    </p>
  </section>

  <div class="controls">
    <button onclick={() => moveCursor(-1)} disabled={tokenIndex === 0}>Prev token</button>
    <button onclick={() => moveCursor(1)}>Next token</button>

    <label>
      State
      <select bind:value={cursorState}>
        {#each cursorStates as state}
          <option value={state}>{state}</option>
        {/each}
      </select>
    </label>

    <label class="toggle">
      <input type="checkbox" bind:checked={flashEnabled} />
      Flash cursor
    </label>

    <label>
      Flash style
      <select bind:value={flashMode}>
        <option value="pulse">Pulse</option>
        <option value="underline">Bottom border</option>
      </select>
    </label>

    <span class="status">token index {tokenIndex + 1}</span>
  </div>

  {#each groupedSamples as grouped}
    <section class="font-group">
      <h2>{grouped.group}</h2>

      {#each grouped.items as sample}
        <section class="sample">
          <h3>{sample.label}</h3>
          <p
            bind:this={sample.element}
            class={`demo-line ${sample.className} ${flashEnabled ? `flash-on flash-${flashMode}` : ''}`}
          >
            {@html sample.html}
          </p>
        </section>
      {/each}
    </section>
  {/each}
</div>

<style>
  .page {
    max-width: 56rem;
    margin: 0 auto;
    padding: 2rem 1rem 8rem;
  }

  .intro {
    max-width: 46rem;
  }

  .controls {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: center;
    margin: 0 0 1.5rem;
  }

  .underline-lab {
    margin: 0 0 1.75rem;
  }

  .underline-lab h2 {
    margin: 0 0 0.4rem;
    font:
      700 1rem/1.2 system-ui,
      sans-serif;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #333;
  }

  .underline-note {
    max-width: 46rem;
    margin: 0 0 0.75rem;
    color: #555;
  }

  .underline-demo {
    margin: 0 0 0.4rem;
  }

  .underline-label {
    display: inline-block;
    min-width: 7rem;
    color: #666;
    font:
      600 0.78rem/1.2 system-ui,
      sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .underline-token-pseudo::after {
    content: ' ';
    text-decoration: none;
  }

  .controls button,
  .controls select {
    font: inherit;
  }

  .toggle {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
  }

  .status {
    color: #666;
  }

  .font-group {
    margin: 0 0 2rem;
  }

  .font-group h2 {
    margin: 0 0 0.75rem;
    font:
      700 1rem/1.2 system-ui,
      sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #333;
  }

  .sample {
    margin: 0 0 1.25rem;
  }

  .sample h3 {
    margin: 0 0 0.35rem;
    font:
      600 0.9rem/1.2 system-ui,
      sans-serif;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #555;
  }

  .demo-line {
    margin: 0;
    max-width: 26rem;
  }

  .sample-sans {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }

  .sample-serif {
    font-family: Georgia, 'Times New Roman', serif;
  }

  .sample-sm {
    font-size: 0.95rem;
  }

  .sample-md {
    font-size: 1.15rem;
  }

  .sample-lg {
    font-size: 1.5rem;
  }

  .demo-line :global(.jsed-token) {
    position: relative;
    border-radius: 0.22rem;
  }

  .demo-line :global(.jsed-token:hover) {
    background: rgba(0, 0, 0, 0.035);
  }

  .demo-line :global(.jsed-token-focus) {
    background: transparent;
    color: white;
  }

  .demo-line :global(.jsed-token-focus.jsed-crs-prepend)::before,
  .demo-line :global(.jsed-token-focus.jsed-crs-append)::after,
  .demo-line :global(.jsed-token-focus.jsed-crs-insert-before)::before,
  .demo-line :global(.jsed-token-focus.jsed-crs-insert-after)::after {
    content: '';
    background: transparent;
  }

  .demo-line :global(.jsed-token-focus.jsed-crs-prepend),
  .demo-line :global(.jsed-token-focus.jsed-crs-append),
  .demo-line :global(.jsed-token-focus.jsed-crs-insert-before),
  .demo-line :global(.jsed-token-focus.jsed-crs-insert-after) {
    background: transparent;
  }

  .demo-line :global(.jsed-token-focus)::before {
    content: '';
    position: absolute;
    z-index: -1;
    top: 0;
    bottom: 0;
    left: -0.2em;
    right: -0.2em;
    border-radius: 0.24rem;
    background: rgba(37, 99, 235, 0.92);
  }

  .demo-line :global(.jsed-token-focus.jsed-crs-prepend)::after,
  .demo-line :global(.jsed-token-focus.jsed-crs-append)::after,
  .demo-line :global(.jsed-token-focus.jsed-crs-insert-before)::after,
  .demo-line :global(.jsed-token-focus.jsed-crs-insert-after)::after {
    content: '';
    position: absolute;
    top: -0.34em;
    width: 0;
    height: 0;
    border-left: 0.24em solid transparent;
    border-right: 0.24em solid transparent;
    border-top: 0.28em solid #dc2626;
    border-bottom: 0;
  }

  .demo-line :global(.jsed-token-focus.jsed-crs-prepend)::after,
  .demo-line :global(.jsed-token-focus.jsed-crs-insert-before)::after {
    left: -0.28em;
  }

  .demo-line :global(.jsed-token-focus.jsed-crs-append)::after,
  .demo-line :global(.jsed-token-focus.jsed-crs-insert-after)::after {
    right: -0.28em;
  }

  .demo-line :global(.jsed-token-focus.jsed-crs-insert-before)::after {
    filter: drop-shadow(0.36em 0 0 #dc2626);
  }

  .demo-line :global(.jsed-token-focus.jsed-crs-insert-after)::after {
    filter: drop-shadow(-0.36em 0 0 #dc2626);
  }

  .demo-line :global(.jsed-token-focus.jsed-crs-append)::after {
    top: -0.22em;
  }

  .flash-on :global(.jsed-token-focus)::before {
    animation: cursor-lab-pulse 1.6s ease-in-out infinite;
  }

  .flash-on.flash-underline :global(.jsed-token-focus)::before {
    animation: none;
  }

  .demo-line :global(.jsed-token-focus.jsed-crs-prepend)::before,
  .demo-line :global(.jsed-token-focus.jsed-crs-append)::before {
    background: rgba(30, 58, 138, 0.92);
  }

  .flash-on.flash-underline :global(.jsed-token-focus)::before,
  .flash-on.flash-underline :global(.jsed-token-focus.jsed-crs-prepend)::before,
  .flash-on.flash-underline :global(.jsed-token-focus.jsed-crs-append)::before,
  .flash-on.flash-underline :global(.jsed-token-focus.jsed-crs-insert-before)::before,
  .flash-on.flash-underline :global(.jsed-token-focus.jsed-crs-insert-after)::before {
    top: auto;
    bottom: -0.14em;
    left: -0.08em;
    right: 0.33ch;
    height: 0.14em;
    border-radius: 999px;
    background: currentColor;
    animation: cursor-lab-underline 1.35s ease-in-out infinite;
  }

  .demo-line :global(.jsed-token-focus.jsed-crs-insert-before)::before,
  .demo-line :global(.jsed-token-focus.jsed-crs-insert-after)::before {
    background: transparent;
  }

  .demo-line :global(.jsed-token-focus.jsed-token-collapsed)::before {
    right: -0.06em;
  }

  .flash-on.flash-underline :global(.jsed-token-focus),
  .flash-on.flash-underline :global(.jsed-token-focus.jsed-crs-prepend),
  .flash-on.flash-underline :global(.jsed-token-focus.jsed-crs-append),
  .flash-on.flash-underline :global(.jsed-token-focus.jsed-crs-insert-before),
  .flash-on.flash-underline :global(.jsed-token-focus.jsed-crs-insert-after) {
    color: inherit;
  }

  .flash-on.flash-underline :global(.jsed-token-focus.jsed-token-collapsed)::before {
    right: -0.06em;
  }

  @keyframes cursor-lab-pulse {
    0%,
    100% {
      background: rgba(37, 99, 235, 1);
      transform: scale(1);
    }

    50% {
      background: rgba(59, 130, 246, 1);
      transform: scale(0.985);
    }
  }

  @keyframes cursor-lab-underline {
    0%,
    100% {
      opacity: 0.95;
      transform: scaleX(1);
    }

    50% {
      opacity: 0.14;
      transform: scaleX(0.82);
    }
  }
</style>
