import { describe, it, expect } from 'vitest';
import {
  KeyEventBindings,
  findKeyConflicts,
  type KeyEvent,
  type KeyBindingMap
} from './bindings.js';

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
  bindings: Record<string, { description: string; bindings: string[]; when?: { menuOpen?: boolean } }>
): KeyBindingMap {
  return Object.entries(bindings).reduce((acc, [actionId, { description, bindings, when }]) => {
    acc[actionId] = {
      action: () => {},
      description,
      bindings,
      when
    };
    return acc;
  }, {} as KeyBindingMap);
}

describe('KeyEventBindings', () => {
  describe('addBinding', () => {
    it('should store the new binding', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({ save: { description: 'Save', bindings: ['$mod+s'] } })
      );

      // act
      bindings.addBinding('save', [keyEvent('s', { altKey: true })]);

      // assert
      expect(bindings.keyBindingMap).toEqual({
        save: {
          action: expect.any(Function),
          description: 'Save',
          bindings: ['$mod+s', 'Alt+s']
        }
      });
    });
  });

  describe('removeBinding', () => {
    it('should remove the binding', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({ save: { description: 'Save', bindings: ['$mod+s', 'Alt+s'] } })
      );

      // act
      bindings.removeBinding('save', 'Alt+s');

      // assert
      expect(bindings.keyBindingMap).toEqual({
        save: {
          action: expect.any(Function),
          description: 'Save',
          bindings: ['$mod+s']
        }
      });
    });
  });

  describe('addBinding duplicate detection', () => {
    it('rejects a binding that already exists — macOS ($mod = Meta)', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({ save: { description: 'Save', bindings: ['$mod+s'] } }),
        true
      );

      // act
      const result = bindings.addBinding('save', [keyEvent('s', { metaKey: true })]);

      // assert
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Binding already exists');
    });

    it('rejects a binding that already exists — Linux/Windows ($mod = Control)', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({ save: { description: 'Save', bindings: ['$mod+s'] } }),
        false
      );

      // act
      const result = bindings.addBinding('save', [keyEvent('s', { controlKey: true })]);

      // assert
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Binding already exists');
    });

    it('allows adding a non-conflicting binding — macOS', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({
          save: { description: 'Save', bindings: ['$mod+s'] },
          open: { description: 'Open', bindings: [] }
        }),
        true
      );

      // act
      const result = bindings.addBinding('open', [keyEvent('o', { metaKey: true })]);

      // assert
      expect(result.isOk()).toBe(true);
      expect(bindings.keyBindingMap['open'].bindings).toHaveLength(1);
    });

    it('allows adding a non-conflicting binding — Linux/Windows', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({
          save: { description: 'Save', bindings: ['$mod+s'] },
          open: { description: 'Open', bindings: [] }
        }),
        false
      );

      // act
      const result = bindings.addBinding('open', [keyEvent('o', { controlKey: true })]);

      // assert
      expect(result.isOk()).toBe(true);
      expect(bindings.keyBindingMap['open'].bindings).toHaveLength(1);
    });
  });

  describe('case-insensitive key matching', () => {
    it('treats "m" and "M" as the same key — macOS', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({ actionA: { description: 'Action A', bindings: ['$mod+m'] } }),
        true
      );

      // act
      const result = bindings.addBinding('actionA', [keyEvent('M', { metaKey: true })]);

      // assert
      expect(result.isErr()).toBe(true);
    });

    it('treats "m" and "M" as the same key — Linux/Windows', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({ actionA: { description: 'Action A', bindings: ['$mod+m'] } }),
        false
      );

      // act
      const result = bindings.addBinding('actionA', [keyEvent('M', { controlKey: true })]);

      // assert
      expect(result.isErr()).toBe(true);
    });
  });

  describe('removeBinding', () => {
    it('removes a specific binding from an action', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({ close: { description: 'Close', bindings: ['Escape', '$mod+w'] } }),
        false
      );

      // act
      bindings.removeBinding('close', 'Escape');

      // assert
      expect(bindings.keyBindingMap['close'].bindings).toEqual(['$mod+w']);
    });
  });

  describe('find', () => {
    it('returns matching bindings for a key sequence — macOS', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({
          save: { description: 'Save', bindings: ['$mod+s'] },
          open: { description: 'Open', bindings: ['$mod+o'] }
        }),
        true
      );

      // act
      const found = bindings.find([keyEvent('s', { metaKey: true })]);

      // assert
      expect(found).toHaveLength(1);
      expect(found[0].description).toBe('Save');
    });

    it('returns matching bindings for a key sequence — Linux/Windows', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({
          save: { description: 'Save', bindings: ['$mod+s'] },
          open: { description: 'Open', bindings: ['$mod+o'] }
        }),
        false
      );

      // act
      const found = bindings.find([keyEvent('s', { controlKey: true })]);

      // assert
      expect(found).toHaveLength(1);
      expect(found[0].description).toBe('Save');
    });
  });

  describe('keyBindingMap round-trip', () => {
    it('converts KeyEvents back to tinykeys strings — macOS uses $mod for Meta', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({ save: { description: 'Save', bindings: ['$mod+s'] } }),
        true
      );

      // act
      bindings.addBinding('save', [keyEvent('x', { metaKey: true, shiftKey: true })]);
      const map = bindings.keyBindingMap;

      // assert
      expect(map['save'].bindings).toContain('$mod+s');
      expect(map['save'].bindings).toContain('$mod+Shift+x');
    });

    it('converts KeyEvents back to tinykeys strings — Linux/Windows uses $mod for Control', () => {
      // arrange
      const bindings = KeyEventBindings.create(
        createBindingMap({ save: { description: 'Save', bindings: ['$mod+s'] } }),
        false
      );

      // act
      bindings.addBinding('save', [keyEvent('x', { controlKey: true, shiftKey: true })]);
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
      const actions = { save: () => {}, open: () => {} };

      // act
      const bindings = KeyEventBindings.create(original, false);
      const serialized = bindings.toSerializable();
      const restored = KeyEventBindings.fromSerializable(serialized, actions, false);

      // assert
      expect(restored.keyBindingMap['save'].bindings).toEqual(original['save'].bindings);
      expect(restored.keyBindingMap['open'].bindings).toEqual(original['open'].bindings);
      expect(restored.keyBindingMap['save'].description).toBe('Save file');
    });
  });
});

describe('findKeyConflicts', () => {
  it('removes conflicting key from defaults and reports the conflict', () => {
    // arrange
    const defaults = createBindingMap({
      hideOneput: { description: 'Hide Oneput', bindings: ['$mod+h'] }
    });
    const overrides = createBindingMap({
      PREV_TOKEN: { description: 'Move to previous token', bindings: ['$mod+h'] }
    });

    // act
    const { cleanedDefaults, conflicts } = findKeyConflicts(defaults, overrides);

    // assert
    expect(conflicts).toEqual([
      { defaultActionId: 'hideOneput', overrideActionId: 'PREV_TOKEN', key: '$mod+h' }
    ]);
    expect(cleanedDefaults['hideOneput']).toBeUndefined();
  });

  it('preserves non-conflicting keys on the same default action', () => {
    // arrange
    const defaults = createBindingMap({
      closeMenu: { description: 'Close menu', bindings: ['$mod+b', 'Escape'] }
    });
    const overrides = createBindingMap({
      TOGGLE: { description: 'Toggle', bindings: ['Escape'] }
    });

    // act
    const { cleanedDefaults, conflicts } = findKeyConflicts(defaults, overrides);

    // assert
    expect(conflicts).toHaveLength(1);
    expect(cleanedDefaults['closeMenu'].bindings).toEqual(['$mod+b']);
  });

  it('returns empty conflicts when keys do not overlap', () => {
    // arrange
    const defaults = createBindingMap({
      openMenu: { description: 'Open menu', bindings: ['$mod+b'] }
    });
    const overrides = createBindingMap({
      NEXT_TOKEN: { description: 'Next token', bindings: ['$mod+l'] }
    });

    // act
    const { cleanedDefaults, conflicts } = findKeyConflicts(defaults, overrides);

    // assert
    expect(conflicts).toEqual([]);
    expect(cleanedDefaults['openMenu'].bindings).toEqual(['$mod+b']);
  });

  it('allows same key when when-conditions are mutually exclusive', () => {
    // arrange
    const defaults = createBindingMap({
      focusPrev: { description: 'Focus previous', bindings: ['$mod+k'], when: { menuOpen: true } }
    });
    const overrides = createBindingMap({
      SIB_PREV: { description: 'Previous sibling', bindings: ['$mod+k'], when: { menuOpen: false } }
    });

    // act
    const { cleanedDefaults, conflicts } = findKeyConflicts(defaults, overrides);

    // assert
    expect(conflicts).toEqual([]);
    expect(cleanedDefaults['focusPrev'].bindings).toEqual(['$mod+k']);
  });
});
