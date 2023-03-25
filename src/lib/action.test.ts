import * as action from './action';
import { div, makeRoot, p, spyOnAllIds } from '../../test/util';

describe('FOCUS', () => {
  it('should focus an F_ELEM (SIB_HIGHLIGHT)', () => {
    // arrange
    const html = ['<p id="p1">p1</p>'].join('');
    const cx = makeRoot(html);
    const p1 = cx.document.getElementById('p1') as HTMLElement;
    const focus = jest.spyOn(p1, 'focus');

    // act
    action.FOCUS(cx, p1);

    // assert
    expect(focus).toBeCalledTimes(1);
  });

  it('should not focus a non-F_ELEM', () => {
    // arrange
    const html = ['<script id="p1">p1</script>'].join('');
    const cx = makeRoot(html);
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
    const html = [
      '<p>p1</p>',
      '<p id="p2">p2</p>',
      '<p>p3</p>',
      '<p>p4</p>',
    ].join('');
    const cx = makeRoot(html);
    cx.document.getElementById('p2')?.focus();

    // act
    action.SIB_HIGHLIGHT(cx);

    // assert
    expect(cx.root).toMatchSnapshot();
  });
});

describe('REC_NEXT', () => {
  it('should recurse down', () => {
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

    // assert
    expect(ids).toEqual(['div1-1', 'p1', 'root', 'div1']);
  });
});
