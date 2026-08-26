import type { KeyBindingMapSerializable } from '../../lib/bindings.js';
import { OneputAction } from '../actions/OneputAction.js';

export const CURRENT_BINDINGS_DB_VERSION = 2;

/** Apply persisted binding changes introduced by newer Oneput versions. */
export function migrateBindings(
  bindings: KeyBindingMapSerializable,
  oldVersion: number
): KeyBindingMapSerializable {
  if (oldVersion >= 2) {
    return bindings;
  }

  const toggleSelection = bindings[OneputAction.TOGGLE_SELECTION];
  if (toggleSelection?.when?.menuOpen !== false) {
    return bindings;
  }

  const { when: _oldWhen, ...migratedToggleSelection } = toggleSelection;
  return {
    ...bindings,
    [OneputAction.TOGGLE_SELECTION]: migratedToggleSelection
  };
}
