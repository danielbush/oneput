import { describe, expect, it } from 'vitest';
import { Nav } from '../../Nav.js';
import { byId, div, makeRoot, p, span } from '../../test/util.js';
import { FocusChainNavigator } from '../edit/FocusChainNavigator.js';

describe('FocusChainNavigator', () => {
  it('keeps moving back down the remembered ancestor chain', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'container' },
        div({ id: 'section' }, //
          p({ id: 'target' }, //
            span({ id: 'inline' }, 'foo'))),
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
        div({ id: 'left' }, //
          p({ id: 'left-leaf' }, 'foo')),
        div({ id: 'right' }, //
          p({ id: 'right-leaf' }, 'bar'))
      )
    );
    const nav = Nav.createNull(doc);
    const navigator = FocusChainNavigator.createNull(nav);
    nav.connect();
    const leftLeaf = byId(doc, 'left-leaf');
    const right = byId(doc, 'right');
    const rightLeaf = byId(doc, 'right-leaf');

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
      div({ id: 'container' }, //
        p({ id: 'first' }, 'foo'), //
        p({ id: 'second' }, 'bar'))
    );
    const nav = Nav.createNull(doc);
    const navigator = FocusChainNavigator.createNull(nav);
    nav.connect();
    const first = byId(doc, 'first');

    nav.REQUEST_FOCUS(first);
    navigator.handleFocusChange(nav.getFocus());

    // act
    navigator.moveDown();

    // assert
    expect(nav.getFocus()).toBe(first);
  });
});
