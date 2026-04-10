type ViewportRect = {
  width: number;
  height: number;
};

export type ElementRect = Pick<DOMRect, 'top' | 'left' | 'bottom' | 'right' | 'width' | 'height'>;
type ScrollVerticalAlignment = 'nearest' | 'start' | 'center' | 'end';
export type ViewportScrollerNullOptions = {
  viewportRect?: ViewportRect;
  getElementRect?: (el: HTMLElement) => ElementRect | null | undefined;
  defaultElementRect?: ElementRect;
};

export type ScrollRequest = {
  element: HTMLElement;
  options: ScrollIntoViewOptions;
};

interface ViewportScrollerEnv {
  getViewportRect(): ViewportRect;
  getElementRect(el: HTMLElement): ElementRect;
  scrollIntoView(el: HTMLElement, options: ScrollIntoViewOptions): void;
  trackScrollRequests(): { data: ScrollRequest[] };
}

class RealViewportScrollerEnv implements ViewportScrollerEnv {
  getViewportRect(): ViewportRect {
    const vp = window.visualViewport;
    return {
      width: vp?.width ?? window.innerWidth,
      height: vp?.height ?? window.innerHeight
    };
  }

  getElementRect(el: HTMLElement): ElementRect {
    return el.getBoundingClientRect();
  }

  scrollIntoView(el: HTMLElement, options: ScrollIntoViewOptions): void {
    el.scrollIntoView(options);
  }

  trackScrollRequests(): { data: ScrollRequest[] } {
    return { data: [] };
  }
}

/**
 * Embedded stub.
 */
class NullViewportScrollerEnv implements ViewportScrollerEnv {
  #scrollRequests: ScrollRequest[] = [];

  constructor(
    private viewportRect: ViewportRect,
    private getConfiguredElementRect?: (el: HTMLElement) => ElementRect | null | undefined,
    private defaultElementRect: ElementRect = {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      width: 0,
      height: 0
    }
  ) {}

  getViewportRect(): ViewportRect {
    return this.viewportRect;
  }

  getElementRect(_el: HTMLElement): ElementRect {
    return this.getConfiguredElementRect?.(_el) ?? this.defaultElementRect;
  }

  scrollIntoView(el: HTMLElement, options: ScrollIntoViewOptions): void {
    this.#scrollRequests.push({ element: el, options });
  }

  trackScrollRequests(): { data: ScrollRequest[] } {
    return { data: this.#scrollRequests };
  }
}

/**
 * Infrastructure wrapper around viewport measurement and scroll requests.
 */
export class ViewportScroller {
  static create(): ViewportScroller {
    return new ViewportScroller(new RealViewportScrollerEnv());
  }

  static createNull(opts?: ViewportScrollerNullOptions): ViewportScroller {
    return new ViewportScroller(
      new NullViewportScrollerEnv(
        opts?.viewportRect ?? {
          width: 1024,
          height: 768
        },
        opts?.getElementRect,
        opts?.defaultElementRect
      )
    );
  }

  constructor(private env: ViewportScrollerEnv) {}

  getViewportRect(): ViewportRect {
    return this.env.getViewportRect();
  }

  getElementRect(el: HTMLElement): ElementRect {
    return this.env.getElementRect(el);
  }

  scrollIntoView(el: HTMLElement, options: ScrollIntoViewOptions): void {
    this.env.scrollIntoView(el, options);
  }

  trackScrollRequests(): { data: ScrollRequest[] } {
    return this.env.trackScrollRequests();
  }

  scrollIntoViewIfHidden(
    el: HTMLElement,
    opts?: { vertical?: ScrollVerticalAlignment; horizontal?: ScrollLogicalPosition }
  ): void {
    const viewport = this.getViewportRect();
    const rect = this.getElementRect(el);
    const isHidden =
      rect.top < 0 || rect.left < 0 || rect.bottom > viewport.height || rect.right > viewport.width;

    if (isHidden) {
      this.scrollIntoView(el, {
        block: opts?.vertical ?? 'nearest',
        inline: opts?.horizontal ?? 'nearest',
        behavior: 'smooth'
      });
    }
  }

  scrollIntoViewCentered(
    el: HTMLElement,
    opts?: { oversizedVertical?: Exclude<ScrollVerticalAlignment, 'nearest'> }
  ): void {
    const viewport = this.getViewportRect();
    const rect = this.getElementRect(el);
    const block = rect.height > viewport.height ? (opts?.oversizedVertical ?? 'start') : 'center';

    this.scrollIntoView(el, {
      block,
      inline: 'nearest',
      behavior: 'smooth'
    });
  }
}
