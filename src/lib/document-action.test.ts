import { describe, it, test, expect, vi } from 'vitest';
import { byId, div, frag, li, makeRoot, p, script, ul } from '../../test/util';
import { DocumentAction } from './document-action';

describe('FOCUS', () => {
  it('should focus an F_ELEM (SIB_HIGHLIGHT)', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'p1'));
    const p1 = doc.document.getElementById('p1') as HTMLElement;
    const action = new DocumentAction(doc);

    // act
    action.FOCUS(p1);

    // assert
    expect(doc.root).toMatchSnapshot();
  });

  it('should not focus a non-F_ELEM', () => {
    // arrange
    const doc = makeRoot(frag(script({ id: 'p1' }, 'p1')));
    const p1 = doc.document.getElementById('p1') as HTMLElement;
    const focus = vi.spyOn(p1, 'focus');
    const action = new DocumentAction(doc);

    // act
    action.FOCUS(p1);

    // assert
    expect(focus).toBeCalledTimes(0);
  });
});

describe('SIB_HIGHLIGHT', () => {
  it('should highlight current siblings of the active element', () => {
    // arrange
    const doc = makeRoot(
      frag(p('p1'), p({ id: 'p2' }, 'p2'), p('p3'), p('p4')),
    );
    byId(doc, 'p2').focus();
    const action = new DocumentAction(doc);

    // act
    action.SIB_HIGHLIGHT();

    // assert
    expect(doc.root).toMatchSnapshot();
  });
});

test('REC_NEXT should recurse down', () => {
  // arrange
  const doc = makeRoot(
    div(
      { id: 'div1' },
      div(
        { id: 'div1-1' },
        p({ id: 'p1' }, 'text-1'),
        p({ id: 'p2' }, 'text-2'),
      ),
    ),
  );
  const action = new DocumentAction(doc);

  // act
  action.REC_NEXT();
  expect(doc.root).toMatchSnapshot();

  action.REC_NEXT();
  expect(doc.root).toMatchSnapshot();

  action.REC_NEXT();
  expect(doc.root).toMatchSnapshot();

  action.REC_NEXT();
  expect(doc.root).toMatchSnapshot();

  action.REC_NEXT();
  expect(doc.root).toMatchSnapshot();

  action.REC_NEXT();
  expect(doc.root).toMatchSnapshot();
});

test('REC_PREV should recurse up', () => {
  // arrange
  const doc = makeRoot(
    div({ id: 'div1' }, div({ id: 'div1-1' }, p({ id: 'p1' }, 'text-1'))),
  );
  const action = new DocumentAction(doc);

  // act
  action.REC_PREV();
  expect(doc.root).toMatchSnapshot();

  action.REC_PREV();
  expect(doc.root).toMatchSnapshot();

  action.REC_PREV();
  expect(doc.root).toMatchSnapshot();

  action.REC_PREV();
  expect(doc.root).toMatchSnapshot();

  action.REC_PREV();
  expect(doc.root).toMatchSnapshot();
});

test('SIB_NEXT should walk to next sibling', () => {
  // arrange
  const doc = makeRoot(
    ul(
      { id: 'ul' },
      li({ id: 'li1' }, 'item 1'),
      li({ id: 'li2' }, ul(li('trap'))),
      li({ id: 'li3' }, 'item 3'),
    ),
  );
  const action = new DocumentAction(doc);

  // act
  action.SIB_NEXT();
  expect(doc.root).toMatchSnapshot();

  action.SIB_NEXT();
  expect(doc.root).toMatchSnapshot();

  action.SIB_NEXT(); // no wrap around
  expect(doc.root).toMatchSnapshot();
});

test('SIB_PREV should walk to previous sibling', () => {
  // arrange
  const doc = makeRoot(
    ul(
      { id: 'ul' },
      li({ id: 'li1' }, 'item 1'),
      li({ id: 'li2' }, ul(li('trap'))),
      li({ id: 'li3' }, 'item 3'),
    ),
  );
  const action = new DocumentAction(doc);

  // act
  action.SIB_PREV();
  expect(doc.root).toMatchSnapshot();

  action.SIB_PREV();
  expect(doc.root).toMatchSnapshot();

  action.SIB_PREV(); // no wrap around
  expect(doc.root).toMatchSnapshot();
});

test('UP can walk up successive parent elements', () => {
  // arrange
  const doc = makeRoot(
    div({ id: 'id1' }, div({ id: 'id2' }, div({ id: 'id3' }, 'id3'))),
  );
  const action = new DocumentAction(doc);
  action.FOCUS(byId(doc, 'id3'));

  // act
  action.UP();
  expect(doc.root).toMatchSnapshot();

  action.UP();
  expect(doc.root).toMatchSnapshot();

  action.UP();
  expect(doc.root).toMatchSnapshot();

  action.UP(); // no wrap around
  expect(doc.root).toMatchSnapshot();
});

describe('ISLAND', () => {
  test('KATEX_ISLAND - should ignore katex islands', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        div({ class: 'katex' }, div('should not go here')),
        div({ id: 'div2' }, 'div'),
      ),
    );
    doc.active = byId(doc, 'div1');
    const action = new DocumentAction(doc);

    // act
    action.REC_NEXT();
    action.REC_NEXT();

    // assert
    expect(doc.active).toEqual(doc.document.getElementById('div2'));
  });
});
