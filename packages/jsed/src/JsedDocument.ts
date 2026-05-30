import * as anchor from './lib/ops/anchor.js';
import { tagImplicitLines } from './lib/ops/implicitLine.js';
import {
  ViewportScroller,
  type ViewportScrollerNullOptions
} from './lib/utilities/ViewportScroller.js';

export class JsedDocument {
  static create(root: HTMLElement): JsedDocument {
    return new JsedDocument(root, ViewportScroller.create());
  }

  static createNull(
    root: HTMLElement,
    opts?: {
      viewportScroller?: ViewportScroller;
      viewportScrollerOpts?: ViewportScrollerNullOptions;
      anchorize: boolean;
    }
  ): JsedDocument {
    return new JsedDocument(
      root,
      opts?.viewportScroller ?? ViewportScroller.createNull(opts?.viewportScrollerOpts),
      opts?.anchorize
    );
  }

  root: HTMLElement;
  SIB_HIGHLIGHT: Set<HTMLElement> = new Set();

  private constructor(
    root: HTMLElement,
    readonly viewportScroller: ViewportScroller,
    readonly anchorize: boolean = true
  ) {
    this.root = root;
    tagImplicitLines(this.root);
    if (this.anchorize) {
      anchor.anchorize(this.root);
    }
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
