import katex from 'katex';
import { insertSafeHtml, sanitiseHtml, type SafeHtml } from '@oneput/safe-html';
import { err, ok, type Result } from 'neverthrow';

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

  /** Check output before the model publishes it to subscribers. */
  prepare(output: string): Result<SafeHtml, Error> {
    const refusal = this.sanitiseErrors.shift();
    return refusal ? err(refusal) : sanitiseHtml(output, 'math');
  }

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

/** Compile bounded formula source and return only markup accepted by the math policy. */
export function formulaMarkup(
  source: string,
  displayMode: boolean,
  doc: DemoDocument
): Result<SafeHtml | null, Error> {
  if (source.length > 4096) return err(new Error('Formula source is too large.'));
  if (source.trim() === '') return ok(null);
  try {
    const output = katex.renderToString(source, {
      displayMode,
      throwOnError: true,
      trust: false,
      strict: 'error',
      maxExpand: 1000,
      maxSize: 20
    });
    if (output.length > 200000) return err(new Error('Formula output is too large.'));
    return doc.prepare(output);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
