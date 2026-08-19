import { afterEach, describe, expect, test } from 'vitest';
import { Controller } from '../../../controllers/controller.js';
import { walk } from '../../../lib/utils.js';
import type { FChildParams, MenuItem } from '../../../types.js';
import { toggleMenuItem } from './toggleMenuItem.js';

const controllers: Controller[] = [];

afterEach(() => {
  for (const ctl of controllers) ctl.destroy();
  controllers.length = 0;
});

function createNull() {
  const ctl = Controller.createNull();
  controllers.push(ctl);
  return ctl;
}

/** The value is the only right-hand fchild carrying text. */
function texts(item: MenuItem): string[] {
  const found: string[] = [];
  walk(item, (child) => {
    if (child.type === 'fchild' && (child as FChildParams).textContent) {
      found.push((child as FChildParams).textContent!);
    }
  });
  return found;
}

describe('toggleMenuItem', () => {
  test('title is the label, right is the snapshot value', () => {
    // arrange
    const item = toggleMenuItem({
      id: 'neighbors',
      label: 'Neighbors',
      values: ['Hidden', 'Shown'],
      index: 1,
      onToggle: () => {},
      bottom: false
    });

    // act
    const rendered = texts(item);

    // assert
    expect(rendered).toEqual(['Neighbors', 'Shown']);
  });

  test('click reports the next index', () => {
    // arrange
    const reported: number[] = [];
    const item = toggleMenuItem({
      id: 'neighbors',
      label: 'Neighbors',
      values: ['Hidden', 'Shown'],
      index: 1,
      onToggle: (next) => reported.push(next)
    });

    // act
    item.action?.(createNull());

    // assert
    expect(reported).toEqual([0]);
  });

  test('the value does not move until the caller rebuilds', () => {
    // arrange
    let index = 0;
    const build = () =>
      toggleMenuItem({
        id: 'neighbors',
        label: 'Neighbors',
        values: ['Hidden', 'Shown'],
        index,
        onToggle: (next) => {
          index = next;
        },
        bottom: false
      });
    const item = build();

    // act
    item.action?.(createNull());

    // assert
    expect(texts(item)).toEqual(['Neighbors', 'Hidden']);
    expect(texts(build())).toEqual(['Neighbors', 'Shown']);
  });
});
