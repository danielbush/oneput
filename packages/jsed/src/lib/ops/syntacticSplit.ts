/**
 * SYNTACTIC_SPLIT — divide text at punctuation, so `foo-bar.` becomes
 * `[foo][-][bar][.]`.
 *
 * A TOKEN used to be a run of non-whitespace, which made a hyphenated word or a
 * bracketed phrase a single indivisible CURSOR stop. Splitting at punctuation
 * lets the user edit part of a compound TOKEN, and gives parens TOKEN's of their
 * own — the groundwork for treating them semantically later (auto-enclosing a
 * selection, say).
 *
 * Nothing about the rendered document changes. The resulting TOKEN's carry no
 * SEPARATOR between them, so `[foo][-][bar]` still reads as `foo-bar`. What
 * changes is CURSOR granularity: three stops where there was one.
 *
 * **The rule uses left context only.** It may look at the characters before the
 * current one, never after. That is what lets the same rule run incrementally as
 * the user types and in one pass when the tokenizer reads existing text, and
 * still give the same answer. Two earlier designs deferred the split to "rest"
 * because `don'` was thought to need lookahead; once an APOSTROPHE was ruled
 * never to split, the need disappeared. Keep any new rule within that limit —
 * see {@link Splitter}.
 */
import { isSeparatorPart, nullSplitter, type Splitter } from './splitter.js';

/**
 * Anything Unicode calls Punctuation or Symbol.
 *
 * `\p{P}` alone is not enough: `+ = < > $ ~ | ^` are Symbol, not Punctuation, so
 * `a+b` would stay a single TOKEN under `\p{P}`.
 */
const PUNCTUATION = /[\p{P}\p{S}]/u;

/**
 * Characters that can act as an apostrophe.
 *
 * More than one, because the same mark has several encodings in real documents.
 * U+2019 is what word processors and smart-quote filters produce, so it is at
 * least as common as the ASCII form. U+02BC appears in orthographies that treat
 * the apostrophe as a letter. All are `\p{P}`, so without this set they would
 * split a word in half.
 *
 * Note this is about *characters*, not HTML entities — `&rsquo;` has already
 * been decoded to U+2019 by the time jsed reads a text node.
 */
const APOSTROPHE = new Set([
  '\u0027', // ' APOSTROPHE
  '\u2019', // ’ RIGHT SINGLE QUOTATION MARK
  '\u02BC', // ʼ MODIFIER LETTER APOSTROPHE
  '\u055A', // ՚ ARMENIAN APOSTROPHE
  '\uFF07' // ＇ FULLWIDTH APOSTROPHE
]);

/**
 * Split one run of non-whitespace wherever the character class changes,
 * grouping consecutive characters of the same class.
 *
 * ```
 * foo-bar.  ->  [foo][-][bar][.]
 * foo...    ->  [foo][...]     a repeated mark is one unit
 * lie,"     ->  [lie][,]["]    different marks are not
 * (x)       ->  [(][x][)]
 * a+b       ->  [a][+][b]
 * ```
 *
 * An APOSTROPHE never splits, wherever it sits. The same character marks a
 * contraction, a possessive, an elision, and a quotation, and nothing in the
 * text distinguishes them — `'n'` in "rock 'n' roll" is elided on both sides
 * and looks exactly like a quoted `n`. Since apostrophes far outnumber
 * single-quoted text in prose, the whole class reads as word characters.
 *
 * ```
 * don't     ->  [don't]
 * dogs'     ->  [dogs']
 * 'tis      ->  ['tis]
 * 'n'       ->  ['n']
 * 'quoted'  ->  ['quoted']    accepted cost
 * ```
 *
 * Double quotes are unambiguous and split normally: `"quoted"` gives
 * `["][quoted]["]`.
 */
function splitRun(text: string): string[] {
  const parts: string[] = [];
  let current = '';
  let previousChar = '';
  let currentIsPunctuation: boolean | null = null;

  for (const char of text) {
    const isPunctuation = PUNCTUATION.test(char) && !APOSTROPHE.has(char);
    // Word characters group freely, so `foo123` stays whole. Punctuation groups
    // only with itself: a repeat is one mark the user thinks of as a unit
    // (`...`), whereas neighbouring *different* marks are separate things they
    // may want to edit apart — `,"` closing a quotation is the common case.
    const startsNewPart =
      currentIsPunctuation !== null &&
      (isPunctuation !== currentIsPunctuation || (isPunctuation && char !== previousChar));

    if (startsNewPart) {
      parts.push(current);
      current = '';
    }
    current += char;
    currentIsPunctuation = isPunctuation;
    previousChar = char;
  }

  if (current !== '') {
    parts.push(current);
  }
  return parts;
}

/**
 * The SYNTACTIC_SPLIT rule as a {@link Splitter}: whitespace runs pass through
 * as SEPARATOR parts, and every other run is divided by {@link splitRun}.
 */
export const syntacticSplitter: Splitter = (text: string) =>
  nullSplitter(text).flatMap((part) => (isSeparatorPart(part) ? [part] : splitRun(part)));
