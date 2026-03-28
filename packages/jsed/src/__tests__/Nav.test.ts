import { describe, it, test, expect, vi } from 'vitest';
import { byId, div, frag, li, makeRoot, p, script, ul } from '../test/util.js';
import { Nav } from '../Nav.js';
import { ElementIndicator } from '../ElementIndicator.js';

describe('FOCUS', () => {
  it('should focus an FOCUSABLE (SIB_HIGHLIGHT)', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'p1'));
    const nav = new Nav(doc, ElementIndicator.createNull());
    const p1 = doc.document.getElementById('p1') as HTMLElement;

    // act
    nav.REQUEST_FOCUS(p1);

    // assert
    expect(doc.root).toMatchSnapshot();
  });

  it('should not focus a non-FOCUSABLE', () => {
    // arrange
    const doc = makeRoot(frag(script({ id: 'p1' }, 'p1')));
    const nav = new Nav(doc, ElementIndicator.createNull());
    const p1 = doc.document.getElementById('p1') as HTMLElement;
    const focus = vi.spyOn(p1, 'focus');

    // act
    nav.REQUEST_FOCUS(p1);

    // assert
    expect(focus).toBeCalledTimes(0);
  });
});

describe('SIB_HIGHLIGHT', () => {
  it('should highlight current siblings of the active element', () => {
    // arrange
    const doc = makeRoot(frag(p('p1'), p({ id: 'p2' }, 'p2'), p('p3'), p('p4')));
    const nav = new Nav(doc, ElementIndicator.createNull());
    byId(doc, 'p2').focus();

    // act
    nav.SIB_HIGHLIGHT();

    // assert
    expect(doc.root).toMatchSnapshot();
  });
});

test('REC_NEXT should recurse down', () => {
  // arrange
  const doc = makeRoot(
    div({ id: 'div1' }, div({ id: 'div1-1' }, p({ id: 'p1' }, 'text-1'), p({ id: 'p2' }, 'text-2')))
  );
  const nav = new Nav(doc, ElementIndicator.createNull());

  // act
  nav.REC_NEXT();
  expect(doc.root).toMatchSnapshot();

  nav.REC_NEXT();
  expect(doc.root).toMatchSnapshot();

  nav.REC_NEXT();
  expect(doc.root).toMatchSnapshot();

  nav.REC_NEXT();
  expect(doc.root).toMatchSnapshot();

  nav.REC_NEXT();
  expect(doc.root).toMatchSnapshot();

  nav.REC_NEXT();
  expect(doc.root).toMatchSnapshot();
});

test('REC_PREV should recurse up', () => {
  // arrange
  const doc = makeRoot(div({ id: 'div1' }, div({ id: 'div1-1' }, p({ id: 'p1' }, 'text-1'))));
  const nav = new Nav(doc, ElementIndicator.createNull());

  // act
  nav.REC_PREV();
  expect(doc.root).toMatchSnapshot();

  nav.REC_PREV();
  expect(doc.root).toMatchSnapshot();

  nav.REC_PREV();
  expect(doc.root).toMatchSnapshot();

  nav.REC_PREV();
  expect(doc.root).toMatchSnapshot();

  nav.REC_PREV();
  expect(doc.root).toMatchSnapshot();
});

test('SIB_NEXT should walk to next sibling', () => {
  // arrange
  const doc = makeRoot(
    ul(
      { id: 'ul' },
      li({ id: 'li1' }, 'item 1'),
      li({ id: 'li2' }, ul(li('trap'))),
      li({ id: 'li3' }, 'item 3')
    )
  );
  const nav = new Nav(doc, ElementIndicator.createNull());

  // act
  nav.SIB_NEXT();
  expect(doc.root).toMatchSnapshot();

  nav.SIB_NEXT();
  expect(doc.root).toMatchSnapshot();

  nav.SIB_NEXT(); // no wrap around
  expect(doc.root).toMatchSnapshot();
});

test('SIB_PREV should walk to previous sibling', () => {
  // arrange
  const doc = makeRoot(
    ul(
      { id: 'ul' },
      li({ id: 'li1' }, 'item 1'),
      li({ id: 'li2' }, ul(li('trap'))),
      li({ id: 'li3' }, 'item 3')
    )
  );
  const nav = new Nav(doc, ElementIndicator.createNull());

  // act
  nav.SIB_PREV();
  expect(doc.root).toMatchSnapshot();

  nav.SIB_PREV();
  expect(doc.root).toMatchSnapshot();

  nav.SIB_PREV(); // no wrap around
  expect(doc.root).toMatchSnapshot();
});

test('UP can walk up successive parent elements', () => {
  // arrange
  const doc = makeRoot(div({ id: 'id1' }, div({ id: 'id2' }, div({ id: 'id3' }, 'id3'))));
  const nav = new Nav(doc, ElementIndicator.createNull());
  nav.REQUEST_FOCUS(byId(doc, 'id3'));

  // act
  nav.UP();
  expect(doc.root).toMatchSnapshot();

  nav.UP();
  expect(doc.root).toMatchSnapshot();

  nav.UP();
  expect(doc.root).toMatchSnapshot();

  nav.UP(); // no wrap around
  expect(doc.root).toMatchSnapshot();
});

describe('focus controller', () => {
  it('should call the focus controller when REQUEST_FOCUS targets a FOCUSABLE', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'p1'), p({ id: 'p2' }, 'p2')));
    const nav = new Nav(doc, ElementIndicator.createNull());
    const controller = vi.fn(() => true);
    nav.setFocusController(controller);

    // act
    nav.REQUEST_FOCUS(byId(doc, 'p1'));

    // assert
    expect(controller).toHaveBeenCalledOnce();
    expect(controller).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'FOCUS_REQUEST',
        targetType: 'FOCUSABLE',
        element: byId(doc, 'p1')
      })
    );
  });

  it('should pass same-element event when REQUEST_FOCUS targets the already-focused element', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'p1'), p({ id: 'p2' }, 'p2')));
    const nav = new Nav(doc, ElementIndicator.createNull());
    const p1 = byId(doc, 'p1');
    nav.FOCUS(p1);
    const controller = vi.fn(() => false);
    nav.setFocusController(controller);

    // act
    nav.REQUEST_FOCUS(p1);

    // assert
    expect(controller).toHaveBeenCalledOnce();
    expect(controller).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'FOCUS_REQUEST',
        targetType: 'FOCUSABLE',
        element: p1
      })
    );
  });

  it('should not change FOCUS when controller returns false', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'p1'), p({ id: 'p2' }, 'p2')));
    const nav = new Nav(doc, ElementIndicator.createNull());
    const p1 = byId(doc, 'p1');
    nav.FOCUS(p1);
    nav.setFocusController(() => false);

    // act
    nav.REQUEST_FOCUS(byId(doc, 'p2'));

    // assert — focus should still be on p1
    expect(nav.getFocus()).toBe(p1);
  });

  it('should allow focus change when controller returns true', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'p1'), p({ id: 'p2' }, 'p2')));
    const nav = new Nav(doc, ElementIndicator.createNull());
    nav.FOCUS(byId(doc, 'p1'));
    nav.setFocusController(() => true);

    // act
    nav.REQUEST_FOCUS(byId(doc, 'p2'));

    // assert
    expect(nav.getFocus()).toBe(byId(doc, 'p2'));
  });
});

describe('ISLAND', () => {
  test.todo('KATEX_ISLAND - should ignore katex islands', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        div({ class: 'katex' }, div('should not go here')),
        div({ id: 'div2' }, 'div')
      )
    );
    const nav = new Nav(doc, ElementIndicator.createNull());

    // act
    nav.REC_NEXT();
    nav.REC_NEXT();

    // assert
    // expect(doc.active).toEqual(doc.document.getElementById('div2'));
  });
});
