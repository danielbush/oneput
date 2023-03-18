import * as load from './load';

describe('tabrec', () => {
  it("should should add tabindex on F_ELEM's but not IF_ELEM's and update TABS index", () => {
    // arrange
    const root = document.createElement('DIV');
    root.id = 'root';
    root.innerHTML = [
      '<div id="div1">',
      '<p id="p1">here is some text</p>',
      '<input type="text" id="input" name="input" size="10" />',
      '<script></script>',
      '</div>',
    ].join('');
    const TABS = new Set<HTMLElement>();
    document.body.appendChild(root);

    // act
    load.tabrec(TABS, root);

    // assert
    expect(root.outerHTML).toMatchSnapshot();
    expect(TABS.size).toEqual(3);
    expect(TABS).toContain(document.getElementById('root'));
    expect(TABS).toContain(document.getElementById('div1'));
    expect(TABS).toContain(document.getElementById('p1'));
  });
});
