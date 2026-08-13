/**
 * SYNTACTIC_SPLIT — the one place that decides how a string becomes TOKEN's.
 *
 * Before this seam existed the decision was hardcoded five times: once in
 * `replaceTextNode` (the read path) and once in each text op (the type path).
 * Read and type could therefore disagree. Now both take a `Splitter`, so they
 * agree by construction.
 *
 * The rule is applied incrementally while the user types *and* in one pass when
 * the tokenizer reads existing text. Those give the same answer only if the rule
 * uses **left context only** — it may look at the characters before the current
 * one, never after. Keep any new rule within that limit.
 */

/**
 * Split text into parts. Whitespace runs are returned as parts of their own, so
 * the caller can tell a SEPARATOR from a TOKEN.
 */
export type Splitter = (text: string) => string[];

/**
 * The behaviour jsed had before SYNTACTIC_SPLIT: split on whitespace only, so
 * one run of non-whitespace is one TOKEN.
 *
 * Injecting this leaves the document identical to the pre-seam code, which makes
 * the wiring verifiable on its own before a real rule is switched on.
 */
export const nullSplitter: Splitter = (text: string) => text.match(/\s+|\S+/g) ?? [];

/**
 * True if a part is a SEPARATOR rather than TOKEN content.
 */
export function isSeparatorPart(part: string): boolean {
  return /^\s+$/.test(part);
}

/**
 * One TOKEN the text ops are about to create.
 */
export type TokenPart = {
  text: string;
  /**
   * Whether a SEPARATOR belongs between this TOKEN and the one before it.
   *
   * False for a SYNTACTIC_SPLIT boundary: `foo-bar` is three TOKEN's that still
   * render as one word, so no SEPARATOR goes between them. True where the user
   * actually typed whitespace.
   *
   * Meaningless for the first part — its neighbour is the TOKEN the op is
   * anchored on, not another part, so each op decides that gap itself.
   */
  separatorBefore: boolean;
};

/**
 * Split text into the TOKEN's to create, recording where SEPARATOR's belong.
 *
 * Replaces the `text.split(/\s+/).filter(Boolean)` each text op used to do. With
 * {@link nullSplitter} every boundary is whitespace, so `separatorBefore` is
 * always true and the result matches the old behaviour.
 */
export function tokenParts(splitter: Splitter, text: string): TokenPart[] {
  const parts: TokenPart[] = [];
  let separatorBefore = false;

  for (const part of splitter(text)) {
    if (isSeparatorPart(part)) {
      separatorBefore = true;
      continue;
    }
    parts.push({ text: part, separatorBefore });
    separatorBefore = false;
  }

  return parts;
}
