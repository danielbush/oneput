import { describe, test, expect } from 'vitest';
import { byId, makeRoot, p, em } from '../../test/util';
import { tokenize } from './token';

describe('tokenize', () => {
  test('<p>foo <em>bar</em> baz</p>', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo ', em('bar'), ' baz'));
    const p1 = doc.document.getElementById('p1') as HTMLElement;

    // act
    tokenize(p1);

    // assert
    expect(byId(doc, 'p1')).toMatchSnapshot();
  });
});
