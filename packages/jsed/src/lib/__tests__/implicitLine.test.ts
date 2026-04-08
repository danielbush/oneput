import { describe, expect, test } from 'vitest';
import {
  byId,
  div,
  em,
  inlineStyleHack,
  inlineStyleHackVal,
  makeRoot,
  p,
  span
} from '../../test/util';
import { tagImplicitLines } from '../implicitLine';
import { JSED_IMPLICIT_CLASS } from '../constants';

describe('IMPLICIT_LINE creation', () => {
  test('text after a LINE is wrapped', () => {
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
        'this is the IMPLICIT_LINE'
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).not.toBeNull();
    expect(implicit!.tagName).toBe('SPAN');
    expect(implicit!.textContent).toBe('this is the IMPLICIT_LINE');
  });

  test('slurps up adjacent INLINE_FLOW', () => {
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
        `this is the <em id="em2" style="${inlineStyleHackVal}">implicit</em> line`
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).not.toBeNull();
    expect(implicit!.textContent).toBe('this is the implicit line');
    expect(implicit!.querySelector('#em2')).not.toBeNull();
  });

  test('starting with an INLINE_FLOW', () => {
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
        `<em id="em2" style="${inlineStyleHackVal}">implicit</em> line`
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).not.toBeNull();
    expect(implicit!.textContent).toBe('implicit line');
    expect(implicit!.querySelector('#em2')).not.toBeNull();
  });

  test('br tags are INLINE_FLOW — absorbed into one IMPLICIT_LINE; hr is block — creates a new one', () => {
    // br tags are inline so buildImplicitLine slurps them along with adjacent
    // text into a single IMPLICIT_LINE. An <hr> is block-level (a LINE), so it
    // stops the slurp and text after the <hr> becomes a second IMPLICIT_LINE.
    //
    // br tags need INLINE_COMPUTED_STYLE because jsdom returns empty display for <br>
    const br = `<br style="display:inline">`;
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'A paragraph.'),
        `First sentence.${br}Second sentence.${br}Third sentence.<hr>After the rule.`
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicits = byId(doc, 'div1').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicits.length).toBe(2);

    // First IMPLICIT_LINE: text and br's before the <hr>
    expect(implicits[0].textContent).toBe('First sentence.Second sentence.Third sentence.');
    expect(implicits[0].querySelectorAll('br').length).toBe(2);

    // Second IMPLICIT_LINE: text after the <hr>
    expect(implicits[1].textContent).toBe('After the rule.');
  });

  test('text after a floated LINE is wrapped', () => {
    // arrange — a floated span is not INLINE_FLOW (float excludes it), so it's a LINE.
    // Browsers blockify floated elements (computed display becomes block),
    // so trailing text should be wrapped in IMPLICIT_LINE.
    const doc = makeRoot(
      div({ id: 'div1' }, 'aaa ', span({ style: 'float:left;' }, 'floated'), ' bbb')
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).not.toBeNull();
    expect(implicit!.textContent!.trim()).toBe('bbb');
  });

  test('text after a block-level ISLAND is wrapped', () => {
    // arrange — a katex span with display:block is an ISLAND, not a LINE.
    // tagImplicitLines should still wrap trailing text so it's reachable by FOCUS.
    const doc = makeRoot(
      div({ id: 'div1' }, 'aaa ', '<span class="katex" style="display:block;">x²</span>', ' bbb')
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).not.toBeNull();
    expect(implicit!.textContent!.trim()).toBe('bbb');
  });

  test('text after an inline ISLAND is not wrapped', () => {
    // arrange — an inline katex span sits on the same visual line as surrounding text.
    // No IMPLICIT_LINE should be created.
    const doc = makeRoot(
      div({ id: 'div1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).toBeNull();
  });

  test('text after a TRANSPARENT_BLOCK is not wrapped', () => {
    // arrange — a TRANSPARENT_BLOCK stays part of the containing LINE for
    // trailing text purposes, so no IMPLICIT_LINE is created.
    const doc = makeRoot(
      div({ id: 'div1' }, div({ id: 'div2', class: 'jsed-cursor-transparent' }, 'nested'), ' bbb')
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).toBeNull();
  });

  test('text after an inline-block TRANSPARENT_BLOCK is not wrapped', () => {
    // arrange — TRANSPARENT_BLOCK wins here too, so trailing text stays on the
    // same LINE instead of being moved into an IMPLICIT_LINE.
    const doc = makeRoot(
      div(
        { id: 'div1' },
        'aaa ',
        div(
          { id: 'div2', class: 'jsed-cursor-transparent', style: 'display:inline-block;' },
          'nested'
        ),
        ' bbb'
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).toBeNull();
  });

  test('text after a normal block (OPAQUE_BLOCK) is wrapped', () => {
    // arrange — a plain div with no transparent class is an OPAQUE_BLOCK.
    // Trailing text should be wrapped in IMPLICIT_LINE.
    const doc = makeRoot(div({ id: 'div1' }, div({ id: 'div2' }, 'nested'), ' bbb'));

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).not.toBeNull();
    expect(implicit!.textContent!.trim()).toBe('bbb');
  });

  test('text after an inline-block (OPAQUE_BLOCK) is wrapped', () => {
    // arrange — inline-block is not INLINE_FLOW, so trailing text gets
    // an IMPLICIT_LINE even though it's visually inline.
    const doc = makeRoot(
      div(
        { id: 'div1' },
        'aaa ',
        div({ id: 'div2', style: 'display:inline-block;' }, 'nested'),
        ' bbb'
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).not.toBeNull();
    expect(implicit!.textContent!.trim()).toBe('bbb');
  });

  test("whitespace-only text between LINE's is ignored", () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' }, //
        p({ id: 'p1' }, 'foo'),
        ' ',
        p({ id: 'p2' }, 'foo')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).toBeNull();
    expect(byId(doc, 'p1').nextSibling).toHaveProperty('nodeType', 3);
  });
});
