import { describe, expect, test } from 'vitest';
import { ActionCatalog, type AppActionCatalog } from './ActionCatalog.js';
import { stdMenuItem } from '../shared/ui/menuItems/stdMenuItem.js';

const Command = {
  SAVE: 'SAVE',
  DELETE: 'DELETE'
} as const;

describe('ActionCatalog', () => {
  test('implements catalog interface', () => {
    // arrange
    const catalog: AppActionCatalog<(typeof Command)[keyof typeof Command]> = ActionCatalog.create({
      [Command.SAVE]: {
        action: () => {}
      }
    });

    // act
    const actions = catalog.filter([Command.SAVE]).getActions();

    // assert
    expect(Object.keys(actions)).toEqual([Command.SAVE]);
  });

  test('filtered actions and menu items', () => {
    // arrange
    const catalog = ActionCatalog.create({
      [Command.SAVE]: {
        action: () => {},
        binding: { bindings: ['$mod+s'], description: 'Save' },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'SAVE_ROW',
            textContent: 'Save',
            action
          })
      },
      [Command.DELETE]: {
        action: () => {},
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'DELETE_ROW',
            textContent: 'Delete',
            action
          })
      }
    }).filter([Command.SAVE]);

    // act
    const actions = catalog.getActions();
    const bindings = catalog.getBindings();
    const menuItems = catalog.getMenuItems([Command.SAVE, Command.DELETE]);

    // assert
    expect(Object.keys(actions)).toEqual([Command.SAVE]);
    expect(actions[Command.SAVE].binding?.bindings).toEqual(['$mod+s']);
    expect(Object.keys(bindings)).toEqual([Command.SAVE]);
    expect(bindings[Command.SAVE].bindings).toEqual(['$mod+s']);
    expect(bindings[Command.SAVE].action).toBe(actions[Command.SAVE].action);
    expect(menuItems.map((item) => item && item.id)).toEqual(['SAVE_ROW', undefined]);
  });

  test('menu item predicates', () => {
    // arrange
    const catalog = ActionCatalog.create({
      [Command.DELETE]: {
        action: () => {},
        canShowMenuItem: () => false,
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'DELETE_ROW',
            textContent: 'Delete',
            action
          })
      }
    });

    // act
    const actions = catalog.getActions();
    const menuItems = catalog.getMenuItems([Command.DELETE]);

    // assert
    expect(actions[Command.DELETE]).toBeDefined();
    expect(menuItems).toEqual([undefined]);
  });
});
