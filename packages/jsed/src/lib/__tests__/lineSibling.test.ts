import { describe, test, expect } from 'vitest';
import { byId, makeRoot, div, p, em, span } from '../../test/util.js';
import {
  getNextLineSibling,
  getPreviousLineSibling,
  getLine,
  isLine,
  isInline,
  isToken,
  isIsland,
  isBlockTransparent
} from '../traversal.js';
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

describe('isToken', () => {
  test('TOKEN after tokenization: returns true', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'hello'));
    tokenizeLine(byId(doc, 'p1'));
    const token = byId(doc, 'p1').querySelector('.jsed-token')!;

    // act & assert
    expect(isToken(token)).toBe(true);
  });

  test('FOCUSABLE (p): returns false', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'hello'));

    // act & assert
    expect(isToken(byId(doc, 'p1'))).toBe(false);
  });

  test('INLINE (em): returns false', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, em(inlineStyle, 'text')));
    const emEl = byId(doc, 'p1').querySelector('em')!;

    // act & assert
    expect(isToken(emEl)).toBe(false);
  });

  test('null: returns false', () => {
    expect(isToken(null)).toBe(false);
  });
});

describe('isInline', () => {
  test('INLINE (em with display:inline): returns true', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, em(inlineStyle, 'text')));
    const emEl = byId(doc, 'p1').querySelector('em')!;

    // act & assert
    expect(isInline(emEl)).toBe(true);
  });

  test('inline-block: returns false (treated as LINE)', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, '<span id="ib" style="display:inline-block;">chip</span>')
    );
    const ib = byId(doc, 'ib');

    // act & assert
    expect(isInline(ib)).toBe(false);
  });

  test('ISLAND (katex with display:inline): returns false', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, '<span class="katex" style="display:inline;">x²</span>'));
    const katex = byId(doc, 'p1').querySelector('.katex')!;

    // act & assert
    expect(isInline(katex)).toBe(false);
  });

  test('block element (div): returns false', () => {
    // arrange
    const doc = makeRoot(div({ id: 'outer' }, div({ id: 'inner' }, 'text')));

    // act & assert
    expect(isInline(byId(doc, 'inner'))).toBe(false);
  });

  test('null: returns false', () => {
    expect(isInline(null)).toBe(false);
  });
});

describe('isLine', () => {
  test('ISLAND (katex): returns false', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, '<span class="katex" style="display:inline;">x²</span>'));
    const katex = byId(doc, 'p1').querySelector('.katex')!;

    // act & assert
    expect(isLine(katex)).toBe(false);
  });

  test('TOKEN: returns false', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'hello'));
    tokenizeLine(byId(doc, 'p1'));
    const token = byId(doc, 'p1').querySelector('.jsed-token')!;

    // act & assert
    expect(isLine(token)).toBe(false);
  });

  test('INLINE (em): returns false', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, em(inlineStyle, 'text')));
    const emEl = byId(doc, 'p1').querySelector('em')!;

    // act & assert
    expect(isLine(emEl)).toBe(false);
  });

  test('inline-block: returns true', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, '<span id="ib" style="display:inline-block;">chip</span>')
    );
    const ib = byId(doc, 'ib');

    // act & assert
    expect(isLine(ib)).toBe(true);
  });

  test('nested div > p: returns true', () => {
    // arrange
    const doc = makeRoot(div({ id: 'outer' }, p({ id: 'inner' }, 'text')));
    const inner = byId(doc, 'inner');

    // act & assert
    expect(isLine(inner)).toBe(true);
  });

  test('nested div > div: returns true', () => {
    // arrange
    const doc = makeRoot(div({ id: 'outer' }, div({ id: 'inner' }, 'text')));
    const inner = byId(doc, 'inner');

    // act & assert
    expect(isLine(inner)).toBe(true);
  });
});

describe('getLine', () => {
  test('TOKEN: returns its parent LINE', () => {
    // arrange
    const doc = makeRoot(div({ id: 'line' }, 'hello world'));
    const line = byId(doc, 'line');
    const token = tokenizeLine(line)!;

    // act & assert
    expect(getLine(token)).toBe(line);
  });

  test('INLINE: returns the containing LINE, not the INLINE itself', () => {
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

  test('INLINE: <p>aaa <em>bbb</em> ccc</p>', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'aaa ', em(inlineStyle, 'bbb'), ' ccc'));
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert — CURSOR traverses seamlessly through the INLINE
    expect(collectForward(first)).toEqual(['aaa', 'bbb', 'ccc']);
    expect(collectBackward(walkToLast(first))).toEqual(['ccc', 'bbb', 'aaa']);
  });

  test('nested INLINE: <p>aaa <em>bbb <em>ccc</em> ddd</em> eee</p>', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', em(inlineStyle, 'bbb ', em(inlineStyle, 'ccc'), ' ddd'), ' eee')
    );
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert
    expect(collectForward(first)).toEqual(['aaa', 'bbb', 'ccc', 'ddd', 'eee']);
    expect(collectBackward(walkToLast(first))).toEqual(['eee', 'ddd', 'ccc', 'bbb', 'aaa']);
  });

  test('NESTED_LINE: CURSOR skips the nested div', () => {
    // arrange
    const doc = makeRoot(div({ id: 'div1' }, 'aaa ', div({ id: 'div2' }, 'nested'), ' bbb'));
    const first = tokenizeLine(byId(doc, 'div1'))!;

    // act & assert
    expect(collectForward(first)).toEqual(['aaa', 'bbb']);
    expect(collectBackward(walkToLast(first))).toEqual(['bbb', 'aaa']);
  });

  test('ISLAND (katex): CURSOR visits the island', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">rendered</span>', ' bbb')
    );
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert — ISLAND is now a LINE_SIBLING the CURSOR visits
    expect(collectForward(first)).toEqual(['aaa', '[island:span]', 'bbb']);
    expect(collectBackward(walkToLast(first))).toEqual(['bbb', '[island:span]', 'aaa']);
  });
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

  test('ISLAND inside INLINE', () => {
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

    // act & assert — CURSOR descends into the INLINE, visits the ISLAND within it
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

  test('TOKEN after INLINE is not padded', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', em({ style: 'display:inline;' }, 'bbb'), ' ccc')
    );
    tokenizeLine(byId(doc, 'p1'));

    // act — find the last TOKEN ('ccc')
    const tokens = byId(doc, 'p1').querySelectorAll('.jsed-token');
    const lastToken = tokens[tokens.length - 1] as HTMLElement;

    // assert — INLINE's last TOKEN provides trailing space, so no padding needed
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

describe('(2) BLOCK_TRANSPARENT: CURSOR visit=no, descend=yes', () => {
  // Category (2) is the DEFAULT for any non-INLINE, non-ISLAND FOCUSABLE (CURSOR_TRANSPARENT).
  // This includes nested block elements (div inside div) and inline-block spans.
  // The CURSOR descends into them seamlessly, like an INLINE.

  test('nested div at middle of LINE: <div>aaa <div>nested</div> bbb</div>', () => {
    // arrange — nested div is not INLINE, not ISLAND → category (2) by default
    const doc = makeRoot(
      div({ id: 'outer' }, 'aaa ', div({ id: 'inner' }, 'nested'), ' bbb')
    );
    const line = byId(doc, 'outer');
    tokenizeLine(line);
    // Manually tokenize the nested element since tokenizeLine does SHALLOW_TOKENIZATION
    const inner = byId(doc, 'inner');
    tokenizeLine(inner);

    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert — CURSOR descends into the nested div and visits its TOKEN's
    expect(collectForward(first, line)).toEqual(['aaa', 'nested', 'bbb']);
  });

  test('nested div at start of LINE: <div><div>nested</div> aaa bbb</div>', () => {
    // arrange
    const doc = makeRoot(
      div({ id: 'outer' }, div({ id: 'inner' }, 'nested'), ' aaa bbb')
    );
    const line = byId(doc, 'outer');
    tokenizeLine(line);
    const inner = byId(doc, 'inner');
    tokenizeLine(inner);

    // The first LINE_SIBLING should be the TOKEN inside the nested div
    const innerToken = inner.querySelector('.jsed-token') as HTMLElement;

    // act & assert
    expect(collectForward(innerToken, line)).toEqual(['nested', 'aaa', 'bbb']);
  });

  test('nested div at end of LINE: <div>aaa bbb <div>nested</div></div>', () => {
    // arrange
    const doc = makeRoot(
      div({ id: 'outer' }, 'aaa bbb ', div({ id: 'inner' }, 'nested'))
    );
    const line = byId(doc, 'outer');
    tokenizeLine(line);
    const inner = byId(doc, 'inner');
    tokenizeLine(inner);

    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert
    expect(collectForward(first, line)).toEqual(['aaa', 'bbb', 'nested']);
  });

  test('nested div inside INLINE: <div>aaa <em>bbb <div>nested</div> ccc</em> ddd</div>', () => {
    // arrange — uses <div> not <p> as outer because <p> auto-closes on block children
    const doc = makeRoot(
      div(
        { id: 'outer' },
        'aaa ',
        em(inlineStyle, 'bbb ', div({ id: 'inner' }, 'nested'), ' ccc'),
        ' ddd'
      )
    );
    const line = byId(doc, 'outer');
    tokenizeLine(line);
    const inner = byId(doc, 'inner');
    tokenizeLine(inner);

    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert — descend through INLINE, then descend into nested div, then back out
    expect(collectForward(first, line)).toEqual(['aaa', 'bbb', 'nested', 'ccc', 'ddd']);
  });

  test('deeply nested blocks: <div>aaa <div>bbb <div>ccc</div> ddd</div> eee</div>', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'outer' },
        'aaa ',
        div({ id: 'mid' }, 'bbb ', div({ id: 'deep' }, 'ccc'), ' ddd'),
        ' eee'
      )
    );
    const line = byId(doc, 'outer');
    tokenizeLine(line);
    tokenizeLine(byId(doc, 'mid'));
    tokenizeLine(byId(doc, 'deep'));

    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert — CURSOR descends through both nested levels
    expect(collectForward(first, line)).toEqual(['aaa', 'bbb', 'ccc', 'ddd', 'eee']);
  });

  test('inline-block at middle of LINE', () => {
    // arrange — inline-block is also category (2)
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', span(inlineBlockStyle, 'inner'), ' bbb')
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
    // an ANCHOR inside the empty BLOCK_TRANSPARENT so the CURSOR can land on it
    const doc = makeRoot(
      div({ id: 'outer' }, 'aaa ', div({ id: 'inner' }, ''), ' bbb')
    );
    const line = byId(doc, 'outer');
    tokenizeLine(line);
    const inner = byId(doc, 'inner');
    tokenizeLine(inner);
    addAnchors(inner);

    const first = line.querySelector('.jsed-token') as HTMLElement;

    // act & assert — CURSOR should still traverse into the nested div and land on the ANCHOR
    const siblings: HTMLElement[] = [first];
    let cur: HTMLElement | null = first;
    while ((cur = getNextLineSibling(cur, line))) {
      siblings.push(cur);
    }
    // aaa, (anchor inside inner div), bbb = 3 LINE_SIBLING's
    expect(siblings.length).toBe(3);
  });
});

describe('(3) CURSOR_BOUNDARY: CURSOR visit=yes, descend=no', () => {
  // A jsed-cursor-opaque element is visited as an opaque LINE_SIBLING.
  // FOCUS can descend into it, but the CURSOR cannot.
  const cursorOpaqueBlock = { style: 'display:inline-block;', class: 'jsed-cursor-opaque' };

  test('CURSOR_BOUNDARY at middle of LINE', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', span(cursorOpaqueBlock, 'nested content'), ' bbb')
    );
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert — visited but not descended: shows as opaque element
    expect(collectForward(first)).toEqual(['aaa', '[span]', 'bbb']);
    expect(collectBackward(walkToLast(first))).toEqual(['bbb', '[span]', 'aaa']);
  });

  test('CURSOR_BOUNDARY at start of LINE', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, span(cursorOpaqueBlock, 'nested'), ' aaa bbb')
    );
    const line = byId(doc, 'p1');
    tokenizeLine(line);
    const opaque = line.querySelector('.jsed-cursor-opaque') as HTMLElement;

    // act & assert — opaque element is the first LINE_SIBLING
    expect(collectForward(opaque, line)).toEqual(['[span]', 'aaa', 'bbb']);
  });

  test('CURSOR_BOUNDARY at end of LINE', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa bbb ', span(cursorOpaqueBlock, 'nested'))
    );
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert
    expect(collectForward(first)).toEqual(['aaa', 'bbb', '[span]']);
  });

  test('CURSOR_BOUNDARY inside INLINE', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' },
        'aaa ',
        em(inlineStyle, 'bbb ', span(cursorOpaqueBlock, 'nested'), ' ccc'),
        ' ddd'
      )
    );
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert
    expect(collectForward(first)).toEqual(['aaa', 'bbb', '[span]', 'ccc', 'ddd']);
  });
});
