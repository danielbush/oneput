import { describe, it, expect } from 'vitest';
import { makeRoot, div, p, input, script, byId, ul, li } from '../../test/util';
import { loadDoc, serialize, untab } from './load';

describe('loadDoc', () => {
  it("should should add tabindex on F_ELEM's but not IF_ELEM's", () => {
    // arrange
    const cx = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'here is some text'),
        input({ id: 'input', type: 'text', name: 'input', size: '10' }),
        script({ id: 'script' }),
      ),
    );

    // act
    loadDoc(cx.root);

    // assert
    expect(cx.root).toMatchSnapshot();
    expect(byId(cx, 'input').getAttribute('tabIndex')).toBe(null);
    expect(byId(cx, 'script').getAttribute('tabIndex')).toBe(null);
    expect(byId(cx, 'div1').getAttribute('tabIndex')).toEqual('0');
  });

  it("should should update TABS index for F_ELEM's but not IF_ELEM's", () => {
    // arrange
    const cx = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'here is some text'),
        input({ id: 'input', type: 'text', name: 'input', size: '10' }),
        script({ id: 'script' }),
      ),
    );

    // act
    loadDoc(cx.root);

    // assert
    expect(cx.TABS.size).toEqual(3);
    expect(cx.TABS).toContain(document.getElementById('root'));
    expect(cx.TABS).toContain(document.getElementById('div1'));
    expect(cx.TABS).toContain(document.getElementById('p1'));
  });

  it('should ignore katex descendents (F_NONREC)', () => {
    // arrange
    const cx = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'here is some text'),
        div({ id: 'katex', class: 'katex' }, div({ id: 'katex-1' }, 'katex-1')),
        div({ id: 'div1-1' }, 'div1-1'),
      ),
    );

    // act
    loadDoc(cx.root);

    // assert
    expect(cx.root).toMatchSnapshot();
    expect(byId(cx, 'katex').getAttribute('tabIndex')).toEqual('0');
    expect(byId(cx, 'katex-1').getAttribute('tabIndex')).toEqual(null);
    expect(byId(cx, 'div1-1').getAttribute('tabIndex')).toEqual('0');
  });
});

describe('untab', () => {
  it('should untab a document', () => {
    // arrange
    const cx = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'here is some text'),
        input({ id: 'input', type: 'text', name: 'input', size: '10' }),
        script({ id: 'script' }),
      ),
    );
    loadDoc(cx.root);

    // act
    untab(cx.TABS);

    // assert
    expect(cx.root).toMatchSnapshot();
  });
});

describe('serialize', () => {
  it('should remove tabindex from F_ELEM', () => {
    // arrange
    const cx = makeRoot(
      ul(
        { id: 'ul' },
        li({ id: 'li1' }, 'item 1'),
        li({ id: 'li2' }, 'item 2'),
      ),
    );
    loadDoc(cx.root);
    expect(cx.root).toMatchSnapshot();

    // act
    const result = serialize(cx.TABS, cx.root);

    // assert
    expect(result).toMatchSnapshot();
  });
});
