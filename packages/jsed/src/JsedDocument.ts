import { sanitiseDocumentNodes, setDocumentHTML } from '@oneput/safe-html';
import {
  ViewportScroller,
  type ViewportScrollerNullOptions
} from './ui/oneput/lib/ViewportScroller.js';

export class JsedDocument {
  /** Load HTML before it becomes live, or check a caller-built detached root. */
  static create(root: HTMLElement, html?: string): JsedDocument {
    if (html !== undefined) setDocumentHTML(root, html);
    return new JsedDocument(root, ViewportScroller.create());
  }

  static createNull(
    root: HTMLElement,
    opts?: {
      viewportScroller?: ViewportScroller;
      viewportScrollerOpts?: ViewportScrollerNullOptions;
      anchorize?: boolean;
      html?: string;
    }
  ): JsedDocument {
    if (opts?.html !== undefined) setDocumentHTML(root, opts.html);
    return new JsedDocument(
      root,
      opts?.viewportScroller ?? ViewportScroller.createNull(opts?.viewportScrollerOpts)
    );
  }

  root: HTMLElement;
  SIB_HIGHLIGHT: Set<HTMLElement> = new Set();

  private constructor(
    root: HTMLElement,
    readonly viewportScroller: ViewportScroller,
    readonly anchorize: boolean = true
  ) {
    if (!sanitiseDocumentNodes(root)) throw new Error('Active document root refused');
    this.root = root;
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
