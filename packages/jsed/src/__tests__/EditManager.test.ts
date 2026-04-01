import { describe, expect, it, vi } from 'vitest';
import { EditManager } from '../EditManager.js';
import { byId, makeRoot, p } from '../test/util.js';
import type { UserInput } from '../UserInput.js';

function makeUserInput(): UserInput {
  return {
    setInputValue: vi.fn(async () => {}),
    selectAll: vi.fn(),
    moveCursorToBeginning: vi.fn(),
    moveCursorToEnd: vi.fn(),
    getRange: vi.fn(() => [0, 0] as [number | null, number | null]),
    focus: vi.fn(),
    enable: vi.fn(),
    setPlaceholder: vi.fn(),
    resetPlaceholder: vi.fn()
  };
}

describe('EditManager', () => {
  it('places the CURSOR on the first TOKEN when editing from a FOCUSABLE', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
    const editManager = EditManager.create({
      document: doc,
      userInput: makeUserInput(),
      onError: vi.fn()
    });

    // act
    const result = editManager.edit(byId(doc, 'p1'));

    // assert
    expect(result.isOk()).toBe(true);
    expect(editManager.cursor?.getToken().textContent?.trim()).toBe('foo');

    editManager.destroy();
  });
});
