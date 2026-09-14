import { Controller } from '@oneput/oneput';
import { describe, expect, test } from 'vitest';
import { byId, makeRoot, p } from '../../../test/util.js';
import { EditorState } from '../EditorState.js';

describe('EditorState.start', () => {
  test('focus: hidden first line / visible next line', () => {
    // arrange
    const doc = makeRoot(
      '<div style="display:none"><p>Hidden</p></div><p id="visible">Visible</p>'
    );
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });

    // act
    state.start();

    // assert
    expect(state.nav.getFocus()).toBe(byId(doc, 'visible'));
    expect(state.isEditing()).toBe(false);
    state.destroy();
  });

  test('focus: all lines hidden / document root', () => {
    // arrange
    const doc = makeRoot('<div hidden><p>First</p><p>Second</p></div>');
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });

    // act
    state.start();

    // assert
    expect(state.nav.getFocus()).toBe(doc.root);
    expect(state.isEditing()).toBe(false);
    state.destroy();
  });
});

describe('EditorState.exitEditing', () => {
  test('selection: unwrap / exit', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'one two'));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    state.enterEditing(byId(doc, 'p1'));
    state.cursor?.extendNext();
    expect(doc.root.querySelector('.jsed-selection')).not.toBeNull();

    // act
    state.exitEditing();

    // assert
    expect(state.isEditing()).toBe(false);
    expect(doc.root.querySelector('.jsed-selection')).toBeNull();
    expect(byId(doc, 'p1').textContent).toBe('one two');

    state.destroy();
  });
});
