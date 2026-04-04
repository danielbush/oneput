import { describe, test, expect } from 'vitest';
import { byId, makeRoot, div, p, em, span } from '../../test/util.js';
import { tokenizeLine, tagImplicitLines, isPadded } from '../token.js';
import { JSED_IMPLICIT_CLASS } from '../constants.js';

/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyleHack = { style: 'display:inline;' };
/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyleHackVal = 'display:inline;';

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
