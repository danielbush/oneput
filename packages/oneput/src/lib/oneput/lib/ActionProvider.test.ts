import { describe, expect, test } from 'vitest';
import { ActionProvider, type AppActionProvider } from './ActionProvider.js';
import { stdMenuItem } from '../shared/ui/menuItems/stdMenuItem.js';

const Command = {
  SAVE: 'SAVE',
  DELETE: 'DELETE'
} as const;

describe('ActionProvider', () => {
  test('implements provider interface', () => {
    // arrange
    const provider: AppActionProvider<(typeof Command)[keyof typeof Command]> =
      ActionProvider.create({
        [Command.SAVE]: {
          description: 'Save',
          action: () => {}
        }
      });

    // act
    const actions = provider.filter([Command.SAVE]).getActions();

    // assert
    expect(Object.keys(actions)).toEqual([Command.SAVE]);
  });

  test('filtered actions and menu items', () => {
    // arrange
    const provider = ActionProvider.create({
      [Command.SAVE]: {
        description: 'Save',
        action: () => {},
        binding: { bindings: ['$mod+s'] },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'SAVE_ROW',
            textContent: 'Save',
            action
          })
      },
      [Command.DELETE]: {
        description: 'Delete',
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
    const actions = provider.getActions();
    const bindings = provider.getBindings();
    const menuItems = provider.getMenuItems([Command.SAVE, Command.DELETE]);

    // assert
    expect(Object.keys(actions)).toEqual([Command.SAVE]);
    expect(actions[Command.SAVE].binding?.bindings).toEqual(['$mod+s']);
    expect(actions[Command.SAVE].binding?.description).toEqual('Save');
    expect(Object.keys(bindings)).toEqual([Command.SAVE]);
    expect(bindings[Command.SAVE].bindings).toEqual(['$mod+s']);
    expect(bindings[Command.SAVE].description).toEqual('Save');
    expect(bindings[Command.SAVE].action).toBe(actions[Command.SAVE].action);
    expect(menuItems.map((item) => item && item.id)).toEqual(['SAVE_ROW', undefined]);
  });

  test('menu item predicates', () => {
    // arrange
    const provider = ActionProvider.create({
      [Command.DELETE]: {
        description: 'Delete',
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
    const actions = provider.getActions();
    const menuItems = provider.getMenuItems([Command.DELETE]);

    // assert
    expect(actions[Command.DELETE]).toBeDefined();
    expect(menuItems).toEqual([undefined]);
  });
});
