import { describe, expect, it, test } from 'vitest';
import { Controller } from '@oneput/oneput';
import { byId, frag, identifyChildren, li, makeRoot, p, ul } from '../../../../test/util.js';
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

  it('falls back to the previous FOCUSABLE in the parent when there is no next', () => {
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

  it('normalizes an emptied parent so the user can edit the empty list item', () => {
    // arrange
    const doc = makeRoot(ul({ id: 'list' }, li({ id: 'item' }, p({ id: 'p1' }, 'item text'))));
    const state = getEditorState(doc);
    const listItem = byId(doc, 'item');
    const paragraph = byId(doc, 'p1');
    state.nav.FOCUS(paragraph);

    // act
    const record = Delete.run(state);

    // assert
    expect(record).toBeDefined();
    expect(doc.root.contains(paragraph)).toBe(false);
    expect(identifyChildren(listItem)).toEqual(['[anchor]', '[deleted-element]']);
    expect(state.nav.getFocus()).toBe(listItem);

    state.destroy();
  });

  it('focuses another FOCUSABLE in the parent after deleting the focused element', () => {
    // arrange
    const doc = makeRoot(
      ul(
        { id: 'list' },
        li(
          { id: 'item' }, //
          p({ id: 'p1' }, 'first'),
          p({ id: 'p2' }, 'second')
        )
      )
    );
    const state = getEditorState(doc);
    const firstParagraph = byId(doc, 'p1');
    const secondParagraph = byId(doc, 'p2');
    state.nav.FOCUS(firstParagraph);

    // act
    const record = Delete.run(state);

    // assert
    expect(record).toBeDefined();
    expect(doc.root.contains(firstParagraph)).toBe(false);
    expect(state.nav.getFocus()).toBe(secondParagraph);

    state.destroy();
  });

  it('focuses the parent instead of escaping to the next FOCUSABLE outside the parent', () => {
    // arrange
    const doc = makeRoot(
      ul(
        { id: 'list' },
        li({ id: 'item1' }, p({ id: 'p1' }, 'first')),
        li({ id: 'item2' }, p({ id: 'p2' }, 'second'))
      )
    );
    const state = getEditorState(doc);
    const firstListItem = byId(doc, 'item1');
    const secondListItem = byId(doc, 'item2');
    const firstParagraph = byId(doc, 'p1');
    state.nav.FOCUS(firstParagraph);

    // act
    const record = Delete.run(state);

    // assert
    expect(record).toBeDefined();
    expect(doc.root.contains(firstParagraph)).toBe(false);
    expect(identifyChildren(firstListItem)).toEqual(['[anchor]', '[deleted-element]']);
    expect(state.nav.getFocus()).toBe(firstListItem);
    expect(state.nav.getFocus()).not.toBe(secondListItem);

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

  test('undo removes the anchor from the deleted state before restoring the element', () => {
    // arrange
    const doc = makeRoot(
      ul(
        { id: 'list' },
        li(
          { id: 'item' }, //
          p({ id: 'p1' }, 'item text')
        )
      )
    );
    const state = getEditorState(doc);
    const listItem = byId(doc, 'item');
    const paragraph = byId(doc, 'p1');
    state.nav.FOCUS(paragraph);
    const record = Delete.run(state)!;
    expect(identifyChildren(listItem)).toEqual(['[anchor]', '[deleted-element]']);

    // act + assert: undo restores the paragraph and removes the temporary anchor
    record.undo(state);
    expect(identifyChildren(listItem)).toEqual(['[element:p#p1]']);
    expect(paragraph.textContent).toBe('item text');
    expect(state.nav.getFocus()).toBe(paragraph);

    // act + assert: redo removes the paragraph and re-anchorizes the empty list item
    record.redo(state);
    expect(identifyChildren(listItem)).toEqual(['[anchor]', '[deleted-element]']);
    expect(state.nav.getFocus()).toBe(listItem);

    state.destroy();
  });
});
