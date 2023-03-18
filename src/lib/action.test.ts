import * as action from './action';
import { makeDivRoot } from '../../test/util';

describe('FOCUS', () => {
  it('should focus an F_ELEM (SIB_HIGHLIGHT)', () => {
    // arrange
    const html = ['<p id="p1">p1</p>'].join('');
    const cx = makeDivRoot(html);
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
    const cx = makeDivRoot(html);
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
    const cx = makeDivRoot(html);
    const p2 = cx.document.getElementById('p2');
    jest.spyOn(cx.document, 'activeElement', 'get').mockReturnValue(p2);

    // act
    action.SIB_HIGHLIGHT(cx);

    // assert
    expect(cx.root).toMatchSnapshot();
  });
});
