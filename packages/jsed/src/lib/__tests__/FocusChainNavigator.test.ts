import { describe, expect, it } from 'vitest';
import { Nav } from '../../Nav.js';
import { byId, div, em, makeRoot, p, span } from '../../test/util.js';
import { FocusChainNavigator } from '../FocusChainNavigator.js';

describe('FocusChainNavigator', () => {
  it('keeps moving back down the remembered ancestor chain', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'container' },
        div(
          { id: 'section' }, //
          p(
            { id: 'target' }, //
            span({ id: 'inline' }, 'foo')
          )
        ),
        p({ id: 'peer' }, 'bar')
      )
    );
    const nav = Nav.createNull(doc);
    const navigator = FocusChainNavigator.createNull(nav);
    nav.connect();
    const root = byId(doc, 'container');
    const section = byId(doc, 'section');
    const target = byId(doc, 'target');
    const inline = byId(doc, 'inline');

    // TODO: maybe better to test this at the EditManager level; we're assuming
    // interactions here:
    nav.REQUEST_FOCUS(target);
    navigator.handleFocusChange(nav.getFocus());
    nav.REQUEST_FOCUS(section);
    navigator.handleFocusChange(nav.getFocus());
    nav.REQUEST_FOCUS(root);
    navigator.handleFocusChange(nav.getFocus());

    // act
    navigator.moveDown();

    // assert
    expect(nav.getFocus()).toBe(section);

    // act
    navigator.moveDown();

    // assert
    expect(nav.getFocus()).toBe(target);

    // act
    navigator.moveDown();

    // assert
    expect(nav.getFocus()).toBe(inline);

    // act
    navigator.moveDown();

    // assert
    expect(nav.getFocus()).toBe(inline); // no change
  });

  it('reanchors CURRENT_MARK when focus moves off the old chain', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'container' },
        div(
          { id: 'left' }, //
          p({ id: 'left-leaf' }, 'foo')
        ),
        div(
          { id: 'right' }, //
          p({ id: 'right-leaf' }, 'bar')
        )
      )
    );
    const nav = Nav.createNull(doc);
    const navigator = FocusChainNavigator.createNull(nav);
    nav.connect();
    const leftLeaf = byId(doc, 'left-leaf');
    const right = byId(doc, 'right');
    const rightLeaf = byId(doc, 'right-leaf');

    // TODO: maybe better to test this at the EditManager level; we're assuming
    // interactions here:
    nav.REQUEST_FOCUS(leftLeaf);
    navigator.handleFocusChange(nav.getFocus());
    nav.REQUEST_FOCUS(right);
    navigator.handleFocusChange(nav.getFocus());

    // act
    navigator.moveDown();

    // assert
    expect(nav.getFocus()).toBe(rightLeaf);
  });

  it('walks the current subtree when focus is already at CURRENT_MARK', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'container' }, //
        p({ id: 'first' }, 'foo'), //
        p({ id: 'second' }, 'bar')
      )
    );
    const nav = Nav.createNull(doc);
    const navigator = FocusChainNavigator.createNull(nav);
    nav.connect();
    const first = byId(doc, 'first');
    nav.REQUEST_FOCUS(first);
    // Set currentMark
    navigator.handleFocusChange(nav.getFocus());

    // act
    navigator.moveDown();

    // assert
    expect(nav.getFocus()).toBe(first);
  });

  it('skips IGNORABLE subtrees when walking down the current line', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'container' },
        div(
          { class: 'jsed-ignore' }, //
          p({ id: 'ignored-leaf' }, 'hidden')
        ),
        p({ id: 'visible-leaf' }, 'shown')
      )
    );
    const nav = Nav.createNull(doc);
    const navigator = FocusChainNavigator.createNull(nav);
    nav.connect();
    const container = byId(doc, 'container');
    const visibleLeaf = byId(doc, 'visible-leaf');

    nav.REQUEST_FOCUS(container);
    navigator.handleFocusChange(nav.getFocus());

    // act
    navigator.moveDown();

    // assert
    expect(nav.getFocus()).toBe(visibleLeaf);
  });

  it('re-enters the same child chain after moving back up', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'container' }, //
        p({ id: 'first' }, 'foo'),
        p({ id: 'second' }, 'bar')
      )
    );
    let navigator: FocusChainNavigator | undefined;
    const nav = Nav.createNull(doc, undefined, (focus) => navigator?.handleFocusChange(focus));
    navigator = FocusChainNavigator.createNull(nav);
    nav.connect();
    const container = byId(doc, 'container');
    const second = byId(doc, 'second');

    nav.REQUEST_FOCUS(second);

    // act + assert
    navigator.moveUp();
    expect(nav.getFocus()).toBe(container);

    navigator.moveDown();
    expect(nav.getFocus()).toBe(second);
  });

  it('does not traverse to a sibling on repeated moveDown', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'line' },
        em({ id: 'em1', style: 'display:inline;' }, 'foo'),
        em({ id: 'em2', style: 'display:inline;' }, 'bar')
      )
    );
    let navigator: FocusChainNavigator | undefined;
    const nav = Nav.createNull(doc, undefined, (focus) => navigator?.handleFocusChange(focus));
    navigator = FocusChainNavigator.createNull(nav);
    nav.connect();
    const line = byId(doc, 'line');
    const em1 = byId(doc, 'em1');

    nav.REQUEST_FOCUS(line);

    // act + assert
    navigator.moveDown();
    expect(nav.getFocus()).toBe(em1);

    navigator.moveDown();
    expect(nav.getFocus()).toBe(em1);
  });
});
