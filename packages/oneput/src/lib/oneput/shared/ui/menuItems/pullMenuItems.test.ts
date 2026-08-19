import { afterEach, describe, expect, test } from 'vitest';
import { Controller } from '../../../controllers/controller.js';
import { cell } from '../../../lib/pull.js';
import { walk } from '../../../lib/utils.js';
import type { FChildParams, MenuItem } from '../../../types.js';
import { checkboxMenuItem } from './checkboxMenuItem.js';
import { pullToggleMenuItem } from './pullToggleMenuItem.js';

const controllers: Controller[] = [];
const mounted: (() => void)[] = [];

afterEach(() => {
  for (const unmount of mounted) unmount();
  mounted.length = 0;
  for (const ctl of controllers) ctl.destroy();
  controllers.length = 0;
});

function createNull() {
  const ctl = Controller.createNull();
  controllers.push(ctl);
  return ctl;
}

function findChild(item: MenuItem, id: string): FChildParams {
  let found: FChildParams | undefined;
  walk(item, (child) => {
    if (child.type === 'fchild' && child.id === id) found = child as FChildParams;
  });
  if (!found) throw new Error(`no fchild with id ${id}`);
  return found;
}

/** Mount a menu item child the way FChild does, and track the teardown. */
function mountChild(item: MenuItem, id: string, tag: string) {
  const child = findChild(item, id);
  const node = document.createElement(tag);
  document.body.appendChild(node);
  const cleanup = child.onMount?.(node);
  const unmount = () => {
    if (typeof cleanup === 'function') cleanup();
    node.remove();
  };
  mounted.push(unmount);
  return { node, unmount };
}

function mountToggle(item: MenuItem, id: string) {
  return mountChild(item, `${id}-title`, 'div');
}

function mountCheckbox(item: MenuItem, id: string) {
  return mountChild(item, `${id}-input`, 'input') as {
    node: HTMLInputElement;
    unmount: () => void;
  };
}

describe('pullToggleMenuItem', () => {
  test('paints the current value on mount', () => {
    // arrange
    const index = cell(1);
    const item = pullToggleMenuItem({
      id: 'when',
      label: 'Menu open',
      values: ['closed', 'open', 'always'],
      source: index,
      onToggle: index.set
    });

    // act
    const { node } = mountToggle(item, 'when');

    // assert
    expect(node.textContent).toBe('Menu open: open');
  });

  test('click cycles the value and repaints', () => {
    // arrange
    const index = cell(0);
    const item = pullToggleMenuItem({
      id: 'when',
      label: 'Menu open',
      values: ['closed', 'open', 'always'],
      source: { get: index.get },
      onToggle: index.set
    });
    const { node } = mountToggle(item, 'when');

    // act
    item.action?.(createNull());

    // assert
    expect(index.get()).toBe(1);
    expect(node.textContent).toBe('Menu open: open');
  });

  test('click wraps at the last value', () => {
    // arrange
    const index = cell(2);
    const item = pullToggleMenuItem({
      id: 'when',
      label: 'Menu open',
      values: ['closed', 'open', 'always'],
      source: { get: index.get },
      onToggle: index.set
    });
    const { node } = mountToggle(item, 'when');

    // act
    item.action?.(createNull());

    // assert
    expect(node.textContent).toBe('Menu open: closed');
  });

  test('a second row with the same source moves without a rebuild', () => {
    // arrange
    const index = cell(0);
    const values = ['closed', 'open', 'always'];
    const clicked = pullToggleMenuItem({
      id: 'clicked',
      label: 'A',
      values,
      source: index,
      onToggle: index.set
    });
    const other = pullToggleMenuItem({
      id: 'other',
      label: 'B',
      values,
      source: index,
      onToggle: index.set
    });
    mountToggle(clicked, 'clicked');
    const { node } = mountToggle(other, 'other');

    // act
    clicked.action?.(createNull());

    // assert
    expect(node.textContent).toBe('B: open');
  });

  test('unmount removes the label and stops listening', () => {
    // arrange
    const index = cell(0);
    const item = pullToggleMenuItem({
      id: 'when',
      label: 'Menu open',
      values: ['closed', 'open', 'always'],
      source: index,
      onToggle: index.set
    });
    const { node, unmount } = mountToggle(item, 'when');

    // act
    unmount();
    index.set(1);

    // assert
    expect(node.textContent).toBe('');
  });

  test('a rebuilt row paints the widget that is mounted', () => {
    // arrange
    const index = cell(0);
    const build = () =>
      pullToggleMenuItem({
        id: 'when',
        label: 'Menu open',
        values: ['closed', 'open', 'always'],
        source: { get: index.get },
        onToggle: index.set
      });
    const { node } = mountToggle(build(), 'when');
    // A rebuild reuses the node, so the later row never mounts.
    const rebuilt = build();

    // act
    rebuilt.action?.(createNull());

    // assert
    expect(node.textContent).toBe('Menu open: open');
  });

  test('a rebuilt row does nothing once the host is unmounted', () => {
    // arrange
    const index = cell(0);
    const build = () =>
      pullToggleMenuItem({
        id: 'when',
        label: 'Menu open',
        values: ['closed', 'open', 'always'],
        source: { get: index.get },
        onToggle: index.set
      });
    const { node, unmount } = mountToggle(build(), 'when');
    const rebuilt = build();

    // act
    unmount();
    rebuilt.action?.(createNull());

    // assert
    expect(index.get()).toBe(1);
    expect(node.textContent).toBe('');
  });

  test('is pinned so the filter cannot write to the title', () => {
    // arrange
    const index = cell(0);

    // act
    const item = pullToggleMenuItem({
      id: 'when',
      label: 'Menu open',
      values: ['closed', 'open'],
      source: index,
      onToggle: index.set
    });

    // assert
    expect(item.canFilter).toBe(false);
  });
});

describe('checkboxMenuItem', () => {
  test('paints the current state on mount', () => {
    // arrange
    const checked = cell(true);
    const item = checkboxMenuItem({
      id: 'box',
      textContent: 'Display mode',
      source: checked,
      action: (_, next) => checked.set(next)
    });

    // act
    const { node } = mountCheckbox(item, 'box');

    // assert
    expect(node.checked).toBe(true);
  });

  test('click flips the state and repaints', () => {
    // arrange
    const checked = cell(false);
    const item = checkboxMenuItem({
      id: 'box',
      textContent: 'Display mode',
      source: { get: checked.get },
      action: (_, next) => checked.set(next)
    });
    const { node } = mountCheckbox(item, 'box');

    // act
    item.action?.(createNull());

    // assert
    expect(checked.get()).toBe(true);
    expect(node.checked).toBe(true);
  });

  test('a write elsewhere moves the box when the source notifies', () => {
    // arrange
    const checked = cell(false);
    const item = checkboxMenuItem({
      id: 'box',
      textContent: 'Display mode',
      source: checked,
      action: (_, next) => checked.set(next)
    });
    const { node } = mountCheckbox(item, 'box');

    // act
    checked.set(true);

    // assert
    expect(node.checked).toBe(true);
  });

  test('a rebuilt row paints the widget that is mounted', () => {
    // arrange
    const checked = cell(false);
    const build = () =>
      checkboxMenuItem({
        id: 'box',
        textContent: 'Display mode',
        source: { get: checked.get },
        action: (_, next) => checked.set(next)
      });
    const { node } = mountCheckbox(build(), 'box');
    // This is the Katex shape: the click invalidates, so the row that gets
    // clicked next is a later build whose widget never mounted.
    const rebuilt = build();

    // act
    rebuilt.action?.(createNull());

    // assert
    expect(node.checked).toBe(true);
  });

  test('a rebuilt row does nothing once the host is unmounted', () => {
    // arrange
    const checked = cell(false);
    const build = () =>
      checkboxMenuItem({
        id: 'box',
        textContent: 'Display mode',
        source: { get: checked.get },
        action: (_, next) => checked.set(next)
      });
    const { node, unmount } = mountCheckbox(build(), 'box');
    const rebuilt = build();

    // act
    unmount();
    rebuilt.action?.(createNull());

    // assert
    expect(checked.get()).toBe(true);
    expect(node.checked).toBe(false);
  });

  test('unmount stops listening', () => {
    // arrange
    const checked = cell(false);
    const item = checkboxMenuItem({
      id: 'box',
      textContent: 'Display mode',
      source: checked,
      action: (_, next) => checked.set(next)
    });
    const { node, unmount } = mountCheckbox(item, 'box');

    // act
    unmount();
    checked.set(true);

    // assert
    expect(node.checked).toBe(false);
  });
});
