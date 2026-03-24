import { describe, test, expect } from 'vitest';
import { byId, makeRoot, div, p, em } from '../../test/util.js';
import { tokenizeLine, tagImplicitLines } from '../token.js';

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

  test('NESTED_LINE: <div><div>nested</div>outer</div>', () => {
    // arrange — "outer" after div2 is wrapped in IMPLICIT_LINE by tagImplicitLines.
    // tokenizeLine(div1) returns null because there's no direct text to tokenize.
    const doc = makeRoot(
      div(
        { id: 'div1' }, //
        div({ id: 'div2' }, 'nested'),
        'outer'
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    const first = tokenizeLine(div1);

    // assert — "outer" is in IMPLICIT_LINE, not tokenized at this level
    expect(div1).toMatchSnapshot();
    expect(first).toBeNull();
  });

  test('text before NESTED_LINE: <div>outer<div>nested</div></div>', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' }, //
        'outer',
        div({ id: 'div2' }, 'nested')
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    const first = tokenizeLine(div1);

    // assert
    expect(div1).toMatchSnapshot();
    expect(first!.textContent!.trim()).toBe('outer');
  });

  test('only NESTED_LINE, no text: <div><div>nested</div></div>', () => {
    // arrange
    const doc = makeRoot(div({ id: 'div1' }, div({ id: 'div2' }, 'nested')));
    const div1 = byId(doc, 'div1');

    // act
    const first = tokenizeLine(div1);

    // assert
    expect(div1).toMatchSnapshot();
    console.log('first token:', first?.textContent ?? 'null');
  });

  test('inline-block NESTED_LINE: <p>outer<span style="display:inline-block">nested</span></p>', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        'outer',
        `<span id="span1" style="display:inline-block;">nested</span>`
      )
    );
    const p1 = byId(doc, 'p1');

    // act
    const first = tokenizeLine(p1);

    // assert
    expect(p1).toMatchSnapshot();
    expect(first!.textContent!.trim()).toBe('outer');
  });

  describe('SHALLOW_TOKENIZATION', () => {
    test('case 1', () => {
      // arrange
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

      // assert
      expect(div1).toMatchSnapshot('Should not tokenize p1 and p2');
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

describe('tagImplicitLines', () => {
  test('case 1 - simple', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'),
        'this is the IMPLICIT_LINE'
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    expect(byId(doc, 'div1')).toMatchSnapshot();
  });

  test('case 2 - IMPLICIT_LINE with nested inline tag', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'),
        `this is the <em id="em2" style="${inlineStyleHackVal}">implicit</em> line`
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    expect(byId(doc, 'div1')).toMatchSnapshot();
  });

  test('case 3 - leaded nested inline tag', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'),
        `<em id="em2" style="${inlineStyleHackVal}">implicit</em> line`
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    expect(byId(doc, 'div1')).toMatchSnapshot();
  });

  test('case 4 - it should ignore spaces', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'foo'),
        //
        ' ', // should not create IMPLICIT_LINE
        //
        p({ id: 'p2' }, 'foo')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    expect(byId(doc, 'p1').nextSibling).toHaveProperty('nodeType', 3);
    expect(byId(doc, 'div1')).toMatchSnapshot('There should be no IMPLICIT_LINE.');
  });
});
