import { describe, it, test, expect, vi } from 'vitest';
import * as action from './action';
import { byId, div, frag, li, makeRoot, p, script, ul } from '../../test/util';

describe('FOCUS', () => {
  it('should focus an F_ELEM (SIB_HIGHLIGHT)', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'p1'));
    const p1 = doc.document.getElementById('p1') as HTMLElement;

    // act
    action.FOCUS(doc, p1);

    // assert
    expect(doc.root).toMatchSnapshot();
  });

  it('should not focus a non-F_ELEM', () => {
    // arrange
    const doc = makeRoot(frag(script({ id: 'p1' }, 'p1')));
    const p1 = doc.document.getElementById('p1') as HTMLElement;
    const focus = vi.spyOn(p1, 'focus');

    // act
    action.FOCUS(doc, p1);

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

    // act
    action.SIB_HIGHLIGHT(doc);

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

  // act
  action.REC_NEXT(doc);
  expect(doc.root).toMatchSnapshot();

  action.REC_NEXT(doc);
  expect(doc.root).toMatchSnapshot();

  action.REC_NEXT(doc);
  expect(doc.root).toMatchSnapshot();

  action.REC_NEXT(doc);
  expect(doc.root).toMatchSnapshot();

  action.REC_NEXT(doc);
  expect(doc.root).toMatchSnapshot();

  action.REC_NEXT(doc);
  expect(doc.root).toMatchSnapshot();
});

test('REC_PREV should recurse up', () => {
  // arrange
  const doc = makeRoot(
    div({ id: 'div1' }, div({ id: 'div1-1' }, p({ id: 'p1' }, 'text-1'))),
  );

  // act
  action.REC_PREV(doc);
  expect(doc.root).toMatchSnapshot();

  action.REC_PREV(doc);
  expect(doc.root).toMatchSnapshot();

  action.REC_PREV(doc);
  expect(doc.root).toMatchSnapshot();

  action.REC_PREV(doc);
  expect(doc.root).toMatchSnapshot();

  action.REC_PREV(doc);
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

  // act
  action.SIB_NEXT(doc);
  expect(doc.root).toMatchSnapshot();

  action.SIB_NEXT(doc);
  expect(doc.root).toMatchSnapshot();

  action.SIB_NEXT(doc); // no wrap around
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

  // act
  action.SIB_PREV(doc);
  expect(doc.root).toMatchSnapshot();

  action.SIB_PREV(doc);
  expect(doc.root).toMatchSnapshot();

  action.SIB_PREV(doc); // no wrap around
  expect(doc.root).toMatchSnapshot();
});

test('UP can walk up successive parent elements', () => {
  // arrange
  const doc = makeRoot(
    div({ id: 'id1' }, div({ id: 'id2' }, div({ id: 'id3' }, 'id3'))),
  );
  // const ids: string[] = [];
  action.FOCUS(doc, byId(doc, 'id3'));

  // act
  action.UP(doc);
  expect(doc.root).toMatchSnapshot();

  action.UP(doc);
  expect(doc.root).toMatchSnapshot();

  action.UP(doc);
  expect(doc.root).toMatchSnapshot();

  action.UP(doc); // no wrap around
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

    // act
    action.REC_NEXT(doc);
    action.REC_NEXT(doc);

    // assert
    expect(doc.active).toEqual(doc.document.getElementById('div2'));
  });
});
