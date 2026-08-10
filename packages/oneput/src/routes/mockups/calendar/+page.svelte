<script lang="ts">
  import '../../_demo-styles.css';
  import '../../_mockup-styles.css';
  import '$lib/oneput/shared/styles/oneput-defaults.css';
  import Oneput from '$lib/oneput/shared/components/Oneput.svelte';
  import * as ui from '../../_ui.js';
  import { resolve } from '$app/paths';
  import * as mockups from '../../_mockups.js';
  import VisualDebugControls from '$lib/oneput/shared/components/VisualDebugControls.svelte';
  import ForceDarkModeControls from '$lib/oneput/shared/components/ForceDarkMode.svelte';

  let richCalSelected = $state(22);
  let richCalInput = $state('2026-07-22');
</script>

<svelte:head>
  <!-- IOS_CLICK_ZOOM -->
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<main>
  <p><a href={resolve('/')}>&larr; Back to visual states</a></p>
  <h1>Calendar mockups</h1>
  <p>Two ways to show a month. Both use existing primitives only.</p>
  <VisualDebugControls />
  <ForceDarkModeControls />

  <br />

  <section class="demo-grid">
    <section class="demo-example">
      <h2>Calendar (week = menu item)</h2>
      <p>
        Each week is one top-level menu item holding seven day cells. It renders as a grid, but
        focus is still 1D — Up/Down moves a whole week and a single day can only be picked with the
        pointer. Per-day keyboard focus would need a 2D cursor, which
        <code>menuItemFocus</code> does not have.
      </p>
      <Oneput
        menuOpen={true}
        menuItems={mockups.calendarMenuItems(2026, 6, 22)}
        menuUI={{ layoutHeader: mockups.calendarHeader(2026, 6) }}
        inputUI={{
          left: ui.inputLeft1,
          right: ui.inputRight1
        }}
        placeholder="Jump to a date..."
        inputValue=""
      />
    </section>

    <section class="demo-example">
      <h2>Calendar (one widget item)</h2>
      <p>
        Ordinary rows above/below a single month widget. Day cells use a tap helper (down/up + slop)
        so scrolling the menu should not select a day — try on a phone.
        <code>$mod+j/k</code> still moves by menu item.
      </p>
      <Oneput
        menuOpen={true}
        menuItems={mockups.richCalendarMenuItems(2026, 6, richCalSelected, (day) => {
          richCalSelected = day;
          richCalInput = `2026-07-${String(day).padStart(2, '0')}`;
        })}
        menuUI={{ layoutHeader: mockups.calendarHeader(2026, 6) }}
        inputUI={{
          left: ui.inputLeft1,
          right: ui.inputRight1
        }}
        placeholder="Jump to a date..."
        bind:inputValue={richCalInput}
      />
    </section>
  </section>
</main>
