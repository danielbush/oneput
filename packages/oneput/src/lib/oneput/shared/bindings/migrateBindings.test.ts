import { describe, expect, test } from 'vitest';
import type { KeyBindingMapSerializable } from '../../lib/bindings.js';
import { OneputAction } from '../actions/OneputAction.js';
import { migrateBindings } from './migrateBindings.js';

describe('migrateBindings', () => {
  test('version 1 toggle selection', () => {
    // arrange
    const bindings: KeyBindingMapSerializable = {
      [OneputAction.TOGGLE_SELECTION]: {
        description: 'Toggle input selection',
        bindings: ['$mod+x'],
        when: { menuOpen: false }
      }
    };

    // act
    const migrated = migrateBindings(bindings, 1);

    // assert
    expect(migrated[OneputAction.TOGGLE_SELECTION]).toEqual({
      description: 'Toggle input selection',
      bindings: ['$mod+x']
    });
  });

  test('version 2 user condition', () => {
    // arrange
    const bindings: KeyBindingMapSerializable = {
      [OneputAction.TOGGLE_SELECTION]: {
        description: 'Toggle input selection',
        bindings: ['$mod+x'],
        when: { menuOpen: false }
      }
    };

    // act
    const migrated = migrateBindings(bindings, 2);

    // assert
    expect(migrated).toBe(bindings);
  });
});
