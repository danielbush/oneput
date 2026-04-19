import { describe, test, expect } from 'vitest';
import { byId, makeRoot, div, p, em, strong, span, inlineStyleHack } from '../../test/util.js';
import {
  detokenizeLine,
  collectLooseTextNodesIn,
  tokenizeLine,
  tokenizeLooseLinesAround,
  tokenizeLooseLinesIn
} from '../tokenize.js';
import { JSED_IMPLICIT_CLASS } from '../constants.js';

describe('tokenizeLine', () => {
  test('simple LINE: <p>foo bar baz</p>', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
    const p1 = byId(doc, 'p1');

    // act
    const first = tokenizeLine(p1);

    // assert
    expect(first!.textContent!.trim()).toBe('foo');
    const tokens = Array.from(p1.querySelectorAll('.jsed-token'));
    expect(tokens.map((token) => token.textContent)).toEqual(['foo', 'bar', 'baz']);
    expect(p1.childNodes).toHaveLength(5);
    expect(p1.childNodes[0]).toBe(tokens[0]);
    expect(p1.childNodes[2]).toBe(tokens[1]);
    expect(p1.childNodes[4]).toBe(tokens[2]);
    expect(p1.childNodes[1]?.nodeType).toBe(Node.TEXT_NODE);
    expect(p1.childNodes[1]?.textContent).toBe(' ');
    expect(p1.childNodes[3]?.nodeType).toBe(Node.TEXT_NODE);
    expect(p1.childNodes[3]?.textContent).toBe(' ');
  });

  test('complex LINE: <p>foo <em>bar</em> baz</p>', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'));
    const p1 = byId(doc, 'p1');

    // act
    const first = tokenizeLine(p1);

    // assert
    expect(first!.textContent!.trim()).toBe('foo');
    const directTokens = Array.from(p1.children).filter((child) =>
      child.classList.contains('jsed-token')
    );
    expect(directTokens.map((token) => token.textContent)).toEqual(['foo', 'baz']);
    expect(p1.childNodes[1]?.nodeType).toBe(Node.TEXT_NODE);
    expect(p1.childNodes[1]?.textContent).toBe(' ');
    const em1 = p1.querySelector('em') as HTMLElement;
    expect(em1.querySelectorAll('.jsed-token')).toHaveLength(1);
    expect(em1.querySelector('.jsed-token')?.textContent).toBe('bar');
    expect(p1.childNodes[3]?.nodeType).toBe(Node.TEXT_NODE);
    expect(p1.childNodes[3]?.textContent).toBe(' ');
  });

  test('TOKEN after ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        'aaa ',
        '<span class="katex" style="display:inline;">x²</span>',
        ' bbb'
      )
    );
    const p1 = byId(doc, 'p1');

    // act
    const first = tokenizeLine(p1);
    const tokens = p1.querySelectorAll('.jsed-token');
    const afterIsland = tokens[1] as HTMLElement;

    // assert
    expect(first!.textContent!.trim()).toBe('aaa');
    expect(tokens.length).toBe(2);
    expect(afterIsland.textContent).toBe('bbb');
  });

  test('ISLAND as first LINE_SIBLING', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const p1 = byId(doc, 'p1');

    // act
    const first = tokenizeLine(p1)!;

    // assert
    expect(first.textContent).toBe('x²');
  });

  test('em around ISLAND as first LINE_SIBLING', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' },
        em(inlineStyleHack, '<span class="katex" style="display:inline;">x²</span>'),
        ' bbb'
      )
    );
    const p1 = byId(doc, 'p1');

    // act
    const first = tokenizeLine(p1)!;

    // assert
    expect(first.textContent).toBe('x²');
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

    test('tokenizing one OPAQUE_BLOCK does not tokenize sibling OPAQUE_BLOCKs', () => {
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
      expect(p1.querySelectorAll('.jsed-token')).toHaveLength(3);
      expect(
        Array.from(p1.querySelectorAll('.jsed-token')).map((token) => token.textContent)
      ).toEqual(['foo', 'bar', 'baz']);
      expect(byId(doc, 'p2').querySelector('.jsed-token')).toBeNull();
      expect(div1.querySelectorAll('.jsed-token')).toHaveLength(3);
    });
  });
});

describe('findLooseLinesIn', () => {
  test('returns one run of text nodes per LOOSE_LINE, ignores text before any LINE', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        'aaa bbb',
        p({ id: 'p1' }, 'ignored'),
        ' first second third ',
        p({ id: 'p2' }, 'ignored'),
        ' fourth fifth '
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    const runs = collectLooseTextNodesIn(div1);

    // assert
    expect(runs.map((run) => run.map((n) => n.nodeValue?.trim()))).toEqual([
      ['first second third'],
      ['fourth fifth']
    ]);
    expect(runs.flat().every((n) => n.nodeType === Node.TEXT_NODE)).toBe(true);
  });

  test('handle INLINE_FLOW: descends into em and collects its text alongside sibling text', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        'aaa',
        p({ id: 'p1' }, 'ignored'),
        em({ ...inlineStyleHack, id: 'em1' }, 'first'),
        ' second third ',
        p({ id: 'p2' }, 'ignored'),
        ' fourth fifth '
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    const runs = collectLooseTextNodesIn(div1);

    // assert
    expect(runs.map((run) => run.map((n) => n.nodeValue?.trim()))).toEqual([
      ['first', 'second third'],
      ['fourth fifth']
    ]);
    expect(runs.flat().every((n) => n.nodeType === Node.TEXT_NODE)).toBe(true);
  });

  test('handle nested INLINE_FLOW', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        'aaa',
        p({ id: 'p1' }, 'ignored'),
        em(
          { ...inlineStyleHack, id: 'em1' }, //
          'first',
          strong({ ...inlineStyleHack, id: 'strong1' }, 'strong1')
        ),
        ' second third ',
        p({ id: 'p2' }, 'ignored'),
        ' fourth fifth '
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    const runs = collectLooseTextNodesIn(div1);

    // assert
    expect(runs.map((run) => run.map((n) => n.nodeValue?.trim()))).toEqual([
      ['first', 'strong1', 'second third'],
      ['fourth fifth']
    ]);
    expect(runs.flat().every((n) => n.nodeType === Node.TEXT_NODE)).toBe(true);
  });

  test('returns empty when there are no nested LINEs', () => {
    // arrange
    const doc = makeRoot(div({ id: 'div1' }, 'aaa bbb'));
    const div1 = byId(doc, 'div1');

    // act
    const runs = collectLooseTextNodesIn(div1);

    // assert
    expect(runs).toEqual([]);
  });
});

describe('tokenizeLooseLinesIn', () => {
  test('tokenizes each LOOSE_LINE run and leaves pre-LINE content alone', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        'aaa bbb',
        p({ id: 'p1' }, 'ignored'),
        ' first second third ',
        p({ id: 'p2' }, 'ignored'),
        ' fourth fifth '
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    tokenizeLooseLinesIn(div1);

    // assert
    const directTokens = Array.from(div1.children).filter((child) =>
      child.classList.contains('jsed-token')
    );
    expect(directTokens.map((t) => t.textContent)).toEqual([
      'first',
      'second',
      'third',
      'fourth',
      'fifth'
    ]);
    // pre-LINE text "aaa bbb" stays as a plain text node
    expect(div1.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(div1.firstChild?.nodeValue).toBe('aaa bbb');
    // nested <p>'s are left untouched
    expect(byId(doc, 'p1').querySelector('.jsed-token')).toBeNull();
    expect(byId(doc, 'p2').querySelector('.jsed-token')).toBeNull();
  });

  test('tokenizes text inside nested INLINE_FLOW wrappers within a run', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'ignored'),
        em(
          { ...inlineStyleHack, id: 'em1' },
          'first ',
          strong({ ...inlineStyleHack, id: 'strong1' }, 'second')
        ),
        ' third fourth'
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    tokenizeLooseLinesIn(div1);

    // assert
    // every non-whitespace word in the run is tokenized, in place
    expect(byId(doc, 'em1').querySelectorAll('.jsed-token').length).toBe(2);
    expect(byId(doc, 'strong1').querySelector('.jsed-token')?.textContent).toBe('second');
    const allTokens = Array.from(div1.querySelectorAll('.jsed-token')).map((t) => t.textContent);
    expect(allTokens).toEqual(['first', 'second', 'third', 'fourth']);
  });
});

describe('tokenizeLooseLinesAround', () => {
  test('tokenizes loose text on both sides of `el` up to sibling LINEs', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'ignored'),
        ' before one ',
        p({ id: 'target' }, 'ignored'),
        ' after two ',
        p({ id: 'p2' }, 'ignored')
      )
    );
    const target = byId(doc, 'target');

    // act
    tokenizeLooseLinesAround(target);

    // assert
    const directTokens = Array.from(byId(doc, 'div1').children).filter((child) =>
      child.classList.contains('jsed-token')
    );
    expect(directTokens.map((t) => t.textContent)).toEqual(['before', 'one', 'after', 'two']);
    // neighbouring LINEs are left untouched
    expect(byId(doc, 'p1').querySelector('.jsed-token')).toBeNull();
    expect(byId(doc, 'p2').querySelector('.jsed-token')).toBeNull();
    expect(byId(doc, 'target').querySelector('.jsed-token')).toBeNull();
  });

  test('descends into CURSOR_TRANSPARENT siblings on each side', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'ignored'),
        em({ ...inlineStyleHack, id: 'em1' }, 'before'),
        ' middle ',
        p({ id: 'target' }, 'ignored'),
        em({ ...inlineStyleHack, id: 'em2' }, 'after')
      )
    );
    const target = byId(doc, 'target');

    // act
    tokenizeLooseLinesAround(target);

    // assert
    expect(byId(doc, 'em1').querySelector('.jsed-token')?.textContent).toBe('before');
    expect(byId(doc, 'em2').querySelector('.jsed-token')?.textContent).toBe('after');
    const allTokens = Array.from(byId(doc, 'div1').querySelectorAll('.jsed-token')).map(
      (t) => t.textContent
    );
    expect(allTokens).toEqual(['before', 'middle', 'after']);
  });

  test('stops at sibling LINE — does not cross LINE boundaries', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        ' far before ',
        p({ id: 'p1' }, 'ignored'),
        ' near before ',
        p({ id: 'target' }, 'ignored'),
        ' near after ',
        p({ id: 'p2' }, 'ignored'),
        ' far after '
      )
    );
    const target = byId(doc, 'target');

    // act
    tokenizeLooseLinesAround(target);

    // assert
    const div1 = byId(doc, 'div1');
    const tokenTexts = Array.from(div1.querySelectorAll('.jsed-token')).map((t) => t.textContent);
    expect(tokenTexts).toEqual(['near', 'before', 'near', 'after']);
    // the far-side text nodes remain plain text
    expect(div1.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(div1.firstChild?.nodeValue).toBe(' far before ');
    expect(div1.lastChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(div1.lastChild?.nodeValue).toBe(' far after ');
  });
});

describe('detokenizeLine', () => {
  test('simple LINE round-trips back to plain text', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
    const p1 = byId(doc, 'p1');
    tokenizeLine(p1);

    // act
    detokenizeLine(p1);

    // assert
    expect(p1.innerHTML).toBe('foo bar baz');
    expect(p1.querySelector('.jsed-token')).toBeNull();
  });

  test('INLINE_FLOW round-trips back to plain text structure', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'));
    const p1 = byId(doc, 'p1');
    const initialHtml = p1.innerHTML;
    tokenizeLine(p1);

    // act
    detokenizeLine(p1);

    // assert
    expect(p1.innerHTML).toBe(initialHtml);
    expect(p1.querySelector('.jsed-token')).toBeNull();
  });

  test('TRANSPARENT_BLOCK round-trips back to plain text structure', () => {
    // arrange
    const doc = makeRoot(
      div({ id: 'div1' }, div({ id: 'div2', class: 'jsed-cursor-transparent' }, 'nested'), ' outer')
    );
    const div1 = byId(doc, 'div1');
    const initialHtml = div1.innerHTML;
    tokenizeLine(div1);

    // act
    detokenizeLine(div1);

    // assert
    expect(div1.innerHTML).toBe(initialHtml);
    expect(div1.querySelector('.jsed-token')).toBeNull();
  });

  test('detokenizeLine does not recurse into OPAQUE_BLOCK children', () => {
    // arrange
    const doc = makeRoot(div({ id: 'div1' }, p({ id: 'p1' }, 'foo bar'), ' outer'));
    const div1 = byId(doc, 'div1');
    const p1 = byId(doc, 'p1');
    tokenizeLine(p1);
    tokenizeLine(div1);

    // act
    detokenizeLine(div1);

    // assert
    expect(div1.querySelectorAll(':scope > .jsed-token')).toHaveLength(0);
    expect(p1.querySelector('.jsed-token')?.textContent).toBe('foo');
  });
});
