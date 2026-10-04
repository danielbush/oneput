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

/**
 * Mount a menu item child the way FChild does, and track the teardown.
 *
 * `ctl` is the Oneput instance that owns the node. Clicks must use the same
 * `ctl` to reach the widget.
 */
function mountChild(item: MenuItem, id: string, tag: string, ctl: Controller) {
  const child = findChild(item, id);
  const node = document.createElement(tag);
  document.body.appendChild(node);
  const cleanup = child.onMount?.(node, { pull: ctl.pull });
  const unmount = () => {
    if (typeof cleanup === 'function') cleanup();
    node.remove();
  };
  mounted.push(unmount);
  return { node, unmount };
}

function mountToggle(item: MenuItem, id: string, ctl: Controller) {
  return mountChild(item, `${id}-value`, 'div', ctl);
}

/** The checkbox paints in a new task after a click (see checkboxMenuItem). */
function nextTask() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function mountCheckbox(item: MenuItem, id: string, ctl: Controller) {
  return mountChild(item, `${id}-input`, 'input', ctl) as {
    node: HTMLInputElement;
    unmount: () => void;
  };
}

describe('pullToggleMenuItem', () => {
  test('paints the current value on mount', () => {
    // arrange
    const ctl = createNull();
    const index = cell(1);
    const item = pullToggleMenuItem({
      id: 'when',
      label: 'Menu open',
      values: ['closed', 'open', 'always'],
      source: index,
      onToggle: index.set
    });

    // act
    const { node } = mountToggle(item, 'when', ctl);

    // assert
    expect(node.textContent).toBe('open');
  });

  test('click cycles the value and repaints', () => {
    // arrange
    const ctl = createNull();
    const index = cell(0);
    const item = pullToggleMenuItem({
      id: 'when',
      label: 'Menu open',
      values: ['closed', 'open', 'always'],
      source: { get: index.get },
      onToggle: index.set
    });
    const { node } = mountToggle(item, 'when', ctl);

    // act
    item.action?.(ctl);

    // assert
    expect(index.get()).toBe(1);
    expect(node.textContent).toBe('open');
  });

  test('click wraps at the last value', () => {
    // arrange
    const ctl = createNull();
    const index = cell(2);
    const item = pullToggleMenuItem({
      id: 'when',
      label: 'Menu open',
      values: ['closed', 'open', 'always'],
      source: { get: index.get },
      onToggle: index.set
    });
    const { node } = mountToggle(item, 'when', ctl);

    // act
    item.action?.(ctl);

    // assert
    expect(node.textContent).toBe('closed');
  });

  test('a second row with the same source moves without a rebuild', () => {
    // arrange
    const ctl = createNull();
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
    mountToggle(clicked, 'clicked', ctl);
    const { node } = mountToggle(other, 'other', ctl);

    // act
    clicked.action?.(ctl);

    // assert
    expect(node.textContent).toBe('open');
  });

  test('unmount removes the value and stops listening', () => {
    // arrange
    const ctl = createNull();
    const index = cell(0);
    const item = pullToggleMenuItem({
      id: 'when',
      label: 'Menu open',
      values: ['closed', 'open', 'always'],
      source: index,
      onToggle: index.set
    });
    const { node, unmount } = mountToggle(item, 'when', ctl);

    // act
    unmount();
    index.set(1);

    // assert
    expect(node.textContent).toBe('');
  });

  test('a rebuilt row paints the widget that is mounted', () => {
    // arrange
    const ctl = createNull();
    const index = cell(0);
    const build = () =>
      pullToggleMenuItem({
        id: 'when',
        label: 'Menu open',
        values: ['closed', 'open', 'always'],
        source: { get: index.get },
        onToggle: index.set
      });
    const { node } = mountToggle(build(), 'when', ctl);
    // A rebuild reuses the node, so the later row never mounts.
    const rebuilt = build();

    // act
    rebuilt.action?.(ctl);

    // assert
    expect(node.textContent).toBe('open');
  });

  test('a rebuilt row does nothing once the host is unmounted', () => {
    // arrange
    const ctl = createNull();
    const index = cell(0);
    const build = () =>
      pullToggleMenuItem({
        id: 'when',
        label: 'Menu open',
        values: ['closed', 'open', 'always'],
        source: { get: index.get },
        onToggle: index.set
      });
    const { node, unmount } = mountToggle(build(), 'when', ctl);
    const rebuilt = build();

    // act
    unmount();
    rebuilt.action?.(ctl);

    // assert
    expect(index.get()).toBe(1);
    expect(node.textContent).toBe('');
  });

  test('leaves the title to Svelte so the row still filters', () => {
    // arrange
    const index = cell(0);
    const item = pullToggleMenuItem({
      id: 'when',
      label: 'Menu open',
      values: ['closed', 'open'],
      source: index,
      onToggle: index.set
    });

    // act
    const title = findChild(item, 'when-title');

    // assert
    expect(title.textContent).toBe('Menu open');
    expect(item.canFilter).toBeUndefined();
  });
});

describe('checkboxMenuItem', () => {
  test('paints the current state on mount', () => {
    // arrange
    const ctl = createNull();
    const checked = cell(true);
    const item = checkboxMenuItem({
      id: 'box',
      textContent: 'Display mode',
      source: checked,
      action: (_, next) => checked.set(next)
    });

    // act
    const { node } = mountCheckbox(item, 'box', ctl);

    // assert
    expect(node.checked).toBe(true);
  });

  test('click flips the state and repaints', async () => {
    // arrange
    const ctl = createNull();
    const checked = cell(false);
    const item = checkboxMenuItem({
      id: 'box',
      textContent: 'Display mode',
      source: { get: checked.get },
      action: (_, next) => checked.set(next)
    });
    const { node } = mountCheckbox(item, 'box', ctl);

    // act
    item.action?.(ctl);
    await nextTask();

    // assert
    expect(checked.get()).toBe(true);
    expect(node.checked).toBe(true);
  });

  test('a write elsewhere moves the box when the source notifies', () => {
    // arrange
    const ctl = createNull();
    const checked = cell(false);
    const item = checkboxMenuItem({
      id: 'box',
      textContent: 'Display mode',
      source: checked,
      action: (_, next) => checked.set(next)
    });
    const { node } = mountCheckbox(item, 'box', ctl);

    // act
    checked.set(true);

    // assert
    expect(node.checked).toBe(true);
  });

  test('a rebuilt row paints the widget that is mounted', async () => {
    // arrange
    const ctl = createNull();
    const checked = cell(false);
    const build = () =>
      checkboxMenuItem({
        id: 'box',
        textContent: 'Display mode',
        source: { get: checked.get },
        action: (_, next) => checked.set(next)
      });
    const { node } = mountCheckbox(build(), 'box', ctl);
    // This is the Katex shape: the click invalidates, so the row that gets
    // clicked next is a later build whose widget never mounted.
    const rebuilt = build();

    // act
    rebuilt.action?.(ctl);
    await nextTask();

    // assert
    expect(node.checked).toBe(true);
  });

  test('a rebuilt row does nothing once the host is unmounted', async () => {
    // arrange
    const ctl = createNull();
    const checked = cell(false);
    const build = () =>
      checkboxMenuItem({
        id: 'box',
        textContent: 'Display mode',
        source: { get: checked.get },
        action: (_, next) => checked.set(next)
      });
    const { node, unmount } = mountCheckbox(build(), 'box', ctl);
    const rebuilt = build();

    // act
    unmount();
    rebuilt.action?.(ctl);
    await nextTask();

    // assert
    expect(checked.get()).toBe(true);
    expect(node.checked).toBe(false);
  });

  test('unmount stops listening', () => {
    // arrange
    const ctl = createNull();
    const checked = cell(false);
    const item = checkboxMenuItem({
      id: 'box',
      textContent: 'Display mode',
      source: checked,
      action: (_, next) => checked.set(next)
    });
    const { node, unmount } = mountCheckbox(item, 'box', ctl);

    // act
    unmount();
    checked.set(true);

    // assert
    expect(node.checked).toBe(false);
  });

  test('a click in one instance does not paint another', async () => {
    // arrange
    const ctlA = createNull();
    const ctlB = createNull();
    let checkedA = false;
    let checkedB = false;
    const itemA = checkboxMenuItem({
      id: 'box',
      textContent: 'Display mode',
      source: { get: () => checkedA },
      action: (_, next) => (checkedA = next)
    });
    const itemB = checkboxMenuItem({
      id: 'box',
      textContent: 'Display mode',
      source: { get: () => checkedB },
      action: (_, next) => (checkedB = next)
    });
    mountCheckbox(itemA, 'box', ctlA);
    const { node: nodeB } = mountCheckbox(itemB, 'box', ctlB);
    // Change B's state without a click on B, so only a paint can show it.
    checkedB = true;

    // act
    itemA.action?.(ctlA);
    await nextTask();

    // assert
    expect(nodeB.checked).toBe(false);
  });
});
