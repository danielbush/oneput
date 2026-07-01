import { describe, expect, it, test } from 'vitest';
import { Controller } from '@oneput/oneput';
import {
  byId,
  div,
  identify,
  identifyChildren,
  li,
  makeRoot,
  p,
  ul
} from '../../../../test/util.js';
import { EditorState, type EditorElementChangeEvent } from '../../EditorState.js';
import type { JsedDocument } from '../../../../JsedDocument.js';
import { JSED_ANCHOR_CLASS } from '../../../../lib/core/taxonomy.js';
import { AppendNew } from '../AppendNew.js';

/**
 * Record-level tests: drive {@link AppendNew} directly against a constructed
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

describe('AppendNew.run', () => {
  it('appends a new element inside the focused tag and focuses it', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo'));
    const state = getEditorState(doc);
    const p1 = byId(doc, 'p1');

    // act
    const record = AppendNew.run(state, { tagName: 'span' });

    // assert
    const child = p1.lastElementChild;
    expect(record).toBeDefined();
    expect(child?.tagName.toLowerCase()).toBe('span');
    expect(child?.querySelector(`.${JSED_ANCHOR_CLASS}`)).not.toBeNull();
    expect(state.nav.getFocus()).toBe(child);

    state.destroy();
  });

  it('emits a focusable-inserted element change for the appended container', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo'));
    const state = getEditorState(doc);
    const elementChanges: EditorElementChangeEvent[] = [];
    state.eventsEmitter.subscribe({
      onElementChange: (event) => elementChanges.push(event)
    });

    // act
    AppendNew.run(state, { tagName: 'span' });

    // assert
    const child = byId(doc, 'p1').lastElementChild;
    expect(elementChanges).toEqual([{ type: 'focusable-inserted', element: child }]);

    state.destroy();
  });

  it('focuses the required child of a container element (ul -> li)', () => {
    // arrange
    const doc = makeRoot(div({ id: 'box' }, p('foo')));
    const state = getEditorState(doc);
    const box = byId(doc, 'box');
    state.nav.REQUEST_FOCUS(box);

    // act
    AppendNew.run(state, { tagName: 'ul', children: [{ tagName: 'li' }] });

    // assert
    const list = box.lastElementChild;
    expect(list?.tagName.toLowerCase()).toBe('ul');
    expect(state.nav.getFocus()).toBe(list?.firstElementChild);
    expect(state.nav.getFocus()?.tagName.toLowerCase()).toBe('li');

    state.destroy();
  });

  test('disallowed child is a no-op', () => {
    // arrange: an ul can only take li children
    const doc = makeRoot(ul({ id: 'list' }, li('one')));
    const state = getEditorState(doc);
    state.nav.REQUEST_FOCUS(byId(doc, 'list'));

    // act
    const record = AppendNew.run(state, { tagName: 'p' });

    // assert
    expect(record).toBeUndefined();
    expect(identifyChildren(byId(doc, 'list'))).toEqual(['[element:li]']);

    state.destroy();
  });

  test('edit mode is a no-op', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo'));
    const state = getEditorState(doc);
    state.enterEditing(byId(doc, 'p1'));

    // act
    const record = AppendNew.run(state, { tagName: 'span' });

    // assert
    expect(record).toBeUndefined();

    state.destroy();
  });
});

describe('AppendNew undo / redo', () => {
  test('undo then redo round-trips the DOM and FOCUS', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo'));
    const state = getEditorState(doc);
    const record = AppendNew.run(state, { tagName: 'span' })!;
    const appended = byId(doc, 'p1').lastElementChild;

    // act + assert: undo removes the appended element + restores FOCUS
    record.undo(state);
    expect(doc.root.contains(appended!)).toBe(false);
    expect(state.nav.getFocus()).toBe(byId(doc, 'p1'));

    // act + assert: redo re-appends + restores FOCUS
    record.redo(state);
    expect(byId(doc, 'p1').lastElementChild).toBe(appended);
    expect(state.nav.getFocus()).toBe(appended);

    state.destroy();
  });

  test('undo then redo round-trips FOCUS to the required child (li)', () => {
    // arrange
    const doc = makeRoot(div({ id: 'box' }, p('foo')));
    const state = getEditorState(doc);
    const box = byId(doc, 'box');
    state.nav.REQUEST_FOCUS(box);
    const record = AppendNew.run(state, { tagName: 'ul', children: [{ tagName: 'li' }] })!;
    const listItem = box.lastElementChild?.firstElementChild;

    // act + assert: undo removes the ul + restores FOCUS
    record.undo(state);
    expect(box.querySelector('ul')).toBeNull();
    expect(state.nav.getFocus()).toBe(box);

    // act + assert: redo re-focuses the li
    record.redo(state);
    expect(identify(state.nav.getFocus())).toBe('[element:li]');
    expect(state.nav.getFocus()).toBe(listItem);

    state.destroy();
  });
});
