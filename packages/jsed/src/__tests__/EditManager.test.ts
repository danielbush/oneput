import { describe, expect, it, test, vi } from 'vitest';
import { EditManager } from '../EditManager.js';
import {
  byId,
  div,
  em,
  em as emTag,
  frag,
  identify,
  inlineStyleHack,
  makeRoot,
  p,
  s,
  span,
  strong as strongTag,
  t
} from '../test/util.js';
import { getValue } from '../lib/token.js';
import { JSED_ANCHOR_CHAR } from '../lib/constants.js';
import { Controller } from '../../../oneput/src/lib/oneput/controllers/controller.js';
import { Tokenizer } from '../Tokenizer.js';
import { isIsland, isToken } from '../lib/taxonomy.js';

describe('EditManager', () => {
  describe('REQUEST_FOCUS (view mode): User clicks/touches', () => {
    it('first REQUEST_FOCUS in view mode tokenizes the focused LINE but stays in view mode', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
      const editManager = EditManager.createNull({
        document: doc
      });
      editManager.nav.connect();
      const p1 = byId(doc, 'p1');

      // act
      editManager.nav.REQUEST_FOCUS(p1);

      // assert
      expect(editManager.getMode()).toBe('view');
      expect(editManager.nav.getFocus()).toBe(p1);
      expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);

      editManager.destroy();
    });

    it('focusing a new FOCUSABLE tokenizes that new LINE without entering edit mode', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
      const editManager = EditManager.createNull({
        document: doc
      });
      editManager.nav.connect();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');

      editManager.nav.REQUEST_FOCUS(p1);
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
      editManager.nav.connect();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');

      editManager.nav.REQUEST_FOCUS(p1);
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
      editManager.nav.connect();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');
      const ignoredTarget = byId(doc, 'ignored-target');

      editManager.nav.REQUEST_FOCUS(p1);
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
      editManager.nav.connect();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');
      const p3 = byId(doc, 'p3');
      const p4 = byId(doc, 'p4');

      // act
      editManager.nav.REQUEST_FOCUS(p1);
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
      editManager.nav.connect();
      const p1 = byId(doc, 'p1');
      const p2 = byId(doc, 'p2');

      editManager.nav.REQUEST_FOCUS(p1);
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
      editManager.nav.connect();
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

    test('<p/> <loose/> <p/>', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'div1' },
          p({ id: 'p1' }, 'aaa'), //
          'bbb ccc', // not tokenized, regression here
          p({ id: 'p2' }, 'ddd')
        )
      );
      const editManager = EditManager.createNull({
        document: doc
      });
      const div1 = byId(doc, 'div1');

      // act
      editManager.nav.REQUEST_FOCUS(div1);

      // assert
      expect(editManager.getMode()).toBe('view');
      expect(editManager.nav.getFocus()).toBe(div1);
      // First FOCUS change should trigger tokenization for (1) first element;
      // (2) all loose text (this is the tricky bit).
      expect(Array.from(div1.querySelectorAll('.jsed-token')).map((t) => t.textContent)).toEqual([
        'aaa',
        'bbb',
        'ccc'
      ]);

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
        editManager.nav.connect();
        const p1 = byId(doc, 'p1');

        // act
        editManager.handleRight();

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
        editManager.nav.connect();

        editManager.nav.REQUEST_FOCUS(byId(doc, 'p2'));

        // act
        editManager.handleUp();

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
        editManager.nav.connect();

        editManager.nav.REQUEST_FOCUS(byId(doc, 'p2'));

        // act
        editManager.handleDown();

        // assert
        expect(editManager.nav.getFocus()).toBe(byId(doc, 'p3'));

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
        editManager.nav.connect();
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
        editManager.handleRight();

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
        editManager.handleRight();

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
        editManager.handleRight();

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
        editManager.handleRight();

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
        editManager.handleRight();

        // assert
        expect(editManager.getMode()).toBe('edit');
        expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

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
              ' ccc'
            )
          );
          const editManager = EditManager.createNull({
            document: doc
          });

          // act + assert
          editManager.enterEditing(byId(doc, 'div1'));
          expect(editManager.getMode()).toBe('edit');
          expect(isToken(editManager.cursor!.getToken())).toBe(true);
          expect(getValue(editManager.cursor!.getToken())).toBe('aaa');

          // The cursor sits on the p-tag
          // TODO: In another test we should repeat up to here then run
          // enterEditing at this point to go inside the p-tag.
          editManager.handleRight();
          expect(isToken(editManager.cursor!.getToken())).toBe(false);
          expect(editManager.cursor!.getToken().tagName).toBe('P');
          expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

          editManager.handleRight();
          expect(isToken(editManager.cursor!.getToken())).toBe(true);
          expect(getValue(editManager.cursor!.getToken())).toBe('ccc');

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
          editManager.enterEditing(byId(doc, 'p1'));
          expect(editManager.getMode()).toBe('edit');
          expect(isToken(editManager.cursor!.getToken())).toBe(true);
          expect(getValue(editManager.cursor!.getToken())).toBe('aaa');

          // Regression here in findCrossLineTarget.
          // <loose/> never gets tokenized and the current algorithm doesn't detect tokens.
          editManager.handleRight();
          expect(isToken(editManager.cursor!.getToken())).toBe(true);
          expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

          editManager.handleRight();
          expect(isToken(editManager.cursor!.getToken())).toBe(true);
          expect(getValue(editManager.cursor!.getToken())).toBe('ccc');

          editManager.handleRight();
          expect(isToken(editManager.cursor!.getToken())).toBe(false); // on p-tag
          expect(editManager.cursor!.getToken().innerText).toBe('ddd');

          editManager.destroy();
        });
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
        editManager.handleLeft();

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
        editManager.handleLeft();

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
        editManager.handleLeft();

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
        editManager.handleLeft();

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
        editManager.handleLeft();

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
        editManager.handleLeft();

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

          editManager.handleLeft();
          // This triggers findPreviousLineCandidate to return an untokenized
          // text node 'aaa'.
          expect(getValue(editManager.cursor!.getToken())).toBe('aaa');

          editManager.destroy();
        });

        it('<loose/> <p/> <loose/> <p/>', () => {
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

          editManager.handleLeft();
          expect(getValue(editManager.cursor!.getToken())).toBe('ccc');

          editManager.handleLeft();
          expect(isToken(editManager.cursor!.getToken())).toBe(false);
          expect(editManager.cursor!.getToken().tagName).toBe('P');
          expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

          editManager.handleLeft();
          expect(isToken(editManager.cursor!.getToken())).toBe(true);
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
          editManager.handleLeft();
          expect(isToken(editManager.cursor!.getToken())).toBe(true);
          expect(getValue(editManager.cursor!.getToken())).toBe('ccc');

          editManager.handleLeft();
          expect(isToken(editManager.cursor!.getToken())).toBe(true);
          expect(getValue(editManager.cursor!.getToken())).toBe('bbb');

          editManager.handleLeft();
          expect(isToken(editManager.cursor!.getToken())).toBe(false); // on p-tag
          expect(editManager.cursor!.getToken().tagName).toBe('P');
          expect(editManager.cursor!.getToken().innerText).toBe('aaa');

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
        const p1 = byId(doc, 'p1');
        editManager.enterEditing(p1);

        // act
        editManager.handleExit();

        // assert
        expect(editManager.getMode()).toBe('view');
        expect(editManager.nav.getFocus()).toBe(p1);

        editManager.destroy();
      });
    });
  });

  describe('scrolling', () => {
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
        const p1 = byId(doc, 'p1');
        editManager.nav.REQUEST_FOCUS(p1);
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

  describe('Actions at FOCUS', () => {
    describe('anchors', () => {
      describe('before tag', () => {
        it('inserts an anchor at the boundary and enters editing on it', () => {
          // arrange
          const doc = makeRoot(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              span({ class: 'jsed-ignore' }),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
            )
          );
          const userInput = Controller.createNull().input;
          const editManager = EditManager.createNull({
            document: doc,
            userInput
          });
          editManager.nav.connect();
          // const em = byId(doc, 'em1');
          const strong = byId(doc, 'strong1');

          editManager.nav.FOCUS(strong);

          // act
          const canInsert = editManager.canInsertAnchorBeforeTag();
          const result = editManager.insertAnchorBeforeTag();

          // assert
          expect(canInsert).toBe(true);
          expect(result).toBe(true);
          expect(editManager.isEditing()).toBe(true);
          const anchor = strong.previousElementSibling as HTMLElement | null;
          expect(anchor).not.toBeNull();
          expect(anchor?.classList.contains('jsed-token')).toBe(true);
          expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
          expect(editManager.cursor?.getToken()).toBe(anchor);
          expect(userInput.getInputValue()).toBe(JSED_ANCHOR_CHAR);
          expect(strong.previousElementSibling).toBe(anchor);

          editManager.destroy();
        });

        it('inserts an anchor before the focused tag when there is no previous sibling', () => {
          // arrange
          const doc = makeRoot(
            p({ id: 'p1' }, emTag({ id: 'em1', style: 'display:inline;' }, 'foo'))
          );
          const userInput = Controller.createNull().input;
          const editManager = EditManager.createNull({
            document: doc,
            userInput
          });
          editManager.nav.connect();
          const em = byId(doc, 'em1');

          editManager.nav.REQUEST_FOCUS(em);

          // act
          const canInsert = editManager.canInsertAnchorBeforeTag();
          const result = editManager.insertAnchorBeforeTag();

          // assert
          expect(canInsert).toBe(true);
          expect(result).toBe(true);
          expect(editManager.isEditing()).toBe(true);
          const anchor = em.previousElementSibling as HTMLElement | null;
          expect(anchor).not.toBeNull();
          expect(anchor?.classList.contains('jsed-token')).toBe(true);
          expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
          expect(editManager.cursor?.getToken()).toBe(anchor);
          expect(userInput.getInputValue()).toBe(JSED_ANCHOR_CHAR);

          editManager.destroy();
        });

        it('inserts an anchor after existing whitespace and enters editing on it', () => {
          // arrange
          const doc = makeRoot(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              s(' '),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
            )
          );
          const userInput = Controller.createNull().input;
          const editManager = EditManager.createNull({
            document: doc,
            userInput
          });
          editManager.nav.connect();
          const strong = byId(doc, 'strong1');

          editManager.nav.FOCUS(strong);

          // act
          const canInsert = editManager.canInsertAnchorBeforeTag();
          const result = editManager.insertAnchorBeforeTag();

          // assert
          expect(canInsert).toBe(true);
          expect(result).toBe(true);
          const anchor = strong.previousElementSibling as HTMLElement | null;
          expect(anchor).not.toBeNull();
          expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
          expect(editManager.cursor?.getToken()).toBe(anchor);
          expect(anchor?.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
          expect(anchor?.previousSibling?.textContent).toBe(' ');

          editManager.destroy();
        });

        it('does not insert an anchor when text already represents the gap', () => {
          // arrange
          const doc = makeRoot(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              s(' gap '),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
            )
          );
          const editManager = EditManager.createNull({
            document: doc
          });
          editManager.nav.connect();
          const strong = byId(doc, 'strong1');

          editManager.nav.FOCUS(strong);

          // act
          const canInsert = editManager.canInsertAnchorBeforeTag();
          const result = editManager.insertAnchorBeforeTag();

          // assert
          expect(canInsert).toBe(false);
          expect(result).toBe(false);
          expect(editManager.isEditing()).toBe(false);
          expect(strong.previousElementSibling?.id).toBe('em1');
          expect(strong.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
          expect(strong.previousSibling?.textContent).toBe(' gap ');

          editManager.destroy();
        });

        it('does not insert an anchor before a focused LINE', () => {
          // arrange
          const doc = makeRoot(div({ id: 'div1' }, p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
          const editManager = EditManager.createNull({
            document: doc
          });
          editManager.nav.connect();
          const p2 = byId(doc, 'p2');

          editManager.nav.FOCUS(p2);

          // act
          const canInsert = editManager.canInsertAnchorBeforeTag();
          const result = editManager.insertAnchorBeforeTag();

          // assert
          expect(canInsert).toBe(false);
          expect(result).toBe(false);
          expect(editManager.isEditing()).toBe(false);
          expect(p2.previousSibling).toBe(byId(doc, 'p1'));

          editManager.destroy();
        });

        it('removes an anchor at the immediate boundary', () => {
          // arrange
          const doc = makeRoot(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              span({ class: 'jsed-token jsed-anchor-token' }),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
            )
          );
          const editManager = EditManager.createNull({
            document: doc
          });
          editManager.nav.connect();
          const em = byId(doc, 'em1');
          const strong = byId(doc, 'strong1');

          editManager.nav.REQUEST_FOCUS(strong);

          // act
          const canRemove = editManager.canRemoveAnchorBeforeTag();
          const result = editManager.removeAnchorBeforeTag();

          // assert
          expect(canRemove).toBe(true);
          expect(result).toBe(true);
          expect(strong.previousSibling).toBe(em);

          editManager.destroy();
        });

        it('removes an anchor before existing whitespace and preserves the space', () => {
          // arrange
          const doc = makeRoot(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              span({ class: 'jsed-token jsed-anchor-token' }),
              s(' '),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
            )
          );
          const editManager = EditManager.createNull({
            document: doc
          });
          editManager.nav.connect();
          const em = byId(doc, 'em1');
          const strong = byId(doc, 'strong1');

          editManager.nav.REQUEST_FOCUS(strong);

          // act
          const canRemove = editManager.canRemoveAnchorBeforeTag();
          const result = editManager.removeAnchorBeforeTag();

          // assert
          expect(canRemove).toBe(true);
          expect(result).toBe(true);
          expect(em.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
          expect(em.nextSibling?.textContent).toBe(' ');
          expect(strong.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
          expect(strong.previousSibling?.textContent).toBe(' ');

          editManager.destroy();
        });
      });

      describe('after tag', () => {
        it('inserts an anchor at the boundary and enters editing on it', () => {
          // arrange
          const doc = makeRoot(
            '<p id="p1"><em id="em1" style="display:inline;">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="display:inline;">bar</strong></p>'
          );
          const userInput = Controller.createNull().input;
          const editManager = EditManager.createNull({
            document: doc,
            userInput
          });
          editManager.nav.connect();
          const em = byId(doc, 'em1');
          const strong = byId(doc, 'strong1');

          editManager.nav.REQUEST_FOCUS(em);

          // act
          const result = editManager.insertAnchorAfterTag();

          // assert
          expect(result).toBe(true);
          expect(editManager.isEditing()).toBe(true);
          const anchor = strong.previousElementSibling as HTMLElement | null;
          expect(anchor).not.toBeNull();
          expect(anchor?.classList.contains('jsed-token')).toBe(true);
          expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
          expect(editManager.cursor?.getToken()).toBe(anchor);
          expect(userInput.getInputValue()).toBe(JSED_ANCHOR_CHAR);

          editManager.destroy();
        });

        it('does not insert an anchor after a focused LINE', () => {
          // arrange
          const doc = makeRoot(div({ id: 'div1' }, p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
          const editManager = EditManager.createNull({
            document: doc
          });
          editManager.nav.connect();
          const p1 = byId(doc, 'p1');
          const p2 = byId(doc, 'p2');

          editManager.nav.FOCUS(p1);

          // act
          const canInsert = editManager.canInsertAnchorAfterTag();
          const result = editManager.insertAnchorAfterTag();

          // assert
          expect(canInsert).toBe(false);
          expect(result).toBe(false);
          expect(editManager.isEditing()).toBe(false);
          expect(p1.nextSibling).toBe(p2);

          editManager.destroy();
        });

        it('inserts an anchor after the focused tag when there is no next sibling', () => {
          // arrange
          const doc = makeRoot('<p id="p1"><em id="em1" style="display:inline;">foo</em></p>');
          const userInput = Controller.createNull().input;
          const editManager = EditManager.createNull({
            document: doc,
            userInput
          });
          editManager.nav.connect();
          const em = byId(doc, 'em1');

          editManager.nav.REQUEST_FOCUS(em);

          // act
          const canInsert = editManager.canInsertAnchorAfterTag();
          const result = editManager.insertAnchorAfterTag();

          // assert
          expect(canInsert).toBe(true);
          expect(result).toBe(true);
          expect(editManager.isEditing()).toBe(true);
          const anchor = em.nextElementSibling as HTMLElement | null;
          expect(anchor).not.toBeNull();
          expect(anchor?.classList.contains('jsed-token')).toBe(true);
          expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
          expect(editManager.cursor?.getToken()).toBe(anchor);
          expect(userInput.getInputValue()).toBe(JSED_ANCHOR_CHAR);

          editManager.destroy();
        });

        it('inserts an anchor before existing whitespace and enters editing on it', () => {
          // arrange
          const doc = makeRoot(
            '<p id="p1"><em id="em1" style="display:inline;">foo</em> <strong id="strong1" style="display:inline;">bar</strong></p>'
          );
          const userInput = Controller.createNull().input;
          const editManager = EditManager.createNull({
            document: doc,
            userInput
          });
          editManager.nav.connect();
          const em = byId(doc, 'em1');

          editManager.nav.REQUEST_FOCUS(em);

          // act
          const canInsert = editManager.canInsertAnchorAfterTag();
          const result = editManager.insertAnchorAfterTag();

          // assert
          expect(canInsert).toBe(true);
          expect(result).toBe(true);
          const anchor = em.nextElementSibling as HTMLElement | null;
          expect(anchor).not.toBeNull();
          expect(anchor?.classList.contains('jsed-anchor-token')).toBe(true);
          expect(editManager.cursor?.getToken()).toBe(anchor);
          expect(anchor?.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
          expect(anchor?.nextSibling?.textContent).toBe(' ');

          editManager.destroy();
        });

        it('does not insert an anchor when text already represents the gap after the focused tag', () => {
          // arrange
          const doc = makeRoot(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              s(' gap '),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
            )
          );
          const editManager = EditManager.createNull({
            document: doc
          });
          editManager.nav.connect();
          const em = byId(doc, 'em1');

          editManager.nav.FOCUS(em);

          // act
          const canInsert = editManager.canInsertAnchorAfterTag();
          const result = editManager.insertAnchorAfterTag();

          // assert
          expect(canInsert).toBe(false);
          expect(result).toBe(false);
          expect(editManager.isEditing()).toBe(false);
          expect(em.nextElementSibling?.id).toBe('strong1');
          expect(em.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
          expect(em.nextSibling?.textContent).toBe(' gap ');

          editManager.destroy();
        });

        it('removes an anchor at the immediate boundary', () => {
          // arrange
          const doc = makeRoot(
            '<p id="p1"><em id="em1" style="display:inline;">foo</em><span class="jsed-token jsed-anchor-token"></span><strong id="strong1" style="display:inline;">bar</strong></p>'
          );
          const editManager = EditManager.createNull({
            document: doc
          });
          editManager.nav.connect();
          const em = byId(doc, 'em1');
          const strong = byId(doc, 'strong1');

          editManager.nav.REQUEST_FOCUS(em);

          // act
          const canRemove = editManager.canRemoveAnchorAfterTag();
          const result = editManager.removeAnchorAfterTag();

          // assert
          expect(canRemove).toBe(true);
          expect(result).toBe(true);
          expect(strong.previousSibling).toBe(em);

          editManager.destroy();
        });

        it('removes an anchor after existing whitespace and preserves the space', () => {
          // arrange
          const doc = makeRoot(
            '<p id="p1"><em id="em1" style="display:inline;">foo</em> <span class="jsed-token jsed-anchor-token"></span><strong id="strong1" style="display:inline;">bar</strong></p>'
          );
          const editManager = EditManager.createNull({
            document: doc
          });
          editManager.nav.connect();
          const em = byId(doc, 'em1');
          const strong = byId(doc, 'strong1');

          editManager.nav.REQUEST_FOCUS(em);

          // act
          const canRemove = editManager.canRemoveAnchorAfterTag();
          const result = editManager.removeAnchorAfterTag();

          // assert
          expect(canRemove).toBe(true);
          expect(result).toBe(true);
          expect(em.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
          expect(em.nextSibling?.textContent).toBe(' ');
          expect(em.nextSibling?.nextSibling).toBe(strong);

          editManager.destroy();
        });
      });

      describe('empty line', () => {
        it('inserts an anchor into an empty LINE and enters editing on it', () => {
          // arrange
          const doc = makeRoot('<p id="p1"></p>');
          const userInput = Controller.createNull().input;
          const editManager = EditManager.createNull({
            document: doc,
            userInput
          });
          editManager.nav.connect();
          const p1 = byId(doc, 'p1');

          editManager.nav.REQUEST_FOCUS(p1);

          // act
          const canInsert = editManager.canInsertAnchorInLine();
          const result = editManager.insertAnchorInLine();

          // assert
          expect(canInsert).toBe(true);
          expect(result).toBe(true);
          expect(editManager.isEditing()).toBe(true);
          const anchor = p1.querySelector('.jsed-anchor-token') as HTMLElement | null;
          expect(anchor).not.toBeNull();
          expect(editManager.cursor?.getToken()).toBe(anchor);
          expect(userInput.getInputValue()).toBe(JSED_ANCHOR_CHAR);

          editManager.destroy();
        });

        it('treats IGNORABLE content as empty when deciding whether an anchor can be inserted', () => {
          // arrange
          const doc = makeRoot(p({ id: 'p1' }, span({ class: 'jsed-ignore' }, 'debug label')));
          const userInput = Controller.createNull().input;
          const editManager = EditManager.createNull({
            document: doc,
            userInput
          });
          editManager.nav.connect();
          const p1 = byId(doc, 'p1');

          editManager.nav.REQUEST_FOCUS(p1);

          // act
          const canInsert = editManager.canInsertAnchorInLine();
          const result = editManager.insertAnchorInLine();

          // assert
          expect(canInsert).toBe(true);
          expect(result).toBe(true);
          expect(editManager.isEditing()).toBe(true);
          const anchor = p1.querySelector('.jsed-anchor-token') as HTMLElement | null;
          expect(anchor).not.toBeNull();
          expect(editManager.cursor?.getToken()).toBe(anchor);
          expect(userInput.getInputValue()).toBe(JSED_ANCHOR_CHAR);

          editManager.destroy();
        });
      });
    });
    describe('leading/trailing spaces', () => {
      describe('at FOCUS', () => {
        describe('insertSpaceAfterTag', () => {
          it('inserts a space at the boundary after the focused tag', () => {
            // arrange
            const doc = makeRoot(
              '<p id="p1"><em id="em1" style="display:inline;">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="display:inline;">bar</strong></p>'
            );
            const editManager = EditManager.createNull({
              document: doc
            });
            editManager.nav.connect();
            const em = byId(doc, 'em1');
            const strong = byId(doc, 'strong1');

            editManager.nav.REQUEST_FOCUS(em);

            // act
            const canInsert = editManager.canInsertSpaceAfterTag();
            const result = editManager.insertSpaceAfterTag();

            // assert
            expect(canInsert).toBe(true);
            expect(result).toBe(true);
            expect(strong.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
            expect(strong.previousSibling?.textContent).toBe(' ');
            expect(editManager.isEditing()).toBe(false);

            editManager.destroy();
          });

          it('does not insert another space when one already exists', () => {
            // arrange
            const doc = makeRoot(
              '<p id="p1"><em id="em1" style="display:inline;">foo</em> <strong id="strong1" style="display:inline;">bar</strong></p>'
            );
            const editManager = EditManager.createNull({
              document: doc
            });
            editManager.nav.connect();
            const em = byId(doc, 'em1');
            const p1 = byId(doc, 'p1');

            editManager.nav.REQUEST_FOCUS(em);

            // act
            const canInsert = editManager.canInsertSpaceAfterTag();
            const result = editManager.insertSpaceAfterTag();

            // assert
            expect(canInsert).toBe(false);
            expect(result).toBe(false);
            const textNodes = Array.from(p1.childNodes).filter(
              (node) => node.nodeType === Node.TEXT_NODE
            );
            expect(textNodes).toHaveLength(1);
            expect(textNodes[0]?.textContent).toBe(' ');

            editManager.destroy();
          });

          it('inserts a space before intervening text', () => {
            // arrange
            const doc = makeRoot(
              '<p id="p1"><em id="em1" style="display:inline;">foo</em>bar<strong id="strong1" style="display:inline;">baz</strong></p>'
            );
            const editManager = EditManager.createNull({
              document: doc
            });
            editManager.nav.connect();
            const em = byId(doc, 'em1');
            const strong = byId(doc, 'strong1');

            editManager.nav.REQUEST_FOCUS(em);

            // act
            const canInsert = editManager.canInsertSpaceAfterTag();
            const result = editManager.insertSpaceAfterTag();

            // assert
            expect(canInsert).toBe(true);
            expect(result).toBe(true);
            expect(em.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
            expect(em.nextSibling?.textContent).toBe(' ');
            expect(
              (em.nextSibling?.nextSibling as HTMLElement | null)?.classList.contains('jsed-token')
            ).toBe(true);
            expect((em.nextSibling?.nextSibling as HTMLElement | null)?.textContent).toBe('bar');
            expect((strong.previousSibling as HTMLElement | null)?.textContent).toBe('bar');

            editManager.destroy();
          });
        });

        describe('removeSpaceAfterTag', () => {
          it('removes boundary whitespace between adjacent tags', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  s(),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
                )
              )
            );
            const editManager = EditManager.createNull({
              document: doc
            });
            editManager.nav.connect();
            const em = byId(doc, 'em1');
            const strong = byId(doc, 'strong1');

            editManager.nav.REQUEST_FOCUS(em);

            // act
            const canRemove = editManager.canRemoveSpaceAfterTag();
            const result = editManager.removeSpaceAfterTag();

            // assert
            expect(canRemove).toBe(true);
            expect(result).toBe(true);
            expect(strong.previousSibling).toBe(em);

            editManager.destroy();
          });

          it('removes leading whitespace from intervening text', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  s(),
                  t('bar'),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
                )
              )
            );
            const editManager = EditManager.createNull({
              document: doc
            });
            editManager.nav.connect();
            const em = byId(doc, 'em1');
            const strong = byId(doc, 'strong1');

            editManager.nav.REQUEST_FOCUS(em);

            // act
            const canRemove = editManager.canRemoveSpaceAfterTag();
            const result = editManager.removeSpaceAfterTag();

            // assert
            expect(canRemove).toBe(true);
            expect(result).toBe(true);
            expect((em.nextSibling as HTMLElement | null)?.classList.contains('jsed-token')).toBe(
              true
            );
            expect((em.nextSibling as HTMLElement | null)?.textContent).toBe('bar');
            expect((strong.previousSibling as HTMLElement | null)?.textContent).toBe('bar');

            editManager.destroy();
          });
        });
        describe('insertSpaceBeforeTag', () => {
          it('inserts a space at the boundary before the focused tag', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  '<span class="jsed-ignore"></span>',
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
                )
              )
            );
            const editManager = EditManager.createNull({
              document: doc
            });
            editManager.nav.connect();
            const strong = byId(doc, 'strong1');

            editManager.nav.REQUEST_FOCUS(strong);

            // act
            const canInsert = editManager.canInsertSpaceBeforeTag();
            const result = editManager.insertSpaceBeforeTag();

            // assert
            expect(canInsert).toBe(true);
            expect(result).toBe(true);
            expect(strong.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
            expect(strong.previousSibling?.textContent).toBe(' ');
            expect(editManager.isEditing()).toBe(false);

            editManager.destroy();
          });

          it('does not insert another space when one already exists', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  s(),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
                )
              )
            );
            const editManager = EditManager.createNull({
              document: doc
            });
            editManager.nav.connect();
            const strong = byId(doc, 'strong1');
            const p1 = byId(doc, 'p1');

            editManager.nav.REQUEST_FOCUS(strong);

            // act
            const canInsert = editManager.canInsertSpaceBeforeTag();
            const result = editManager.insertSpaceBeforeTag();

            // assert
            expect(canInsert).toBe(false);
            expect(result).toBe(false);
            const textNodes = Array.from(p1.childNodes).filter(
              (node) => node.nodeType === Node.TEXT_NODE
            );
            expect(textNodes).toHaveLength(1);
            expect(textNodes[0]?.textContent).toBe(' ');

            editManager.destroy();
          });

          it('inserts a space after intervening text', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  t('bar'),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
                )
              )
            );
            const editManager = EditManager.createNull({
              document: doc
            });
            editManager.nav.connect();
            const strong = byId(doc, 'strong1');

            editManager.nav.REQUEST_FOCUS(strong);

            // act
            const canInsert = editManager.canInsertSpaceBeforeTag();
            const result = editManager.insertSpaceBeforeTag();

            // assert
            expect(canInsert).toBe(true);
            expect(result).toBe(true);
            expect(strong.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
            expect(strong.previousSibling?.textContent).toBe(' ');
            expect(
              (strong.previousSibling?.previousSibling as HTMLElement | null)?.classList.contains(
                'jsed-token'
              )
            ).toBe(true);
            expect(
              (strong.previousSibling?.previousSibling as HTMLElement | null)?.textContent
            ).toBe('bar');

            editManager.destroy();
          });
        });
        describe('removeSpaceBeforeTag', () => {
          it('removes boundary whitespace between adjacent tags', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  s(),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
                )
              )
            );
            const editManager = EditManager.createNull({
              document: doc
            });
            editManager.nav.connect();
            const em = byId(doc, 'em1');
            const strong = byId(doc, 'strong1');

            editManager.nav.REQUEST_FOCUS(strong);

            // act
            const canRemove = editManager.canRemoveSpaceBeforeTag();
            const result = editManager.removeSpaceBeforeTag();

            // assert
            expect(canRemove).toBe(true);
            expect(result).toBe(true);
            expect(strong.previousSibling).toBe(em);

            editManager.destroy();
          });

          it('removes trailing whitespace from intervening text', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  t('bar'),
                  s(),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
                )
              )
            );
            const editManager = EditManager.createNull({
              document: doc
            });
            editManager.nav.connect();
            const strong = byId(doc, 'strong1');

            editManager.nav.REQUEST_FOCUS(strong);

            // act
            const canRemove = editManager.canRemoveSpaceBeforeTag();
            const result = editManager.removeSpaceBeforeTag();

            // assert
            expect(canRemove).toBe(true);
            expect(result).toBe(true);
            expect(
              (strong.previousSibling as HTMLElement | null)?.classList.contains('jsed-token')
            ).toBe(true);
            expect((strong.previousSibling as HTMLElement | null)?.textContent).toBe('bar');

            editManager.destroy();
          });
        });
      });
    });
  });

  describe('Actions at CURSOR', () => {
    describe('leading/trailing spaces', () => {
      describe('at CURSOR', () => {
        describe('before CURSOR', () => {
          it('inserts whitespace before an anchor between adjacent inline tags', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  span({ id: 'a1', class: 'jsed-token jsed-anchor-token' }),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
                )
              )
            );
            const userInput = Controller.createNull().input;
            const editManager = EditManager.createNull({
              document: doc,
              userInput
            });
            editManager.nav.connect();
            const anchor = byId(doc, 'a1');

            editManager.enterEditing(anchor);

            // act
            const canInsert = editManager.canInsertSpaceBeforeCursor();
            const result = editManager.insertSpaceBeforeCursor();

            // assert
            expect(canInsert).toBe(true);
            expect(result).toBe(true);
            expect(anchor.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
            expect(anchor.previousSibling?.textContent).toBe(' ');
            expect(editManager.cursor?.getToken()).toBe(anchor);
            expect(userInput.getInputValue()).toBe(JSED_ANCHOR_CHAR);

            editManager.destroy();
          });

          it('inserts whitespace before a token between a closing tag and an opening tag', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  t('bar'),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
                )
              )
            );
            const userInput = Controller.createNull().input;
            const editManager = EditManager.createNull({
              document: doc,
              userInput
            });
            editManager.nav.connect();
            Tokenizer.createNull().tokenizeLineAt(byId(doc, 'p1'));
            const bar = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
              (el) => el.textContent === 'bar'
            ) as HTMLElement;

            editManager.enterEditing(bar);

            // act
            const canInsert = editManager.canInsertSpaceBeforeCursor();
            const result = editManager.insertSpaceBeforeCursor();

            // assert
            expect(canInsert).toBe(true);
            expect(result).toBe(true);
            expect(bar.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
            expect(bar.previousSibling?.textContent).toBe(' ');

            editManager.destroy();
          });

          it('does not offer leading space when the previous inline boundary already contributes trailing whitespace', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo '),
                  t('bar'),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
                )
              )
            );
            const userInput = Controller.createNull().input;
            const editManager = EditManager.createNull({
              document: doc,
              userInput
            });
            editManager.nav.connect();
            Tokenizer.createNull().tokenizeLineAt(byId(doc, 'p1'));
            const bar = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
              (el) => el.textContent === 'bar'
            ) as HTMLElement;

            editManager.enterEditing(bar);

            // act
            const canInsert = editManager.canInsertSpaceBeforeCursor();

            // assert
            expect(canInsert).toBe(false);

            editManager.destroy();
          });

          it('removes whitespace before an anchor between adjacent inline tags', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  s(),
                  span({ id: 'a1', class: 'jsed-token jsed-anchor-token' }),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
                )
              )
            );
            const userInput = Controller.createNull().input;
            const editManager = EditManager.createNull({
              document: doc,
              userInput
            });
            editManager.nav.connect();
            const anchor = byId(doc, 'a1');

            editManager.enterEditing(anchor);

            // act
            const canRemove = editManager.canRemoveSpaceBeforeCursor();
            const result = editManager.removeSpaceBeforeCursor();

            // assert
            expect(canRemove).toBe(true);
            expect(result).toBe(true);
            expect(anchor.previousSibling?.nodeType).not.toBe(Node.TEXT_NODE);

            editManager.destroy();
          });

          it('removes whitespace before a token between a closing tag and an opening tag', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  s(),
                  t('bar'),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
                )
              )
            );
            const userInput = Controller.createNull().input;
            const editManager = EditManager.createNull({
              document: doc,
              userInput
            });
            editManager.nav.connect();
            const bar = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
              (el) => el.textContent === 'bar'
            ) as HTMLElement;

            editManager.enterEditing(bar);

            // act
            const canRemove = editManager.canRemoveSpaceBeforeCursor();
            const result = editManager.removeSpaceBeforeCursor();

            // assert
            expect(canRemove).toBe(true);
            expect(result).toBe(true);
            expect(bar.previousSibling?.nodeType).not.toBe(Node.TEXT_NODE);

            editManager.destroy();
          });
        });

        describe('after CURSOR', () => {
          it('inserts whitespace after an anchor between adjacent inline tags', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  span({ id: 'a1', class: 'jsed-token jsed-anchor-token' }),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
                )
              )
            );
            const userInput = Controller.createNull().input;
            const editManager = EditManager.createNull({
              document: doc,
              userInput
            });
            editManager.nav.connect();
            const anchor = byId(doc, 'a1');

            editManager.enterEditing(anchor);

            // act
            const canInsert = editManager.canInsertSpaceAfterCursor();
            const result = editManager.insertSpaceAfterCursor();

            // assert
            expect(canInsert).toBe(true);
            expect(result).toBe(true);
            expect(anchor.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
            expect(anchor.nextSibling?.textContent).toBe(' ');
            expect(editManager.cursor?.getToken()).toBe(anchor);
            expect(userInput.getInputValue()).toBe(JSED_ANCHOR_CHAR);

            editManager.destroy();
          });

          it('inserts whitespace after a token between a closing tag and an opening tag', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  t('bar'),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
                )
              )
            );
            const userInput = Controller.createNull().input;
            const editManager = EditManager.createNull({
              document: doc,
              userInput
            });
            editManager.nav.connect();
            Tokenizer.createNull().tokenizeLineAt(byId(doc, 'p1'));
            const bar = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
              (el) => el.textContent === 'bar'
            ) as HTMLElement;

            editManager.enterEditing(bar);

            // act
            const canInsert = editManager.canInsertSpaceAfterCursor();
            const result = editManager.insertSpaceAfterCursor();

            // assert
            expect(canInsert).toBe(true);
            expect(result).toBe(true);
            expect(bar.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
            expect(bar.nextSibling?.textContent).toBe(' ');

            editManager.destroy();
          });

          it('does not offer cursor-side space insertion in an ordinary text run', () => {
            // arrange
            const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar baz')));
            const userInput = Controller.createNull().input;
            const editManager = EditManager.createNull({
              document: doc,
              userInput
            });
            editManager.nav.connect();
            Tokenizer.createNull().tokenizeLineAt(byId(doc, 'p1'));
            const bar = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
              (el) => el.textContent === 'bar'
            ) as HTMLElement;

            editManager.enterEditing(bar);

            // act
            const canInsertBefore = editManager.canInsertSpaceBeforeCursor();
            const canInsertAfter = editManager.canInsertSpaceAfterCursor();

            // assert
            expect(canInsertBefore).toBe(false);
            expect(canInsertAfter).toBe(false);

            editManager.destroy();
          });

          it('does not offer trailing space when the next inline boundary already contributes leading whitespace', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  t('bar'),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, ' baz')
                )
              )
            );
            const userInput = Controller.createNull().input;
            const editManager = EditManager.createNull({
              document: doc,
              userInput
            });
            editManager.nav.connect();
            Tokenizer.createNull().tokenizeLineAt(byId(doc, 'p1'));
            const bar = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
              (el) => el.textContent === 'bar'
            ) as HTMLElement;

            editManager.enterEditing(bar);

            // act
            const canInsert = editManager.canInsertSpaceAfterCursor();

            // assert
            expect(canInsert).toBe(false);

            editManager.destroy();
          });

          it('removes whitespace after an anchor between adjacent inline tags', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  span({ id: 'a1', class: 'jsed-token jsed-anchor-token' }),
                  s(),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
                )
              )
            );
            const userInput = Controller.createNull().input;
            const editManager = EditManager.createNull({
              document: doc,
              userInput
            });
            editManager.nav.connect();
            const anchor = byId(doc, 'a1');

            editManager.enterEditing(anchor);

            // act
            const canRemove = editManager.canRemoveSpaceAfterCursor();
            const result = editManager.removeSpaceAfterCursor();

            // assert
            expect(canRemove).toBe(true);
            expect(result).toBe(true);
            expect(anchor.nextSibling?.nodeType).not.toBe(Node.TEXT_NODE);

            editManager.destroy();
          });

          it('removes whitespace after a token between a closing tag and an opening tag', () => {
            // arrange
            const doc = makeRoot(
              frag(
                p(
                  { id: 'p1' },
                  emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
                  t('bar'),
                  s(),
                  strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
                )
              )
            );
            const userInput = Controller.createNull().input;
            const editManager = EditManager.createNull({
              document: doc,
              userInput
            });
            editManager.nav.connect();
            const bar = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
              (el) => el.textContent === 'bar'
            ) as HTMLElement;

            editManager.enterEditing(bar);

            // act
            const canRemove = editManager.canRemoveSpaceAfterCursor();
            const result = editManager.removeSpaceAfterCursor();

            // assert
            expect(canRemove).toBe(true);
            expect(result).toBe(true);
            expect(bar.nextSibling?.nodeType).not.toBe(Node.TEXT_NODE);

            editManager.destroy();
          });

          it('does not offer cursor-side space removal in an ordinary text run', () => {
            // arrange
            const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar baz')));
            const userInput = Controller.createNull().input;
            const editManager = EditManager.createNull({
              document: doc,
              userInput
            });
            editManager.nav.connect();
            Tokenizer.createNull().tokenizeLineAt(byId(doc, 'p1'));
            const bar = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
              (el) => el.textContent === 'bar'
            ) as HTMLElement;

            editManager.enterEditing(bar);

            // act
            const canRemoveBefore = editManager.canRemoveSpaceBeforeCursor();
            const canRemoveAfter = editManager.canRemoveSpaceAfterCursor();

            // assert
            expect(canRemoveBefore).toBe(false);
            expect(canRemoveAfter).toBe(false);

            editManager.destroy();
          });

          // Blocks usually don't care about trailing or leading whitespace.
          describe('OPAQUE_BLOCK', () => {
            it('inserts whitespace after a token before an OPAQUE_BLOCK', () => {
              // arrange
              const doc = makeRoot(
                frag(
                  div(
                    { id: 'div1' },
                    t('foo'),
                    div({ id: 'opaque1', style: 'display:inline-block;' }, p('bar')),
                    s(),
                    t('baz')
                  )
                )
              );
              const userInput = Controller.createNull().input;
              const editManager = EditManager.createNull({
                document: doc,
                userInput
              });
              editManager.nav.connect();
              const foo = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
                (el) => el.textContent === 'foo'
              ) as HTMLElement;
              const opaque1 = byId(doc, 'opaque1');

              editManager.enterEditing(foo);

              // act
              const canInsert = editManager.canInsertSpaceAfterCursor();
              const result = editManager.insertSpaceAfterCursor();

              // assert
              expect(canInsert).toBe(true);
              expect(result).toBe(true);
              expect(foo.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
              expect(foo.nextSibling?.textContent).toBe(' ');
              expect(foo.nextSibling?.nextSibling).toBe(opaque1);

              editManager.destroy();
            });

            it('inserts whitespace after a token before an OPAQUE_BLOCK with leading space', () => {
              // arrange
              const doc = makeRoot(
                frag(
                  div(
                    { id: 'div1' },
                    t('foo'),
                    div(
                      { id: 'opaque1', style: 'display:inline-block;' }, //
                      s(), // should be ignored
                      p('bar')
                    ),
                    s(),
                    t('baz')
                  )
                )
              );
              const userInput = Controller.createNull().input;
              const editManager = EditManager.createNull({
                document: doc,
                userInput
              });
              editManager.nav.connect();
              const foo = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
                (el) => el.textContent === 'foo'
              ) as HTMLElement;
              const opaque1 = byId(doc, 'opaque1');

              editManager.enterEditing(foo);

              // act
              const canInsert = editManager.canInsertSpaceAfterCursor();
              const result = editManager.insertSpaceAfterCursor();

              // assert
              expect(canInsert).toBe(true);
              expect(result).toBe(true);
              expect(foo.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
              expect(foo.nextSibling?.textContent).toBe(' ');
              expect(foo.nextSibling?.nextSibling).toBe(opaque1);

              editManager.destroy();
            });

            it('removes whitespace after a token before an OPAQUE_BLOCK', () => {
              // arrange
              const doc = makeRoot(
                frag(
                  div(
                    { id: 'div1' },
                    t('foo'),
                    s(),
                    div({ id: 'opaque1', style: 'display:inline-block;' }, p('bar')),
                    s(),
                    t('baz')
                  )
                )
              );
              const userInput = Controller.createNull().input;
              const editManager = EditManager.createNull({
                document: doc,
                userInput
              });
              editManager.nav.connect();
              const foo = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
                (el) => el.textContent === 'foo'
              ) as HTMLElement;
              const opaque1 = byId(doc, 'opaque1');

              editManager.enterEditing(foo);

              // act
              const canRemove = editManager.canRemoveSpaceAfterCursor();
              const result = editManager.removeSpaceAfterCursor();

              // assert
              expect(canRemove).toBe(true);
              expect(result).toBe(true);
              expect(foo.nextSibling).toBe(opaque1);

              editManager.destroy();
            });

            it('removes whitespace after a token before an OPAQUE_BLOCK with extra whitespace', () => {
              // arrange
              const doc = makeRoot(
                frag(
                  div(
                    { id: 'div1' },
                    t('foo'),
                    s('  '),
                    div({ id: 'opaque1', style: 'display:inline-block;' }, p('bar')),
                    s(),
                    t('baz')
                  )
                )
              );
              const userInput = Controller.createNull().input;
              const editManager = EditManager.createNull({
                document: doc,
                userInput
              });
              editManager.nav.connect();
              const foo = Array.from(doc.root.querySelectorAll('.jsed-token')).find(
                (el) => el.textContent === 'foo'
              ) as HTMLElement;
              const opaque1 = byId(doc, 'opaque1');

              editManager.enterEditing(foo);

              // act
              const canRemove = editManager.canRemoveSpaceAfterCursor();
              const result = editManager.removeSpaceAfterCursor();

              // assert
              expect(canRemove).toBe(true);
              expect(result).toBe(true);
              expect(foo.nextSibling).toBe(opaque1);

              editManager.destroy();
            });
          });
        });
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
});
