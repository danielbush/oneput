import { Controller } from '@oneput/oneput';
import { describe, expect, test } from 'vitest';
import { JSED_CURSOR_MARKER_CLASS } from '../../../cursor/lib/CursorState.js';
import {
  JSED_ANCHOR_CLASS,
  JSED_FOCUS_CLASS,
  JSED_IGNORE_CLASS,
  JSED_IMPLICIT_CLASS,
  JSED_TOKEN_CLASS
} from '../../../lib/core/taxonomy.js';
import { byId, em, frag, makeRoot, p } from '../../../test/util.js';
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

describe('EditorState.serialize', () => {
  test('returns whole-document authored html', () => {
    // arrange
    const doc = makeRoot(
      frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, em('formatted content')))
    );
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();

    // act
    const html = state.serialize();

    // assert
    expect(html).toBe('<p id="p1">foo bar</p><p id="p2"><em>formatted content</em></p>');

    state.destroy();
  });

  test('repeatedly returns clean html without changing live artifacts', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    expect(doc.root.querySelectorAll(`.${JSED_TOKEN_CLASS}`).length).toBeGreaterThan(0);
    expect(doc.root.querySelectorAll(`.${JSED_FOCUS_CLASS}`).length).toBeGreaterThan(0);
    const liveHtml = doc.root.innerHTML;

    // act
    const first = state.serialize();
    const second = state.serialize();

    // assert
    expect(second).toBe(first);
    expect(first).toContain('foo bar');
    expect(first).toContain('id="p1"');
    expect(first).not.toContain(JSED_TOKEN_CLASS);
    expect(first).not.toContain(JSED_ANCHOR_CLASS);
    expect(first).not.toContain(JSED_IMPLICIT_CLASS);
    expect(first).not.toContain(JSED_FOCUS_CLASS);
    expect(first).not.toContain('anchor-name');
    expect(doc.root.innerHTML).toBe(liveHtml);

    state.destroy();
  });
});

describe('EditorState.serializeElement', () => {
  test('returns formatted authored html without cursor or ignored artifacts', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'target' },
        em('formatted content'),
        `<span class="${JSED_CURSOR_MARKER_CLASS} ${JSED_IGNORE_CLASS}">cursor</span>`
      )
    );
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    const target = byId(doc, 'target');

    // act
    const result = state.serializeElement(target);

    // assert
    expect(result.isOk()).toBe(true);
    expect(result.isOk() ? result.value : undefined).toBe('<em>formatted content</em>');

    state.destroy();
  });

  test('rejects an element outside the editor document', () => {
    // arrange
    const doc = makeRoot(p({ id: 'target' }, 'content'));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    const outside = document.createElement('p');

    // act
    const result = state.serializeElement(outside);

    // assert
    expect(result.isErr()).toBe(true);
    expect(result.isErr() ? result.error : undefined).toEqual({
      type: 'element-outside-document'
    });

    state.destroy();
  });

  test('does not mutate the live target', () => {
    // arrange
    const doc = makeRoot(p({ id: 'target' }, 'foo bar'));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    const target = byId(doc, 'target');
    const marker = document.createElement('span');
    marker.classList.add(JSED_CURSOR_MARKER_CLASS, JSED_IGNORE_CLASS);
    target.append(marker);
    const liveHtml = target.outerHTML;

    // act
    const result = state.serializeElement(target);

    // assert
    expect(result.isOk()).toBe(true);
    expect(target.outerHTML).toBe(liveHtml);
    expect(target.contains(marker)).toBe(true);

    state.destroy();
  });
});
