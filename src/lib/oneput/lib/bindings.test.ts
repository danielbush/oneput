import { describe, it, expect } from 'vitest';
import { KeyEventBindings, type KeyEvent, type KeyBindingMap } from './bindings.js';

/**
 * Helper to create a KeyEvent with sensible defaults (all modifiers false).
 */
function keyEvent(key: string, modifiers: Partial<KeyEvent> = {}): KeyEvent {
  return {
    key,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    controlKey: false,
    ...modifiers
  };
}

/**
 * Helper to create a minimal KeyBindingMap for testing.
 */
function createBindingMap(
  bindings: Record<string, { description: string; bindings: string[] }>
): KeyBindingMap {
  return Object.entries(bindings).reduce((acc, [actionId, { description, bindings }]) => {
    acc[actionId] = {
      action: () => {},
      description,
      bindings
    };
    return acc;
  }, {} as KeyBindingMap);
}

describe('KeyEventBindings', () => {
  describe('addBinding duplicate detection', () => {
    it('rejects a binding that already exists for another action', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({
          save: { description: 'Save', bindings: ['$mod+s'] }
        })
      );

      // act
      const result = bindings.addBinding('save', [keyEvent('s', { metaKey: true })]);

      // assert
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Binding already exists');
    });

    it('allows adding a binding that does not conflict', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({
          save: { description: 'Save', bindings: ['$mod+s'] },
          open: { description: 'Open', bindings: [] }
        })
      );

      // act
      const result = bindings.addBinding('open', [keyEvent('o', { metaKey: true })]);

      // assert
      expect(result.isOk()).toBe(true);
      expect(bindings.keyBindingMap['open'].bindings).toHaveLength(1);
    });
  });

  describe('case-insensitive key matching', () => {
    it('treats "m" and "M" as the same key for duplicate detection', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({
          actionA: { description: 'Action A', bindings: ['$mod+m'] }
        })
      );

      // act
      const result = bindings.addBinding('actionA', [keyEvent('M', { metaKey: true })]);

      // assert
      expect(result.isErr()).toBe(true);
    });
  });

  describe('removeBinding', () => {
    it('removes a specific binding from an action', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({
          close: { description: 'Close', bindings: ['Escape', '$mod+w'] }
        })
      );

      // act
      bindings.removeBinding('close', 'Escape');

      // assert
      const remaining = bindings.keyBindingMap['close'].bindings;
      expect(remaining).toEqual(['$mod+w']);
    });
  });

  describe('find', () => {
    it('returns matching bindings for a key sequence', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({
          save: { description: 'Save', bindings: ['$mod+s'] },
          open: { description: 'Open', bindings: ['$mod+o'] }
        })
      );

      // act
      const found = bindings.find([keyEvent('s', { metaKey: true })]);

      // assert
      expect(found).toHaveLength(1);
      expect(found[0].description).toBe('Save');
    });
  });

  describe('keyBindingMap', () => {
    it('converts internal KeyEvents back to tinykeys binding strings', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({
          save: { description: 'Save', bindings: ['$mod+s'] }
        })
      );

      // act
      bindings.addBinding('save', [keyEvent('x', { metaKey: true, shiftKey: true })]);
      const map = bindings.keyBindingMap;

      // assert
      expect(map['save'].bindings).toContain('$mod+s');
      expect(map['save'].bindings).toContain('$mod+Shift+x');
    });
  });

  describe('serialization round-trip', () => {
    it('preserves bindings through toSerializable/fromSerializable', () => {
      // arrange
      const original = createBindingMap({
        save: { description: 'Save file', bindings: ['$mod+s', '$mod+Shift+s'] },
        open: { description: 'Open file', bindings: ['$mod+o'] }
      });
      const actions = {
        save: () => {},
        open: () => {}
      };

      // act
      const bindings = KeyEventBindings.create(original);
      const serialized = bindings.toSerializable();
      const restored = KeyEventBindings.fromSerializable(serialized, actions);

      // assert
      expect(restored.keyBindingMap['save'].bindings).toEqual(original['save'].bindings);
      expect(restored.keyBindingMap['open'].bindings).toEqual(original['open'].bindings);
      expect(restored.keyBindingMap['save'].description).toBe('Save file');
    });
  });
});
