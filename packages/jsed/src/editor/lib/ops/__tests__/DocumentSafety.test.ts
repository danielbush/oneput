import { Controller } from '@oneput/oneput';
import { describe, expect, it, test } from 'vitest';
import { JsedDocument } from '../../../../JsedDocument.js';
import { byId, makeRoot } from '../../../../test/util.js';
import { EditorState } from '../../EditorState.js';
import { PatchElement } from '../PatchElement.js';
import * as paste from '../../../../lib/ops/focusable/paste.js';
import { createElement, SpecRefusedError } from '../../../../lib/ops/focusable/create.js';
import { convert } from '../../../../lib/ops/focusable/convert.js';
import type { ElementSpec } from '../../../../lib/core/dom-rules.js';

const hostile =
  '<script>bad()</script><img src="x" onerror="bad()"><a href="javascript:bad()">link</a><iframe></iframe><img src="data:text/html,bad"><svg><path d="M0 0"></path><script>bad()</script></svg>';
const cleaned = '<img src="x"><a>link</a><img><svg><path d="M0 0"></path></svg>';
const ordinary =
  '<section id="note" class="note" data-task="todo" aria-label="Note" style="color:red"><p>Hello <em>world</em></p><table><tbody><tr><td>Cell</td></tr></tbody></table><img src="https://example.com/photo.png"><img src="data:image/png;base64,AAAA"><svg viewBox="0 0 16 16"><path d="M0 0"></path></svg><!-- note --></section>';

describe('document boundaries', () => {
  it('cleans HTML before editor structure is built', () => {
    // arrange
    const root = makeRoot('').root;

    // act
    const doc = JsedDocument.createNull(root, { html: hostile });

    // assert
    expect(doc.root.innerHTML).toBe(cleaned);
  });

  it('checks caller nodes without replacing safe nodes at load', () => {
    // arrange
    const root = makeRoot('').root;
    const p = document.createElement('p');
    p.setAttribute('onclick', 'bad()');
    p.textContent = 'Keep';
    root.append(p);

    // act
    const doc = JsedDocument.createNull(root);

    // assert
    expect(doc.root.firstChild).toBe(p);
    expect(p.outerHTML).toBe('<p>Keep</p>');
  });

  test.each([
    paste.pasteBefore,
    paste.pasteAfter,
    paste.pasteWithin,
    paste.pasteCopyBefore,
    paste.pasteCopyAfter,
    paste.pasteCopyWithin
  ])('paste boundary: %s', (operation) => {
    // arrange
    const doc = makeRoot('<div id="target"><p>Keep</p></div>');
    const target = byId(doc, 'target');
    const template = document.createElement('template');
    template.innerHTML = `<section>${hostile}</section>`;
    const source = template.content.firstElementChild as HTMLElement;

    // act
    const pasted = operation(source, target);

    // assert
    expect(pasted?.innerHTML).toBe(cleaned);
    expect(doc.root.contains(pasted)).toBe(true);
    expect(target.querySelector('p')?.textContent).toBe('Keep');
  });

  test.each([paste.copyEmptyNext, paste.copyEmptyPrevious])('shell boundary: %s', (operation) => {
    // arrange
    const doc = makeRoot('<p id="target">Keep</p>');
    const target = byId(doc, 'target');
    target.setAttribute('onclick', 'bad()');

    // act
    const pasted = operation(target);

    // assert
    expect(pasted?.hasAttribute('onclick')).toBe(false);
    expect(pasted?.textContent).toBe('');
  });

  test.each(['script', 'ScRiPt', 'iframe', 'frame', 'object', 'embed', 'base', 'foreignObject'])(
    'caller tag: %s',
    (tagName) => {
      // arrange
      const doc = makeRoot('<p id="target">Keep</p>');
      const target = byId(doc, 'target');

      // act & assert
      expect(() => createElement({ tagName })).toThrow();
      expect(() => convert(target, tagName)).toThrow();
      expect(target.outerHTML).toBe('<p id="target">Keep</p>');
      expect(doc.root.firstChild).toBe(target);
    }
  );

  describe('bounded creation', () => {
    const refusal = (spec: ElementSpec) => {
      try {
        createElement(spec);
      } catch (error) {
        return error instanceof SpecRefusedError ? error : undefined;
      }
    };

    test('cycle', () => {
      // arrange
      const cyclic: ElementSpec = { tagName: 'div', children: [] };
      cyclic.children!.push(cyclic);

      // act
      const error = refusal(cyclic);

      // assert
      expect(error?.reason).toEqual({ type: 'cycle' });
      expect(error?.message).toBe(
        'Document element specification refused: the spec contains itself'
      );
    });

    test('too many nodes', () => {
      // arrange
      const wide: ElementSpec = {
        tagName: 'div',
        children: Array.from({ length: 10001 }, () => ({ tagName: 'p' }))
      };

      // act
      const error = refusal(wide);

      // assert
      expect(error?.reason).toEqual({ type: 'too-many-nodes', limit: 10000 });
      expect(error?.message).toBe('Document element specification refused: more than 10000 nodes');
    });

    test('too deep', () => {
      // arrange
      let deep: ElementSpec = { tagName: 'p' };
      for (let i = 0; i < 70; i++) deep = { tagName: 'div', children: [deep] };

      // act
      const error = refusal(deep);

      // assert
      expect(error?.reason).toEqual({ type: 'too-deep', limit: 64 });
      expect(error?.message).toBe(
        'Document element specification refused: nested deeper than 64 levels'
      );
    });

    test('tag not allowed', () => {
      // arrange
      const spec: ElementSpec = { tagName: 'div', children: [{ tagName: 'script' }] };

      // act
      const error = refusal(spec);

      // assert
      expect(error?.reason).toEqual({ type: 'tag-not-allowed', tagName: 'script' });
      expect(error?.message).toBe(
        'Document element specification refused: tag "script" is not allowed'
      );
    });
  });

  it('cleans export clones and keeps live nodes and FOCUS', () => {
    // arrange
    const doc = makeRoot('<p id="keep">Keep</p><section id="later"></section>');
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    const focus = byId(doc, 'keep');
    state.nav.FOCUS(focus);
    const later = byId(doc, 'later');
    const template = document.createElement('template');
    template.innerHTML = hostile;
    later.append(template.content);

    // act
    const html = state.serialize();
    const sectionHtml = state.serializeElement(later);

    // assert
    expect(html).toBe(`<p id="keep">Keep</p><section id="later">${cleaned}</section>`);
    expect(sectionHtml._unsafeUnwrap()).toBe(cleaned);
    expect(later.querySelector('script')).not.toBeNull();
    expect(state.nav.getFocus()).toBe(focus);
    expect(byId(doc, 'keep')).toBe(focus);
    state.destroy();
  });

  it('cleans markup that changes structure when saved', () => {
    // arrange
    const doc = makeRoot('<p>Keep</p>');
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    const style = document.createElement('style');
    style.textContent = '</style><img src=x onerror="bad()"><script>bad()</script>';
    const comment = document.createComment('--><img src=x onerror="bad()"><!--');
    doc.root.append(style, comment);

    // act
    const saved = state.serialize();
    const reopened = JsedDocument.createNull(document.createElement('div'), { html: saved });

    // assert
    expect(reopened.root.querySelector('script,[onerror]')).toBeNull();
    expect(saved).not.toContain('onerror');
    expect(style.textContent).toContain('onerror');
    expect(comment.data).toContain('onerror');
    state.destroy();
  });

  it('keeps ordinary content through FOCUS, paste, patch and history', () => {
    // arrange
    const doc = makeRoot(ordinary + '<p id="after">After</p>');
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    const note = byId(doc, 'note');
    const after = byId(doc, 'after');
    state.nav.FOCUS(note);
    state.focusOps.copy();
    state.nav.FOCUS(after);

    // act
    expect(state.focusOps.pasteAfter()).toBe(true);
    const pasted = after.nextElementSibling as HTMLElement;
    state.undo.popUndo()!.undo(state);

    // assert
    expect(state.serialize().replace(/ class=""/g, '')).toBe(ordinary + '<p id="after">After</p>');
    expect(state.nav.getFocus()).toBe(after);

    // act
    state.undo.popRedo()!.redo(state);
    const children = document.createElement('template');
    children.innerHTML = ordinary;
    const record = PatchElement.run(state, after, { children: children.content });

    // assert
    expect(record).toBeDefined();
    expect(
      state
        .serializeElement(after)
        ._unsafeUnwrap()
        .replace(/ class=""/g, '')
    ).toBe(ordinary);
    expect(state.nav.getFocus()).toBe(pasted);

    // act
    record!.undo(state);

    // assert
    expect(state.serializeElement(after)._unsafeUnwrap()).toBe('After');

    // act
    record!.redo(state);

    // assert
    expect(
      state
        .serializeElement(after)
        ._unsafeUnwrap()
        .replace(/ class=""/g, '')
    ).toBe(ordinary);
    expect(state.serializeElement(pasted)._unsafeUnwrap()).toBe(
      state.serializeElement(note)._unsafeUnwrap()
    );
    expect(state.nav.getFocus()).toBe(pasted);
    expect(doc.root.firstElementChild).toBe(note);
    state.destroy();
  });

  it('copies the focused element after itself with undo and redo', () => {
    // arrange
    const doc = makeRoot('<p id="one">One</p>');
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    const one = byId(doc, 'one');
    state.nav.FOCUS(one);
    state.focusOps.copy();

    // act
    const pasted = state.focusOps.pasteAfter();
    const copy = one.nextElementSibling;

    // assert
    expect(pasted).toBe(true);
    expect(state.serialize().replace(/ class=""/g, '')).toBe(
      '<p id="one">One</p><p id="one">One</p>'
    );
    expect(state.nav.getFocus()).toBe(copy);

    // act
    state.undo.popUndo()!.undo(state);

    // assert
    expect(doc.root.firstElementChild).toBe(one);
    expect(one.nextElementSibling?.tagName).toBe('TEMPLATE');
    expect(state.nav.getFocus()).toBe(one);

    // act
    state.undo.popRedo()!.redo(state);

    // assert
    expect(one.nextElementSibling).toBe(copy);
    expect(state.nav.getFocus()).toBe(copy);
    state.destroy();
  });

  it('restores cut paste positions with node identity', () => {
    // arrange
    const doc = makeRoot('<p id="one">One</p><p id="two">Two</p><p id="three">Three</p>');
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    const one = byId(doc, 'one');
    state.nav.FOCUS(one);
    state.focusOps.cut();
    state.nav.FOCUS(byId(doc, 'three'));

    // act
    state.focusOps.pasteAfter();

    // assert
    expect(state.serialize().replace(/ class=""/g, '')).toBe(
      '<p id="two">Two</p><p id="three">Three</p><p id="one">One</p>'
    );

    // act
    state.undo.popUndo()!.undo(state);

    // assert
    expect(state.serialize().replace(/ class=""/g, '')).toBe(
      '<p id="one">One</p><p id="two">Two</p><p id="three">Three</p>'
    );
    expect(doc.root.firstElementChild).toBe(one);

    // act
    state.undo.popRedo()!.redo(state);

    // assert
    expect(doc.root.lastElementChild).toBe(one);
    expect(state.nav.getFocus()).toBe(one);
    state.destroy();
  });
});
