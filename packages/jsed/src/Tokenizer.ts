import { Detokenizer } from './lib/Detokenizer.js';
import { quickDescend as quickDescendImpl } from './lib/tokenize.js';

/**
 * Thin service wrapper around tokenization entry points.
 *
 * Owns the Detokenizer so tokenization lifecycle concerns stay grouped under a
 * single module boundary.
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

  quickDescend(el: HTMLElement): HTMLElement | null {
    const result = quickDescendImpl(el);
    for (const line of result.tokenizedLines) {
      this.detokenizer.recordTokenizedLine(line);
    }
    this.detokenizer.scheduleCleanup((line) => this.lineContainsCursor(line));
    return result.target;
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
