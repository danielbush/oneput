<script lang="ts">
  import '../../_demo-styles.css';
  import './_breadcrumb-styles.css';
  import '$lib/oneput/shared/styles/oneput-defaults.css';
  import Oneput from '$lib/oneput/shared/components/Oneput.svelte';
  import { resolve } from '$app/paths';
  import * as ui from '../../_ui.js';
  import * as crumbs from './_breadcrumbs.js';
  import VisualDebugControls from '$lib/oneput/shared/components/VisualDebugControls.svelte';
  import ForceDarkModeControls from '$lib/oneput/shared/components/ForceDarkMode.svelte';

  let lastPicked = $state('—');
  const pick = (label: string) => {
    lastPicked = label;
  };

  const short = $derived(crumbs.shortTrail(pick));
  const long = $derived(crumbs.longTrail(pick));
  const shortEl = $derived(crumbs.shortElementTrail(pick));
  const longEl = $derived(crumbs.longElementTrail(pick));

  const more = () => pick('(more…)');
</script>

<svelte:head>
  <!-- IOS_CLICK_ZOOM -->
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<main>
  <p><a href={resolve('/')}>&larr; Back to visual states</a></p>
  <h1>Breadcrumb mockup</h1>
  <p>
    The trail goes in the <code>innerUI</code> slot, which renders as
    <code>.oneput__inner-area</code> — directly above the input. A crumb with a target is a button; the
    last crumb is the current location, so it is a disabled label. The trailing icon button sits outside
    the scroller, so the crumbs pass under it.
  </p>
  <p>Last crumb clicked: <strong>{lastPicked}</strong></p>
  <VisualDebugControls />
  <ForceDarkModeControls />

  <br />

  <section class="demo-grid">
    <section class="demo-example">
      <h2>Short trail (fits)</h2>
      <p>Baseline — no overflow handling is doing anything here.</p>
      <Oneput
        menuOpen={false}
        innerUI={crumbs.breadcrumbInner(short, { onMore: more })}
        inputUI={{
          left: ui.inputLeft1,
          right: ui.inputRight1
        }}
        placeholder="Search here..."
        inputValue=""
      />
    </section>

    <section class="demo-example">
      <h2>Long trail (scrolls)</h2>
      <p>
        One horizontal scroller, auto-scrolled to the end on mount so you land on the current
        location. An edge fades only while crumbs are hidden behind it, so a trail that fits shows
        no fade at all. Nothing is hidden and there is no expand button, but the root is several
        swipes away.
      </p>
      <Oneput
        menuOpen={false}
        innerUI={crumbs.breadcrumbInner(long, { onMore: more })}
        inputUI={{
          left: ui.inputLeft1,
          right: ui.inputRight1
        }}
        placeholder="Search here..."
        inputValue=""
      />
    </section>
  </section>

  <h2>Element trails</h2>
  <p>
    The same widget showing a DOM path, as an editor like jsed would. These stress the shape
    differently: many crumbs, short repeated labels, and a muted <code>#id</code> or
    <code>.class</code> qualifier where siblings need telling apart.
  </p>

  <section class="demo-grid">
    <section class="demo-example">
      <h2>Shallow path (fits)</h2>
      <p>Three elements, no qualifiers needed — the trail reads as a sentence.</p>
      <Oneput
        menuOpen={false}
        innerUI={crumbs.breadcrumbInner(shortEl, { onMore: more, code: true })}
        inputUI={{
          left: ui.inputLeft1,
          right: ui.inputRight1
        }}
        placeholder="Search here..."
        inputValue=""
      />
    </section>

    <section class="demo-example">
      <h2>Deep path (scrolls)</h2>
      <p>
        Ten elements with repeated <code>div</code> names. Position alone does not identify a crumb here,
        which is what the qualifiers are for — and where the width goes.
      </p>
      <Oneput
        menuOpen={false}
        innerUI={crumbs.breadcrumbInner(longEl, { onMore: more, code: true })}
        inputUI={{
          left: ui.inputLeft1,
          right: ui.inputRight1
        }}
        placeholder="Search here..."
        inputValue=""
      />
    </section>
  </section>
</main>
