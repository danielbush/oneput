<script lang="ts">
  import '../../_demo-styles.css';
  import '$lib/oneput/shared/styles/oneput-defaults.css';
  import Oneput from '$lib/oneput/shared/components/Oneput.svelte';
  import * as ui from '../../_ui.js';
  import { resolve } from '$app/paths';
  import * as mockups from './_set-time.js';
  import VisualDebugControls from '$lib/oneput/shared/components/VisualDebugControls.svelte';
  import ForceDarkModeControls from '$lib/oneput/shared/components/ForceDarkMode.svelte';

  let richTimeHour = $state(14);
  let richTimeMinute = $state(30);
</script>

<svelte:head>
  <!-- IOS_CLICK_ZOOM -->
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<main>
  <p><a href={resolve('/')}>&larr; Back to visual states</a></p>
  <h1>Time mockup</h1>
  <p>Set a time from one rich menu item.</p>
  <VisualDebugControls />
  <ForceDarkModeControls />

  <br />

  <section class="demo-grid">
    <section class="demo-example">
      <h2>Set time (one widget item)</h2>
      <p>
        Single rich item: AM/PM toggle, hour ▲/▼, minutes ±1 flanking and ▲/▼ for ±15. Parent owns
        24h state and rebuilds the item on change.
      </p>
      <Oneput
        menuOpen={true}
        menuItems={mockups.richSetTimeMenuItems(richTimeHour, richTimeMinute, (next) => {
          richTimeHour = next.hour;
          richTimeMinute = next.minute;
        })}
        menuUI={{ layoutHeader: mockups.setTimeHeader }}
        inputUI={{
          left: ui.inputLeft1,
          right: ui.inputRight1
        }}
        placeholder="Selected time…"
        inputValue={`${String(richTimeHour).padStart(2, '0')}:${String(richTimeMinute).padStart(2, '0')}`}
      />
    </section>
  </section>
</main>
