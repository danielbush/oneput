import { tagImplicitLines } from './lib/implicitLine.js';
import { ViewportScroller, type ViewportScrollerNullOptions } from './lib/ViewportScroller.js';

export class JsedDocument {
  static create(root: HTMLElement): JsedDocument {
    return new JsedDocument(root, ViewportScroller.create());
  }

  static createNull(
    root: HTMLElement,
    opts?: {
      viewportScroller?: ViewportScroller;
      viewportScrollerOpts?: ViewportScrollerNullOptions;
    }
  ): JsedDocument {
    return new JsedDocument(
      root,
      opts?.viewportScroller ?? ViewportScroller.createNull(opts?.viewportScrollerOpts)
    );
  }

  root: HTMLElement;
  SIB_HIGHLIGHT: Set<HTMLElement> = new Set();

  private constructor(
    root: HTMLElement,
    readonly viewportScroller: ViewportScroller
  ) {
    this.root = root;
    tagImplicitLines(root);
  }

  get document(): Document {
    return this.root.ownerDocument;
  }

  get window(): Window {
    if (!this.root.ownerDocument.defaultView) {
      throw new Error('defaultView not set');
    }
    return this.root.ownerDocument.defaultView;
  }
}
