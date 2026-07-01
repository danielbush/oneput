import { describe, expect, it, test } from 'vitest';
import { Controller } from '@oneput/oneput';
import { byId, frag, makeRoot, p } from '../../../../test/util.js';
import { EditorState, type EditorElementChangeEvent } from '../../EditorState.js';
import type { JsedDocument } from '../../../../JsedDocument.js';
import { isDeletedElement } from '../../../../lib/core/taxonomy.js';
import { Delete } from '../Delete.js';

/**
 * Record-level tests: drive {@link Delete} directly against a constructed
 * `EditorState`, calling `run` / `undo` / `redo` ourselves rather than going
 * through the `EditorFocusOps` facade. See `InsertAfter.test.ts` for the
 * rationale.
 */
function getEditorState(doc: JsedDocument): EditorState {
  const state = EditorState.createNull({
    document: doc,
    userInput: Controller.createNull().input
  });
  state.start();
  return state;
}

describe('Delete.run', () => {
  it('deletes the focused element and focuses the next FOCUSABLE', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');

    // act
    const record = Delete.run(state);

    // assert
    expect(record).toBeDefined();
    expect(doc.root.contains(p1)).toBe(false);
    expect(doc.root.children).toHaveLength(2);
    expect(isDeletedElement(doc.root.children[0])).toBe(true);
    expect(doc.root.children[1]).toBe(p2);
    expect(state.nav.getFocus()).toBe(p2);

    state.destroy();
  });

  it('falls back to the previous FOCUSABLE when there is no next', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');
    state.nav.REQUEST_FOCUS(p2);

    // act
    const record = Delete.run(state);

    // assert
    expect(record).toBeDefined();
    expect(doc.root.contains(p2)).toBe(false);
    expect(doc.root.children).toHaveLength(2);
    expect(doc.root.children[0]).toBe(p1);
    expect(isDeletedElement(doc.root.children[1])).toBe(true);
    expect(state.nav.getFocus()).toBe(p1);

    state.destroy();
  });

  it('emits a focusable-removed element change for the deleted element', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    const p1 = byId(doc, 'p1');
    const elementChanges: EditorElementChangeEvent[] = [];
    state.eventsEmitter.subscribe({
      onElementChange: (event) => elementChanges.push(event)
    });

    // act
    Delete.run(state);

    // assert
    expect(elementChanges).toEqual([{ type: 'focusable-removed', element: p1 }]);

    state.destroy();
  });

  test('edit mode is a no-op', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    state.enterEditing(byId(doc, 'p1'));

    // act
    const record = Delete.run(state);

    // assert
    expect(record).toBeUndefined();
    expect(doc.root.children).toHaveLength(2);

    state.destroy();
  });

  test('undeletable focus (root) is a no-op', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    state.nav.FOCUS(doc.root);

    // act
    const record = Delete.run(state);

    // assert
    expect(record).toBeUndefined();
    expect(doc.root.children).toHaveLength(2);

    state.destroy();
  });
});

describe('Delete undo / redo', () => {
  test('undo then redo round-trips the DOM and FOCUS', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');
    const record = Delete.run(state)!;

    // act + assert: undo restores the element + FOCUS
    record.undo(state);
    expect(doc.root.contains(p1)).toBe(true);
    expect(doc.root.children).toHaveLength(2);
    expect(state.nav.getFocus()).toBe(p1);

    // act + assert: redo re-deletes + moves FOCUS to the next
    record.redo(state);
    expect(doc.root.contains(p1)).toBe(false);
    expect(isDeletedElement(doc.root.children[0])).toBe(true);
    expect(state.nav.getFocus()).toBe(p2);

    state.destroy();
  });
});
