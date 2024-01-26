import { describe, it, expect } from 'vitest';
import { makeRoot, div, p, input, script, byId, ul, li } from '../../test/util';
import { loadDoc, serialize, untab } from './load';

describe('loadDoc', () => {
  it("should should update TABS index for F_ELEM's but not IF_ELEM's", () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'here is some text'),
        input({ id: 'input', type: 'text', name: 'input', size: '10' }),
        script({ id: 'script' }),
      ),
    );

    // act
    loadDoc(doc.root);

    // assert
    expect(doc.TABS.size).toEqual(3);
    expect(doc.TABS).toContain(document.getElementById('root'));
    expect(doc.TABS).toContain(document.getElementById('div1'));
    expect(doc.TABS).toContain(document.getElementById('p1'));
  });

  it('should ignore katex descendents (F_NONREC)', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'here is some text'),
        div({ id: 'katex', class: 'katex' }, div({ id: 'katex-1' }, 'katex-1')),
        div({ id: 'div1-1' }, 'div1-1'),
      ),
    );

    // act
    loadDoc(doc.root);

    // assert
    expect(doc.root).toMatchSnapshot();
    expect(doc.TABS.has(byId(doc, 'katex'))).toBe(true);
    expect(doc.TABS.has(byId(doc, 'katex-1'))).toBe(false);
    expect(doc.TABS.has(byId(doc, 'div1-1'))).toBe(true);
  });
});

describe('untab', () => {
  it('should untab a document', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'here is some text'),
        input({ id: 'input', type: 'text', name: 'input', size: '10' }),
        script({ id: 'script' }),
      ),
    );
    loadDoc(doc.root);

    // act
    untab(doc.TABS);

    // assert
    expect(doc.root).toMatchSnapshot();
  });
});

describe('serialize', () => {
  it('should remove tabindex from F_ELEM', () => {
    // arrange
    const doc = makeRoot(
      ul(
        { id: 'ul' },
        li({ id: 'li1' }, 'item 1'),
        li({ id: 'li2' }, 'item 2'),
      ),
    );
    loadDoc(doc.root);
    expect(doc.root).toMatchSnapshot();

    // act
    const result = serialize(doc.TABS, doc.root);

    // assert
    expect(result).toMatchSnapshot();
  });
});
