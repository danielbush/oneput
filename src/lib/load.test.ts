import * as util from '../../test/util';

describe('loadDoc', () => {
  it("should should add tabindex on F_ELEM's but not IF_ELEM's and update TABS index", () => {
    // arrange
    // const root = document.createElement('DIV');
    // root.id = 'root';
    const html = [
      '<div id="div1">',
      '<p id="p1">here is some text</p>',
      '<input type="text" id="input" name="input" size="10" />',
      '<script></script>',
      '</div>',
    ].join('');

    // act
    const cx = util.makeRoot(html);

    // assert
    expect(cx.root.outerHTML).toMatchSnapshot();
    expect(cx.TABS.size).toEqual(3);
    expect(cx.TABS).toContain(document.getElementById('root'));
    expect(cx.TABS).toContain(document.getElementById('div1'));
    expect(cx.TABS).toContain(document.getElementById('p1'));
  });
});
