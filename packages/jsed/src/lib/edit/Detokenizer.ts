import { detokenizeLine } from '../tokenize.js';

const DEFAULT_TOKENIZED_LINE_LIMIT = 3;

/**
 * Tracks tokenized LINEs so future cleanup can detokenize older inactive work.
 *
 * Records tokenized LINEs in oldest-first order and performs small background
 * cleanup passes so jsed does not gradually leave the whole document tokenized.
 */
export class Detokenizer {
  #tokenizedLines: HTMLElement[] = [];
  #cleanupTimer: number | null = null;

  static create() {
    return new Detokenizer();
  }

  static createNull() {
    return new Detokenizer();
  }

  constructor(private tokenizedLineLimit = DEFAULT_TOKENIZED_LINE_LIMIT) {}

  /** Record a tokenized LINE once, preserving oldest-first order. */
  recordTokenizedLine(line: HTMLElement) {
    if (this.#tokenizedLines.includes(line)) {
      return;
    }
    this.#tokenizedLines.push(line);
  }

  /** Return tokenized LINEs in oldest-first order. */
  getTokenizedLines(): readonly HTMLElement[] {
    return this.#tokenizedLines;
  }

  /** Detokenize at most one oldest safe LINE. Returns whether any work was done. */
  cleanupOne(shouldKeepTokenized: (line: HTMLElement) => boolean): boolean {
    for (let i = 0; i < this.#tokenizedLines.length; i++) {
      const line = this.#tokenizedLines[i]!;

      if (!line.isConnected) {
        this.#tokenizedLines.splice(i, 1);
        return true;
      }

      if (shouldKeepTokenized(line)) {
        continue;
      }

      detokenizeLine(line);
      this.#tokenizedLines.splice(i, 1);
      return true;
    }

    return false;
  }

  /** Schedule a small background cleanup pass when tokenized work exceeds the limit. */
  scheduleCleanup(shouldKeepTokenized: (line: HTMLElement) => boolean) {
    if (this.#cleanupTimer !== null) {
      return;
    }
    if (this.#tokenizedLines.length <= this.tokenizedLineLimit) {
      return;
    }

    this.#cleanupTimer = window.setTimeout(() => {
      this.#cleanupTimer = null;
      this.cleanupOne(shouldKeepTokenized);

      if (this.#tokenizedLines.length > this.tokenizedLineLimit) {
        this.scheduleCleanup(shouldKeepTokenized);
      }
    }, 0);
  }

  destroy() {
    if (this.#cleanupTimer !== null) {
      window.clearTimeout(this.#cleanupTimer);
      this.#cleanupTimer = null;
    }
    return;
  }
}
