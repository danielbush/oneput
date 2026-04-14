import { describe, test, expect, it } from 'vitest';
import {
  byId,
  em,
  frag,
  inlineStyleHack,
  inlineStyleHackVal,
  makeRoot,
  p,
  s,
  strong,
  t
} from '../../test/util.js';
import {
  canInsertAnchorInLine,
  createToken,
  createAnchor,
  replaceText,
  getRemovableSpaceAfterToken,
  canInsertSpaceAfterTag,
  insertSpaceAfterTag,
  removeSpaceAfterToken,
  getRemovableSpaceBeforeToken,
  getRemovableSpaceAfterTag,
  removeSpaceAfterTag,
  canInsertSpaceBeforeTag,
  insertSpaceBeforeTag,
  getRemovableSpaceBeforeTag,
  removeSpaceBeforeToken,
  removeSpaceBeforeTag,
  getAnchorAfterTagInsertionPoint,
  insertAnchorAfterTag,
  getRemovableAnchorAfterTag,
  removeAnchorAfterTag,
  getAnchorBeforeTagInsertionPoint,
  insertAnchorBeforeTag,
  getRemovableAnchorBeforeTag,
  removeAnchorBeforeTag
} from '../token.js';
import { isAnchor } from '../taxonomy.js';

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

describe('token LEADING_SPACE / TRAILING_SPACE removal', () => {
  test('removeSpaceBeforeToken removes boundary whitespace before a TOKEN', () => {
    // arrange
    const doc = makeRoot(
      frag(
        p(
          { id: 'p1' },
          em({ id: 'em1', ...inlineStyleHack }, 'foo'),
          s(),
          t('bar'),
          strong({ id: 'strong1', ...inlineStyleHack }, 'baz')
        )
      )
    );
    const tokenBar = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
      (el) => el.textContent === 'bar'
    ) as HTMLElement;

    // act
    const removable = getRemovableSpaceBeforeToken(tokenBar);
    const result = removeSpaceBeforeToken(tokenBar);

    // assert
    expect(removable?.textContent).toBe(' ');
    expect(result).toBe(true);
    expect(tokenBar.previousSibling?.nodeType).not.toBe(Node.TEXT_NODE);
  });

  test('removeSpaceAfterToken removes boundary whitespace after a TOKEN', () => {
    // arrange
    const doc = makeRoot(
      frag(
        p(
          { id: 'p1' },
          em({ id: 'em1', ...inlineStyleHack }, 'foo'),
          t('bar'),
          s(),
          strong({ id: 'strong1', ...inlineStyleHack }, 'baz')
        )
      )
    );
    const tokenBar = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
      (el) => el.textContent === 'bar'
    ) as HTMLElement;

    // act
    const removable = getRemovableSpaceAfterToken(tokenBar);
    const result = removeSpaceAfterToken(tokenBar);

    // assert
    expect(removable?.textContent).toBe(' ');
    expect(result).toBe(true);
    expect(tokenBar.nextSibling?.nodeType).not.toBe(Node.TEXT_NODE);
  });
});

describe('anchor LEADING_SPACE / TRAILING_SPACE insertion', () => {
  test('canInsertSpaceAfterTag skips IGNORABLE siblings and finds the next tag boundary', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');
    // act
    const canInsert = canInsertSpaceAfterTag(em1);

    // assert
    expect(canInsert).toBe(true);
  });

  test('canInsertSpaceAfterTag returns false when whitespace already represents the gap', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');

    // act
    const canInsert = canInsertSpaceAfterTag(em1);

    // assert
    expect(canInsert).toBe(false);
  });

  test('canInsertSpaceAfterTag allows insertion before intervening text with no leading space', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em>bar<strong id="strong1" style="${inlineStyleHackVal}">baz</strong></p>`
    );
    const em1 = byId(doc, 'em1');

    // act
    const canInsert = canInsertSpaceAfterTag(em1);

    // assert
    expect(canInsert).toBe(true);
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
      frag(
        p(
          { id: 'p1' },
          em({ id: 'em1', ...inlineStyleHack }, 'foo'),
          s(),
          strong({ id: 'strong1', ...inlineStyleHack }, 'bar')
        )
      )
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
      frag(
        p(
          { id: 'p1' },
          em({ id: 'em1', ...inlineStyleHack }, 'foo'),
          s(),
          t('bar'),
          strong({ id: 'strong1', ...inlineStyleHack }, 'baz')
        )
      )
    );
    const em1 = byId(doc, 'em1');
    const strong1 = byId(doc, 'strong1');

    // act
    const result = removeSpaceAfterTag(em1);

    // assert
    expect(result).toBe(true);
    expect((em1.nextSibling as HTMLElement | null)?.classList.contains('jsed-token')).toBe(true);
    expect((em1.nextSibling as HTMLElement | null)?.textContent).toBe('bar');
    expect(strong1.previousSibling?.textContent).toBe('bar');
  });

  test('canInsertSpaceBeforeTag skips IGNORABLE siblings and finds the previous tag boundary', () => {
    // arrange
    const doc = makeRoot(
      frag(
        p(
          { id: 'p1' },
          em({ id: 'em1', ...inlineStyleHack }, 'foo'),
          '<span class="jsed-ignore"></span>',
          strong({ id: 'strong1', ...inlineStyleHack }, 'bar')
        )
      )
    );
    const strong1 = byId(doc, 'strong1');
    // act
    const canInsert = canInsertSpaceBeforeTag(strong1);

    // assert
    expect(canInsert).toBe(true);
  });

  test('canInsertSpaceBeforeTag returns false when whitespace already represents the gap', () => {
    // arrange
    const doc = makeRoot(
      frag(
        p(
          { id: 'p1' },
          em({ id: 'em1', ...inlineStyleHack }, 'foo'),
          s(),
          strong({ id: 'strong1', ...inlineStyleHack }, 'bar')
        )
      )
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const canInsert = canInsertSpaceBeforeTag(strong1);

    // assert
    expect(canInsert).toBe(false);
  });

  test('canInsertSpaceBeforeTag allows insertion after intervening text with no trailing space', () => {
    // arrange
    const doc = makeRoot(
      frag(
        p(
          { id: 'p1' },
          em({ id: 'em1', ...inlineStyleHack }, 'foo'),
          t('bar'),
          strong({ id: 'strong1', ...inlineStyleHack }, 'baz')
        )
      )
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const canInsert = canInsertSpaceBeforeTag(strong1);

    // assert
    expect(canInsert).toBe(true);
  });

  test('insertSpaceBeforeTag inserts a whitespace text node after the previous tag', () => {
    // arrange
    const doc = makeRoot(
      frag(
        p(
          { id: 'p1' },
          em({ id: 'em1', ...inlineStyleHack }, 'foo'),
          '<span class="jsed-ignore"></span>',
          strong({ id: 'strong1', ...inlineStyleHack }, 'bar')
        )
      )
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
      frag(
        p(
          { id: 'p1' },
          em({ id: 'em1', ...inlineStyleHack }, 'foo'),
          t('bar'),
          strong({ id: 'strong1', ...inlineStyleHack }, 'baz')
        )
      )
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const space = insertSpaceBeforeTag(strong1);

    // assert
    expect(space).not.toBeNull();
    expect(space?.nodeType).toBe(Node.TEXT_NODE);
    expect(space?.textContent).toBe(' ');
    expect(strong1.previousSibling).toBe(space);
    expect((space?.previousSibling as HTMLElement | null)?.classList.contains('jsed-token')).toBe(
      true
    );
    expect((space?.previousSibling as HTMLElement | null)?.textContent).toBe('bar');
  });

  test('getRemovableSpaceBeforeTag finds boundary whitespace between adjacent tags', () => {
    // arrange
    const doc = makeRoot(
      frag(
        p(
          { id: 'p1' },
          em({ id: 'em1', ...inlineStyleHack }, 'foo'),
          s(),
          strong({ id: 'strong1', ...inlineStyleHack }, 'bar')
        )
      )
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
      frag(
        p(
          { id: 'p1' },
          em({ id: 'em1', ...inlineStyleHack }, 'foo'),
          s(),
          strong({ id: 'strong1', ...inlineStyleHack }, 'bar')
        )
      )
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
      frag(
        p(
          { id: 'p1' },
          em({ id: 'em1', ...inlineStyleHack }, 'foo'),
          t('bar'),
          s(),
          strong({ id: 'strong1', ...inlineStyleHack }, 'baz')
        )
      )
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const result = removeSpaceBeforeTag(strong1);

    // assert
    expect(result).toBe(true);
    expect((strong1.previousSibling as HTMLElement | null)?.classList.contains('jsed-token')).toBe(
      true
    );
    expect((strong1.previousSibling as HTMLElement | null)?.textContent).toBe('bar');
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

  test('getRemovableAnchorAfterTag finds an anchor at the immediate boundary', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em><span class="jsed-token jsed-anchor-token"></span><strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');

    // act
    const anchor = getRemovableAnchorAfterTag(em1);

    // assert
    expect(anchor).not.toBeNull();
    expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
  });

  test('getRemovableAnchorAfterTag finds an anchor after existing whitespace', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> <span class="jsed-token jsed-anchor-token"></span><strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');

    // act
    const anchor = getRemovableAnchorAfterTag(em1);

    // assert
    expect(anchor).not.toBeNull();
    expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
  });

  test('removeAnchorAfterTag removes the anchor and preserves whitespace', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em> <span class="jsed-token jsed-anchor-token"></span><strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');
    const strong1 = byId(doc, 'strong1');

    // act
    const removed = removeAnchorAfterTag(em1);

    // assert
    expect(removed).not.toBeNull();
    expect(em1.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
    expect(em1.nextSibling?.textContent).toBe(' ');
    expect(em1.nextSibling?.nextSibling).toBe(strong1);
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

  test('getRemovableAnchorBeforeTag finds an anchor at the immediate boundary', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em><span class="jsed-token jsed-anchor-token"></span><strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const anchor = getRemovableAnchorBeforeTag(strong1);

    // assert
    expect(anchor).not.toBeNull();
    expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
  });

  test('getRemovableAnchorBeforeTag finds an anchor before existing whitespace', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em><span class="jsed-token jsed-anchor-token"></span> <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const strong1 = byId(doc, 'strong1');

    // act
    const anchor = getRemovableAnchorBeforeTag(strong1);

    // assert
    expect(anchor).not.toBeNull();
    expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
  });

  test('removeAnchorBeforeTag removes the anchor and preserves whitespace', () => {
    // arrange
    const doc = makeRoot(
      `<p id="p1"><em id="em1" style="${inlineStyleHackVal}">foo</em><span class="jsed-token jsed-anchor-token"></span> <strong id="strong1" style="${inlineStyleHackVal}">bar</strong></p>`
    );
    const em1 = byId(doc, 'em1');
    const strong1 = byId(doc, 'strong1');

    // act
    const removed = removeAnchorBeforeTag(strong1);

    // assert
    expect(removed).not.toBeNull();
    expect(em1.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
    expect(em1.nextSibling?.textContent).toBe(' ');
    expect(strong1.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
    expect(strong1.previousSibling?.textContent).toBe(' ');
  });
});
