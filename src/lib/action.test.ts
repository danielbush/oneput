import { makeDocumentContext } from './DocumentContext';
import * as action from './action';

describe('FOCUS', () => {
  // TODO - SIB_HIGHLIGHT depends on this
});

describe('SIB_HIGHLIGHT', () => {
  it('should highlight current siblings of the active element', () => {
    // arrange
    const cx = makeDocumentContext(document);
    cx.root.innerHTML = [
      '<p>p1</p>',
      '<p id="p2">p2</p>',
      '<p>p3</p>',
      '<p>p4</p>',
    ].join('');
    cx.TABS = new Set(cx.root.getElementsByTagName('p'));
    document.body.appendChild(cx.root);
    const p2 = document.getElementById('p2');
    jest.spyOn(document, 'activeElement', 'get').mockReturnValue(p2);

    // act
    action.SIB_HIGHLIGHT(cx);

    // assert
    expect(cx.root).toMatchSnapshot();
  });
});
