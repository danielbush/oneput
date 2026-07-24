<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { hideShowListener } from '../../lib/utils.js';

  let { children, id = 'oneput__command-bar' } = $props();

  /** Small inset so the menu top isn’t flush with the visual viewport edge. */
  const MENU_VIEWPORT_PAD_PX = 8;

  /**
   * VISUAL_VIEWPORT_ZOOM
   */
  const ensureScaleInvariance: Attachment<HTMLElement> = (commandBar) => {
    const fn = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      commandBar.style.transform = `scale(${1 / vv!.scale})`;
      commandBar.style.transformOrigin = 'bottom left';
    };
    document.addEventListener('touchend', fn);
    document.addEventListener('scroll', fn);
    document.addEventListener('resize', fn);
    return () => {
      document.removeEventListener('touchend', fn);
      document.removeEventListener('scroll', fn);
      document.removeEventListener('resize', fn);
    };
  };

  /**
   * Feed CSS menu-height formula: measured non-menu chrome + visual viewport
   * height. See MENU_VISUAL_VIEWPORT_HEIGHT / --oneput-menu-max-height.
   */
  function updateMenuViewportVars(commandBar: HTMLElement, vv: VisualViewport) {
    commandBar.style.setProperty(
      '--oneput-visual-viewport-height',
      `${Math.floor(vv.height - MENU_VIEWPORT_PAD_PX)}px`
    );

    const container = commandBar.querySelector('.oneput__container') as HTMLElement | null;
    if (!container) return;

    const menuArea = container.querySelector('.oneput__menu-area') as HTMLElement | null;
    // Chrome below the menu (input / outer / etc.). Exclude the menu itself so
    // the measurement isn’t circular when the menu is already open.
    const chromePx = container.offsetHeight - (menuArea?.offsetHeight ?? 0);
    commandBar.style.setProperty('--oneput-non-menu-chrome', `${chromePx}px`);
  }

  /**
   * OSK_VISUAL_VIEWPORT
   */
  const adjustPosition: Attachment<HTMLElement> = (commandBar) => {
    const vv = window.visualViewport;
    if (!vv) return;

    const layoutViewport = document.createElement('div');
    layoutViewport.style.position = 'fixed';
    layoutViewport.style.width = '100%';
    layoutViewport.style.height = '100%';
    layoutViewport.style.visibility = 'hidden';
    document.body.appendChild(layoutViewport);

    function viewportHandler() {
      // Since the bar is position: fixed we need to offset it by the visual
      // viewport's offset from the layout viewport origin.
      var offsetX = vv!.offsetLeft;
      var offsetY = vv!.height - layoutViewport.getBoundingClientRect().height + vv!.offsetTop;

      // You could also do this by setting style.left and style.top if you
      // use width: 100% instead.
      commandBar.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) ';
      ensureContainerObserved();
      updateMenuViewportVars(commandBar, vv!);
    }

    vv.addEventListener('resize', viewportHandler);
    vv.addEventListener('scroll', viewportHandler);
    // onscrollend = ...; // too new
    window.addEventListener('resize', viewportHandler);
    window.addEventListener('scroll', viewportHandler);
    // onscrollend = ...

    // Menu open/close / multiline input change chrome height without a vv event.
    const ro = new ResizeObserver(() => {
      ensureContainerObserved();
      updateMenuViewportVars(commandBar, vv!);
    });
    const inner = commandBar.querySelector('.oneput__command-bar-inner');
    if (inner) ro.observe(inner);

    let observedContainer: Element | null = null;
    function ensureContainerObserved() {
      const c = commandBar.querySelector('.oneput__container');
      if (c && c !== observedContainer) {
        if (observedContainer) ro.unobserve(observedContainer);
        ro.observe(c);
        observedContainer = c;
      }
    }

    viewportHandler();

    return () => {
      vv.removeEventListener('resize', viewportHandler);
      vv.removeEventListener('scroll', viewportHandler);
      window.removeEventListener('resize', viewportHandler);
      window.removeEventListener('scroll', viewportHandler);
      ro.disconnect();
      layoutViewport.remove();
      commandBar.style.removeProperty('--oneput-visual-viewport-height');
      commandBar.style.removeProperty('--oneput-non-menu-chrome');
    };
  };
</script>

<svelte:head>
  <!-- IOS_CLICK_ZOOM -->
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<div {id} class="oneput__command-bar" {@attach adjustPosition} {@attach hideShowListener(true)}>
  <div class="oneput__command-bar-inner">
    <div {@attach ensureScaleInvariance}>
      <!-- Oneput goes here -->
      {@render children()}
    </div>
  </div>
</div>

<style>
  .oneput__command-bar {
    position: fixed;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 0;
    z-index: var(--oneput-z-index, 999999);
  }

  .oneput__command-bar-inner {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    min-width: var(--oneput-min-width, 320px);
    max-width: var(--oneput-max-width, 500px);
  }
</style>
