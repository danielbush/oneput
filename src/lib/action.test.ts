import { describe, it, test, expect, vi } from 'vitest';
import * as action from './action';
import { byId, div, frag, li, makeRoot, p, script, ul } from '../../test/util';

describe('FOCUS', () => {
  it('should focus an F_ELEM (SIB_HIGHLIGHT)', () => {
    // arrange
    const cx = makeRoot(p({ id: 'p1' }, 'p1'));
    const p1 = cx.document.getElementById('p1') as HTMLElement;

    // act
    action.FOCUS(cx, p1);

    // assert
    expect(cx.root).toMatchSnapshot();
  });

  it('should not focus a non-F_ELEM', () => {
    // arrange
    const cx = makeRoot(frag(script({ id: 'p1' }, 'p1')));
    const p1 = cx.document.getElementById('p1') as HTMLElement;
    const focus = vi.spyOn(p1, 'focus');

    // act
    action.FOCUS(cx, p1);

    // assert
    expect(focus).toBeCalledTimes(0);
  });
});

describe('SIB_HIGHLIGHT', () => {
  it('should highlight current siblings of the active element', () => {
    // arrange
    const cx = makeRoot(frag(p('p1'), p({ id: 'p2' }, 'p2'), p('p3'), p('p4')));
    byId(cx, 'p2').focus();

    // act
    action.SIB_HIGHLIGHT(cx);

    // assert
    expect(cx.root).toMatchSnapshot();
  });
});

test('REC_NEXT should recurse down', () => {
  // arrange
  const cx = makeRoot(
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
  action.REC_NEXT(cx);
  expect(cx.root).toMatchSnapshot();

  action.REC_NEXT(cx);
  expect(cx.root).toMatchSnapshot();

  action.REC_NEXT(cx);
  expect(cx.root).toMatchSnapshot();

  action.REC_NEXT(cx);
  expect(cx.root).toMatchSnapshot();

  action.REC_NEXT(cx);
  expect(cx.root).toMatchSnapshot();

  action.REC_NEXT(cx);
  expect(cx.root).toMatchSnapshot();
});

test('REC_PREV should recurse up', () => {
  // arrange
  const cx = makeRoot(
    div({ id: 'div1' }, div({ id: 'div1-1' }, p({ id: 'p1' }, 'text-1'))),
  );

  // act
  action.REC_PREV(cx);
  expect(cx.root).toMatchSnapshot();

  action.REC_PREV(cx);
  expect(cx.root).toMatchSnapshot();

  action.REC_PREV(cx);
  expect(cx.root).toMatchSnapshot();

  action.REC_PREV(cx);
  expect(cx.root).toMatchSnapshot();

  action.REC_PREV(cx);
  expect(cx.root).toMatchSnapshot();
});

test('SIB_NEXT should walk to next sibling', () => {
  // arrange
  const cx = makeRoot(
    ul(
      { id: 'ul' },
      li({ id: 'li1' }, 'item 1'),
      li({ id: 'li2' }, ul(li('trap'))),
      li({ id: 'li3' }, 'item 3'),
    ),
  );

  // act
  action.SIB_NEXT(cx);
  expect(cx.root).toMatchSnapshot();

  action.SIB_NEXT(cx);
  expect(cx.root).toMatchSnapshot();

  action.SIB_NEXT(cx); // no wrap around
  expect(cx.root).toMatchSnapshot();
});

test('SIB_PREV should walk to previous sibling', () => {
  // arrange
  const cx = makeRoot(
    ul(
      { id: 'ul' },
      li({ id: 'li1' }, 'item 1'),
      li({ id: 'li2' }, ul(li('trap'))),
      li({ id: 'li3' }, 'item 3'),
    ),
  );

  // act
  action.SIB_PREV(cx);
  expect(cx.root).toMatchSnapshot();

  action.SIB_PREV(cx);
  expect(cx.root).toMatchSnapshot();

  action.SIB_PREV(cx); // no wrap around
  expect(cx.root).toMatchSnapshot();
});

test('UP can walk up successive parent elements', () => {
  // arrange
  const cx = makeRoot(
    div({ id: 'id1' }, div({ id: 'id2' }, div({ id: 'id3' }, 'id3'))),
  );
  // const ids: string[] = [];
  action.FOCUS(cx, byId(cx, 'id3'));

  // act
  action.UP(cx);
  expect(cx.root).toMatchSnapshot();

  action.UP(cx);
  expect(cx.root).toMatchSnapshot();

  action.UP(cx);
  expect(cx.root).toMatchSnapshot();

  action.UP(cx); // no wrap around
  expect(cx.root).toMatchSnapshot();
});

describe('ISLAND', () => {
  test('KATEX_ISLAND - should ignore katex islands', () => {
    // arrange
    const cx = makeRoot(
      div(
        { id: 'div1' },
        div({ class: 'katex' }, div('should not go here')),
        div({ id: 'div2' }, 'div'),
      ),
    );
    cx.active = byId(cx, 'div1');

    // act
    action.REC_NEXT(cx);
    action.REC_NEXT(cx);

    // assert
    expect(cx.active).toEqual(cx.document.getElementById('div2'));
  });
});
