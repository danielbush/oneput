import { describe, test, expect, it } from 'vitest';
import {
  byId,
  makeRoot,
  div,
  p,
  em,
  span,
  inlineStyleHack,
  inlineStyleHackVal
} from '../../test/util.js';
import {
  isPadded,
  canInsertAnchorInLine,
  createToken,
  createAnchor,
  replaceText,
  getSpaceAfterTagInsertionPoint,
  insertSpaceAfterTag,
  getRemovableSpaceAfterTag,
  removeSpaceAfterTag,
  getSpaceBeforeTagInsertionPoint,
  insertSpaceBeforeTag,
  getRemovableSpaceBeforeTag,
  removeSpaceBeforeTag,
  getAnchorAfterTagInsertionPoint,
  insertAnchorAfterTag,
  getAnchorBeforeTagInsertionPoint,
  insertAnchorBeforeTag
} from '../token.js';
import { isAnchor } from '../taxonomy.js';
import { JSED_IMPLICIT_CLASS } from '../constants.js';
import { tokenizeLine } from '../tokenize.js';

describe('tokenizeLine', () => {
  test('simple LINE: <p>foo bar baz</p>', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
    const p1 = byId(doc, 'p1');

    // act
    const first = tokenizeLine(p1);

    // assert
    expect(p1).toMatchSnapshot();
    expect(first!.textContent!.trim()).toBe('foo');
  });

  test('complex LINE: <p>foo <em>bar</em> baz</p>', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'));
    const p1 = byId(doc, 'p1');

    // act
    const first = tokenizeLine(p1);

    // assert
    expect(byId(doc, 'p1')).toMatchSnapshot();
    expect(first!.textContent!.trim()).toBe('foo');
  });

  test('TOKEN after ISLAND is not yet marked padded during tokenizeLine', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const p1 = byId(doc, 'p1');

    // act
    tokenizeLine(p1);
    const tokens = p1.querySelectorAll('.jsed-token');
    const afterIsland = tokens[1] as HTMLElement;

    // assert
    expect(tokens.length).toBe(2);
    expect(isPadded(afterIsland)).toBe(false);
    expect(afterIsland.textContent).toBe('bbb');
  });

  test('TOKEN before ISLAND is not padded', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const p1 = byId(doc, 'p1');

    // act
    const first = tokenizeLine(p1)!;

    // assert
    expect(isPadded(first)).toBe(false);
    expect(first.textContent).toBe('aaa');
  });

  test('TOKEN after INLINE_FLOW is not padded', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'aaa ', em({ style: 'display:inline;' }, 'bbb'), ' ccc'));
    const p1 = byId(doc, 'p1');

    // act
    tokenizeLine(p1);
    const tokens = p1.querySelectorAll('.jsed-token');
    const lastToken = tokens[tokens.length - 1] as HTMLElement;

    // assert
    expect(isPadded(lastToken)).toBe(false);
  });

  test('ISLAND at end of LINE: no TOKEN to pad', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>')
    );
    const p1 = byId(doc, 'p1');

    // act
    tokenizeLine(p1);
    const tokens = p1.querySelectorAll('.jsed-token');

    // assert
    expect(tokens.length).toBe(1);
    expect(isPadded(tokens[0] as HTMLElement)).toBe(false);
  });

  test('TOKEN after inline-block OPAQUE_BLOCK is not padded', () => {
    // arrange — trailing text after inline-block should remain unpadded.
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', span({ style: 'display:inline-block;' }, 'inner'), ' bbb')
    );
    const p1 = byId(doc, 'p1');

    // act
    tokenizeLine(p1);
    const tokens = p1.querySelectorAll('.jsed-token');
    const afterInlineBlock = tokens[tokens.length - 1] as HTMLElement;

    // assert
    expect(afterInlineBlock.textContent).toBe('bbb');
    expect(isPadded(afterInlineBlock)).toBe(false);
  });

  test('TOKEN after TRANSPARENT_BLOCK is not padded', () => {
    // arrange — tokenization descends into TRANSPARENT_BLOCKs, so trailing
    // text stays part of the containing LINE without becoming padded.
    const doc = makeRoot(
      p(
        { id: 'p1' },
        'aaa ',
        div({ id: 'inner', class: 'jsed-cursor-transparent' }, 'inner'),
        ' bbb'
      )
    );
    const p1 = byId(doc, 'p1');

    // act
    tokenizeLine(p1);
    const tokens = p1.querySelectorAll('.jsed-token');
    const lastToken = tokens[tokens.length - 1] as HTMLElement;

    // assert
    expect(isPadded(lastToken)).toBe(false);
  });

  test('adjacent ISLANDs: TOKEN after second ISLAND is not yet marked padded during tokenizeLine', () => {
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
    const p1 = byId(doc, 'p1');

    // act
    tokenizeLine(p1);
    const tokens = p1.querySelectorAll('.jsed-token');
    const afterSecondIsland = tokens[tokens.length - 1] as HTMLElement;

    // assert
    expect(isPadded(afterSecondIsland)).toBe(false);
    expect(afterSecondIsland.textContent).toBe('bbb');
  });

  test('NESTED_LINE: <div><div>nested</div>outer</div>', () => {
    // arrange — trailing text after a TRANSPARENT_BLOCK now stays in the same
    // LINE, so tokenizeLine recurses into div2 and then tokenizes "outer" on
    // the outer LINE directly.
    const doc = makeRoot(
      div(
        { id: 'div1' }, //
        div({ id: 'div2', class: 'jsed-cursor-transparent' }, 'nested'),
        'outer'
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    const first = tokenizeLine(div1);

    // assert — first TOKEN is "nested" (inside div2), "outer" remains directly
    // under the outer LINE
    expect(first).not.toBeNull();
    expect(first!.textContent!.trim()).toBe('nested');
    expect(div1.querySelector(`.${JSED_IMPLICIT_CLASS}`)).toBeNull();
    const outerTokens = Array.from(div1.children).filter((child) =>
      child.classList.contains('jsed-token')
    );
    expect(outerTokens[0]!.textContent!.trim()).toBe('outer');
  });

  test('text before NESTED_LINE: <div>outer<div>nested</div></div>', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' }, //
        'outer',
        div({ id: 'div2', class: 'jsed-cursor-transparent' }, 'nested')
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    const first = tokenizeLine(div1);

    // assert — "outer" tokenized at div1 level, "nested" tokenized inside div2
    expect(first!.textContent!.trim()).toBe('outer');
    expect(byId(doc, 'div2').querySelector('.jsed-token')!.textContent!.trim()).toBe('nested');
  });

  test('only NESTED_LINE, no text: <div><div>nested</div></div>', () => {
    // arrange
    const doc = makeRoot(
      div({ id: 'div1' }, div({ id: 'div2', class: 'jsed-cursor-transparent' }, 'nested'))
    );
    const div1 = byId(doc, 'div1');

    // act
    const first = tokenizeLine(div1);

    // assert — recurses into div2 (TRANSPARENT_BLOCK) and tokenizes "nested"
    expect(first).not.toBeNull();
    expect(first!.textContent!.trim()).toBe('nested');
  });

  test('inline-block TRANSPARENT_BLOCK: <p>outer<span style="display:inline-block">nested</span></p>', () => {
    // arrange — inline-block span marked transparent
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        'outer',
        `<span id="span1" class="jsed-cursor-transparent" style="display:inline-block;">nested</span>`
      )
    );
    const p1 = byId(doc, 'p1');

    // act
    const first = tokenizeLine(p1);

    // assert — "outer" tokenized at p1 level, "nested" tokenized inside the span
    expect(first!.textContent!.trim()).toBe('outer');
    expect(
      doc.document.getElementById('span1')!.querySelector('.jsed-token')!.textContent!.trim()
    ).toBe('nested');
  });

  test('nested div at middle: <div>aaa <div>nested</div> bbb</div>', () => {
    // arrange — trailing text after a TRANSPARENT_BLOCK now stays directly on
    // the outer LINE rather than moving into an IMPLICIT_LINE.
    const doc = makeRoot(
      div(
        { id: 'div1' },
        'aaa ',
        div({ id: 'div2', class: 'jsed-cursor-transparent' }, 'nested'),
        ' bbb'
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    const first = tokenizeLine(div1);

    // assert — tokenizeLine should tokenize both "aaa" and "bbb" on the outer LINE
    expect(first).not.toBeNull();
    expect(first!.textContent!.trim()).toBe('aaa');
    expect(div1.querySelector(`.${JSED_IMPLICIT_CLASS}`)).toBeNull();
    const outerTokens = Array.from(div1.children).filter((child) =>
      child.classList.contains('jsed-token')
    );
    expect(outerTokens[1]!.textContent!.trim()).toBe('bbb');
  });

  describe('SHALLOW_TOKENIZATION', () => {
    test('tokenizeLine recurses into TRANSPARENT_BLOCK children', () => {
      // arrange — p1 and p2 marked transparent so tokenizeLine descends into them
      const doc = makeRoot(
        div(
          { id: 'div1' },
          p(
            { id: 'p1', class: 'jsed-cursor-transparent' },
            'foo ', //
            em(inlineStyleHack, 'bar'),
            ' baz'
          ),
          p(
            { id: 'p2', class: 'jsed-cursor-transparent' }, //
            'foo ',
            em(inlineStyleHack, 'bar'),
            ' baz'
          )
        )
      );
      const div1 = byId(doc, 'div1');

      // act
      tokenizeLine(div1);

      // assert — both p1 and p2 are TRANSPARENT_BLOCK, so both are tokenized
      expect(byId(doc, 'p1').querySelector('.jsed-token')).not.toBeNull();
      expect(byId(doc, 'p2').querySelector('.jsed-token')).not.toBeNull();
    });

    test('tokenizeLine does not recurse into OPAQUE_BLOCK children', () => {
      // arrange — p1 and p2 have no jsed-cursor-transparent class, so they are
      // OPAQUE_BLOCK by default. tokenizeLine should skip them.
      const doc = makeRoot(
        div(
          { id: 'div1' },
          p(
            { id: 'p1' },
            'foo ', //
            em(inlineStyleHack, 'bar'),
            ' baz'
          ),
          p(
            { id: 'p2' }, //
            'foo ',
            em(inlineStyleHack, 'bar'),
            ' baz'
          )
        )
      );
      const div1 = byId(doc, 'div1');

      // act
      tokenizeLine(div1);

      // assert — neither p1 nor p2 should have tokens inside them
      expect(byId(doc, 'p1').querySelector('.jsed-token')).toBeNull();
      expect(byId(doc, 'p2').querySelector('.jsed-token')).toBeNull();
    });

    test('case 2', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'div1' },
          p(
            { id: 'p1' }, //
            'foo ',
            em(inlineStyleHack, 'bar'),
            ' baz'
          ),
          p(
            { id: 'p2' }, //
            'foo ',
            em(inlineStyleHack, 'bar'),
            ' baz'
          )
        )
      );
      const p1 = byId(doc, 'p1');
      const div1 = byId(doc, 'div1');

      // act
      tokenizeLine(p1);

      // assert
      expect(div1).toMatchSnapshot('Should only tokenize p1');
    });
  });
});

describe('replaceText', () => {
  it('rewrites an existing TOKEN text node', () => {
    // arrange
    const token = createToken('foo');

    // act
    replaceText(token, 'bar');

    // assert
    expect(token.textContent).toBe('bar');
    expect(token.childNodes).toHaveLength(1);
    expect(token.firstChild?.nodeType).toBe(Node.TEXT_NODE);
  });

  it('converts an empty ANCHOR into a TOKEN with a text node', () => {
    // arrange
    const anchor = createAnchor();
    expect(anchor.childNodes).toHaveLength(0);

    // act
    replaceText(anchor, 'bar');

    // assert
    expect(isAnchor(anchor)).toBe(false);
    expect(anchor.textContent).toBe('bar');
    expect(anchor.childNodes).toHaveLength(1);
    expect(anchor.firstChild?.nodeType).toBe(Node.TEXT_NODE);
  });
});

describe('anchor LEADING_SPACE / TRAILING_SPACE insertion', () => {
  test('getSpaceAfterTagInsertionPoint skips IGNORABLE siblings and finds the next tag boundary', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');
    const strong1 = byId(doc, 'strong1');

    // act
    const insertionPoint = getSpaceAfterTagInsertionPoint(em1);

    // assert
    expect(insertionPoint).not.toBeNull();
    expect(insertionPoint?.parent).toBe(em1.parentNode);
    expect(insertionPoint?.next).toBe(strong1);
  });

  test('getSpaceAfterTagInsertionPoint returns null when whitespace already represents the gap', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');

    // act
    const insertionPoint = getSpaceAfterTagInsertionPoint(em1);

    // assert
    expect(insertionPoint).toBeNull();
  });

  test('getSpaceAfterTagInsertionPoint allows insertion before intervening text with no leading space', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em>bar<strong id="strong1" style="${inlineStyleHackVal}">baz</strong></p>`
    );
    const em1 = byId(doc, 'em1');

    // act
    const insertionPoint = getSpaceAfterTagInsertionPoint(em1);

    // assert
    expect(insertionPoint).not.toBeNull();
    expect(insertionPoint?.next?.nodeType).toBe(Node.TEXT_NODE);
    expect(insertionPoint?.next?.textContent).toBe('bar');
  });

  test('insertSpaceAfterTag inserts a whitespace text node before the next tag', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');
    const strong1 = byId(doc, 'strong1');

    // act
    const space = insertSpaceAfterTag(em1);

    // assert
    expect(space).not.toBeNull();
    expect(strong1.previousSibling).toBe(space);
    expect(space?.nodeType).toBe(Node.TEXT_NODE);
    expect(space?.textContent).toBe(' ');
  });

  test('insertSpaceAfterTag inserts a whitespace text node before intervening text', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em>bar<strong id="strong1" style="${inlineStyleHackVal}">baz</strong></p>`
    );
    const em1 = byId(doc, 'em1');
    const strong1 = byId(doc, 'strong1');

    // act
    const space = insertSpaceAfterTag(em1);

    // assert
    expect(space).not.toBeNull();
    expect(space?.nodeType).toBe(Node.TEXT_NODE);
    expect(space?.textContent).toBe(' ');
    expect(space?.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
    expect(space?.nextSibling?.textContent).toBe('bar');
    expect(strong1.previousSibling?.textContent).toBe('bar');
  });

  test('getRemovableSpaceAfterTag finds boundary whitespace between adjacent tags', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');

    // act
    const removable = getRemovableSpaceAfterTag(em1);

    // assert
    expect(removable).not.toBeNull();
    expect(removable?.textContent).toBe(' ');
  });

  test('removeSpaceAfterTag removes boundary whitespace between adjacent tags', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');
    const strong1 = byId(doc, 'strong1');

    // act
    const result = removeSpaceAfterTag(em1);

    // assert
    expect(result).toBe(true);
    expect(strong1.previousSibling).toBe(em1);
  });

  test('removeSpaceAfterTag removes leading whitespace from intervening text', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> bar<strong id="strong1" style="${inlineStyleHackVal}">baz</strong></p>`
    );
    const em1 = byId(doc, 'em1');
    const strong1 = byId(doc, 'strong1');

    // act
    const result = removeSpaceAfterTag(em1);

    // assert
    expect(result).toBe(true);
    expect(em1.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
    expect(em1.nextSibling?.textContent).toBe('bar');
    expect(strong1.previousSibling?.textContent).toBe('bar');
  });

  test('getSpaceBeforeTagInsertionPoint skips IGNORABLE siblings and finds the previous tag boundary', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const strong1 = byId(doc, 'strong1');
    const em1 = byId(doc, 'em1');

    // act
    const insertionPoint = getSpaceBeforeTagInsertionPoint(strong1);

    // assert
    expect(insertionPoint).not.toBeNull();
    expect(insertionPoint?.parent).toBe(strong1.parentNode);
    expect(insertionPoint?.previous).toBe(em1);
  });

  test('getSpaceBeforeTagInsertionPoint returns null when whitespace already represents the gap', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const insertionPoint = getSpaceBeforeTagInsertionPoint(strong1);

    // assert
    expect(insertionPoint).toBeNull();
  });

  test('getSpaceBeforeTagInsertionPoint allows insertion after intervening text with no trailing space', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em>bar<strong id="strong1" style="${inlineStyleHackVal}">baz</strong></p>`
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const insertionPoint = getSpaceBeforeTagInsertionPoint(strong1);

    // assert
    expect(insertionPoint).not.toBeNull();
    expect(insertionPoint?.previous?.nodeType).toBe(Node.TEXT_NODE);
    expect(insertionPoint?.previous?.textContent).toBe('bar');
  });

  test('insertSpaceBeforeTag inserts a whitespace text node after the previous tag', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const space = insertSpaceBeforeTag(strong1);

    // assert
    expect(space).not.toBeNull();
    expect(strong1.previousSibling).toBe(space);
    expect(space?.nodeType).toBe(Node.TEXT_NODE);
    expect(space?.textContent).toBe(' ');
  });

  test('insertSpaceBeforeTag inserts a whitespace text node after intervening text', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em>bar<strong id="strong1" style="${inlineStyleHackVal}">baz</strong></p>`
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const space = insertSpaceBeforeTag(strong1);

    // assert
    expect(space).not.toBeNull();
    expect(space?.nodeType).toBe(Node.TEXT_NODE);
    expect(space?.textContent).toBe(' ');
    expect(strong1.previousSibling).toBe(space);
    expect(space?.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
    expect(space?.previousSibling?.textContent).toBe('bar');
  });

  test('getRemovableSpaceBeforeTag finds boundary whitespace between adjacent tags', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const removable = getRemovableSpaceBeforeTag(strong1);

    // assert
    expect(removable).not.toBeNull();
    expect(removable?.textContent).toBe(' ');
  });

  test('removeSpaceBeforeTag removes boundary whitespace between adjacent tags', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');
    const strong1 = byId(doc, 'strong1');

    // act
    const result = removeSpaceBeforeTag(strong1);

    // assert
    expect(result).toBe(true);
    expect(strong1.previousSibling).toBe(em1);
  });

  test('removeSpaceBeforeTag removes trailing whitespace from intervening text', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em>bar <strong id="strong1" style="${inlineStyleHackVal}">baz</strong></p>`
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const result = removeSpaceBeforeTag(strong1);

    // assert
    expect(result).toBe(true);
    expect(strong1.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
    expect(strong1.previousSibling?.textContent).toBe('bar');
  });
});

describe('anchor insertion', () => {
  test('getAnchorBeforeTagInsertionPoint skips IGNORABLE siblings and finds the previous tag boundary', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const strong1 = byId(doc, 'strong1');
    const em1 = byId(doc, 'em1');

    // act
    const insertionPoint = getAnchorBeforeTagInsertionPoint(strong1);

    // assert
    expect(insertionPoint).not.toBeNull();
    expect(insertionPoint?.parent).toBe(strong1.parentNode);
    expect(insertionPoint?.previous).toBe(em1);
  });

  test('getAnchorBeforeTagInsertionPoint returns null when text already represents the gap', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> gap <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const insertionPoint = getAnchorBeforeTagInsertionPoint(strong1);

    // assert
    expect(insertionPoint).toBeNull();
  });

  test('anchor insertion points return null for LINEs', () => {
    // arrange
    const doc = makeRoot('<div id="div1"><p id="p1">foo</p><p id="p2">bar</p></div>');
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');

    // act
    const afterPoint = getAnchorAfterTagInsertionPoint(p1);
    const beforePoint = getAnchorBeforeTagInsertionPoint(p2);

    // assert
    expect(afterPoint).toBeNull();
    expect(beforePoint).toBeNull();
  });

  test('canInsertAnchorInLine ignores IGNORABLE content inside an otherwise empty LINE', () => {
    // arrange
    const doc = makeRoot(`<p id="p1"><span class="jsed-ignore">debug label</span></p>`);
    const p1 = byId(doc, 'p1');

    // act
    const result = canInsertAnchorInLine(p1);

    // assert
    expect(result).toBe(true);
  });

  test('getAnchorBeforeTagInsertionPoint allows insertion after existing whitespace', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const insertionPoint = getAnchorBeforeTagInsertionPoint(strong1);

    // assert
    expect(insertionPoint).not.toBeNull();
    expect(insertionPoint?.previous?.nodeType).toBe(Node.TEXT_NODE);
    expect(insertionPoint?.previous?.textContent).toBe(' ');
  });

  test('getAnchorAfterTagInsertionPoint skips IGNORABLE siblings and finds the next tag boundary', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');
    const strong1 = byId(doc, 'strong1');

    // act
    const insertionPoint = getAnchorAfterTagInsertionPoint(em1);

    // assert
    expect(insertionPoint).not.toBeNull();
    expect(insertionPoint?.parent).toBe(em1.parentNode);
    expect(insertionPoint?.next).toBe(strong1);
  });

  test('getAnchorAfterTagInsertionPoint returns null when text already represents the gap', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> gap <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');

    // act
    const insertionPoint = getAnchorAfterTagInsertionPoint(em1);

    // assert
    expect(insertionPoint).toBeNull();
  });

  test('getAnchorAfterTagInsertionPoint allows insertion before existing whitespace', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');

    // act
    const insertionPoint = getAnchorAfterTagInsertionPoint(em1);

    // assert
    expect(insertionPoint).not.toBeNull();
    expect(insertionPoint?.next?.nodeType).toBe(Node.TEXT_NODE);
    expect(insertionPoint?.next?.textContent).toBe(' ');
  });

  test('insertAnchorAfterTag inserts an anchor at the boundary before the next tag', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');
    const strong1 = byId(doc, 'strong1');

    // act
    const anchor = insertAnchorAfterTag(em1);

    // assert
    expect(anchor).not.toBeNull();
    expect(strong1.previousElementSibling).toBe(anchor);
    expect(anchor?.classList.contains('jsed-token')).toBe(true);
    expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
  });

  test('insertAnchorAfterTag inserts an anchor at end of siblings when there is no next tag', () => {
    // arrange
    const doc = makeRoot(`<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em></p>`);
    const em1 = byId(doc, 'em1');

    // act
    const anchor = insertAnchorAfterTag(em1);

    // assert
    expect(anchor).not.toBeNull();
    expect(em1.nextElementSibling).toBe(anchor);
    expect(anchor?.classList.contains('jsed-token')).toBe(true);
    expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
  });

  test('insertAnchorAfterTag inserts an anchor before existing whitespace', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');

    // act
    const anchor = insertAnchorAfterTag(em1);

    // assert
    expect(anchor).not.toBeNull();
    expect(em1.nextElementSibling).toBe(anchor);
    expect(anchor?.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
    expect(anchor?.nextSibling?.textContent).toBe(' ');
  });

  test('insertAnchorBeforeTag inserts an anchor at the boundary after the previous tag', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    // const em1 = byId(doc, 'em1');
    const strong1 = byId(doc, 'strong1');

    // act
    const anchor = insertAnchorBeforeTag(strong1);

    // assert
    expect(anchor).not.toBeNull();
    expect(strong1.previousElementSibling).toBe(anchor);
    expect(anchor?.classList.contains('jsed-token')).toBe(true);
    expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
  });

  test('insertAnchorBeforeTag inserts an anchor at start of siblings when there is no previous tag', () => {
    // arrange
    const doc = makeRoot(`<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em></p>`);
    const em1 = byId(doc, 'em1');

    // act
    const anchor = insertAnchorBeforeTag(em1);

    // assert
    expect(anchor).not.toBeNull();
    expect(em1.previousElementSibling).toBe(anchor);
    expect(anchor?.classList.contains('jsed-token')).toBe(true);
    expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
  });

  test('insertAnchorBeforeTag inserts an anchor after existing whitespace', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const anchor = insertAnchorBeforeTag(strong1);

    // assert
    expect(anchor).not.toBeNull();
    expect(anchor?.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
    expect(anchor?.previousSibling?.textContent).toBe(' ');
    expect(anchor?.nextElementSibling).toBe(strong1);
  });
});
