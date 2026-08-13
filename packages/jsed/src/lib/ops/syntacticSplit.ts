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
 * Built once — constructing a segmenter is far more expensive than using it,
 * and `splitRun` runs on every keystroke.
 *
 * `undefined` locale so it follows the host, and `Intl.Segmenter` is only read
 * if it exists: grapheme segmentation is the correctness fix, not a hard
 * requirement, so an environment without it degrades to code points rather than
 * throwing.
 */
const GRAPHEMES =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

/**
 * Iterate user-perceived characters. Falls back to code points, which is what
 * `for...of` over a string already gives.
 */
function clusters(text: string): Iterable<string> {
  if (!GRAPHEMES) {
    return text;
  }
  return (function* () {
    for (const { segment } of GRAPHEMES.segment(text)) {
      yield segment;
    }
  })();
}

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
 * The unit is a **grapheme cluster**, not a code point. A user-perceived
 * character is often several code points, and some of those code points are not
 * Punctuation or Symbol, so classifying them one at a time tears the character
 * in half:
 *
 * ```
 * 👨‍👩‍👧    ZWJ is \p{Cf}   -> would give [👨][ZWJ][👩][ZWJ][👧]
 * 👍🏽      skin tone is \p{Sk} -> would give [👍][🏽]
 * ❤️      VS16 is \p{Mn}   -> would give [❤][VS16]
 * 🇦🇺      two regional indicators -> would give [🇦][🇺]
 * ```
 *
 * Splitting a TOKEN there breaks the glyph on screen, because a browser cannot
 * shape one cluster across element boundaries. (The document text survives: the
 * parts carry no SEPARATOR, so detokenizing rejoins them and save output is
 * unchanged. It renders wrong, it does not save wrong.) Clustering also makes
 * combining marks correct by design rather than by accident — `café` written
 * with a combining acute used to hold together only because `\p{Mn}` happens to
 * classify like a letter.
 *
 * A cluster is classified by its **first** code point, which is its base
 * character. ASCII clusters are single code points, so the punctuation rules
 * above are unaffected.
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
  let previousCluster = '';
  let currentIsPunctuation: boolean | null = null;

  for (const cluster of clusters(text)) {
    // The base character decides the class for the whole cluster.
    const base = String.fromCodePoint(cluster.codePointAt(0)!);
    const isPunctuation = PUNCTUATION.test(base) && !APOSTROPHE.has(base);
    // Word characters group freely, so `foo123` stays whole. Punctuation groups
    // only with itself: a repeat is one mark the user thinks of as a unit
    // (`...`), whereas neighbouring *different* marks are separate things they
    // may want to edit apart — `,"` closing a quotation is the common case.
    const startsNewPart =
      currentIsPunctuation !== null &&
      (isPunctuation !== currentIsPunctuation || (isPunctuation && cluster !== previousCluster));

    if (startsNewPart) {
      parts.push(current);
      current = '';
    }
    current += cluster;
    currentIsPunctuation = isPunctuation;
    previousCluster = cluster;
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
