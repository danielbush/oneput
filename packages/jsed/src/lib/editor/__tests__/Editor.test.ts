import { describe, expect, it, test, vi } from 'vitest';
import { Editor } from '../Editor.js';
import {
  byId,
  div,
  em,
  frag,
  identify,
  identifyChildren,
  inlineStyleHack,
  li,
  makeRoot,
  p,
  s,
  t,
  ul
} from '../../../test/util.js';
import { getValue } from '../../token/token.js';
import { Controller } from '../../../../../oneput/src/lib/oneput/controllers/controller.js';
import { Tokenizer } from '../../token/Tokenizer.js';
import {
  isDeletedElement,
  isIsland,
  isToken,
  JSED_ANCHOR_CLASS,
  JSED_TOKEN_CLASS
} from '../../core/taxonomy.js';
import type { JsedDocument } from '../../../JsedDocument.js';

function createNullEditor(doc: JsedDocument): Editor {
  return Editor.createNull({
    document: doc,
    userInput: Controller.createNull().input
  });
}

describe('Editor', () => {
  describe('REQUEST_FOCUS (view mode): User clicks/touches', () => {
    it('first REQUEST_FOCUS in view mode tokenizes the focused LINE but stays in view mode', () => {
      // arrange
      const doc = makeRoot(
        frag(
          p(
            { id: 'p1' }, //
            'foo bar'
          ),
          p(
            { id: 'p2' }, //
            'baz qux'
          )
        )
      );
      const editor = createNullEditor(doc);
      editor.start();
      const p2 = byId(doc, 'p2');

      // act
      editor.nav.REQUEST_FOCUS(p2);

      // assert
      expect(editor.getMode()).toBe('view');
      expect(editor.nav.getFocus()).toBe(p2);
      expect(p2.querySelectorAll('.jsed-token')).toHaveLength(2);

      editor.destroy();
    });

    it('focusing a new FOCUSABLE tokenizes that new LINE without entering edit mode', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
      const editor = createNullEditor(doc);
      editor.start();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');

      expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
      expect(p2.querySelectorAll('.jsed-token')).toHaveLength(0);

      // act
      editor.nav.REQUEST_FOCUS(p2);

      // assert
      expect(editor.getMode()).toBe('view');
      expect(editor.nav.getFocus()).toBe(p2);
      expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
      expect(p2.querySelectorAll('.jsed-token')).toHaveLength(2);

      editor.destroy();
    });

    it('re-focusing an already-tokenized LINE is idempotent at the DOM level', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
      const editor = createNullEditor(doc);
      editor.start();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');

      const originalTokens = Array.from(p1.querySelectorAll('.jsed-token'));
      expect(originalTokens).toHaveLength(2);

      editor.nav.REQUEST_FOCUS(p2);
      expect(editor.nav.getFocus()).toBe(p2);

      // act
      editor.nav.REQUEST_FOCUS(p1);

      // assert
      const retokenizedTokens = Array.from(p1.querySelectorAll('.jsed-token'));
      expect(editor.getMode()).toBe('view');
      expect(editor.nav.getFocus()).toBe(p1);
      expect(retokenizedTokens).toHaveLength(2);
      expect(retokenizedTokens).toEqual(originalTokens);
      expect(p1.querySelector('.jsed-token .jsed-token')).toBeNull();

      editor.destroy();
    });

    it('ignores REQUEST_FOCUS on an element inside an IGNORABLE ancestor', () => {
      // arrange
      const doc = makeRoot(
        frag(
          p({ id: 'p1' }, 'foo bar'),
          p(
            { id: 'p2' },
            '<span class="jsed-ignore"><em id="ignored-target" style="display:inline;">debug</em></span>'
          )
        )
      );
      const editor = createNullEditor(doc);
      editor.start();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');
      const ignoredTarget = byId(doc, 'ignored-target');

      expect(editor.nav.getFocus()).toBe(p1);
      expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
      expect(p2.querySelectorAll('.jsed-token')).toHaveLength(0);

      // act
      editor.nav.REQUEST_FOCUS(ignoredTarget);

      // assert
      expect(editor.getMode()).toBe('view');
      expect(editor.nav.getFocus()).toBe(p1);
      expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
      expect(p2.querySelectorAll('.jsed-token')).toHaveLength(0);

      editor.destroy();
    });

    test('background cleanup detokenizes the oldest inactive LINE after enough normal interactions', async () => {
      // arrange
      vi.useFakeTimers();
      const doc = makeRoot(
        frag(
          p({ id: 'p1' }, 'aaa'),
          p({ id: 'p2' }, 'bbb'),
          p({ id: 'p3' }, 'ccc'),
          p({ id: 'p4' }, 'ddd')
        )
      );
      const editor = createNullEditor(doc);
      editor.start();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');
      const p3 = byId(doc, 'p3');
      const p4 = byId(doc, 'p4');

      // act
      editor.nav.REQUEST_FOCUS(p2);
      editor.nav.REQUEST_FOCUS(p3);
      editor.nav.REQUEST_FOCUS(p4);
      await vi.runAllTimersAsync();

      // assert
      expect(editor.getMode()).toBe('view');
      expect(editor.nav.getFocus()).toBe(p4);
      expect(p1.querySelector('.jsed-token')).toBeNull();
      expect(p2.querySelector('.jsed-token')?.textContent).toBe('bbb');
      expect(p3.querySelector('.jsed-token')?.textContent).toBe('ccc');
      expect(p4.querySelector('.jsed-token')?.textContent).toBe('ddd');

      editor.destroy();
      vi.useRealTimers();
    });

    it('clicking a token in another already-tokenized FOCUSABLE requires two interactions', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
      const editor = Editor.createNull({
        document: doc,
        userInput: Controller.createNull().input
      });
      editor.start();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');

      editor.nav.REQUEST_FOCUS(p2);
      const p1FirstToken = p1.querySelector('.jsed-token') as HTMLElement;

      // act
      editor.nav.REQUEST_FOCUS(p1FirstToken);

      // assert
      expect(editor.getMode()).toBe('view');
      expect(editor.nav.getFocus()).toBe(p1);

      // act
      editor.nav.REQUEST_FOCUS(p1FirstToken);

      // assert
      expect(editor.getMode()).toBe('edit');
      expect(editor.getCursor()).toBe(p1FirstToken);

      editor.destroy();
    });
  });

  describe('REQUEST_FOCUS (edit mode): User clicks/touches', () => {
    it('exiting edit mode by focusing another element quick-descends and tokenizes the new focus target', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
      const editor = Editor.createNull({
        document: doc,
        userInput: Controller.createNull().input
      });
      editor.start();
      editor.enterEditing(byId(doc, 'p1'));
      const p2 = byId(doc, 'p2');

      // act
      editor.nav.REQUEST_FOCUS(p2);

      // assert
      expect(editor.getMode()).toBe('view');
      expect(editor.nav.getFocus()).toBe(p2);
      expect(p2.querySelectorAll('.jsed-token')).toHaveLength(2);

      editor.destroy();
    });
  });

  // Action = Key or menu
  describe('FOCUS-based actions (view mode)', () => {
    describe('handleRight', () => {
      it('descends within the focused subtree in view mode', () => {
        // arrange
        const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
        const editor = createNullEditor(doc);
        editor.start();
        const p1 = byId(doc, 'p1');

        // act
        editor.moveNext();

        // assert
        expect(editor.getMode()).toBe('view');
        expect(editor.nav.getFocus()).toBe(p1);

        editor.destroy();
      });
    });

    describe('handleUp', () => {
      it('moves FOCUS to the previous sibling', () => {
        // arrange
        const doc = makeRoot(
          frag(
            p({ id: 'p1' }, 'foo'), //
            p({ id: 'p2' }, 'bar'),
            p({ id: 'p3' }, 'baz')
          )
        );
        const editor = createNullEditor(doc);
        editor.start();

        editor.nav.REQUEST_FOCUS(byId(doc, 'p2'));

        // act
        editor.moveUp();

        // assert
        expect(editor.nav.getFocus()).toBe(byId(doc, 'p1'));

        editor.destroy();
      });
    });

    describe('handleDown', () => {
      it('moves FOCUS to the next sibling', () => {
        // arrange
        const doc = makeRoot(
          frag(
            p({ id: 'p1' }, 'foo'), //
            p({ id: 'p2' }, 'bar'),
            p({ id: 'p3' }, 'baz')
          )
        );
        const editor = createNullEditor(doc);
        editor.start();

        editor.nav.REQUEST_FOCUS(byId(doc, 'p2'));

        // act
        editor.moveDown();

        // assert
        expect(editor.nav.getFocus()).toBe(byId(doc, 'p3'));

        editor.destroy();
      });
    });

    describe('insertElementAfterFocus', () => {
      it('inserts a new element after the focused tag and focuses it', () => {
        // arrange
        const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
        const editor = createNullEditor(doc);
        editor.start();

        // act
        expect(editor.nav.getFocus()).toBe(byId(doc, 'p1'));
        const inserted = editor.focus.insertNewAfter('p');

        // assert
        const children = Array.from(doc.root.children);
        expect(inserted).toBe(true);
        expect(children).toHaveLength(3);
        expect(children[1]?.tagName.toLowerCase()).toBe('p');
        expect(children[1]?.querySelector(`.${JSED_ANCHOR_CLASS}`)).not.toBeNull();
        expect(editor.nav.getFocus()).toBe(children[1]);

        editor.destroy();
      });

      it('uses a typed element name when the focused tag parent allows it', () => {
        // arrange
        const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
        const editor = createNullEditor(doc);
        editor.start();

        // act
        const inserted = editor.focus.insertNewAfter('h2');

        // assert
        const children = Array.from(doc.root.children);
        expect(inserted).toBe(true);
        expect(children[1]?.tagName.toLowerCase()).toBe('h2');
        expect(editor.nav.getFocus()).toBe(children[1]);

        editor.destroy();
      });
    });

    describe('insertElementBeforeFocus', () => {
      it('uses a typed element name before the focused tag and focuses it', () => {
        // arrange
        const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
        const editor = createNullEditor(doc);
        editor.start();
        editor.nav.REQUEST_FOCUS(byId(doc, 'p2'));

        // act
        const inserted = editor.focus.insertNewBefore('h2');

        // assert
        const children = Array.from(doc.root.children);
        expect(inserted).toBe(true);
        expect(children).toHaveLength(3);
        expect(children[1]?.tagName.toLowerCase()).toBe('h2');
        expect(editor.nav.getFocus()).toBe(children[1]);

        editor.destroy();
      });
    });

    describe('insertElementInFocus', () => {
      it('uses a typed element name inside the focused tag and focuses it', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo'));
        const editor = createNullEditor(doc);
        editor.start();
        const p1 = byId(doc, 'p1');

        // act
        const inserted = editor.focus.appendNew('span');

        // assert
        const child = p1.lastElementChild;
        expect(inserted).toBe(true);
        expect(child?.tagName.toLowerCase()).toBe('span');
        expect(child?.querySelector(`.${JSED_ANCHOR_CLASS}`)).not.toBeNull();
        expect(editor.nav.getFocus()).toBe(child);

        editor.destroy();
      });

      it('defaults to a specific child tag when the focused tag requires one', () => {
        // arrange
        const doc = makeRoot(ul({ id: 'list' }, li('one')));
        const editor = createNullEditor(doc);
        editor.start();
        const list = byId(doc, 'list');
        editor.nav.REQUEST_FOCUS(list);

        // act
        const inserted = editor.focus.appendNew('li');

        // assert
        const child = list.lastElementChild;
        expect(inserted).toBe(true);
        expect(child?.tagName.toLowerCase()).toBe('li');
        expect(editor.nav.getFocus()).toBe(child);

        editor.destroy();
      });

      it('does not offer insert-in for a tag without child elements', () => {
        // arrange
        const doc = makeRoot('<br id="break">');
        const editor = createNullEditor(doc);
        editor.start();

        // act
        editor.nav.FOCUS(byId(doc, 'break'));

        // assert
        expect(editor.focus.canAppend()).toBe(false);
        expect(editor.focus.appendNew('span')).toBe(false);

        editor.destroy();
      });
    });

    describe('deleteFocus', () => {
      it('deletes the focused element and focuses the next FOCUSABLE', () => {
        // arrange
        const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
        const editor = createNullEditor(doc);
        editor.start();
        const p1 = byId(doc, 'p1');
        const p2 = byId(doc, 'p2');

        // act
        const deleted = editor.focus.delete();

        // assert
        expect(deleted).toBe(true);
        expect(doc.root.contains(p1)).toBe(false);
        expect(doc.root.children).toHaveLength(2);
        expect(isDeletedElement(doc.root.children[0])).toBe(true);
        expect(doc.root.children[1]).toBe(p2);
        expect(editor.nav.getFocus()).toBe(p2);

        editor.destroy();
      });

      it('deletes the focused element and falls back to the previous FOCUSABLE', () => {
        // arrange
        const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
        const editor = createNullEditor(doc);
        editor.start();
        const p1 = byId(doc, 'p1');
        const p2 = byId(doc, 'p2');
        editor.nav.REQUEST_FOCUS(p2);

        // act
        const deleted = editor.focus.delete();

        // assert
        expect(deleted).toBe(true);
        expect(doc.root.contains(p2)).toBe(false);
        expect(doc.root.children).toHaveLength(2);
        expect(doc.root.children[0]).toBe(p1);
        expect(isDeletedElement(doc.root.children[1])).toBe(true);
        expect(editor.nav.getFocus()).toBe(p1);

        editor.destroy();
      });
    });

    describe('handleEnter - user initiates editing', () => {
      test('from a focused LINE with a leading ISLAND lands the CURSOR on that ISLAND', () => {
        // arrange
        const doc = makeRoot(
          '<div id="d1"><span class="katex" style="display:inline;">x²</span> after island</div>'
        );
        const editor = createNullEditor(doc);
        editor.start();
        const div1 = byId(doc, 'd1');

        editor.nav.REQUEST_FOCUS(div1);

        // act
        const result = editor.handleEnter();

        // assert
        expect(result.isOk()).toBe(true);
        expect(editor.getMode()).toBe('edit');
        expect(editor.getCursor()).toBeDefined();
        expect(isIsland(editor.getCursor())).toBe(true);
        expect(editor.getCursor()?.classList.contains('katex')).toBe(true);

        editor.destroy();
      });
    });
  });

  describe('CURSOR-based actions (edit mode)', () => {
    describe('wrapCursorWithTag', () => {
      it('wraps the current TOKEN and keeps the CURSOR on that TOKEN', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p1'));
        const cursorToken = editor.getCursor() as HTMLElement;

        // act
        const wrapped = editor.cursorOps.wrap('em');

        // assert
        const wrapper = byId(doc, 'p1').querySelector('em') as HTMLElement;
        expect(wrapped).toBe(true);
        expect(wrapper).not.toBeNull();
        expect(wrapper.textContent).toBe('foo');
        expect(wrapper.firstElementChild).toBe(cursorToken);
        expect(editor.getCursor()).toBe(cursorToken);
        expect(editor.nav.getFocus()).toBe(wrapper);

        editor.destroy();
      });

      it('wraps the current ISLAND and keeps the CURSOR on that ISLAND', () => {
        // arrange
        const doc = makeRoot(
          '<div id="d1"><span class="katex" style="display:inline;">x²</span> after island</div>'
        );
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'd1'));
        const island = editor.getCursor() as HTMLElement;

        // act
        const wrapped = editor.cursorOps.wrap('em');

        // assert
        const wrapper = byId(doc, 'd1').querySelector('em') as HTMLElement;
        expect(wrapped).toBe(true);
        expect(wrapper).not.toBeNull();
        expect(wrapper.firstElementChild).toBe(island);
        expect(isIsland(editor.getCursor())).toBe(true);
        expect(editor.getCursor()).toBe(island);

        editor.destroy();
      });

      it('wraps the active SELECTION and clears the transient selection wrappers', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p1'));
        const anchor = editor.getCursor() as HTMLElement;
        editor.extendNext();

        // act
        const wrapped = editor.cursorOps.wrap('strong');

        // assert
        const wrapper = byId(doc, 'p1').querySelector('strong') as HTMLElement;
        expect(wrapped).toBe(true);
        expect(wrapper).not.toBeNull();
        expect(wrapper.textContent).toBe('foo bar');
        expect(doc.root.querySelector('.jsed-selection')).toBeNull();
        expect(editor.getCursor()).toBe(anchor);
        expect(editor.nav.getFocus()).toBe(wrapper);

        editor.destroy();
      });

      it('wraps a SELECTION containing an ISLAND', () => {
        // arrange
        const doc = makeRoot(
          '<div id="d1">before <span class="katex" style="display:inline;">x²</span> after</div>'
        );
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'd1'));
        editor.extendNext();

        // act
        const wrapped = editor.cursorOps.wrap('strong');

        // assert
        const wrapper = byId(doc, 'd1').querySelector('strong') as HTMLElement;
        expect(wrapped).toBe(true);
        expect(wrapper).not.toBeNull();
        expect(wrapper.textContent).toBe('before x²');
        expect(wrapper.querySelector('.katex')).not.toBeNull();
        expect(doc.root.querySelector('.jsed-selection')).toBeNull();

        editor.destroy();
      });
    });

    describe('handleEnter - user initiates editing', () => {
      describe('enterEditing: when user initiates editing...', () => {
        // TODO: should these be in handleEnter ?
        it('places the CURSOR on the first TOKEN when entering editing from a FOCUSABLE', () => {
          // arrange
          const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
          const editor = createNullEditor(doc);

          // act
          const result = editor.enterEditing(byId(doc, 'p1'));

          // assert
          expect(result.isOk()).toBe(true);
          expect(editor.getMode()).toBe('edit');
          expect(editor.getCursor()?.textContent?.trim()).toBe('foo');

          editor.destroy();
        });

        it('tokenizes the focused LINE and lands on its first TOKEN', () => {
          // arrange
          const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
          const editor = createNullEditor(doc);
          const line = byId(doc, 'p1');

          expect(line.querySelectorAll('.jsed-token')).toHaveLength(0);

          // act
          const result = editor.enterEditing(line);

          // assert
          expect(result.isOk()).toBe(true);
          expect(editor.getMode()).toBe('edit');
          expect(
            Array.from(line.querySelectorAll('.jsed-token')).map((token) => token.textContent)
          ).toEqual(['foo', 'bar', 'baz']);
          expect(identify(editor.getCursor())).toBe('foo');

          editor.destroy();
        });

        it('entering from a container tokenizes only the candidate LINE, not the whole subtree', () => {
          // arrange
          const doc = makeRoot(
            div(
              { id: 'div1' }, //
              p({ id: 'p1' }, 'foo bar'),
              p({ id: 'p2' }, 'baz qux')
            )
          );
          const editor = createNullEditor(doc);
          const div1 = byId(doc, 'div1');
          const p1 = byId(doc, 'p1');
          const p2 = byId(doc, 'p2');

          expect(div1.querySelectorAll(':scope > .jsed-token')).toHaveLength(0);
          expect(p1.querySelectorAll('.jsed-token')).toHaveLength(0);
          expect(p2.querySelectorAll('.jsed-token')).toHaveLength(0);

          // act
          const result = editor.enterEditing(div1);

          // assert
          expect(result.isOk()).toBe(true);
          expect(editor.getMode()).toBe('edit');
          expect(div1.querySelectorAll(':scope > .jsed-token')).toHaveLength(0);
          expect(
            Array.from(p1.querySelectorAll('.jsed-token')).map((token) => token.textContent)
          ).toEqual(['foo', 'bar']);
          expect(p2.querySelectorAll('.jsed-token')).toHaveLength(0);
          expect(identify(editor.getCursor())).toBe('foo');

          editor.destroy();
        });

        it('SHALLOW_TOKENIZATION: skips empty LINEs and tokenizes only the first editable LINE', () => {
          // arrange
          const doc = makeRoot(
            div(
              { id: 'div1' },
              p({ id: 'empty-line' }),
              p({ id: 'first-editable-line' }, 'foo bar'),
              p({ id: 'later-line' }, 'baz qux')
            )
          );
          const editor = createNullEditor(doc);
          const div1 = byId(doc, 'div1');
          const emptyLine = byId(doc, 'empty-line');
          const firstEditableLine = byId(doc, 'first-editable-line');
          const laterLine = byId(doc, 'later-line');

          // act
          const result = editor.enterEditing(div1);

          // assert
          expect(result.isOk()).toBe(true);
          expect(editor.getMode()).toBe('edit');
          expect(emptyLine.querySelectorAll('.jsed-token')).toHaveLength(0);
          expect(
            Array.from(firstEditableLine.querySelectorAll('.jsed-token')).map(
              (token) => token.textContent
            )
          ).toEqual(['foo', 'bar']);
          expect(laterLine.querySelectorAll('.jsed-token')).toHaveLength(0);
          expect(identify(editor.getCursor())).toBe('foo');

          editor.destroy();
        });

        test('if entering on a INLINE_FLOW (em-tag), CURSOR should be set to first child in INLINE_FLOW', () => {
          // arrange
          const doc = makeRoot(
            p(
              { id: 'p1' }, //
              'before ',
              em({ id: 'em1', ...inlineStyleHack }, 'italic'),
              ' after'
            )
          );
          const em1 = byId(doc, 'em1');
          const editor = createNullEditor(doc);

          // act
          const result = editor.enterEditing(em1);

          // assert
          expect(result.isOk()).toBe(true);
          expect(editor.getMode()).toBe('edit');
          expect(editor.getCursor()).not.toBeNull();
          expect(editor.getCursor()!.textContent).toEqual('italic');
        });

        test(`if entering on empty INLINE_FLOW (em-tag), don't add CURSOR`, () => {
          // arrange
          const doc = makeRoot(
            p(
              { id: 'p1' }, //
              'before ',
              em({ id: 'em1', ...inlineStyleHack }),
              ' after'
            )
          );
          const em1 = byId(doc, 'em1');
          const editor = createNullEditor(doc);

          // act
          const result = editor.enterEditing(em1);

          // assert
          expect(result.isOk()).toBe(false);
          expect(editor.getMode()).toBe('view');
        });

        test('if entering on a TOKEN, CURSOR should be set to this TOKEN', () => {
          // arrange
          const doc = makeRoot(
            p(
              { id: 'p1' }, //
              t('before'),
              s(),
              t('middle'),
              s(),
              em({ id: 'em1', ...inlineStyleHack }),
              ' after'
            )
          );
          const p1 = byId(doc, 'p1');
          const middle1 = p1.firstChild?.nextSibling?.nextSibling as HTMLElement;
          expect(middle1?.textContent).toEqual('middle');
          const editor = createNullEditor(doc);

          // act
          const result = editor.enterEditing(middle1!);

          // assert
          expect(result.isOk()).toBe(true);
          expect(editor.getMode()).toBe('edit');
          expect(editor.getCursor()).not.toBeNull();
          expect(editor.getCursor()!.textContent).toEqual('middle');
        });
      });
    });

    describe('handleRight', () => {
      it('moves to the next TOKEN in edit mode', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p1'));

        // act
        editor.moveNext();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(editor.getCursor()?.textContent?.trim()).toBe('bar');

        editor.destroy();
      });

      it('from the last TOKEN of a LINE enters the next LINE', () => {
        // arrange
        const doc = makeRoot(
          frag(
            p({ id: 'p1' }, 'aaa'), //
            p({ id: 'p2' }, 'bbb ccc')
          )
        );
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p1'));

        // act
        editor.moveNext();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor())).toBe('bbb');

        editor.destroy();
      });

      it('from the last LINE_SIBLING of a LINE enters the next LINE that starts with an ISLAND', () => {
        // arrange
        const doc = makeRoot(
          frag(
            p({ id: 'p1' }, 'aaa'),
            p({ id: 'p2' }, '<span class="katex" style="display:inline;">x²</span>', ' bbb')
          )
        );
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p1'));

        // act
        editor.moveNext();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor()!)).toBe('[island:span]');

        editor.destroy();
      });

      it('stays put at the final LINE of the document', () => {
        // arrange
        const doc = makeRoot(
          frag(
            //
            p({ id: 'p1' }, 'aaa'),
            p({ id: 'p2' }, 'bbb')
          )
        );
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p2'));

        // act
        editor.moveNext();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor())).toBe('bbb');

        editor.destroy();
      });

      it('lands on the first editable LINE_SIBLING beyond the exhausted LINE, not the start of an ancestor LINE', () => {
        // arrange
        const doc = makeRoot(
          div(
            { id: 'outer' },
            p({ id: 'p1' }, 'aaa'),
            div(
              { id: 'wrap', class: 'jsed-cursor-transparent' },
              p({ id: 'p2' }, 'bbb'),
              p({ id: 'p3' }, 'ccc')
            )
          )
        );
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p1'));

        // act
        editor.moveNext();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor())).toBe('bbb');

        editor.destroy();
      });
    });

    describe('handleLeft', () => {
      it('moves to the previous TOKEN in edit mode', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p1'));
        editor.moveNext();

        // act
        editor.movePrevious();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(editor.getCursor()?.textContent?.trim()).toBe('foo');

        editor.destroy();
      });

      it('from the first TOKEN of a LINE enters the previous LINE', () => {
        // arrange
        const doc = makeRoot(
          frag(
            //
            p({ id: 'p1' }, 'aaa bbb'),
            p({ id: 'p2' }, 'ccc')
          )
        );
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p2'));

        // act
        editor.movePrevious();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor())).toBe('bbb');

        editor.destroy();
      });

      it('from the first TOKEN of a LINE enters the previous LINE that ends with an ISLAND', () => {
        // arrange
        const doc = makeRoot(
          frag(
            p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>'),
            p({ id: 'p2' }, 'bbb')
          )
        );
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p2'));
        expect(identify(editor.getCursor()!)).toBe('bbb');

        // act
        editor.movePrevious();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor()!)).toBe('[island:span]');

        editor.destroy();
      });

      it('lands on the last editable LINE_SIBLING beyond the exhausted LINE, not the start of an ancestor LINE', () => {
        // arrange
        const doc = makeRoot(
          div(
            { id: 'outer' },
            div(
              { id: 'wrap', class: 'jsed-cursor-transparent' },
              p({ id: 'p1' }, 'aaa'),
              p({ id: 'p2' }, 'bbb')
            ),
            p({ id: 'p3' }, 'ccc')
          )
        );
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p3'));

        // act
        editor.movePrevious();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor())).toBe('bbb');

        editor.destroy();
      });

      it('from the first paragraph in an opaque container skips the container and continues to something before it', () => {
        // arrange
        const doc = makeRoot(
          frag(
            p({ id: 'before' }, 'zzz'),
            div({ id: 'outer' }, p({ id: 'p1' }, 'aaa'), p({ id: 'p2' }, 'bbb'))
          )
        );
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p1'));

        // act
        editor.movePrevious();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor())).toBe('zzz');

        editor.destroy();
      });

      it('stays put at the first LINE of the document', () => {
        // arrange
        const doc = makeRoot(
          frag(
            //
            p({ id: 'p1' }, 'aaa'),
            p({ id: 'p2' }, 'bbb')
          )
        );
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p1'));

        // act
        editor.movePrevious();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor())).toBe('aaa');

        editor.destroy();
      });

      describe('LOOSE_TEXT', () => {
        it('<loose/> <p/> <loose/>', () => {
          // arrange
          const doc = makeRoot(
            div(
              { id: 'div1' }, //
              'aaa ',
              p({ id: 'p1' }, 'bbb'),
              ' ccc',
              p({ id: 'p2' }, 'ddd')
            )
          );
          const editor = createNullEditor(doc);

          // act + assert
          editor.enterEditing(byId(doc, 'p1'));
          expect(identify(editor.getCursor())).toBe('bbb');

          editor.movePrevious();
          // This triggers findPreviousLineCandidate to return an untokenized
          // text node 'aaa' but only when tokenizeLooseLinesIn ignored the
          // first LOOSE_LINE ('aaa').
          expect(identify(editor.getCursor())).toBe('aaa');

          editor.destroy();
        });

        it('<p/> <loose/> <p/>', () => {
          // arrange
          const doc = makeRoot(
            frag(
              p({ id: 'p1' }, 'aaa'), //
              'bbb ccc', // not tokenized, regression here
              p({ id: 'p2' }, 'ddd')
            )
          );
          const editor = createNullEditor(doc);

          // act + assert
          editor.enterEditing(byId(doc, 'p2'));
          expect(editor.getMode()).toBe('edit');
          expect(isToken(editor.getCursor())).toBe(true);
          expect(identify(editor.getCursor())).toBe('ddd');

          // Regression here in findPreviousCrossLineTarget.
          // <loose/> never gets tokenized and the current algorithm
          // doesn't detect tokens.
          editor.movePrevious();
          expect(isToken(editor.getCursor())).toBe(true);
          expect(identify(editor.getCursor())).toBe('ccc');

          editor.movePrevious();
          expect(isToken(editor.getCursor())).toBe(true);
          expect(identify(editor.getCursor())).toBe('bbb');

          editor.movePrevious();
          expect(editor.getCursor()?.innerText).toBe('aaa');

          editor.destroy();
        });

        it('<loose/> <p/> <loose/> <p/> - requires findPreviousLineCandidate to look for loose text nodes', () => {
          // arrange
          const doc = makeRoot(
            div(
              { id: 'div1' }, //
              'aaa ',
              p({ id: 'p1' }, 'bbb'),
              ' ccc',
              p({ id: 'p2' }, 'ddd')
            )
          );
          const editor = createNullEditor(doc);

          // act + assert
          editor.enterEditing(byId(doc, 'p2'));
          expect(identify(editor.getCursor())).toBe('ddd');

          editor.movePrevious();
          expect(identify(editor.getCursor())).toBe('ccc');

          editor.movePrevious();
          expect(identify(editor.getCursor())).toBe('bbb');

          editor.movePrevious();
          expect(isToken(editor.getCursor())).toBe(true);
          expect(identify(editor.getCursor())).toBe('aaa');

          editor.destroy();
        });

        it('div boundary - requires findPreviousLineCandidate to look for loose text nodes', () => {
          // arrange
          const doc = makeRoot(
            frag(
              div(
                { id: 'div1' }, //
                'aaa ',
                p({ id: 'p1' }, 'bbb'),
                ' ccc'
              ),
              div(
                { id: 'div2' }, //
                'ddd ',
                p({ id: 'p2' }, 'eee')
              )
            )
          );
          const editor = createNullEditor(doc);

          // act + assert
          editor.enterEditing(byId(doc, 'p2'));
          expect(identify(editor.getCursor())).toBe('eee');

          editor.movePrevious();
          expect(identify(editor.getCursor())).toBe('ddd');

          editor.movePrevious();
          // Key regression here - something about the div boundary between div1 and div2.
          expect(identify(editor.getCursor())).toBe('ccc');

          editor.movePrevious();
          expect(identify(editor.getCursor())).toBe('bbb');

          editor.movePrevious();
          expect(identify(editor.getCursor())).toBe('aaa');

          editor.destroy();
        });
      });
    });

    describe('handleExit', () => {
      it('leaves edit mode and returns to view mode', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
        const editor = createNullEditor(doc);
        editor.start();
        const p1 = byId(doc, 'p1');
        editor.enterEditing(p1);

        // act
        editor.handleExit();

        // assert
        expect(editor.getMode()).toBe('view');
        expect(editor.nav.getFocus()).toBe(p1);

        editor.destroy();
      });

      it('cancels a forward-extended selection and lands the CURSOR on the head (stays in edit mode)', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editor = Editor.createNull({
          document: doc,
          userInput: Controller.createNull().input
        });
        editor.enterEditing(byId(doc, 'p1'));
        editor.extendNext(); // head: bar
        editor.extendNext(); // head: baz

        // act
        editor.handleExit();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor())).toBe('baz');
        expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

        editor.destroy();
      });

      it('cancels a backward-extended selection and lands the CURSOR on the head', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editor = Editor.createNull({
          document: doc,
          userInput: Controller.createNull().input
        });
        editor.enterEditing(byId(doc, 'p1'));
        editor.moveNext(); // cursor: bar
        editor.moveNext(); // cursor: baz
        editor.extendPrevious(); // head: bar
        editor.extendPrevious(); // head: foo

        // act
        editor.handleExit();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor())).toBe('foo');
        expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

        editor.destroy();
      });

      it('next-extended + handleRight → CURSOR lands on head (forward end)', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editor = Editor.createNull({
          document: doc,
          userInput: Controller.createNull().input
        });
        editor.enterEditing(byId(doc, 'p1'));
        editor.extendNext(); // head: bar
        editor.extendNext(); // head: baz

        // act
        editor.moveNext();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor())).toBe('baz');
        expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

        editor.destroy();
      });

      it('next-extended + handleLeft → CURSOR lands on anchor (start)', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editor = Editor.createNull({
          document: doc,
          userInput: Controller.createNull().input
        });
        editor.enterEditing(byId(doc, 'p1'));
        editor.extendNext();
        editor.extendNext();

        // act
        editor.movePrevious();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor())).toBe('foo');
        expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

        editor.destroy();
      });

      it('previous-extended + handleLeft → CURSOR lands on head (backward end)', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editor = Editor.createNull({
          document: doc,
          userInput: Controller.createNull().input
        });
        editor.enterEditing(byId(doc, 'p1'));
        editor.moveNext();
        editor.moveNext(); // cursor: baz
        editor.extendPrevious(); // head: bar
        editor.extendPrevious(); // head: foo

        // act
        editor.movePrevious();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor())).toBe('foo');
        expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

        editor.destroy();
      });

      it('previous-extended + handleRight → CURSOR lands on anchor (start)', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editor = Editor.createNull({
          document: doc,
          userInput: Controller.createNull().input
        });
        editor.enterEditing(byId(doc, 'p1'));
        editor.moveNext();
        editor.moveNext(); // cursor: baz
        editor.extendPrevious();
        editor.extendPrevious();

        // act
        editor.moveNext();

        // assert
        expect(editor.getMode()).toBe('edit');
        expect(identify(editor.getCursor())).toBe('baz');
        expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

        editor.destroy();
      });

      it('exits editing when there is no selection', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
        const editor = Editor.createNull({
          document: doc,
          userInput: Controller.createNull().input
        });
        const p1 = byId(doc, 'p1');
        editor.enterEditing(p1);
        editor.extendNext();
        editor.handleExit(); // cancels selection
        expect(editor.getMode()).toBe('edit');

        // act — second handleExit now exits editing
        editor.handleExit();

        // assert
        expect(editor.getMode()).toBe('view');
        expect(editor.nav.getFocus()).toBe(p1);

        editor.destroy();
      });
    });
  });

  describe('Scrolling', () => {
    describe('revealActiveTarget (edit mode) - user scrolls into view', () => {
      it('centers the current TOKEN in edit mode', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar'), {
          viewportScrollerOpts: {
            getElementRect: (el) =>
              el.classList.contains('jsed-token-focus')
                ? {
                    top: 0,
                    left: 0,
                    bottom: 20,
                    right: 40,
                    width: 40,
                    height: 20
                  }
                : undefined
          }
        });
        const editor = createNullEditor(doc);
        editor.enterEditing(byId(doc, 'p1'));
        const token = editor.getCursor() as HTMLElement;
        const scrollRequests = doc.viewportScroller.trackScrollRequests();
        scrollRequests.data.length = 0;

        // act
        const revealed = editor.scrollActiveTargetIntoView();

        // assert
        expect(revealed).toBe(true);
        expect(scrollRequests.data).toEqual([
          {
            element: token,
            options: {
              block: 'center',
              inline: 'nearest',
              behavior: 'smooth'
            }
          }
        ]);

        editor.destroy();
      });
    });

    describe('revealActiveTarget (view mode) - user scrolls into view', () => {
      it('aligns an oversized FOCUSABLE to the top of the viewport', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar'), {
          viewportScrollerOpts: {
            getElementRect: (el) =>
              el.id === 'p1'
                ? {
                    top: 0,
                    left: 0,
                    bottom: 818,
                    right: 100,
                    width: 100,
                    height: 818
                  }
                : undefined
          }
        });
        const editor = createNullEditor(doc);
        editor.start();
        const p1 = byId(doc, 'p1');
        const scrollRequests = doc.viewportScroller.trackScrollRequests();
        scrollRequests.data.length = 0;

        // act
        const revealed = editor.scrollActiveTargetIntoView();

        // assert
        expect(revealed).toBe(true);
        expect(scrollRequests.data).toEqual([
          {
            element: p1,
            options: {
              block: 'start',
              inline: 'nearest',
              behavior: 'smooth'
            }
          }
        ]);

        editor.destroy();
      });
    });
  });

  describe('User types - input handling', () => {
    async function createEditorFixture(params?: { html?: string }) {
      const doc = makeRoot(params?.html ?? p({ id: 'p1' }, 'foo'));
      const line = byId(doc, 'p1');
      const firstToken = Tokenizer.createNull().tokenizeLineAt(line);
      if (!firstToken) {
        throw new Error('expected first token');
      }
      const ctl = Controller.createNull();
      const userInput = ctl.input;
      await userInput.setInputValue(getValue(firstToken));
      const editor = Editor.createNull({
        document: doc,
        userInput
      });
      editor.enterEditing(line);

      return { ctl, doc, editor, line, userInput };
    }

    function getTokenValues(line: HTMLElement) {
      return Array.from(line.querySelectorAll('.jsed-token')).map((token) => token.textContent);
    }

    test('"foo|" => "foo |" => "foo b|" ==> "b|": inserts new token after foo with space between', async () => {
      // arrange
      const { editor, line, userInput } = await createEditorFixture({
        html: p({ id: 'p1' }, 'foo')
      });
      // handleCursorChange asynchronously selects the whole token text
      await userInput.setCaret(3);
      expect(userInput.getRange()).toEqual([3, 3]); // verify

      // act: user types space at the end of "foo"
      await userInput.typeText(' ');

      // act: then types "b"
      await userInput.typeText('b');

      // assert
      expect(getTokenValues(line)).toEqual(['foo', 'b']);
      expect(identify(editor.getCursor())).toBe('b');
      expect(userInput.getInputValue()).toBe('b');
    });

    test('"foo bar" with "foo|" => "foo |" => "foo c|" ==> "c|": inserts a new token between foo and bar', async () => {
      // arrange
      const { editor, line, userInput } = await createEditorFixture({
        html: p({ id: 'p1' }, 'foo bar')
      });
      await userInput.setCaret(3);

      // act
      await userInput.typeText(' ');
      await userInput.typeText('c');

      // assert
      expect(getTokenValues(line)).toEqual(['foo', 'c', 'bar']);
      const [firstToken, secondToken, thirdToken] = Array.from(
        line.querySelectorAll('.jsed-token')
      );
      expect(firstToken?.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(firstToken?.nextSibling?.textContent).toBe(' ');
      expect(firstToken?.nextSibling?.nextSibling).toBe(secondToken);
      expect(secondToken?.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(secondToken?.nextSibling?.textContent).toBe(' ');
      expect(secondToken?.nextSibling?.nextSibling).toBe(thirdToken);
      expect(identify(editor.getCursor())).toBe('c');
      expect(userInput.getInputValue()).toBe('c');
    });

    test('"[foo]" => " |": moves next token', async () => {
      // arrange
      const { editor, line, userInput } = await createEditorFixture({
        html: p({ id: 'p1' }, 'foo bar')
      });
      await userInput.selectRange(0, 3);

      // act
      await userInput.typeText(' ');

      // assert
      expect(getTokenValues(line)).toEqual(['foo', 'bar']);
      expect(identify(editor.getCursor())).toBe('bar');
      expect(userInput.getInputValue()).toBe('bar');
    });

    test.skip('"foo|" => "foo |" ==> "[bar]": moves to the next token and keeps a space boundary', async () => {
      // arrange
      const { editor, line, userInput } = await createEditorFixture({
        html: p({ id: 'p1' }, 'foo bar')
      });
      await userInput.setCaret(3);

      // act
      await userInput.typeText(' ');

      // assert
      expect(getTokenValues(line)).toEqual(['foo', 'bar']);
      const [firstToken, secondToken] = Array.from(line.querySelectorAll('.jsed-token'));
      expect(firstToken?.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(firstToken?.nextSibling?.textContent).toBe(' ');
      expect(firstToken?.nextSibling?.nextSibling).toBe(secondToken);
      expect(identify(editor.getCursor())).toBe('bar');
      expect(userInput.getInputValue()).toBe('bar');
      expect(userInput.getRange()).toEqual([0, 3]);
    });

    test.skip('"foo|" => "foo |" inside collapsed inline wrappers creates a boundary space before moving to "[bar]"', async () => {
      // arrange
      const { editor, line, userInput } = await createEditorFixture({
        html: '<p id="p1"><em>foo</em><strong>bar</strong><u>baz</u></p>'
      });
      await userInput.setCaret(3);

      // act
      await userInput.typeText(' ');

      // assert
      const em = line.querySelector('em');
      const strong = line.querySelector('strong');
      expect(em?.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(em?.nextSibling?.textContent).toBe(' ');
      expect(em?.nextSibling?.nextSibling).toBe(strong);
      expect(identify(editor.getCursor())).toBe('bar');
      expect(userInput.getInputValue()).toBe('bar');
      expect(userInput.getRange()).toEqual([0, 3]);
    });

    test('"[foo]" => "|": deletes the token', async () => {
      // arrange
      const { line, userInput } = await createEditorFixture({
        html: p({ id: 'p1' }, 'foo')
      });
      await userInput.selectRange(0, 3);

      // act
      await userInput.typeText('');

      // assert
      expect(identifyChildren(line)).toEqual(['[anchor]', 'd("foo")']);
      expect(userInput.getInputValue()).toBe('');
    });

    test('"|foo" => " |foo" ==> "| foo" => "b| foo" ==> "b|": inserts new token before foo with space between', async () => {
      // arrange
      const { editor, line, userInput } = await createEditorFixture({
        html: p({ id: 'p1' }, 'foo')
      });
      await userInput.setCaret(0);

      // act
      await userInput.typeText(' ');
      await userInput.typeText('b');

      // assert
      expect(getTokenValues(line)).toEqual(['b', 'foo']);
      expect(identify(editor.getCursor())).toBe('b');
      expect(userInput.getInputValue()).toBe('b');
    });

    // TODO: is this still a valid scenario?
    test.skip('"|foo" => "b|foo" ==> "b |foo" ==> "b|": inserts new token before foo with space between', async () => {
      // arrange
      const { editor, line, userInput } = await createEditorFixture({
        html: p({ id: 'p1' }, 'foo')
      });
      await userInput.setCaret(0);

      // act
      await userInput.typeText('b');
      await userInput.typeText(' ');

      // assert
      expect(getTokenValues(line)).toEqual(['b', 'foo']);
      const [firstToken, secondToken] = Array.from(line.querySelectorAll('.jsed-token'));
      expect(firstToken?.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(firstToken?.nextSibling?.textContent).toBe(' ');
      expect(firstToken?.nextSibling?.nextSibling).toBe(secondToken);
      expect(identify(editor.getCursor())).toBe('b');
      expect(userInput.getInputValue()).toBe('b');
    });

    test('"fo|o" => " fo |o" ==> "[o]": splits at the cursor and prefers the trailing TOKEN with a space in-between', async () => {
      // arrange
      const { editor, line, userInput } = await createEditorFixture({
        html: p({ id: 'p1' }, 'foo')
      });
      await userInput.setCaret(2);

      // act
      await userInput.typeText(' ');

      // assert
      expect(getTokenValues(line)).toEqual(['fo', 'o']);
      const [firstToken, secondToken] = Array.from(line.querySelectorAll('.jsed-token'));
      expect(firstToken?.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(firstToken?.nextSibling?.textContent).toBe(' ');
      expect(firstToken?.nextSibling?.nextSibling).toBe(secondToken);
      expect(identify(editor.getCursor())).toBe('o');
      expect(userInput.getInputValue()).toBe('o');
    });
  });

  /**
   * Typing while a selection is active should replace the whole selection
   * with a single new TOKEN positioned where the head was. Tiered from
   * easy to hard:
   *   1. single-LINE full selection  → one TOKEN, rest removed
   *   2. single-LINE partial         → selected removed, rest intact
   *   3. INLINE_FLOW fully consumed  → em-tag removed when emptied
   *   4. cross-LINE with one empty   → p-tag removed when emptied
   *
   * All four currently fail — typing acts only on the anchor TOKEN.
   */
  describe('User types over a selection', () => {
    async function setupWithDoc(doc: ReturnType<typeof makeRoot>, seed: HTMLElement) {
      const userInput = Controller.createNull().input;
      const editor = Editor.createNull({ document: doc, userInput });
      editor.enterEditing(seed);
      return { editor, userInput };
    }

    function tokenValues(el: HTMLElement): string[] {
      return Array.from(el.querySelectorAll('.jsed-token')).map((t) => t.textContent ?? '');
    }

    test('type over selection - replace all / extendNext', async () => {
      // arrange: p(foo bar baz), select all three tokens forward
      const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
      const p1 = byId(doc, 'p1');
      const { editor, userInput } = await setupWithDoc(doc, p1);
      editor.extendNext(); // head: bar
      editor.extendNext(); // head: baz

      // act: user types over the selection
      await userInput.typeText('x');

      // assert
      expect(tokenValues(p1)).toEqual(['x']);
      expect(identify(editor.getCursor())).toBe('x');
      expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);
      // Input value reflects what the user typed — handleCursorChange must
      // not clobber it with the head TOKEN's pre-rewrite value.
      expect(userInput.getInputValue()).toBe('x');

      editor.destroy();
    });

    test('type over selection - partial extendNext', async () => {
      // arrange: p(foo bar baz), anchor=foo, head=bar
      const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
      const p1 = byId(doc, 'p1');
      const { editor, userInput } = await setupWithDoc(doc, p1);
      editor.extendNext(); // head: bar

      // act
      await userInput.typeText('x');

      // assert: 'foo' and 'bar' gone, 'x' lands where bar was, 'baz' intact
      expect(tokenValues(p1)).toEqual(['x', 'baz']);
      expect(identify(editor.getCursor())).toBe('x');
      expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

      editor.destroy();
    });

    test('type over selection - INLINE_FLOW extendNext', async () => {
      // arrange: p(aa <em>bb cc</em> dd)
      const doc = makeRoot(
        p(
          { id: 'p1' }, //
          'aa ',
          em(
            { ...inlineStyleHack, id: 'em1' }, //
            'bb cc'
          ),
          ' dd'
        )
      );
      const p1 = byId(doc, 'p1');
      const { editor, userInput } = await setupWithDoc(doc, p1);
      editor.extendNext(); // aa -> bb
      editor.extendNext(); // bb -> cc

      // act
      await userInput.typeText('x');

      // assert: em emptied and removed; p has single 'x' followed by 'dd'
      expect(Array.from(p1.querySelectorAll(`.${JSED_TOKEN_CLASS}`)).map(identify)).toEqual([
        'x',
        'dd'
      ]);
      expect(isToken(p1.firstChild)).toBe(true);
      expect(identify(p1.firstChild)).toBe('x');
      expect(identify(editor.getCursor())).toBe('x');
      const elements = Array.from(p1.querySelectorAll('*'));
      expect(elements).toHaveLength(3);
      expect(identify(elements[0])).toBe('x');
      expect(isDeletedElement(elements[1])).toBe(true);
      expect(identify(elements[2])).toBe('dd');
      expect(tokenValues(p1)).toEqual(['x', 'dd']);

      editor.destroy();
    });

    test('type over selection - cross-LINE extendNext', async () => {
      // arrange: p1(foo bar) + p2(baz qux). Anchor=foo (in p1); forward
      // extension to baz crosses into p2. Selection = [foo, bar, baz].
      // Standard text-editor UX: typing lands where the selection STARTED
      // (p1). p1's tokens are all in the selection but p1 survives because
      // it hosts the new TOKEN; p2 is partial so qux remains.
      const doc = makeRoot(
        frag(
          p({ id: 'p1' }, 'foo bar'), //
          p({ id: 'p2' }, 'baz qux')
        )
      );
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');
      const { editor, userInput } = await setupWithDoc(doc, p1);
      editor.extendNext(); // head: bar
      editor.extendNext(); // head: baz (crossed into p2)

      // act
      await userInput.typeText('x');

      // assert
      expect(tokenValues(p1)).toEqual(['x']);
      expect(tokenValues(p2)).toEqual(['qux']);
      expect(identify(editor.getCursor())).toBe('x');
      expect(doc.root.querySelector('#p1')).not.toBeNull();

      editor.destroy();
    });
  });
});
