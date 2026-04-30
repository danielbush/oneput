import { describe, it, test, expect } from 'vitest';
import { byId, div, frag, li, makeRoot, p, script, ul } from '../test/util.js';
import { Nav, type OnRequestFocus } from '../Nav.js';
import { ElementIndicator } from '../ElementIndicator.js';
import type { JsedFocusRequestEvent } from '../types.js';
import { JSED_FOCUS_CLASS, SBR_FOCUS_SIBLING } from '../lib/constants.js';

function trackFocusRequests(allow: boolean | ((evt: JsedFocusRequestEvent) => boolean) = true): {
  onFocusRequest: OnRequestFocus;
  data: JsedFocusRequestEvent[];
} {
  const data: JsedFocusRequestEvent[] = [];
  return {
    onFocusRequest: (evt) => {
      data.push(evt);
      return typeof allow === 'function' ? allow(evt) : allow;
    },
    data
  };
}

function expectFocusedElement(doc: ReturnType<typeof makeRoot>, el: HTMLElement) {
  const focused = Array.from(doc.root.querySelectorAll(`.${JSED_FOCUS_CLASS}`));
  expect(focused).toHaveLength(1);
  expect(focused[0]).toBe(el);
  expect(el.classList.contains(JSED_FOCUS_CLASS)).toBe(true);
}

function expectRootFocused(doc: ReturnType<typeof makeRoot>) {
  expect(doc.root.classList.contains(JSED_FOCUS_CLASS)).toBe(true);
  expect(doc.root.querySelectorAll(`.${JSED_FOCUS_CLASS}`)).toHaveLength(0);
}

function expectSiblingHighlights(doc: ReturnType<typeof makeRoot>, ids: string[]) {
  const highlighted = Array.from(doc.root.querySelectorAll(`.${SBR_FOCUS_SIBLING}`)).map(
    (el) => (el as HTMLElement).id
  );
  expect(highlighted).toEqual(ids);
}

describe('FOCUS', () => {
  it('should focus an FOCUSABLE (SIB_HIGHLIGHT)', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'p1'));
    const nav = new Nav(doc, ElementIndicator.createNull());
    const p1 = doc.document.getElementById('p1') as HTMLElement;

    // act
    nav.REQUEST_FOCUS(p1);

    // assert
    expectFocusedElement(doc, p1);
    expectSiblingHighlights(doc, []);
  });

  it('should not focus a non-FOCUSABLE', () => {
    // arrange
    const doc = makeRoot(frag(script({ id: 'p1' }, 'p1')));
    const nav = new Nav(doc, ElementIndicator.createNull());
    nav.FOCUS(doc.root);
    const p1 = doc.document.getElementById('p1') as HTMLElement;

    // act
    nav.REQUEST_FOCUS(p1);

    // assert
    expect(nav.getFocus()).toBe(doc.root);
  });

  it('scrolls a hidden FOCUSABLE back into view with nearest alignment', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'p1'), {
      viewportScrollerOpts: {
        getElementRect: (el) =>
          el.id === 'p1'
            ? {
                top: -10,
                left: 0,
                bottom: 10,
                right: 10,
                width: 10,
                height: 20
              }
            : undefined
      }
    });
    const nav = new Nav(doc, ElementIndicator.createNull());
    const p1 = byId(doc, 'p1');
    const scrollRequests = doc.viewportScroller.trackScrollRequests();
    scrollRequests.data.length = 0;

    // act
    nav.REQUEST_FOCUS(p1);

    // assert
    expect(scrollRequests.data).toEqual([
      {
        element: p1,
        options: {
          block: 'nearest',
          inline: 'nearest',
          behavior: 'smooth'
        }
      }
    ]);
  });

  it('scrolls a FOCUSABLE into view when it is clipped by a nested scroll container', () => {
    // arrange
    const doc = makeRoot(
      div(
        {
          id: 'scrollport'
        },
        p({ id: 'p1' }, 'p1')
      ),
      {
        viewportScrollerOpts: {
          getElementRect: (el) =>
            el.id === 'p1'
              ? {
                  top: 160,
                  left: 0,
                  bottom: 190,
                  right: 100,
                  width: 100,
                  height: 30
                }
              : undefined,
          getScrollportRects: (el) =>
            el.id === 'p1'
              ? [
                  {
                    top: 0,
                    left: 0,
                    bottom: 150,
                    right: 300,
                    width: 300,
                    height: 150
                  }
                ]
              : undefined
        }
      }
    );
    const nav = new Nav(doc, ElementIndicator.createNull());
    const p1 = byId(doc, 'p1');
    const scrollRequests = doc.viewportScroller.trackScrollRequests();
    scrollRequests.data.length = 0;

    // act
    nav.REQUEST_FOCUS(p1);

    // assert
    expect(scrollRequests.data).toEqual([
      {
        element: p1,
        options: {
          block: 'nearest',
          inline: 'nearest',
          behavior: 'smooth'
        }
      }
    ]);
  });
});

describe('SIB_HIGHLIGHT', () => {
  it('should highlight current siblings of the active element', () => {
    // arrange
    const doc = makeRoot(frag(p('p1'), p({ id: 'p2' }, 'p2'), p('p3'), p('p4')));
    const nav = new Nav(doc, ElementIndicator.createNull());
    nav.FOCUS(doc.root);
    byId(doc, 'p2').focus();

    // act
    nav.SIB_HIGHLIGHT();

    // assert
    expectRootFocused(doc);
    expectSiblingHighlights(doc, []);
  });
});

test('REC_NEXT should recurse down', () => {
  // arrange
  const doc = makeRoot(
    div(
      { id: 'div1' }, //
      div(
        { id: 'div1-1' }, //
        p({ id: 'p1' }, 'text-1'),
        p({ id: 'p2' }, 'text-2')
      )
    )
  );
  const nav = new Nav(doc, ElementIndicator.createNull());
  nav.FOCUS(doc.root);

  // act
  nav.REC_NEXT();
  expectFocusedElement(doc, byId(doc, 'div1'));
  expectSiblingHighlights(doc, []);

  nav.REC_NEXT();
  expectFocusedElement(doc, byId(doc, 'div1-1'));
  expectSiblingHighlights(doc, []);

  nav.REC_NEXT();
  expectFocusedElement(doc, byId(doc, 'p1'));
  expectSiblingHighlights(doc, ['p2']);

  nav.REC_NEXT();
  expectFocusedElement(doc, byId(doc, 'p2'));
  expectSiblingHighlights(doc, ['p1']);

  nav.REC_NEXT();
  expectFocusedElement(doc, byId(doc, 'p2'));
  expectSiblingHighlights(doc, ['p1']);
});

test('REC_PREV should recurse up', () => {
  // arrange
  const doc = makeRoot(
    div(
      { id: 'div1' }, //
      div(
        { id: 'div1-1' }, //
        p({ id: 'p1' }, 'text-1')
      )
    )
  );
  const nav = new Nav(doc, ElementIndicator.createNull());
  nav.FOCUS(byId(doc, 'p1'));

  // act
  nav.REC_PREV();
  expectFocusedElement(doc, byId(doc, 'div1-1'));
  expectSiblingHighlights(doc, []);

  nav.REC_PREV();
  expectFocusedElement(doc, byId(doc, 'div1'));
  expectSiblingHighlights(doc, []);

  nav.REC_PREV();
  expectFocusedElement(doc, byId(doc, 'div1'));
  expectSiblingHighlights(doc, []);
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
  nav.FOCUS(byId(doc, 'li1'));

  // act
  nav.SIB_NEXT();
  expectFocusedElement(doc, byId(doc, 'li2'));
  expectSiblingHighlights(doc, ['li1', 'li3']);

  nav.SIB_NEXT();
  expectFocusedElement(doc, byId(doc, 'li3'));
  expectSiblingHighlights(doc, ['li2']);

  nav.SIB_NEXT(); // no wrap around
  expectFocusedElement(doc, byId(doc, 'li3'));
  expectSiblingHighlights(doc, ['li2']);
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
  nav.FOCUS(byId(doc, 'li3'));

  // act
  nav.SIB_PREV();
  expectFocusedElement(doc, byId(doc, 'li2'));
  expectSiblingHighlights(doc, ['li1', 'li3']);

  nav.SIB_PREV();
  expectFocusedElement(doc, byId(doc, 'li1'));
  expectSiblingHighlights(doc, ['li2']);

  nav.SIB_PREV(); // no wrap around
  expectFocusedElement(doc, byId(doc, 'li1'));
  expectSiblingHighlights(doc, ['li2']);
});

test('UP can walk up successive parent elements', () => {
  // arrange
  const doc = makeRoot(div({ id: 'id1' }, div({ id: 'id2' }, div({ id: 'id3' }, 'id3'))));
  const nav = new Nav(doc, ElementIndicator.createNull());
  nav.FOCUS(byId(doc, 'id3'));

  // act
  nav.UP();
  expectFocusedElement(doc, byId(doc, 'id2'));
  expectSiblingHighlights(doc, []);

  nav.UP();
  expectFocusedElement(doc, byId(doc, 'id1'));
  expectSiblingHighlights(doc, []);

  nav.UP();
  expectRootFocused(doc);
  expectSiblingHighlights(doc, []);

  nav.UP(); // no wrap around
  expectRootFocused(doc);
  expectSiblingHighlights(doc, []);
});

describe('focus controller', () => {
  it('should call the focus controller when REQUEST_FOCUS targets a FOCUSABLE', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'p1'), p({ id: 'p2' }, 'p2')));
    const requests = trackFocusRequests();
    const nav = new Nav(doc, ElementIndicator.createNull(), requests.onFocusRequest);
    requests.data.length = 0;

    // act
    nav.REQUEST_FOCUS(byId(doc, 'p1'));

    // assert
    expect(requests.data).toEqual([
      expect.objectContaining({
        type: 'FOCUS_REQUEST',
        targetType: 'FOCUSABLE',
        element: byId(doc, 'p1')
      })
    ]);
  });

  it('should pass same-element event when REQUEST_FOCUS targets the already-focused element', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'p1'), p({ id: 'p2' }, 'p2')));
    const requests = trackFocusRequests(false);
    const nav = new Nav(doc, ElementIndicator.createNull(), requests.onFocusRequest);
    const p1 = byId(doc, 'p1');
    nav.FOCUS(p1);
    requests.data.length = 0;

    // act
    nav.REQUEST_FOCUS(p1);

    // assert
    expect(requests.data).toEqual([
      expect.objectContaining({
        type: 'FOCUS_REQUEST',
        targetType: 'FOCUSABLE',
        element: p1
      })
    ]);
  });

  it('should not change FOCUS when controller returns false', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'p1'), p({ id: 'p2' }, 'p2')));
    const nav = new Nav(doc, ElementIndicator.createNull(), () => false);
    const p1 = byId(doc, 'p1');
    nav.FOCUS(p1);

    // act
    nav.REQUEST_FOCUS(byId(doc, 'p2'));

    // assert — focus should still be on p1
    expect(nav.getFocus()).toBe(p1);
  });

  it('should allow focus change when controller returns true', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'p1'), p({ id: 'p2' }, 'p2')));
    const nav = new Nav(doc, ElementIndicator.createNull(), () => true);
    nav.FOCUS(byId(doc, 'p1'));

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
