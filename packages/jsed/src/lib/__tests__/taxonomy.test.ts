import { describe, test, expect } from 'vitest';
import { byId, makeRoot, div, p, em } from '../../test/util.js';
import { isFocusable, isIgnorable, isInlineFlow, isLine, isToken } from '../taxonomy.js';
import { tokenizeLineAt } from '../tokenize.js';

const inlineStyle = { style: 'display:inline;' };

describe('isToken', () => {
  test('TOKEN after tokenization: returns true', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'hello'));
    tokenizeLineAt(byId(doc, 'p1'));
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

  test('INLINE_FLOW (em): returns false', () => {
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

describe('isInlineFlow', () => {
  test('em with display:inline: returns true', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, em(inlineStyle, 'text')));
    const emEl = byId(doc, 'p1').querySelector('em')!;

    // act & assert
    expect(isInlineFlow(emEl)).toBe(true);
  });

  test('inline-block: returns false (narrow check)', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, '<span id="ib" style="display:inline-block;">chip</span>')
    );
    const ib = byId(doc, 'ib');

    // act & assert
    expect(isInlineFlow(ib)).toBe(false);
  });

  test('ISLAND (katex with display:inline): returns true (pure — no island check)', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, '<span class="katex" style="display:inline;">x²</span>'));
    const katex = byId(doc, 'p1').querySelector('.katex')!;

    // act & assert — isInlineFlow is pure display, so islands with inline display return true
    expect(isInlineFlow(katex)).toBe(true);
  });

  test('implicit-line span: returns true (pure — no class check)', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'outer' },
        div({ id: 'inner' }, 'first line'),
        '<span class="jsed-implicit-line" style="display:inline;">second line</span>'
      )
    );
    const implicit = byId(doc, 'outer').querySelector('.jsed-implicit-line')!;

    // act & assert — isInlineFlow doesn't check classes
    expect(isInlineFlow(implicit)).toBe(true);
  });

  test('floated span with display:inline: returns false', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, '<span style="float:left; display:inline;">floated</span>')
    );
    const floated = byId(doc, 'p1').querySelector('span')!;

    // act & assert — float pulls element out of normal flow
    expect(isInlineFlow(floated)).toBe(false);
  });

  test('block element (div): returns false', () => {
    // arrange
    const doc = makeRoot(div({ id: 'outer' }, div({ id: 'inner' }, 'text')));

    // act & assert
    expect(isInlineFlow(byId(doc, 'inner'))).toBe(false);
  });

  test('null: returns false', () => {
    expect(isInlineFlow(null)).toBe(false);
  });
});

describe('isIgnorable', () => {
  test('directly flagged element: returns true', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, '<span id="ignore" class="jsed-ignore"></span>'));
    const ignore = byId(doc, 'ignore');

    // act & assert
    expect(isIgnorable(ignore)).toBe(true);
  });

  test('descendant of a flagged ancestor: returns true', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' },
        '<span class="jsed-ignore"><em id="inner" style="display:inline;">debug</em></span>'
      )
    );
    const inner = byId(doc, 'inner');

    // act & assert
    expect(isIgnorable(inner)).toBe(true);
  });
});

describe('isFocusable', () => {
  test('descendant of a flagged ancestor: returns false', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' },
        '<span class="jsed-ignore"><em id="inner" style="display:inline;">debug</em></span>'
      )
    );
    const inner = byId(doc, 'inner');

    // act & assert
    expect(isFocusable(inner)).toBe(false);
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
    tokenizeLineAt(byId(doc, 'p1'));
    const token = byId(doc, 'p1').querySelector('.jsed-token')!;

    // act & assert
    expect(isLine(token)).toBe(false);
  });

  test('INLINE_FLOW (em): returns false', () => {
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
