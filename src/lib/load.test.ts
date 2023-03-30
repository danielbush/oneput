import { makeRoot, div, p, input, script, byId } from '../../test/util';
import { loadDoc } from './load';

describe('loadDoc', () => {
  it("should should add tabindex on F_ELEM's but not IF_ELEM's and update TABS index", () => {
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
    expect(cx.root.outerHTML).toMatchSnapshot();
    expect(byId(cx, 'input').getAttribute('tabIndex')).toBe(null);
    expect(byId(cx, 'script').getAttribute('tabIndex')).toBe(null);
    expect(byId(cx, 'div1').getAttribute('tabIndex')).toEqual('0');

    // TABS should stored
    expect(cx.TABS.size).toEqual(3);
    expect(cx.TABS).toContain(document.getElementById('root'));
    expect(cx.TABS).toContain(document.getElementById('div1'));
    expect(cx.TABS).toContain(document.getElementById('p1'));
  });
});
