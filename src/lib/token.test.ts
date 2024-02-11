import { describe, test, expect } from 'vitest';
import { byId, makeRoot, div, p, em } from '../../test/util';
import { tokenize } from './token';

describe('tokenize', () => {
  test('<p>foo <em>bar</em> baz</p>', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo ', em('bar'), ' baz'));
    const p1 = byId(doc, 'p1');

    // act
    tokenize(p1);

    // assert
    expect(byId(doc, 'p1')).toMatchSnapshot();
  });

  describe('localized tokenizaation (not everything)', () => {
    test('case 1', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'div1' },
          p({ id: 'p1' }, 'foo ', em('bar'), ' baz'),
          p({ id: 'p2' }, 'foo ', em('bar'), ' baz'),
        ),
      );
      const div1 = byId(doc, 'div1');

      // act
      tokenize(div1);
      console.log(div1.outerHTML);
    });

    test.only('case 2', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'div1' },
          p({ id: 'p1' }, 'foo ', em('bar'), ' baz'),
          p({ id: 'p2' }, 'foo ', em('bar'), ' baz'),
        ),
      );
      const p1 = byId(doc, 'p1');

      // act
      tokenize(p1);
      console.log(p1.outerHTML);
    });
  });
});
