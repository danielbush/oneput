import { Detokenizer } from './lib/Detokenizer.js';
import { containsSelection, findLineCandidateAt, getLine } from './lib/sibwalk.js';
import { isFocusable, isToken } from './lib/taxonomy.js';
import { tokenizeLine } from './lib/tokenize.js';

/**
 * Tokenize-and-seat service for the CURSOR.
 *
 * Owns the Detokenizer and orchestrates SHALLOW_TOKENIZATION:
 * - resolves the candidate LINE under a starting FOCUSABLE
 *   (`findLineCandidateAt`)
 * - tokenizes that LINE (`tokenizeLine`)
 * - records the tokenized LINE for background detokenization
 * - returns the first reachable LINE_SIBLING ("first seat") so callers can
 *   place the CURSOR
 *
 * The DOM-mutation primitives live in `lib/tokenize.ts`; this module is the
 * orchestration boundary above them.
 */
export class Tokenizer {
  #cursorElement: HTMLElement | null = null;

  static create() {
    return new Tokenizer(Detokenizer.create());
  }

  static createNull() {
    return new Tokenizer(Detokenizer.createNull());
  }

  constructor(private detokenizer: Detokenizer = Detokenizer.create()) {}

  /**
   * Resolve a candidate LINE under `el`, tokenize it, and return the first
   * reachable LINE_SIBLING within that LINE (the first CURSOR seat).
   *
   * `el` should be a FOCUSABLE often the current FOCUS.  If the FOCUSABLE is
   * cursor transparent (eg an 'em' tag) then we tokenize the surrounding LINE
   * but find the first token within this tag.
   *
   * Returns null if no candidate LINE exists under `el`.
   */
  tokenizeLineAt(el: HTMLElement): HTMLElement | null {
    if (!isFocusable(el)) {
      return null;
    }
    const { line } = findLineCandidateAt(el);
    if (!line) {
      this.detokenizer.scheduleCleanup((l) => this.shouldKeepTokenized(l));
      return null;
    }
    const firstLineSibling = tokenizeLine(line);
    if (firstLineSibling) {
      this.detokenizer.recordTokenizedLine(line);
    }
    this.detokenizer.scheduleCleanup((l) => this.shouldKeepTokenized(l));
    return firstLineSibling;
  }

  /**
   * Run tokenizeLineAt on the LINE that `node` belongs to and return the
   * TOKEN's generated from `node`, in document order.
   *
   * The text node is usually part of a LOOSE_LINE — a run of loose content
   * between nested LINE's of an outer LINE. `tokenizeLineAt` on the owning
   * LINE will tokenize that LOOSE_LINE as part of its pre-pass.
   */
  tokenizeLineAtTextNode(node: Node): HTMLElement[] {
    if (node.nodeType !== Node.TEXT_NODE) return [];
    const parent = node.parentNode;
    if (!parent) return [];

    const line = getLine(node);
    // Comment nodes are ignored by the tokenization walk so they don't affect
    // behaviour.
    const startMarker = document.createComment('');
    const endMarker = document.createComment('');
    parent.insertBefore(startMarker, node);
    parent.insertBefore(endMarker, node.nextSibling);

    this.tokenizeLineAt(line);

    const tokens: HTMLElement[] = [];
    for (let n = startMarker.nextSibling; n && n !== endMarker; n = n.nextSibling) {
      if (isToken(n)) tokens.push(n as HTMLElement);
    }
    startMarker.remove();
    endMarker.remove();
    return tokens;
  }

  setCursorElement(el: HTMLElement | null) {
    this.#cursorElement = el;
  }

  getCursorElement() {
    return this.#cursorElement;
  }

  lineContainsCursor(line: HTMLElement) {
    return !!this.#cursorElement && line.contains(this.#cursorElement);
  }

  /**
   * A LINE should stay tokenized while it hosts the CURSOR or any
   * SELECTION_WRAPPER — detokenizing under either would strand references
   * held by TokenCursor or TokenSelection.
   */
  private shouldKeepTokenized(line: HTMLElement): boolean {
    return this.lineContainsCursor(line) || containsSelection(line);
  }

  getDetokenizer() {
    return this.detokenizer;
  }

  destroy() {
    this.#cursorElement = null;
    this.detokenizer.destroy();
  }
}
