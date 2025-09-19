import { describe, test, expect } from 'vitest';
import { byId, makeRoot, div, p, em } from '../../../test/util';
import { tokenize, tokenizeImplicitLine } from '../token';

/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyleHack = { style: 'display:inline;' };
/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyleHackVal = 'display:inline;';

describe('tokenize', () => {
  test('<p>foo <em>bar</em> baz</p>', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'),
    );
    const p1 = byId(doc, 'p1');

    // act
    tokenize(p1);

    // assert
    expect(byId(doc, 'p1')).toMatchSnapshot();
  });

  describe('localized tokenization (not everything)', () => {
    test('case 1', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'div1' },
          p({ id: 'p1' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'),
          p({ id: 'p2' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'),
        ),
      );
      const div1 = byId(doc, 'div1');

      // act
      tokenize(div1);

      // assert
      expect(div1).toMatchSnapshot('Should not tokenize p1 and p2');
    });

    test('case 2', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'div1' },
          p({ id: 'p1' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'),
          p({ id: 'p2' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'),
        ),
      );
      const p1 = byId(doc, 'p1');
      const div1 = byId(doc, 'div1');

      // act
      tokenize(p1);

      // assert
      expect(div1).toMatchSnapshot('Should only tokenize p1');
    });
  });
});

describe('tokenizeImplicitLine', () => {
  test('case 1 - simple', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'),
        'this is the implicit line',
      ),
    );

    // act
    tokenizeImplicitLine(doc.root);

    // assert
    expect(byId(doc, 'div1')).toMatchSnapshot();
  });

  test('case 2 - implicit line with nested inline tag', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'),
        `this is the <em id="em2" style="${inlineStyleHackVal}">implicit</em> line`,
      ),
    );

    // act
    tokenizeImplicitLine(doc.root);

    // assert
    expect(byId(doc, 'div1')).toMatchSnapshot();
  });

  test('case 3 - leaded nested inline tag', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'),
        `<em id="em2" style="${inlineStyleHackVal}">implicit</em> line`,
      ),
    );

    // act
    tokenizeImplicitLine(doc.root);

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
        ' ', // should not create implicit line
        //
        p({ id: 'p2' }, 'foo'),
      ),
    );

    // act
    tokenizeImplicitLine(doc.root);

    // assert
    expect(byId(doc, 'p1').nextSibling).toHaveProperty('nodeType', 3);
    expect(byId(doc, 'div1')).toMatchSnapshot(
      'There should be no implicit line.',
    );
  });
});
