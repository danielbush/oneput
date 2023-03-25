import * as action from './action';
import {
  div,
  frag,
  li,
  makeRoot,
  p,
  script,
  spyOnAllIds,
  ul,
} from '../../test/util';

describe('FOCUS', () => {
  it('should focus an F_ELEM (SIB_HIGHLIGHT)', () => {
    // arrange
    const cx = makeRoot(p({ id: 'p1' }, 'p1'));
    const p1 = cx.document.getElementById('p1') as HTMLElement;
    const focus = jest.spyOn(p1, 'focus');

    // act
    action.FOCUS(cx, p1);

    // assert
    expect(focus).toBeCalledTimes(1);
  });

  it('should not focus a non-F_ELEM', () => {
    // arrange
    const cx = makeRoot(frag(script({ id: 'p1' }, 'p1')));
    const p1 = cx.document.getElementById('p1') as HTMLElement;
    const focus = jest.spyOn(p1, 'focus');

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
    cx.document.getElementById('p2')?.focus();

    // act
    action.SIB_HIGHLIGHT(cx);

    // assert
    expect(cx.root).toMatchSnapshot();
  });
});

test('REC_NEXT should recurse down', () => {
  // arrange
  const cx = makeRoot(
    div({ id: 'div1' }, div({ id: 'div1-1' }, p({ id: 'p1' }, 'text-1'))),
  );
  const ids: string[] = [];
  cx.document.getElementById('div1')?.focus();
  spyOnAllIds(cx, {
    focus: (id: string) => {
      ids.push(id);
    },
  });

  // act
  action.REC_NEXT(cx);
  action.REC_NEXT(cx);
  action.REC_NEXT(cx);
  action.REC_NEXT(cx);
  action.REC_NEXT(cx);

  // assert
  expect(ids).toEqual(['div1-1', 'p1', 'root', 'div1', 'div1-1']);
});

test('REC_PREV should recurse up', () => {
  // arrange
  const cx = makeRoot(
    div({ id: 'div1' }, div({ id: 'div1-1' }, p({ id: 'p1' }, 'text-1'))),
  );
  const ids: string[] = [];
  cx.document.getElementById('div1')?.focus();
  spyOnAllIds(cx, {
    focus: (id: string) => {
      ids.push(id);
    },
  });

  // act
  action.REC_PREV(cx);
  action.REC_PREV(cx);
  action.REC_PREV(cx);
  action.REC_PREV(cx);
  action.REC_PREV(cx);

  // assert
  expect(ids).toEqual(['root', 'p1', 'div1-1', 'div1', 'root']);
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
  const ids: string[] = [];
  cx.document.getElementById('li1')?.focus();
  spyOnAllIds(cx, {
    focus: (id: string) => {
      ids.push(id);
    },
  });

  // act
  action.SIB_NEXT(cx);
  action.SIB_NEXT(cx);
  action.SIB_NEXT(cx); // no wrap around

  // assert
  expect(ids).toEqual(['li2', 'li3']);
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
  const ids: string[] = [];
  cx.document.getElementById('li3')?.focus();
  spyOnAllIds(cx, {
    focus: (id: string) => {
      ids.push(id);
    },
  });

  // act
  action.SIB_PREV(cx);
  action.SIB_PREV(cx);
  action.SIB_PREV(cx); // no wrap around

  // assert
  expect(ids).toEqual(['li2', 'li1']);
});
