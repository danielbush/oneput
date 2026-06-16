type ViewportRect = {
  width: number;
  height: number;
};

export type ElementRect = Pick<DOMRect, 'top' | 'left' | 'bottom' | 'right' | 'width' | 'height'>;
type ScrollVerticalAlignment = 'nearest' | 'start' | 'center' | 'end';
export type ViewportScrollerNullOptions = {
  viewportRect?: ViewportRect;
  getElementRect?: (el: HTMLElement) => ElementRect | null | undefined;
  getScrollportRects?: (el: HTMLElement) => ElementRect[] | null | undefined;
  defaultElementRect?: ElementRect;
};

export type ScrollRequest = {
  element: HTMLElement;
  options: ScrollIntoViewOptions;
};

interface ViewportScrollerEnv {
  getViewportRect(): ViewportRect;
  getElementRect(el: HTMLElement): ElementRect;
  getScrollportRects(el: HTMLElement): ElementRect[];
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

  getScrollportRects(el: HTMLElement): ElementRect[] {
    const rects: ElementRect[] = [];
    for (let current = el.parentElement; current; current = current.parentElement) {
      const style = window.getComputedStyle(current);
      const clipsVertically =
        (style.overflowY === 'auto' ||
          style.overflowY === 'scroll' ||
          style.overflowY === 'overlay') &&
        current.scrollHeight > current.clientHeight;
      const clipsHorizontally =
        (style.overflowX === 'auto' ||
          style.overflowX === 'scroll' ||
          style.overflowX === 'overlay') &&
        current.scrollWidth > current.clientWidth;

      if (clipsVertically || clipsHorizontally) {
        rects.push(current.getBoundingClientRect());
      }
    }
    return rects;
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
    private getConfiguredScrollportRects?: (el: HTMLElement) => ElementRect[] | null | undefined,
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

  getScrollportRects(_el: HTMLElement): ElementRect[] {
    return this.getConfiguredScrollportRects?.(_el) ?? [];
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
        opts?.getScrollportRects,
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

  getScrollportRects(el: HTMLElement): ElementRect[] {
    return this.env.getScrollportRects(el);
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
    const rect = this.getElementRect(el);
    const viewport = this.getViewportRect();
    const viewportRect: ElementRect = {
      top: 0,
      left: 0,
      bottom: viewport.height,
      right: viewport.width,
      width: viewport.width,
      height: viewport.height
    };
    const isHidden = [viewportRect, ...this.getScrollportRects(el)].some(
      (boundary) =>
        rect.top < boundary.top ||
        rect.left < boundary.left ||
        rect.bottom > boundary.bottom ||
        rect.right > boundary.right
    );

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
