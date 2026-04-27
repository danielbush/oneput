import { describe, test, expect } from 'vitest';
import { byId, makeRoot, div, p, em, span, t, a, identify } from '../../test/util.js';
import { getNextLineSibling, getPreviousLineSibling, getLine } from '../sibwalk.js';

// INLINE_COMPUTED_STYLE
const inlineStyle = { style: 'display:inline;' };
const inlineBlockStyle = { style: 'display:inline-block;' };

/** Collect all LINE_SIBLING's forward using getNextLineSibling. */
function collectForward(first: Node, ceiling = first.parentElement!): string[] {
  const result: string[] = [identify(first)];
  let cur: Node | null = first;
  while ((cur = getNextLineSibling(cur, ceiling))) {
    result.push(identify(cur));
  }
  return result;
}

/** Collect all LINE_SIBLING's backward using getPreviousLineSibling. */
function collectBackward(last: Node, ceiling = last.parentElement!): string[] {
  const result: string[] = [identify(last)];
  let cur: Node | null = last;
  while ((cur = getPreviousLineSibling(cur, ceiling))) {
    result.push(identify(cur));
  }
  return result;
}

/** Walk forward to the last LINE_SIBLING. */
function walkToLast(first: Node, ceiling = first.parentElement!): Node {
  let cur = first;
  let next: Node | null;
  while ((next = getNextLineSibling(cur, ceiling))) {
    cur = next;
  }
  return cur;
}

describe('getLine', () => {
  test('TOKEN: returns its parent LINE', () => {
    // arrange
    const doc = makeRoot(div({ id: 'line' }, t('hello'), t('world')));
    const line = byId(doc, 'line');
    const token = line.querySelector('.jsed-token') as HTMLElement;

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
    const doc = makeRoot(p({ id: 'p1' }, t('foo'), t('bar'), t('baz')));
    const first = byId(doc, 'p1').querySelector('.jsed-token') as HTMLElement;

    // act & assert
    expect(collectForward(first)).toEqual(['foo', 'bar', 'baz']);
    expect(collectBackward(walkToLast(first, first.parentElement!))).toEqual(['baz', 'bar', 'foo']);
  });

  test('INLINE_FLOW: <p>aaa <em>bbb</em> ccc</p>', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('aaa'), em(inlineStyle, t('bbb')), t('ccc')));
    const first = byId(doc, 'p1').querySelector('.jsed-token') as HTMLElement;

    // act & assert — CURSOR traverses seamlessly through the INLINE_FLOW
    expect(collectForward(first)).toEqual(['aaa', 'bbb', 'ccc']);
    expect(collectBackward(walkToLast(first))).toEqual(['ccc', 'bbb', 'aaa']);
  });

  test('nested INLINE_FLOW: <p>aaa <em>bbb <em>ccc</em> ddd</em> eee</p>', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' },
        t('aaa'),
        em(inlineStyle, t('bbb'), em(inlineStyle, t('ccc')), t('ddd')),
        t('eee')
      )
    );
    const first = byId(doc, 'p1').querySelector('.jsed-token') as HTMLElement;

    // act & assert
    expect(collectForward(first)).toEqual(['aaa', 'bbb', 'ccc', 'ddd', 'eee']);
    expect(collectBackward(walkToLast(first))).toEqual(['eee', 'ddd', 'ccc', 'bbb', 'aaa']);
  });

  test('NESTED_LINE: CURSOR descends nested div', () => {
    // arrange — nested div marked transparent; "bbb"
    const doc = makeRoot(
      div(
        { id: 'div1' },
        t('aaa'),
        div({ id: 'div2', class: 'jsed-cursor-transparent' }, t('nested')),
        t('bbb')
      )
    );
    const div1 = byId(doc, 'div1');
    const first = div1.querySelector('.jsed-token') as HTMLElement;

    // act & assert — CURSOR traverses through nested div (TRANSPARENT_BLOCK)
    expect(collectForward(first)).toEqual(['aaa', 'nested', 'bbb']);
    expect(collectBackward(walkToLast(first))).toEqual(['bbb', 'nested', 'aaa']);
  });

  test('floated element is a LINE (OPAQUE_BLOCK)', () => {
    // arrange — a floated span is not INLINE_FLOW (float excludes it), so it's a LINE.
    const doc = makeRoot(
      div(
        { id: 'div1' }, //
        t('aaa'),
        span({ style: 'float:left;' }, 'floated'),
        t('bbb')
      )
    );
    const div1 = byId(doc, 'div1');
    const first = div1.querySelector('.jsed-token') as HTMLElement;

    // act & assert — floated span is OPAQUE_BLOCK (visited, not descended),
    expect(collectForward(first)).toEqual(['aaa', '[span]', 'bbb']);
    expect(collectBackward(walkToLast(first))).toEqual(['bbb', '[span]', 'aaa']);
  });

  describe('(1) ISLAND: CURSOR visit=yes, descend=no', () => {
    test('ISLAND at middle of LINE', () => {
      // arrange
      const doc = makeRoot(
        p({ id: 'p1' }, t('aaa'), '<span class="katex" style="display:inline;">x²</span>', t('bbb'))
      );
      const first = byId(doc, 'p1').querySelector('.jsed-token') as HTMLElement;

      // act & assert — CURSOR should visit the ISLAND as an opaque LINE_SIBLING
      expect(collectForward(first)).toEqual(['aaa', '[island:span]', 'bbb']);
      expect(collectBackward(walkToLast(first))).toEqual(['bbb', '[island:span]', 'aaa']);
    });

    test('ISLAND at start of LINE', () => {
      // arrange
      const doc = makeRoot(
        p({ id: 'p1' }, '<span class="katex" style="display:inline;">x²</span>', t('aaa'), t('bbb'))
      );
      const katex = byId(doc, 'p1').querySelector('.katex') as HTMLElement;

      // act & assert — ISLAND is the first LINE_SIBLING
      expect(collectForward(katex)).toEqual(['[island:span]', 'aaa', 'bbb']);
    });

    test('ISLAND at end of LINE', () => {
      // arrange
      const doc = makeRoot(
        p({ id: 'p1' }, t('aaa'), t('bbb'), '<span class="katex" style="display:inline;">x²</span>')
      );
      const first = byId(doc, 'p1').querySelector('.jsed-token') as HTMLElement;

      // act & assert — ISLAND is the last LINE_SIBLING
      expect(collectForward(first)).toEqual(['aaa', 'bbb', '[island:span]']);
    });

    test('ISLAND inside INLINE_FLOW', () => {
      // arrange
      const doc = makeRoot(
        p(
          { id: 'p1' },
          t('aaa'),
          em(
            inlineStyle,
            t('bbb'),
            '<span class="katex" style="display:inline;">x²</span>',
            t('ccc')
          ),
          t('ddd')
        )
      );
      const first = byId(doc, 'p1').querySelector('.jsed-token') as HTMLElement;

      // act & assert — CURSOR descends into the INLINE_FLOW, visits the ISLAND within it
      expect(collectForward(first)).toEqual(['aaa', 'bbb', '[island:span]', 'ccc', 'ddd']);
    });

    test('adjacent ISLANDs', () => {
      // arrange
      const doc = makeRoot(
        p(
          { id: 'p1' },
          t('aaa'),
          '<span class="katex" style="display:inline;">x²</span>',
          '<span class="katex" style="display:inline;">y³</span>',
          t('bbb')
        )
      );
      const first = byId(doc, 'p1').querySelector('.jsed-token') as HTMLElement;

      // act & assert — both ISLANDs are visited
      expect(collectForward(first)).toEqual(['aaa', '[island:span]', '[island:span]', 'bbb']);
    });
  });

  describe('(2) TRANSPARENT_BLOCK: CURSOR visit=no, descend=yes', () => {
    // Category (2) requires explicit opt-in via jsed-cursor-transparent class.
    // This includes nested block elements (div inside div) and inline-block spans.
    // The CURSOR descends into them seamlessly, like an INLINE_FLOW.
    const transparent = 'jsed-cursor-transparent';

    test('nested div at middle of LINE: <div>aaa <div>nested</div> bbb</div>', () => {
      // arrange — nested div marked transparent so CURSOR descends
      const doc = makeRoot(
        div(
          { id: 'outer' }, //
          t('aaa'),
          div({ id: 'inner', class: transparent }, t('nested')),
          t('bbb')
        )
      );
      const line = byId(doc, 'outer');
      const first = line.querySelector('.jsed-token') as HTMLElement;

      // act & assert — CURSOR descends into the nested div
      expect(collectForward(first)).toEqual(['aaa', 'nested', 'bbb']);
    });

    test('nested div at start of LINE: <div><div>nested</div> aaa bbb</div>', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'outer' },
          div({ id: 'inner', class: transparent }, t('nested')),
          t('aaa'),
          t('bbb')
        )
      );
      const innerToken = byId(doc, 'inner').querySelector('.jsed-token') as HTMLElement;

      // act & assert — CURSOR descends through nested div
      expect(collectForward(innerToken)).toEqual(['nested', 'aaa', 'bbb']);
    });

    test('nested div at end of LINE: <div>aaa bbb <div>nested</div></div>', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'outer' },
          t('aaa'),
          t('bbb'),
          div({ id: 'inner', class: transparent }, t('nested'))
        )
      );
      const line = byId(doc, 'outer');
      const first = line.querySelector('.jsed-token') as HTMLElement;

      // act & assert
      expect(collectForward(first)).toEqual(['aaa', 'bbb', 'nested']);
    });

    test('nested div inside INLINE_FLOW: <div>aaa <em>bbb <div>nested</div> ccc</em> ddd</div>', () => {
      // arrange — uses <div> not <p> as outer because <p> auto-closes on block children
      const doc = makeRoot(
        div(
          { id: 'outer' },
          t('aaa'),
          em(
            inlineStyle,
            t('bbb'),
            div({ id: 'inner', class: transparent }, t('nested')),
            t('ccc')
          ),
          t('ddd')
        )
      );
      const line = byId(doc, 'outer');
      const first = line.querySelector('.jsed-token') as HTMLElement;

      // act & assert — descend through INLINE_FLOW, then nested div
      expect(collectForward(first)).toEqual(['aaa', 'bbb', 'nested', 'ccc', 'ddd']);
    });

    test('deeply nested blocks: <div>aaa <div>bbb <div>ccc</div> ddd</div> eee</div>', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'outer' },
          t('aaa'),
          div(
            { id: 'mid', class: transparent },
            t('bbb'),
            div({ id: 'deep', class: transparent }, t('ccc')),
            t('ddd')
          ),
          t('eee')
        )
      );
      const line = byId(doc, 'outer');
      const first = line.querySelector('.jsed-token') as HTMLElement;

      // act & assert — CURSOR descends through all nested levels
      expect(collectForward(first)).toEqual(['aaa', 'bbb', 'ccc', 'ddd', 'eee']);
    });

    test('inline-block at middle of LINE', () => {
      // arrange — inline-block marked transparent so CURSOR descends.
      // Inline-block does NOT trigger IMPLICIT_LINE (not block-level).
      const doc = makeRoot(
        p(
          { id: 'p1' },
          t('aaa'),
          span({ ...inlineBlockStyle, class: transparent }, t('inner')),
          t('bbb')
        )
      );
      const line = byId(doc, 'p1');
      const first = line.querySelector('.jsed-token') as HTMLElement;

      // act & assert
      expect(collectForward(first)).toEqual(['aaa', 'inner', 'bbb']);
    });

    test('nested block containing only an ANCHOR', () => {
      // arrange — a nested div with an explicit ANCHOR so the CURSOR can land on it.
      const doc = makeRoot(
        div(
          { id: 'outer' }, //
          t('aaa'),
          div({ id: 'inner', class: transparent }, a()),
          t('bbb')
        )
      );
      const line = byId(doc, 'outer');
      const first = line.querySelector('.jsed-token') as HTMLElement;

      // act & assert — CURSOR traverses: aaa, (anchor inside inner div), bbb
      expect(collectForward(first)).toHaveLength(3);
      expect(collectForward(first)).toEqual(['aaa', '¤', 'bbb']);
    });
  });
});

// ---------------------------------------------------------------------------
// CURSOR walks non-TOKEN LINE_SIBLING's
// ---------------------------------------------------------------------------
//
// These tests describe the DESIRED behavior from the spec
// "cursor-walks-non-tokens". They are expected to FAIL until the
// implementation is updated.

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
        t('aaa'),
        div({ id: 'inner' }, 'nested content'),
        t('bbb')
      )
    );
    const line = byId(doc, 'outer');
    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert — inner div is visited as opaque, "nested content" is not descended into
    expect(collectForward(first)).toEqual(['aaa', '[div]', 'bbb']);
    expect(collectBackward(walkToLast(first))).toEqual(['bbb', '[div]', 'aaa']);
  });

  test('inline-block at middle of LINE', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('aaa'), span(inlineBlock, 'nested content'), t('bbb')));
    const line = byId(doc, 'p1');
    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert — visited but not descended: shows as opaque element
    expect(collectForward(first)).toEqual(['aaa', '[span]', 'bbb']);
    expect(collectBackward(walkToLast(first))).toEqual(['bbb', '[span]', 'aaa']);
  });

  test('inline-block at start of LINE', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, span(inlineBlock, 'nested'), t('aaa'), t('bbb')));
    const line = byId(doc, 'p1');
    const opaque = line.querySelector('span[style]') as HTMLElement;

    // act & assert — opaque element is the first LINE_SIBLING
    expect(collectForward(opaque)).toEqual(['[span]', 'aaa', 'bbb']);
  });

  test('inline-block at end of LINE', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('aaa'), t('bbb'), span(inlineBlock, 'nested')));
    const first = byId(doc, 'p1').querySelector('.jsed-token') as HTMLElement;

    // act & assert
    expect(collectForward(first)).toEqual(['aaa', 'bbb', '[span]']);
  });

  test('inline-block inside INLINE_FLOW', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        t('aaa'),
        em(
          inlineStyle, //
          t('bbb'),
          span(inlineBlock, 'nested'),
          t('ccc')
        ),
        t('ddd')
      )
    );
    const first = byId(doc, 'p1').querySelector('.jsed-token') as HTMLElement;

    // act & assert
    expect(collectForward(first)).toEqual(['aaa', 'bbb', '[span]', 'ccc', 'ddd']);
  });
});
