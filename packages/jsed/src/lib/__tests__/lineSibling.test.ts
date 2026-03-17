import { describe, test, expect } from 'vitest';
import { byId, makeRoot, div, p, em } from '../../test/util.js';
import {
  tokenizeLine,
  getNextLineSibling,
  getPreviousLineSibling,
  getLine,
  isLine,
  isInline,
  isToken
} from '../token.js';

// INLINE_COMPUTED_STYLE
const inlineStyle = { style: 'display:inline;' };

/** Collect all TOKEN text from first to last using getNextLineSibling. */
function collectForward(first: HTMLElement): string[] {
  const result: string[] = [first.textContent!.trim()];
  let cur: HTMLElement | null = first;
  while ((cur = getNextLineSibling(cur))) {
    result.push(cur.textContent!.trim());
  }
  return result;
}

/** Collect all TOKEN text from last to first using getPreviousLineSibling. */
function collectBackward(last: HTMLElement): string[] {
  const result: string[] = [last.textContent!.trim()];
  let cur: HTMLElement | null = last;
  while ((cur = getPreviousLineSibling(cur))) {
    result.push(cur.textContent!.trim());
  }
  return result;
}

/** Walk forward to the last TOKEN. */
function walkToLast(first: HTMLElement): HTMLElement {
  let cur = first;
  let next: HTMLElement | null;
  while ((next = getNextLineSibling(cur))) {
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

  test('ISLAND (katex): CURSOR skips the island', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">rendered</span>', ' bbb')
    );
    const first = tokenizeLine(byId(doc, 'p1'))!;

    // act & assert
    expect(collectForward(first)).toEqual(['aaa', 'bbb']);
    expect(collectBackward(walkToLast(first))).toEqual(['bbb', 'aaa']);
  });
});
