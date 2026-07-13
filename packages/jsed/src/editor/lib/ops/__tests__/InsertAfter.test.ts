import { describe, expect, it, test } from 'vitest';
import { Controller } from '@oneput/oneput';
import { byId, frag, identify, identifyChildren, makeRoot, p } from '../../../../test/util.js';
import { EditorState, type EditorElementChangeEvent } from '../../EditorState.js';
import type { JsedDocument } from '../../../../JsedDocument.js';
import { JSED_ANCHOR_CLASS } from '../../../../lib/core/taxonomy.js';
import { InsertAfter } from '../InsertAfter.js';

/**
 * Record-level tests: drive {@link InsertAfter} directly against a constructed
 * `EditorState`, calling `run` / `undo` / `redo` ourselves rather than going
 * through the `EditorFocusOps` facade. Mirrors `cursor/lib/ops/__tests__`,
 * which builds `CursorState` directly — this is where the record earns its
 * coverage.
 */
function getEditorState(doc: JsedDocument): EditorState {
  const state = EditorState.createNull({
    document: doc,
    userInput: Controller.createNull().input
  });
  state.start();
  return state;
}

describe('InsertAfter.run', () => {
  it('inserts a new element after the focused tag and focuses it', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    expect(state.nav.getFocus()).toBe(byId(doc, 'p1'));

    // act
    const record = InsertAfter.run(state, { tagName: 'p' });

    // assert
    const children = Array.from(doc.root.children);
    expect(record).toBeDefined();
    expect(children).toHaveLength(3);
    expect(children[1]?.tagName.toLowerCase()).toBe('p');
    expect(children[1]?.querySelector(`.${JSED_ANCHOR_CLASS}`)).not.toBeNull();
    expect(state.nav.getFocus()).toBe(children[1]);

    state.destroy();
  });

  it('uses a typed element name when the focused tag parent allows it', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);

    // act
    InsertAfter.run(state, { tagName: 'h2' });

    // assert
    const children = Array.from(doc.root.children);
    expect(children[1]?.tagName.toLowerCase()).toBe('h2');
    expect(state.nav.getFocus()).toBe(children[1]);

    state.destroy();
  });

  it('does not anchorize an inserted empty div', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);

    // act
    InsertAfter.run(state, { tagName: 'div' });

    // assert
    const inserted = doc.root.children[1];
    expect(inserted?.tagName.toLowerCase()).toBe('div');
    expect(inserted?.querySelector(`.${JSED_ANCHOR_CLASS}`)).toBeNull();

    state.destroy();
  });

  it('emits a focusable-inserted element change for the inserted container', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    const elementChanges: EditorElementChangeEvent[] = [];
    state.eventsEmitter.subscribe({
      onElementChange: (event) => elementChanges.push(event)
    });

    // act
    InsertAfter.run(state, { tagName: 'p' });

    // assert
    const inserted = doc.root.children[1];
    expect(elementChanges).toEqual([{ type: 'focusable-inserted', element: inserted }]);

    state.destroy();
  });

  it('focuses the required child of a container element (ul -> li)', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo'));
    const state = getEditorState(doc);

    // act
    InsertAfter.run(state, { tagName: 'ul', children: [{ tagName: 'li' }] });

    // assert
    const list = doc.root.children[1];
    expect(list?.tagName.toLowerCase()).toBe('ul');
    expect(state.nav.getFocus()).toBe(list?.firstElementChild);
    expect(state.nav.getFocus()?.tagName.toLowerCase()).toBe('li');

    state.destroy();
  });

  test('edit mode is a no-op', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    state.enterEditing(byId(doc, 'p1'));

    // act
    const record = InsertAfter.run(state, { tagName: 'p' });

    // assert
    expect(record).toBeUndefined();
    expect(Array.from(doc.root.children)).toHaveLength(2);

    state.destroy();
  });

  test('document root is a no-op', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    state.nav.FOCUS(doc.root);

    // act
    const record = InsertAfter.run(state, { tagName: 'p' });

    // assert
    expect(record).toBeUndefined();
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]', '[element:p#p2]']);

    state.destroy();
  });
});

describe('InsertAfter undo / redo', () => {
  test('undo then redo round-trips the DOM and FOCUS', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    const record = InsertAfter.run(state, { tagName: 'p' })!;
    const inserted = doc.root.children[1];

    // act + assert: undo restores original DOM + FOCUS
    record.undo(state);
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]', '[element:p#p2]']);
    expect(state.nav.getFocus()).toBe(byId(doc, 'p1'));

    // act + assert: redo re-inserts + restores FOCUS
    record.redo(state);
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]', '[element:p]', '[element:p#p2]']);
    expect(state.nav.getFocus()).toBe(inserted);

    state.destroy();
  });

  test('undo then redo round-trips FOCUS to the required child (li)', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo'));
    const state = getEditorState(doc);
    const record = InsertAfter.run(state, { tagName: 'ul', children: [{ tagName: 'li' }] })!;
    const listItem = doc.root.children[1]?.firstElementChild;

    // act + assert: undo restores original DOM + FOCUS
    record.undo(state);
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]']);
    expect(state.nav.getFocus()).toBe(byId(doc, 'p1'));

    // act + assert: redo re-focuses the li
    record.redo(state);
    expect(identify(state.nav.getFocus())).toBe('[element:li]');
    expect(state.nav.getFocus()).toBe(listItem);

    state.destroy();
  });
});
