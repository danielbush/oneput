import { describe, expect, it, test, vi } from 'vitest';
import { EditManager } from '../EditManager.js';
import {
  byId,
  div,
  em,
  frag,
  identify,
  inlineStyleHack,
  li,
  makeRoot,
  p,
  s,
  t,
  ul
} from '../test/util.js';
import { getValue } from '../lib/token.js';
import { JSED_ANCHOR_CHAR, JSED_TOKEN_CLASS } from '../lib/constants.js';
import { Controller } from '../../../oneput/src/lib/oneput/controllers/controller.js';
import { Tokenizer } from '../Tokenizer.js';
import { isIsland, isToken } from '../lib/taxonomy.js';

describe('EditManager', () => {
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
      const editManager = EditManager.createNull({
        document: doc
      });
      editManager.start();
      const p2 = byId(doc, 'p2');

      // act
      editManager.nav.REQUEST_FOCUS(p2);

      // assert
      expect(editManager.getMode()).toBe('view');
      expect(editManager.nav.getFocus()).toBe(p2);
      expect(p2.querySelectorAll('.jsed-token')).toHaveLength(2);

      editManager.destroy();
    });

    it('focusing a new FOCUSABLE tokenizes that new LINE without entering edit mode', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
      const editManager = EditManager.createNull({
        document: doc
      });
      editManager.start();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');

      expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
      expect(p2.querySelectorAll('.jsed-token')).toHaveLength(0);

      // act
      editManager.nav.REQUEST_FOCUS(p2);

      // assert
      expect(editManager.getMode()).toBe('view');
      expect(editManager.nav.getFocus()).toBe(p2);
      expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
      expect(p2.querySelectorAll('.jsed-token')).toHaveLength(2);

      editManager.destroy();
    });

    it('re-focusing an already-tokenized LINE is idempotent at the DOM level', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
      const editManager = EditManager.createNull({
        document: doc
      });
      editManager.start();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');

      const originalTokens = Array.from(p1.querySelectorAll('.jsed-token'));
      expect(originalTokens).toHaveLength(2);

      editManager.nav.REQUEST_FOCUS(p2);
      expect(editManager.nav.getFocus()).toBe(p2);

      // act
      editManager.nav.REQUEST_FOCUS(p1);

      // assert
      const retokenizedTokens = Array.from(p1.querySelectorAll('.jsed-token'));
      expect(editManager.getMode()).toBe('view');
      expect(editManager.nav.getFocus()).toBe(p1);
      expect(retokenizedTokens).toHaveLength(2);
      expect(retokenizedTokens).toEqual(originalTokens);
      expect(p1.querySelector('.jsed-token .jsed-token')).toBeNull();

      editManager.destroy();
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
      const editManager = EditManager.createNull({
        document: doc
      });
      editManager.start();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');
      const ignoredTarget = byId(doc, 'ignored-target');

      expect(editManager.nav.getFocus()).toBe(p1);
      expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
      expect(p2.querySelectorAll('.jsed-token')).toHaveLength(0);

      // act
      editManager.nav.REQUEST_FOCUS(ignoredTarget);

      // assert
      expect(editManager.getMode()).toBe('view');
      expect(editManager.nav.getFocus()).toBe(p1);
      expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
      expect(p2.querySelectorAll('.jsed-token')).toHaveLength(0);

      editManager.destroy();
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
      const editManager = EditManager.createNull({
        document: doc
      });
      editManager.start();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');
      const p3 = byId(doc, 'p3');
      const p4 = byId(doc, 'p4');

      // act
      editManager.nav.REQUEST_FOCUS(p2);
      editManager.nav.REQUEST_FOCUS(p3);
      editManager.nav.REQUEST_FOCUS(p4);
      await vi.runAllTimersAsync();

      // assert
      expect(editManager.getMode()).toBe('view');
      expect(editManager.nav.getFocus()).toBe(p4);
      expect(p1.querySelector('.jsed-token')).toBeNull();
      expect(p2.querySelector('.jsed-token')?.textContent).toBe('bbb');
      expect(p3.querySelector('.jsed-token')?.textContent).toBe('ccc');
      expect(p4.querySelector('.jsed-token')?.textContent).toBe('ddd');

      editManager.destroy();
      vi.useRealTimers();
    });

    it('clicking a token in another already-tokenized FOCUSABLE requires two interactions', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
      const editManager = EditManager.createNull({
        document: doc,
        userInput: Controller.createNull().input
      });
      editManager.start();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');

      editManager.nav.REQUEST_FOCUS(p2);
      const p1FirstToken = p1.querySelector('.jsed-token') as HTMLElement;

      // act
      editManager.nav.REQUEST_FOCUS(p1FirstToken);

      // assert
      expect(editManager.getMode()).toBe('view');
      expect(editManager.nav.getFocus()).toBe(p1);

      // act
      editManager.nav.REQUEST_FOCUS(p1FirstToken);

      // assert
      expect(editManager.getMode()).toBe('edit');
      expect(editManager.cursor?.getToken()).toBe(p1FirstToken);

      editManager.destroy();
    });
  });

  describe('REQUEST_FOCUS (edit mode): User clicks/touches', () => {
    it('exiting edit mode by focusing another element quick-descends and tokenizes the new focus target', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
      const editManager = EditManager.createNull({
        document: doc,
        userInput: Controller.createNull().input
      });
      editManager.start();
      editManager.enterEditing(byId(doc, 'p1'));
      const p2 = byId(doc, 'p2');

      // act
      editManager.nav.REQUEST_FOCUS(p2);

      // assert
      expect(editManager.getMode()).toBe('view');
      expect(editManager.nav.getFocus()).toBe(p2);
      expect(p2.querySelectorAll('.jsed-token')).toHaveLength(2);

      editManager.destroy();
    });
  });

  // Action = Key or menu
  describe('FOCUS-based actions (view mode)', () => {
    describe('handleRight', () => {
      it('descends within the focused subtree in view mode', () => {
        // arrange
        const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();
        const p1 = byId(doc, 'p1');

        // act
        editManager.moveNext();

        // assert
        expect(editManager.getMode()).toBe('view');
        expect(editManager.nav.getFocus()).toBe(p1);

        editManager.destroy();
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
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();

        editManager.nav.REQUEST_FOCUS(byId(doc, 'p2'));

        // act
        editManager.moveUp();

        // assert
        expect(editManager.nav.getFocus()).toBe(byId(doc, 'p1'));

        editManager.destroy();
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
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();

        editManager.nav.REQUEST_FOCUS(byId(doc, 'p2'));

        // act
        editManager.moveDown();

        // assert
        expect(editManager.nav.getFocus()).toBe(byId(doc, 'p3'));

        editManager.destroy();
      });
    });

    describe('insertElementAfterFocus', () => {
      it('inserts a new element after the focused tag and focuses it', () => {
        // arrange
        const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();

        // act
        const inserted = editManager.insertElementAfterFocus();

        // assert
        const children = Array.from(doc.root.children);
        expect(inserted).toBe(true);
        expect(children).toHaveLength(3);
        expect(children[1]?.tagName.toLowerCase()).toBe('p');
        expect(children[1]?.querySelector(`.${JSED_TOKEN_CLASS}`)).not.toBeNull();
        expect(editManager.nav.getFocus()).toBe(children[1]);

        editManager.destroy();
      });

      it('uses a typed element name when the focused tag parent allows it', () => {
        // arrange
        const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();

        // act
        const inserted = editManager.insertElementAfterFocus('h2');

        // assert
        const children = Array.from(doc.root.children);
        expect(inserted).toBe(true);
        expect(children[1]?.tagName.toLowerCase()).toBe('h2');
        expect(editManager.nav.getFocus()).toBe(children[1]);

        editManager.destroy();
      });
    });

    describe('insertElementBeforeFocus', () => {
      it('uses a typed element name before the focused tag and focuses it', () => {
        // arrange
        const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();
        editManager.nav.REQUEST_FOCUS(byId(doc, 'p2'));

        // act
        const inserted = editManager.insertElementBeforeFocus('h2');

        // assert
        const children = Array.from(doc.root.children);
        expect(inserted).toBe(true);
        expect(children).toHaveLength(3);
        expect(children[1]?.tagName.toLowerCase()).toBe('h2');
        expect(editManager.nav.getFocus()).toBe(children[1]);

        editManager.destroy();
      });
    });

    describe('insertElementInFocus', () => {
      it('uses a typed element name inside the focused tag and focuses it', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo'));
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();
        const p1 = byId(doc, 'p1');

        // act
        const inserted = editManager.insertElementInFocus('span');

        // assert
        const child = p1.lastElementChild;
        expect(inserted).toBe(true);
        expect(child?.tagName.toLowerCase()).toBe('span');
        expect(child?.querySelector(`.${JSED_TOKEN_CLASS}`)).not.toBeNull();
        expect(editManager.nav.getFocus()).toBe(child);

        editManager.destroy();
      });

      it('defaults to a specific child tag when the focused tag requires one', () => {
        // arrange
        const doc = makeRoot(ul({ id: 'list' }, li('one')));
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();
        const list = byId(doc, 'list');
        editManager.nav.REQUEST_FOCUS(list);

        // act
        const inserted = editManager.insertElementInFocus();

        // assert
        const child = list.lastElementChild;
        expect(inserted).toBe(true);
        expect(child?.tagName.toLowerCase()).toBe('li');
        expect(editManager.nav.getFocus()).toBe(child);

        editManager.destroy();
      });

      it('does not offer insert-in for a tag without child elements', () => {
        // arrange
        const doc = makeRoot('<br id="break">');
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();

        // assert
        expect(editManager.canInsertElementInFocus()).toBe(false);
        expect(editManager.insertElementInFocus()).toBe(false);

        editManager.destroy();
      });
    });

    describe('deleteFocus', () => {
      it('deletes the focused element and focuses the next FOCUSABLE', () => {
        // arrange
        const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();
        const p1 = byId(doc, 'p1');
        const p2 = byId(doc, 'p2');

        // act
        const deleted = editManager.deleteFocus();

        // assert
        expect(deleted).toBe(true);
        expect(doc.root.contains(p1)).toBe(false);
        expect(Array.from(doc.root.children)).toHaveLength(1);
        expect(editManager.nav.getFocus()).toBe(p2);

        editManager.destroy();
      });

      it('deletes the focused element and falls back to the previous FOCUSABLE', () => {
        // arrange
        const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();
        const p1 = byId(doc, 'p1');
        const p2 = byId(doc, 'p2');
        editManager.nav.REQUEST_FOCUS(p2);

        // act
        const deleted = editManager.deleteFocus();

        // assert
        expect(deleted).toBe(true);
        expect(doc.root.contains(p2)).toBe(false);
        expect(Array.from(doc.root.children)).toHaveLength(1);
        expect(editManager.nav.getFocus()).toBe(p1);

        editManager.destroy();
      });
    });

    describe('handleEnter - user initiates editing', () => {
      test('from a focused LINE with a leading ISLAND lands the CURSOR on that ISLAND', () => {
        // arrange
        const doc = makeRoot(
          '<div id="d1"><span class="katex" style="display:inline;">x²</span> after island</div>'
        );
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();
        const div1 = byId(doc, 'd1');

        editManager.nav.REQUEST_FOCUS(div1);

        // act
        const result = editManager.handleEnter();

        // assert
        expect(result.isOk()).toBe(true);
        expect(editManager.getMode()).toBe('edit');
        expect(editManager.cursor).toBeDefined();
        expect(isIsland(editManager.cursor!.getToken())).toBe(true);
        expect(editManager.cursor!.getToken().classList.contains('katex')).toBe(true);

        editManager.destroy();
      });
    });
  });

  describe('CURSOR-based actions (edit mode)', () => {
    describe('wrapCursorWithTag', () => {
      it('wraps the current TOKEN and keeps the CURSOR on that TOKEN', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p1'));
        const cursorToken = editManager.cursor?.getToken() as HTMLElement;

        // act
        const wrapped = editManager.wrapCursorWithTag('em');

        // assert
        const wrapper = byId(doc, 'p1').querySelector('em') as HTMLElement;
        expect(wrapped).toBe(true);
        expect(wrapper).not.toBeNull();
        expect(wrapper.textContent).toBe('foo');
        expect(wrapper.firstElementChild).toBe(cursorToken);
        expect(editManager.cursor?.getToken()).toBe(cursorToken);
        expect(editManager.nav.getFocus()).toBe(wrapper);

        editManager.destroy();
      });

      it('wraps the current ISLAND and keeps the CURSOR on that ISLAND', () => {
        // arrange
        const doc = makeRoot(
          '<div id="d1"><span class="katex" style="display:inline;">x²</span> after island</div>'
        );
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'd1'));
        const island = editManager.cursor?.getToken() as HTMLElement;

        // act
        const wrapped = editManager.wrapCursorWithTag('em');

        // assert
        const wrapper = byId(doc, 'd1').querySelector('em') as HTMLElement;
        expect(wrapped).toBe(true);
        expect(wrapper).not.toBeNull();
        expect(wrapper.firstElementChild).toBe(island);
        expect(isIsland(editManager.cursor!.getToken())).toBe(true);
        expect(editManager.cursor?.getToken()).toBe(island);

        editManager.destroy();
      });

      it('wraps the active SELECTION and clears the transient selection wrappers', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p1'));
        const anchor = editManager.cursor?.getToken() as HTMLElement;
        editManager.extendNext();

        // act
        const wrapped = editManager.wrapCursorWithTag('strong');

        // assert
        const wrapper = byId(doc, 'p1').querySelector('strong') as HTMLElement;
        expect(wrapped).toBe(true);
        expect(wrapper).not.toBeNull();
        expect(wrapper.textContent).toBe('foo bar');
        expect(doc.root.querySelector('.jsed-selection')).toBeNull();
        expect(editManager.cursor?.getToken()).toBe(anchor);
        expect(editManager.nav.getFocus()).toBe(wrapper);

        editManager.destroy();
      });

      it('wraps a SELECTION containing an ISLAND', () => {
        // arrange
        const doc = makeRoot(
          '<div id="d1">before <span class="katex" style="display:inline;">x²</span> after</div>'
        );
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'd1'));
        editManager.extendNext();

        // act
        const wrapped = editManager.wrapCursorWithTag('strong');

        // assert
        const wrapper = byId(doc, 'd1').querySelector('strong') as HTMLElement;
        expect(wrapped).toBe(true);
        expect(wrapper).not.toBeNull();
        expect(wrapper.textContent).toBe('before x²');
        expect(wrapper.querySelector('.katex')).not.toBeNull();
        expect(doc.root.querySelector('.jsed-selection')).toBeNull();

        editManager.destroy();
      });
    });

    describe('handleEnter - user initiates editing', () => {
      describe('enterEditing: when user initiates editing...', () => {
        // TODO: should these be in handleEnter ?
        it('places the CURSOR on the first TOKEN when entering editing from a FOCUSABLE', () => {
          // arrange
          const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
          const editManager = EditManager.createNull({
            document: doc
          });

          // act
          const result = editManager.enterEditing(byId(doc, 'p1'));

          // assert
          expect(result.isOk()).toBe(true);
          expect(editManager.getMode()).toBe('edit');
          expect(editManager.cursor?.getToken().textContent?.trim()).toBe('foo');

          editManager.destroy();
        });

        it('tokenizes the focused LINE and lands on its first TOKEN', () => {
          // arrange
          const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
          const editManager = EditManager.createNull({
            document: doc
          });
          const line = byId(doc, 'p1');

          expect(line.querySelectorAll('.jsed-token')).toHaveLength(0);

          // act
          const result = editManager.enterEditing(line);

          // assert
          expect(result.isOk()).toBe(true);
          expect(editManager.getMode()).toBe('edit');
          expect(
            Array.from(line.querySelectorAll('.jsed-token')).map((token) => token.textContent)
          ).toEqual(['foo', 'bar', 'baz']);
          expect(getValue(editManager.cursor!.getToken())).toBe('foo');

          editManager.destroy();
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
          const editManager = EditManager.createNull({
            document: doc
          });
          const div1 = byId(doc, 'div1');
          const p1 = byId(doc, 'p1');
          const p2 = byId(doc, 'p2');

          expect(div1.querySelectorAll(':scope > .jsed-token')).toHaveLength(0);
          expect(p1.querySelectorAll('.jsed-token')).toHaveLength(0);
          expect(p2.querySelectorAll('.jsed-token')).toHaveLength(0);

          // act
          const result = editManager.enterEditing(div1);

          // assert
          expect(result.isOk()).toBe(true);
          expect(editManager.getMode()).toBe('edit');
          expect(div1.querySelectorAll(':scope > .jsed-token')).toHaveLength(0);
          expect(
            Array.from(p1.querySelectorAll('.jsed-token')).map((token) => token.textContent)
          ).toEqual(['foo', 'bar']);
          expect(p2.querySelectorAll('.jsed-token')).toHaveLength(0);
          expect(getValue(editManager.cursor!.getToken())).toBe('foo');

          editManager.destroy();
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
          const editManager = EditManager.createNull({
            document: doc
          });
          const div1 = byId(doc, 'div1');
          const emptyLine = byId(doc, 'empty-line');
          const firstEditableLine = byId(doc, 'first-editable-line');
          const laterLine = byId(doc, 'later-line');

          // act
          const result = editManager.enterEditing(div1);

          // assert
          expect(result.isOk()).toBe(true);
          expect(editManager.getMode()).toBe('edit');
          expect(emptyLine.querySelectorAll('.jsed-token')).toHaveLength(0);
          expect(
            Array.from(firstEditableLine.querySelectorAll('.jsed-token')).map(
              (token) => token.textContent
            )
          ).toEqual(['foo', 'bar']);
          expect(laterLine.querySelectorAll('.jsed-token')).toHaveLength(0);
          expect(getValue(editManager.cursor!.getToken())).toBe('foo');

          editManager.destroy();
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
          const editManager = EditManager.createNull({
            document: doc
          });

          // act
          const result = editManager.enterEditing(em1);

          // assert
          expect(result.isOk()).toBe(true);
          expect(editManager.getMode()).toBe('edit');
          expect(editManager.cursor?.getToken()).not.toBeNull();
          expect(editManager.cursor?.getToken()!.textContent).toEqual('italic');
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
          const editManager = EditManager.createNull({
            document: doc
          });

          // act
          const result = editManager.enterEditing(em1);

          // assert
          expect(result.isOk()).toBe(false);
          expect(editManager.getMode()).toBe('view');
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
          const editManager = EditManager.createNull({
            document: doc
          });

          // act
          const result = editManager.enterEditing(middle1!);

          // assert
          expect(result.isOk()).toBe(true);
          expect(editManager.getMode()).toBe('edit');
          expect(editManager.cursor?.getToken()).not.toBeNull();
          expect(editManager.cursor?.getToken()!.textContent).toEqual('middle');
        });
      });
    });

    describe('handleRight', () => {
      it('moves to the next TOKEN in edit mode', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p1'));

        // act
        editManager.moveNext();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(editManager.cursor?.getToken().textContent?.trim()).toBe('bar');

        editManager.destroy();
      });

      it('from the last TOKEN of a LINE enters the next LINE', () => {
        // arrange
        const doc = makeRoot(
          frag(
            p({ id: 'p1' }, 'aaa'), //
            p({ id: 'p2' }, 'bbb ccc')
          )
        );
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p1'));

        // act
        editManager.moveNext();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

        editManager.destroy();
      });

      it('from the last LINE_SIBLING of a LINE enters the next LINE that starts with an ISLAND', () => {
        // arrange
        const doc = makeRoot(
          frag(
            p({ id: 'p1' }, 'aaa'),
            p({ id: 'p2' }, '<span class="katex" style="display:inline;">x²</span>', ' bbb')
          )
        );
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p1'));

        // act
        editManager.moveNext();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(identify(editManager.cursor!.getToken())).toBe('[island:span]');

        editManager.destroy();
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
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p2'));

        // act
        editManager.moveNext();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

        editManager.destroy();
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
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p1'));

        // act
        editManager.moveNext();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

        editManager.destroy();
      });
    });

    describe('handleLeft', () => {
      it('moves to the previous TOKEN in edit mode', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p1'));
        editManager.cursor?.moveNext();

        // act
        editManager.movePrevious();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(editManager.cursor?.getToken().textContent?.trim()).toBe('foo');

        editManager.destroy();
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
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p2'));

        // act
        editManager.movePrevious();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

        editManager.destroy();
      });

      it('from the first TOKEN of a LINE enters the previous LINE that ends with an ISLAND', () => {
        // arrange
        const doc = makeRoot(
          frag(
            p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>'),
            p({ id: 'p2' }, 'bbb')
          )
        );
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p2'));
        expect(identify(editManager.cursor!.getToken())).toBe('bbb');

        // act
        editManager.movePrevious();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(identify(editManager.cursor!.getToken())).toBe('[island:span]');

        editManager.destroy();
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
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p3'));

        // act
        editManager.movePrevious();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

        editManager.destroy();
      });

      it('from the first paragraph in an opaque container skips the container and continues to something before it', () => {
        // arrange
        const doc = makeRoot(
          frag(
            p({ id: 'before' }, 'zzz'),
            div({ id: 'outer' }, p({ id: 'p1' }, 'aaa'), p({ id: 'p2' }, 'bbb'))
          )
        );
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p1'));

        // act
        editManager.movePrevious();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('zzz');

        editManager.destroy();
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
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p1'));

        // act
        editManager.movePrevious();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('aaa');

        editManager.destroy();
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
          const editManager = EditManager.createNull({
            document: doc
          });

          // act + assert
          editManager.enterEditing(byId(doc, 'p1'));
          expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

          editManager.movePrevious();
          // This triggers findPreviousLineCandidate to return an untokenized
          // text node 'aaa' but only when tokenizeLooseLinesIn ignored the
          // first LOOSE_LINE ('aaa').
          expect(getValue(editManager.cursor!.getToken())).toBe('aaa');

          editManager.destroy();
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
          const editManager = EditManager.createNull({
            document: doc
          });

          // act + assert
          editManager.enterEditing(byId(doc, 'p2'));
          expect(editManager.getMode()).toBe('edit');
          expect(isToken(editManager.cursor!.getToken())).toBe(true);
          expect(getValue(editManager.cursor!.getToken())).toBe('ddd');

          // Regression here in findPreviousCrossLineTarget.
          // <loose/> never gets tokenized and the current algorithm
          // doesn't detect tokens.
          editManager.movePrevious();
          expect(isToken(editManager.cursor!.getToken())).toBe(true);
          expect(getValue(editManager.cursor!.getToken())).toBe('ccc');

          editManager.movePrevious();
          expect(isToken(editManager.cursor!.getToken())).toBe(true);
          expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

          editManager.movePrevious();
          expect(editManager.cursor!.getToken().innerText).toBe('aaa');

          editManager.destroy();
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
          const editManager = EditManager.createNull({
            document: doc
          });

          // act + assert
          editManager.enterEditing(byId(doc, 'p2'));
          expect(getValue(editManager.cursor!.getToken())).toBe('ddd');

          editManager.movePrevious();
          expect(getValue(editManager.cursor!.getToken())).toBe('ccc');

          editManager.movePrevious();
          expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

          editManager.movePrevious();
          expect(isToken(editManager.cursor!.getToken())).toBe(true);
          expect(getValue(editManager.cursor!.getToken())).toBe('aaa');

          editManager.destroy();
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
          const editManager = EditManager.createNull({
            document: doc
          });

          // act + assert
          editManager.enterEditing(byId(doc, 'p2'));
          expect(getValue(editManager.cursor!.getToken())).toBe('eee');

          editManager.movePrevious();
          expect(getValue(editManager.cursor!.getToken())).toBe('ddd');

          editManager.movePrevious();
          // Key regression here - something about the div boundary between div1 and div2.
          expect(getValue(editManager.cursor!.getToken())).toBe('ccc');

          editManager.movePrevious();
          expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

          editManager.movePrevious();
          expect(getValue(editManager.cursor!.getToken())).toBe('aaa');

          editManager.destroy();
        });
      });
    });

    describe('handleExit', () => {
      it('leaves edit mode and returns to view mode', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();
        const p1 = byId(doc, 'p1');
        editManager.enterEditing(p1);

        // act
        editManager.handleExit();

        // assert
        expect(editManager.getMode()).toBe('view');
        expect(editManager.nav.getFocus()).toBe(p1);

        editManager.destroy();
      });

      it('cancels a forward-extended selection and lands the CURSOR on the head (stays in edit mode)', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editManager = EditManager.createNull({ document: doc });
        editManager.enterEditing(byId(doc, 'p1'));
        editManager.extendNext(); // head: bar
        editManager.extendNext(); // head: baz

        // act
        editManager.handleExit();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('baz');
        expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

        editManager.destroy();
      });

      it('cancels a backward-extended selection and lands the CURSOR on the head', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editManager = EditManager.createNull({ document: doc });
        editManager.enterEditing(byId(doc, 'p1'));
        editManager.moveNext(); // cursor: bar
        editManager.moveNext(); // cursor: baz
        editManager.extendPrevious(); // head: bar
        editManager.extendPrevious(); // head: foo

        // act
        editManager.handleExit();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('foo');
        expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

        editManager.destroy();
      });

      it('next-extended + handleRight → CURSOR lands on head (forward end)', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editManager = EditManager.createNull({ document: doc });
        editManager.enterEditing(byId(doc, 'p1'));
        editManager.extendNext(); // head: bar
        editManager.extendNext(); // head: baz

        // act
        editManager.moveNext();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('baz');
        expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

        editManager.destroy();
      });

      it('next-extended + handleLeft → CURSOR lands on anchor (start)', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editManager = EditManager.createNull({ document: doc });
        editManager.enterEditing(byId(doc, 'p1'));
        editManager.extendNext();
        editManager.extendNext();

        // act
        editManager.movePrevious();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('foo');
        expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

        editManager.destroy();
      });

      it('previous-extended + handleLeft → CURSOR lands on head (backward end)', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editManager = EditManager.createNull({ document: doc });
        editManager.enterEditing(byId(doc, 'p1'));
        editManager.moveNext();
        editManager.moveNext(); // cursor: baz
        editManager.extendPrevious(); // head: bar
        editManager.extendPrevious(); // head: foo

        // act
        editManager.movePrevious();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('foo');
        expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

        editManager.destroy();
      });

      it('previous-extended + handleRight → CURSOR lands on anchor (start)', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
        const editManager = EditManager.createNull({ document: doc });
        editManager.enterEditing(byId(doc, 'p1'));
        editManager.moveNext();
        editManager.moveNext(); // cursor: baz
        editManager.extendPrevious();
        editManager.extendPrevious();

        // act
        editManager.moveNext();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('baz');
        expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

        editManager.destroy();
      });

      it('exits editing when there is no selection', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
        const editManager = EditManager.createNull({ document: doc });
        const p1 = byId(doc, 'p1');
        editManager.enterEditing(p1);
        editManager.extendNext();
        editManager.handleExit(); // cancels selection
        expect(editManager.getMode()).toBe('edit');

        // act — second handleExit now exits editing
        editManager.handleExit();

        // assert
        expect(editManager.getMode()).toBe('view');
        expect(editManager.nav.getFocus()).toBe(p1);

        editManager.destroy();
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
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.enterEditing(byId(doc, 'p1'));
        const token = editManager.cursor?.getToken() as HTMLElement;
        const scrollRequests = doc.viewportScroller.trackScrollRequests();
        scrollRequests.data.length = 0;

        // act
        const revealed = editManager.revealActiveTarget();

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

        editManager.destroy();
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
        const editManager = EditManager.createNull({
          document: doc
        });
        editManager.start();
        const p1 = byId(doc, 'p1');
        const scrollRequests = doc.viewportScroller.trackScrollRequests();
        scrollRequests.data.length = 0;

        // act
        const revealed = editManager.revealActiveTarget();

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

        editManager.destroy();
      });
    });
  });

  describe('User types - input handling', () => {
    async function createEditManagerFixture(params?: { html?: string }) {
      const doc = makeRoot(params?.html ?? p({ id: 'p1' }, 'foo'));
      const line = byId(doc, 'p1');
      const firstToken = Tokenizer.createNull().tokenizeLineAt(line);
      if (!firstToken) {
        throw new Error('expected first token');
      }
      const ctl = Controller.createNull();
      const userInput = ctl.input;
      await userInput.setInputValue(getValue(firstToken));
      const editManager = EditManager.createNull({
        document: doc,
        userInput
      });
      editManager.enterEditing(line);

      return { ctl, doc, editManager, line, userInput };
    }

    function getTokenValues(line: HTMLElement) {
      return Array.from(line.querySelectorAll('.jsed-token')).map((token) => token.textContent);
    }

    test('"foo|" => "foo |" => "foo b|" ==> "b|": inserts new token after foo with space between', async () => {
      // arrange
      const { editManager, line, userInput } = await createEditManagerFixture({
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
      expect(getValue(editManager.cursor!.getToken())).toBe('b');
      expect(userInput.getInputValue()).toBe('b');
    });

    test('"foo bar" with "foo|" => "foo |" => "foo c|" ==> "c|": inserts a new token between foo and bar', async () => {
      // arrange
      const { editManager, line, userInput } = await createEditManagerFixture({
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
      expect(getValue(editManager.cursor!.getToken())).toBe('c');
      expect(userInput.getInputValue()).toBe('c');
    });

    test('"[foo]" => " |": moves next token', async () => {
      // arrange
      const { editManager, line, userInput } = await createEditManagerFixture({
        html: p({ id: 'p1' }, 'foo bar')
      });
      await userInput.selectRange(0, 3);

      // act
      await userInput.typeText(' ');

      // assert
      expect(getTokenValues(line)).toEqual(['foo', 'bar']);
      expect(getValue(editManager.cursor!.getToken())).toBe('bar');
      expect(userInput.getInputValue()).toBe('bar');
    });

    test.skip('"foo|" => "foo |" ==> "[bar]": moves to the next token and keeps a space boundary', async () => {
      // arrange
      const { editManager, line, userInput } = await createEditManagerFixture({
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
      expect(getValue(editManager.cursor!.getToken())).toBe('bar');
      expect(userInput.getInputValue()).toBe('bar');
      expect(userInput.getRange()).toEqual([0, 3]);
    });

    test.skip('"foo|" => "foo |" inside collapsed inline wrappers creates a boundary space before moving to "[bar]"', async () => {
      // arrange
      const { editManager, line, userInput } = await createEditManagerFixture({
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
      expect(getValue(editManager.cursor!.getToken())).toBe('bar');
      expect(userInput.getInputValue()).toBe('bar');
      expect(userInput.getRange()).toEqual([0, 3]);
    });

    test('"[foo]" => "|": deletes the token', async () => {
      // arrange
      const { line, userInput } = await createEditManagerFixture({
        html: p({ id: 'p1' }, 'foo')
      });
      await userInput.selectRange(0, 3);

      // act
      await userInput.typeText('');

      // assert
      expect(line.querySelectorAll('.jsed-token')).toHaveLength(1);
      expect(userInput.getInputValue()).toBe(JSED_ANCHOR_CHAR);
    });

    test('"|foo" => " |foo" ==> "| foo" => "b| foo" ==> "b|": inserts new token before foo with space between', async () => {
      // arrange
      const { editManager, line, userInput } = await createEditManagerFixture({
        html: p({ id: 'p1' }, 'foo')
      });
      await userInput.setCaret(0);

      // act
      await userInput.typeText(' ');
      await userInput.typeText('b');

      // assert
      expect(getTokenValues(line)).toEqual(['b', 'foo']);
      expect(getValue(editManager.cursor!.getToken())).toBe('b');
      expect(userInput.getInputValue()).toBe('b');
    });

    test('"|foo" => "b|foo" ==> "b |foo" ==> "b|": inserts new token before foo with space between', async () => {
      // arrange
      const { editManager, line, userInput } = await createEditManagerFixture({
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
      expect(getValue(editManager.cursor!.getToken())).toBe('b');
      expect(userInput.getInputValue()).toBe('b');
    });

    test('"fo|o" => " fo |o" ==> "[o]": splits at the cursor and prefers the trailing TOKEN with a space in-between', async () => {
      // arrange
      const { editManager, line, userInput } = await createEditManagerFixture({
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
      expect(getValue(editManager.cursor!.getToken())).toBe('o');
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
      const editManager = EditManager.createNull({ document: doc, userInput });
      editManager.enterEditing(seed);
      return { editManager, userInput };
    }

    function tokenValues(el: HTMLElement): string[] {
      return Array.from(el.querySelectorAll('.jsed-token')).map((t) => t.textContent ?? '');
    }

    test('type over selection - replace all / extendNext', async () => {
      // arrange: p(foo bar baz), select all three tokens forward
      const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
      const p1 = byId(doc, 'p1');
      const { editManager, userInput } = await setupWithDoc(doc, p1);
      editManager.extendNext(); // head: bar
      editManager.extendNext(); // head: baz

      // act: user types over the selection
      await userInput.typeText('x');

      // assert
      expect(tokenValues(p1)).toEqual(['x']);
      expect(getValue(editManager.cursor!.getToken())).toBe('x');
      expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);
      // Input value reflects what the user typed — handleCursorChange must
      // not clobber it with the head TOKEN's pre-rewrite value.
      expect(userInput.getInputValue()).toBe('x');

      editManager.destroy();
    });

    test('type over selection - partial extendNext', async () => {
      // arrange: p(foo bar baz), anchor=foo, head=bar
      const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
      const p1 = byId(doc, 'p1');
      const { editManager, userInput } = await setupWithDoc(doc, p1);
      editManager.extendNext(); // head: bar

      // act
      await userInput.typeText('x');

      // assert: 'foo' and 'bar' gone, 'x' lands where bar was, 'baz' intact
      expect(tokenValues(p1)).toEqual(['x', 'baz']);
      expect(getValue(editManager.cursor!.getToken())).toBe('x');
      expect(doc.root.querySelectorAll('.jsed-selection').length).toBe(0);

      editManager.destroy();
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
      const { editManager, userInput } = await setupWithDoc(doc, p1);
      editManager.extendNext(); // aa -> bb
      editManager.extendNext(); // bb -> cc

      // act
      await userInput.typeText('x');

      // assert: em emptied and removed; p has single 'x' followed by 'dd'
      expect(Array.from(p1.querySelectorAll(`.${JSED_TOKEN_CLASS}`)).map(identify)).toEqual([
        'x',
        '[anchor]',
        'dd'
      ]);
      expect(isToken(p1.firstChild)).toBe(true);
      expect(getValue(p1.firstChild as HTMLElement)).toBe('x');
      expect(getValue(editManager.cursor!.getToken())).toBe('x');
      expect(Array.from(p1.querySelectorAll('em > *')).map(identify)).toEqual(['[anchor]']);

      editManager.destroy();
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
      const { editManager, userInput } = await setupWithDoc(doc, p1);
      editManager.extendNext(); // head: bar
      editManager.extendNext(); // head: baz (crossed into p2)

      // act
      await userInput.typeText('x');

      // assert
      expect(tokenValues(p1)).toEqual(['x']);
      expect(tokenValues(p2)).toEqual(['qux']);
      expect(getValue(editManager.cursor!.getToken())).toBe('x');
      expect(doc.root.querySelector('#p1')).not.toBeNull();

      editManager.destroy();
    });
  });
});
