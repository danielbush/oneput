/**
 * KaTeX for the demos: compile a formula, check its output, paint a preview
 * and put accepted formulas in the page. No Oneput.
 *
 * - `renderFormula` compiles bounded source with fixed, safe options.
 * - `DemoDocument` is the infrastructure wrapper for the page (nullables).
 * - `paintPreview` shows a checked formula, or a placeholder, in a node.
 *
 * `katex.css` styles the preview row and the `#katex-demo` output.
 */
import katex from 'katex';
import { insertSafeHtml, sanitiseHtml, type SafeHtml } from '@oneput/safe-html';
import { err, type Result } from 'neverthrow';
import './katex.css';

/**
 * Checks formula output and inserts accepted formulas into the page.
 *
 * Infrastructure wrapper: `create()` appends to `#katex-demo`. `createNull()`
 * appends to a detached root. Tests can supply a root and read its DOM.
 */
export class DemoDocument {
  static create() {
    return new DemoDocument(document.getElementById('katex-demo')!);
  }

  static createNull(
    root = document.createElement('div'),
    { sanitiseErrors = [] }: { sanitiseErrors?: (Error | null)[] } = {}
  ) {
    return new DemoDocument(root, [...sanitiseErrors]);
  }

  constructor(
    private root: HTMLElement,
    private sanitiseErrors: (Error | null)[] = []
  ) {}

  /** Check output before it is shown or inserted. */
  prepare(output: string): Result<SafeHtml, Error> {
    const refusal = this.sanitiseErrors.shift();
    return refusal ? err(refusal) : sanitiseHtml(output, 'math');
  }

  /**
   * Put a checked formula at the end of the page.
   *
   * Display mode gives a block formula in a `.katex-display` wrapper, which
   * katex.css puts on its own line and centers. Thus we do not put it in a
   * paragraph. Inline mode gives a formula that flows with text, so a
   * paragraph is correct.
   */
  append(formula: SafeHtml, displayMode: boolean) {
    const output = this.root.ownerDocument.createElement('div');
    insertSafeHtml(output, formula);
    const nodes = this.root.ownerDocument.createDocumentFragment();
    nodes.append(...output.childNodes);
    if (displayMode) this.root.append(nodes);
    else {
      const paragraph = this.root.ownerDocument.createElement('p');
      paragraph.append(nodes);
      this.root.append(paragraph);
    }
  }
}

/** The result of compiling katex source. */
export type RenderResult =
  | { empty: true } // nothing typed
  | { html: SafeHtml } // valid katex
  | { error: string }; // invalid katex

/**
 * Compile bounded source with fixed options. Give only checked output.
 */
export function renderFormula(
  source: string,
  displayMode: boolean,
  doc: DemoDocument
): RenderResult {
  if (source.length > 4096) return { error: 'Formula source is too large.' };
  if (source.trim() === '') return { empty: true };
  try {
    const output = katex.renderToString(source, {
      displayMode,
      throwOnError: true,
      trust: false,
      strict: 'error',
      maxExpand: 1000,
      maxSize: 20
    });
    if (output.length > 200000) return { error: 'Formula output is too large.' };
    const content = doc.prepare(output);
    return content.isErr() ? { error: content.error.message } : { html: content.value };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/** Show a checked formula in `node`, or `(preview)` when there is none. */
export function paintPreview(node: HTMLElement, preview: SafeHtml | null) {
  if (preview) insertSafeHtml(node, preview);
  else node.textContent = '(preview)';
}
