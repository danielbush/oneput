import { Detokenizer } from './lib/Detokenizer.js';
import { findLineCandidateAt } from './lib/sibwalk.js';
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
    const { line } = findLineCandidateAt(el);
    if (!line) {
      return null;
    }
    const firstLineSibling = tokenizeLine(line);
    if (firstLineSibling) {
      this.detokenizer.recordTokenizedLine(line);
    }
    this.detokenizer.scheduleCleanup((l) => this.lineContainsCursor(l));
    return firstLineSibling;
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

  getDetokenizer() {
    return this.detokenizer;
  }

  destroy() {
    this.#cursorElement = null;
    this.detokenizer.destroy();
  }
}
