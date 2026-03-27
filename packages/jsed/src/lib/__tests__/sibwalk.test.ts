import { describe, test, expect } from 'vitest';
import { byId, makeRoot, div, p, em, span } from '../../test/util.js';
import { isToken, isIsland, isInlineFlow, isLine } from '../taxonomy.js';
import { getNextLineSibling, getPreviousLineSibling, getLine } from '../sibwalk.js';
import { tokenizeLine, isPadded, addAnchors } from '../token.js';

// INLINE_COMPUTED_STYLE
const inlineStyle = { style: 'display:inline;' };
const inlineBlockStyle = { style: 'display:inline-block;' };

/** Identify a LINE_SIBLING: TOKEN text for TOKEN's, bracketed descriptor for non-TOKEN's. */
function identify(el: HTMLElement): string {
  if (isToken(el)) return el.textContent!.trim();
  if (isIsland(el)) return `[island:${el.tagName.toLowerCase()}]`;
  return `[${el.tagName.toLowerCase()}]`;
}

/** Collect all LINE_SIBLING's forward using getNextLineSibling. */
function collectForward(first: HTMLElement, line?: HTMLElement): string[] {
  const ln = line ?? getLine(first);
  const result: string[] = [identify(first)];
  let cur: HTMLElement | null = first;
  while ((cur = getNextLineSibling(cur, ln))) {
    result.push(identify(cur));
  }
  return result;
}

/** Collect all LINE_SIBLING's backward using getPreviousLineSibling. */
function collectBackward(last: HTMLElement, line?: HTMLElement): string[] {
  const ln = line ?? getLine(last);
  const result: string[] = [identify(last)];
  let cur: HTMLElement | null = last;
  while ((cur = getPreviousLineSibling(cur, ln))) {
    result.push(identify(cur));
  }
  return result;
}

/** Walk forward to the last LINE_SIBLING. */
function walkToLast(first: HTMLElement, line?: HTMLElement): HTMLElement {
  const ln = line ?? getLine(first);
  let cur = first;
  let next: HTMLElement | null;
  while ((next = getNextLineSibling(cur, ln))) {
    cur = next;
  }
  return cur;
}

describe('getLine', () => {
  test('TOKEN: returns its parent LINE', () => {
    // arrange
    const doc = makeRoot(div({ id: 'line' }, 'hello world'));
    const line = byId(doc, 'line');
    const token = tokenizeLine(line)!;

    // act & assert
    expect(getLine(token)).toBe(line);
  });

  test('INLINE_FLOW: returns the containing LINE, not the INLINE_FLOW itself', () => {
    // arrange
    const doc = makeRoot(div({ id: 'line' }, em(inlineStyle, 'text')));
    const line = byId(doc, 'line');
    const emEl = line.querySelector('em')!;

    // act & assert
    expect(getLine(emEl)).toBe(line);
  });

  test('ISLAND (katex): returns the containing LINE', () => {
    // arrange
    const doc = makeRoot(
      div({ id: 'line' }, '<span class="katex" style="display:inline;">x²</span>')
    );
    const line = byId(doc, 'line');
    const katex = line.querySelector('.katex')!;

    // act & assert
    expect(getLine(katex)).toBe(line);
  });

  test('NESTED_LINE: returns itself, not the outer LINE', () => {
    // arrange
    const doc = makeRoot(div({ id: 'outer' }, div({ id: 'inner' }, 'text')));
    const inner = byId(doc, 'inner');

    // act & assert
    expect(getLine(inner)).toBe(inner);
  });
});

describe('getNextLineSibling / getPreviousLineSibling', () => {
  test('simple LINE: <p>foo bar baz</p>', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert
    expect(collectForward(first)).toEqual(['foo', 'bar', 'baz']);
    expect(collectBackward(walkToLast(first))).toEqual(['baz', 'bar', 'foo']);
  });

  test('INLINE_FLOW: <p>aaa <em>bbb</em> ccc</p>', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'aaa ', em(inlineStyle, 'bbb'), ' ccc'));
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert — CURSOR traverses seamlessly through the INLINE_FLOW
    expect(collectForward(first)).toEqual(['aaa', 'bbb', 'ccc']);
    expect(collectBackward(walkToLast(first))).toEqual(['ccc', 'bbb', 'aaa']);
  });

  test('nested INLINE_FLOW: <p>aaa <em>bbb <em>ccc</em> ddd</em> eee</p>', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', em(inlineStyle, 'bbb ', em(inlineStyle, 'ccc'), ' ddd'), ' eee')
    );
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert
    expect(collectForward(first)).toEqual(['aaa', 'bbb', 'ccc', 'ddd', 'eee']);
    expect(collectBackward(walkToLast(first))).toEqual(['eee', 'ddd', 'ccc', 'bbb', 'aaa']);
  });

  test('NESTED_LINE: CURSOR descends nested div', () => {
    // arrange — nested div marked transparent; "bbb"
    const doc = makeRoot(
      div(
        { id: 'div1' },
        'aaa ',
        div({ id: 'div2', class: 'jsed-cursor-transparent' }, 'nested'),
        ' bbb'
      )
    );
    const div1 = byId(doc, 'div1');
    tokenizeLine(div1);
    tokenizeLine(byId(doc, 'div2'));

    const first = div1.querySelector('.jsed-token') as HTMLElement;

    // act & assert — CURSOR traverses through nested div (TRANSPARENT_BLOCK)
    expect(collectForward(first, div1)).toEqual(['aaa', 'nested', 'bbb']);
    expect(collectBackward(walkToLast(first, div1), div1)).toEqual(['bbb', 'nested', 'aaa']);
  });

  test('floated element is a LINE (OPAQUE_BLOCK)', () => {
    // arrange — a floated span is not INLINE_FLOW (float excludes it), so it's a LINE.
    const doc = makeRoot(
      div({ id: 'div1' }, 'aaa ', span({ style: 'float:left;' }, 'floated'), ' bbb')
    );
    const div1 = byId(doc, 'div1');
    const floatedSpan = div1.querySelector('span[style*="float"]') as HTMLElement;

    // assert — float pulls element out of normal flow, so isInlineFlow is false → it's a LINE
    expect(isInlineFlow(floatedSpan)).toBe(false);
    expect(isLine(floatedSpan)).toBe(true);

    // act — tokenize and check traversal
    tokenizeLine(div1);
    const first = div1.querySelector('.jsed-token') as HTMLElement;

    // assert — floated span is OPAQUE_BLOCK (visited, not descended),
    expect(collectForward(first, div1)).toEqual(['aaa', '[span]', 'bbb']);
    expect(collectBackward(walkToLast(first, div1), div1)).toEqual(['bbb', '[span]', 'aaa']);
  });

  // ISLAND traversal covered thoroughly in '(1) ISLAND' describe block below
});

// ---------------------------------------------------------------------------
// CURSOR walks non-TOKEN LINE_SIBLING's
// ---------------------------------------------------------------------------
//
// These tests describe the DESIRED behavior from the spec
// "cursor-walks-non-tokens". They are expected to FAIL until the
// implementation is updated.

describe('(1) ISLAND: CURSOR visit=yes, descend=no', () => {
  test('ISLAND at middle of LINE', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert — CURSOR should visit the ISLAND as an opaque LINE_SIBLING
    expect(collectForward(first)).toEqual(['aaa', '[island:span]', 'bbb']);
    expect(collectBackward(walkToLast(first))).toEqual(['bbb', '[island:span]', 'aaa']);
  });

  test('ISLAND at start of LINE', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, '<span class="katex" style="display:inline;">x²</span>', ' aaa bbb')
    );
    tokenizeLine(byId(doc, 'p1'));
    const katex = byId(doc, 'p1').querySelector('.katex') as HTMLElement;

    // act & assert — ISLAND is the first LINE_SIBLING
    expect(collectForward(katex)).toEqual(['[island:span]', 'aaa', 'bbb']);
  });

  test('ISLAND at end of LINE', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa bbb ', '<span class="katex" style="display:inline;">x²</span>')
    );
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert — ISLAND is the last LINE_SIBLING
    expect(collectForward(first)).toEqual(['aaa', 'bbb', '[island:span]']);
  });

  test('ISLAND inside INLINE_FLOW', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' },
        'aaa ',
        em(inlineStyle, 'bbb ', '<span class="katex" style="display:inline;">x²</span>', ' ccc'),
        ' ddd'
      )
    );
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert — CURSOR descends into the INLINE_FLOW, visits the ISLAND within it
    expect(collectForward(first)).toEqual(['aaa', 'bbb', '[island:span]', 'ccc', 'ddd']);
  });

  test('adjacent ISLANDs', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' },
        'aaa ',
        '<span class="katex" style="display:inline;">x²</span>',
        '<span class="katex" style="display:inline;">y³</span>',
        ' bbb'
      )
    );
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert — both ISLANDs are visited
    expect(collectForward(first)).toEqual(['aaa', '[island:span]', '[island:span]', 'bbb']);
  });
});

describe('PADDED_TOKEN: TOKEN after ISLAND gets leading space', () => {
  test('TOKEN after ISLAND is padded', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    tokenizeLine(byId(doc, 'p1'));

    // act — find the TOKEN after the ISLAND
    const katex = byId(doc, 'p1').querySelector('.katex') as HTMLElement;
    const afterIsland = getNextLineSibling(katex, byId(doc, 'p1'))!;

    // assert
    expect(isToken(afterIsland)).toBe(true);
    expect(isPadded(afterIsland)).toBe(true);
    expect(afterIsland.textContent).toBe(' bbb ');
  });

  test('TOKEN before ISLAND is not padded', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // assert
    expect(isPadded(first)).toBe(false);
    expect(first.textContent).toBe('aaa ');
  });

  test('TOKEN after INLINE_FLOW is not padded', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'aaa ', em({ style: 'display:inline;' }, 'bbb'), ' ccc'));
    tokenizeLine(byId(doc, 'p1'));

    // act — find the last TOKEN ('ccc')
    const tokens = byId(doc, 'p1').querySelectorAll('.jsed-token');
    const lastToken = tokens[tokens.length - 1] as HTMLElement;

    // assert — INLINE_FLOW's last TOKEN provides trailing space, so no padding needed
    expect(isPadded(lastToken)).toBe(false);
  });

  test('ISLAND at end of LINE: no TOKEN to pad', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>')
    );
    tokenizeLine(byId(doc, 'p1'));

    // assert — only one TOKEN, it should not be padded
    const tokens = byId(doc, 'p1').querySelectorAll('.jsed-token');
    expect(tokens.length).toBe(1);
    expect(isPadded(tokens[0] as HTMLElement)).toBe(false);
  });

  test('TOKEN after inline-block OPAQUE_BLOCK is padded', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'aaa ', span(inlineBlockStyle, 'inner'), ' bbb'));
    tokenizeLine(byId(doc, 'p1'));

    // act — find the TOKEN after the inline-block
    const ib = byId(doc, 'p1').querySelector('span[style]') as HTMLElement;
    const afterIb = getNextLineSibling(ib, byId(doc, 'p1'))!;

    // assert
    expect(isToken(afterIb)).toBe(true);
    expect(isPadded(afterIb)).toBe(true);
    expect(afterIb.textContent).toBe(' bbb ');
  });

  test('TOKEN after TRANSPARENT_BLOCK is not padded (text absorbed into block)', () => {
    // arrange — tokenization descends into TRANSPARENT_BLOCKs, so the trailing
    // text node gets absorbed (via implicit line tagging) rather than staying as
    // a sibling. The padding predicate never fires.
    const doc = makeRoot(
      p(
        { id: 'p1' },
        'aaa ',
        div({ id: 'inner', class: 'jsed-cursor-transparent' }, 'inner'),
        ' bbb'
      )
    );
    tokenizeLine(byId(doc, 'p1'));

    // act — find the last TOKEN ('bbb')
    const tokens = byId(doc, 'p1').querySelectorAll('.jsed-token');
    const lastToken = tokens[tokens.length - 1] as HTMLElement;

    // assert
    expect(isPadded(lastToken)).toBe(false);
  });

  test('adjacent ISLANDs: TOKEN after second ISLAND is padded', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' },
        'aaa ',
        '<span class="katex" style="display:inline;">x²</span>',
        '<span class="katex" style="display:inline;">y³</span>',
        ' bbb'
      )
    );
    tokenizeLine(byId(doc, 'p1'));

    // act
    const katexEls = byId(doc, 'p1').querySelectorAll('.katex');
    const afterSecond = getNextLineSibling(katexEls[1] as HTMLElement, byId(doc, 'p1'))!;

    // assert
    expect(isToken(afterSecond)).toBe(true);
    expect(isPadded(afterSecond)).toBe(true);
  });
});

describe('(2) TRANSPARENT_BLOCK: CURSOR visit=no, descend=yes', () => {
  // Category (2) requires explicit opt-in via jsed-cursor-transparent class.
  // This includes nested block elements (div inside div) and inline-block spans.
  // The CURSOR descends into them seamlessly, like an INLINE_FLOW.
  const transparent = 'jsed-cursor-transparent';

  test('nested div at middle of LINE: <div>aaa <div>nested</div> bbb</div>', () => {
    // arrange — nested div marked transparent so CURSOR descends
    // "bbb" after the nested div is wrapped in IMPLICIT_LINE (also TRANSPARENT_BLOCK)
    const doc = makeRoot(
      div(
        { id: 'outer' }, //
        'aaa ',
        div({ id: 'inner', class: transparent }, 'nested'),
        ' bbb'
      )
    );
    const line = byId(doc, 'outer');
    tokenizeLine(line);
    tokenizeLine(byId(doc, 'inner'));

    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert — CURSOR descends into the nested div and IMPLICIT_LINE
    expect(collectForward(first, line)).toEqual(['aaa', 'nested', 'bbb']);
  });

  test('nested div at start of LINE: <div><div>nested</div> aaa bbb</div>', () => {
    // arrange — "aaa bbb" after the nested div is wrapped in IMPLICIT_LINE
    const doc = makeRoot(
      div({ id: 'outer' }, div({ id: 'inner', class: transparent }, 'nested'), ' aaa bbb')
    );
    const line = byId(doc, 'outer');
    tokenizeLine(line);
    tokenizeLine(byId(doc, 'inner'));

    const innerToken = byId(doc, 'inner').querySelector('.jsed-token') as HTMLElement;

    // act & assert — CURSOR descends through nested div and IMPLICIT_LINE
    expect(collectForward(innerToken, line)).toEqual(['nested', 'aaa', 'bbb']);
  });

  test('nested div at end of LINE: <div>aaa bbb <div>nested</div></div>', () => {
    // arrange
    const doc = makeRoot(
      div({ id: 'outer' }, 'aaa bbb ', div({ id: 'inner', class: transparent }, 'nested'))
    );
    const line = byId(doc, 'outer');
    tokenizeLine(line);
    const inner = byId(doc, 'inner');
    tokenizeLine(inner);

    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert
    expect(collectForward(first, line)).toEqual(['aaa', 'bbb', 'nested']);
  });

  test('nested div inside INLINE_FLOW: <div>aaa <em>bbb <div>nested</div> ccc</em> ddd</div>', () => {
    // arrange — uses <div> not <p> as outer because <p> auto-closes on block children
    // "ccc" after the nested div inside em is wrapped in IMPLICIT_LINE
    const doc = makeRoot(
      div(
        { id: 'outer' },
        'aaa ',
        em(inlineStyle, 'bbb ', div({ id: 'inner', class: transparent }, 'nested'), ' ccc'),
        ' ddd'
      )
    );
    const line = byId(doc, 'outer');
    tokenizeLine(line);
    tokenizeLine(byId(doc, 'inner'));

    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert — descend through INLINE_FLOW, then nested div, then IMPLICIT_LINE for "ccc"
    expect(collectForward(first, line)).toEqual(['aaa', 'bbb', 'nested', 'ccc', 'ddd']);
  });

  test('deeply nested blocks: <div>aaa <div>bbb <div>ccc</div> ddd</div> eee</div>', () => {
    // arrange — "ddd" and "eee" after block-level divs are wrapped in IMPLICIT_LINE's
    const doc = makeRoot(
      div(
        { id: 'outer' },
        'aaa ',
        div(
          { id: 'mid', class: transparent },
          'bbb ',
          div({ id: 'deep', class: transparent }, 'ccc'),
          ' ddd'
        ),
        ' eee'
      )
    );
    const line = byId(doc, 'outer');
    tokenizeLine(line);
    tokenizeLine(byId(doc, 'mid'));
    tokenizeLine(byId(doc, 'deep'));

    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert — CURSOR descends through all nested levels and IMPLICIT_LINE's
    expect(collectForward(first, line)).toEqual(['aaa', 'bbb', 'ccc', 'ddd', 'eee']);
  });

  test('inline-block at middle of LINE', () => {
    // arrange — inline-block marked transparent so CURSOR descends.
    // Inline-block does NOT trigger IMPLICIT_LINE (not block-level).
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', span({ ...inlineBlockStyle, class: transparent }, 'inner'), ' bbb')
    );
    const line = byId(doc, 'p1');
    tokenizeLine(line);
    const ib = line.querySelector('span[style*="inline-block"]') as HTMLElement;
    tokenizeLine(ib);

    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert
    expect(collectForward(first, line)).toEqual(['aaa', 'inner', 'bbb']);
  });

  test('nested block containing only an ANCHOR', () => {
    // arrange — a nested div with no text content yet; addAnchors creates
    // an ANCHOR inside the empty TRANSPARENT_BLOCK so the CURSOR can land on it.
    // "bbb" after the nested div is wrapped in IMPLICIT_LINE.
    const doc = makeRoot(
      div({ id: 'outer' }, 'aaa ', div({ id: 'inner', class: transparent }, ''), ' bbb')
    );
    const line = byId(doc, 'outer');
    tokenizeLine(line);
    const inner = byId(doc, 'inner');
    tokenizeLine(inner);
    addAnchors(inner);

    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert — CURSOR traverses: aaa, (anchor inside inner div), bbb (in IMPLICIT_LINE)
    const siblings: HTMLElement[] = [first];
    let cur: HTMLElement | null = first;
    while ((cur = getNextLineSibling(cur, line))) {
      siblings.push(cur);
    }
    expect(siblings.length).toBe(3);
  });
});

describe('(3) OPAQUE_BLOCK: CURSOR visit=yes, descend=no', () => {
  // A non-INLINE_FLOW, non-ISLAND FOCUSABLE is opaque by default (no class needed).
  // FOCUS can descend into it, but the CURSOR cannot.
  const inlineBlock = { style: 'display:inline-block;' };

  test('plain block-level div middle of line', () => {
    // arrange — a nested div with no class is opaque by default (the flip).
    // CURSOR visits it but does not descend into its content.
    const doc = makeRoot(
      div(
        { id: 'outer' }, //
        'aaa ',
        div({ id: 'inner' }, 'nested content'),
        ' bbb'
      )
    );
    const line = byId(doc, 'outer');
    tokenizeLine(line);
    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert — inner div is visited as opaque, "nested content" is not descended into
    expect(collectForward(first, line)).toEqual(['aaa', '[div]', 'bbb']);
    expect(collectBackward(walkToLast(first, line), line)).toEqual(['bbb', '[div]', 'aaa']);
  });

  test('inline-block at middle of LINE', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'aaa ', span(inlineBlock, 'nested content'), ' bbb'));
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert — visited but not descended: shows as opaque element
    expect(collectForward(first)).toEqual(['aaa', '[span]', 'bbb']);
    expect(collectBackward(walkToLast(first))).toEqual(['bbb', '[span]', 'aaa']);
  });

  test('inline-block at start of LINE', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, span(inlineBlock, 'nested'), ' aaa bbb'));
    const line = byId(doc, 'p1');
    tokenizeLine(line);
    const opaque = line.querySelector('span[style]') as HTMLElement;

    // act & assert — opaque element is the first LINE_SIBLING
    expect(collectForward(opaque, line)).toEqual(['[span]', 'aaa', 'bbb']);
  });

  test('inline-block at end of LINE', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'aaa bbb ', span(inlineBlock, 'nested')));
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert
    expect(collectForward(first)).toEqual(['aaa', 'bbb', '[span]']);
  });

  test('inline-block inside INLINE_FLOW', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        'aaa ',
        em(
          inlineStyle, //
          'bbb ',
          span(inlineBlock, 'nested'),
          ' ccc'
        ),
        ' ddd'
      )
    );
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert
    expect(collectForward(first)).toEqual(['aaa', 'bbb', '[span]', 'ccc', 'ddd']);
  });
});
