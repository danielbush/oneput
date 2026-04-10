import { describe, expect, it, test } from 'vitest';
import { EditManager } from '../EditManager.js';
import { byId, frag, makeRoot, p, span } from '../test/util.js';
import { getValue, quickDescend } from '../lib/token.js';
import { JSED_ANCHOR_CHAR } from '../lib/constants.js';
import { Controller } from '../../../oneput/src/lib/oneput/controllers/controller.js';

describe('EditManager', () => {
  it('first focus quick-descends but stays in view mode', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
    const editManager = EditManager.createNull({
      document: doc,
      userInput: Controller.createNull().input
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

  it('places the CURSOR on the first TOKEN when entering editing from a FOCUSABLE', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
    const editManager = EditManager.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });

    // act
    const result = editManager.enterEditing(byId(doc, 'p1'));

    // assert
    expect(result.isOk()).toBe(true);
    expect(editManager.getMode()).toBe('edit');
    expect(editManager.cursor?.getToken().textContent?.trim()).toBe('foo');

    editManager.destroy();
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

  it('clicking a different element while editing exits to view mode and quick-descends it', () => {
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

  it('handleRight navigates by FOCUS in view mode', () => {
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

    // act
    editManager.handleRight();

    // assert
    expect(editManager.getMode()).toBe('view');
    expect(editManager.nav.getFocus()).toBe(p2);

    editManager.destroy();
  });

  it('handleRight moves to the next TOKEN in edit mode', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
    const editManager = EditManager.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    editManager.enterEditing(byId(doc, 'p1'));

    // act
    editManager.handleRight();

    // assert
    expect(editManager.getMode()).toBe('edit');
    expect(editManager.cursor?.getToken().textContent?.trim()).toBe('bar');

    editManager.destroy();
  });

  it('handleLeft moves to the previous TOKEN in edit mode', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
    const editManager = EditManager.createNull({
      document: doc,
      userInput: Controller.createNull().input
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

  it('handleExit leaves edit mode and returns to view mode', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
    const editManager = EditManager.createNull({
      document: doc,
      userInput: Controller.createNull().input
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

  it('handleDown moves FOCUS to the next sibling', () => {
    // arrange
    const doc = makeRoot(
      frag(
        p({ id: 'p1' }, 'foo'), //
        p({ id: 'p2' }, 'bar'),
        p({ id: 'p3' }, 'baz')
      )
    );
    const editManager = EditManager.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    editManager.nav.connect();

    editManager.nav.REQUEST_FOCUS(byId(doc, 'p2'));

    // act
    editManager.handleDown();

    // assert
    expect(editManager.nav.getFocus()).toBe(byId(doc, 'p3'));

    editManager.destroy();
  });

  it('handleUp moves FOCUS to the previous sibling', () => {
    // arrange
    const doc = makeRoot(
      frag(
        p({ id: 'p1' }, 'foo'), //
        p({ id: 'p2' }, 'bar'),
        p({ id: 'p3' }, 'baz')
      )
    );
    const editManager = EditManager.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    editManager.nav.connect();

    editManager.nav.REQUEST_FOCUS(byId(doc, 'p2'));

    // act
    editManager.handleUp();

    // assert
    expect(editManager.nav.getFocus()).toBe(byId(doc, 'p1'));

    editManager.destroy();
  });

  it('handleParent moves FOCUS to the parent element', () => {
    // arrange
    const doc = makeRoot('<div id="root-line"><p id="nested">inner</p></div>');
    const editManager = EditManager.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    editManager.nav.connect();
    editManager.nav.REQUEST_FOCUS(byId(doc, 'nested'));

    // act
    editManager.handleParent();

    // assert
    expect(editManager.nav.getFocus()).toBe(byId(doc, 'root-line'));

    editManager.destroy();
  });

  describe('revealActiveTarget', () => {
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
        document: doc,
        userInput: Controller.createNull().input
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
        document: doc,
        userInput: Controller.createNull().input
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

  describe('insertAnchorAfterTag', () => {
    it('insertAnchorAfterTag inserts an anchor at the boundary and enters editing on it', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="display:inline;">bar</strong></p>'
      );
      const userInput = Controller.createNull().input;
      const editManager = EditManager.createNull({
        document: doc,
        userInput,
        onError: () => {}
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
    it('insertAnchorAfterTag inserts an anchor after the focused tag when there is no next sibling', () => {
      // arrange
      const doc = makeRoot('<p id="p1"><em id="em1" style="display:inline;">foo</em></p>');
      const userInput = Controller.createNull().input;
      const editManager = EditManager.createNull({
        document: doc,
        userInput,
        onError: () => {}
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
    it('insertAnchorAfterTag inserts an anchor before existing whitespace and enters editing on it', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em> <strong id="strong1" style="display:inline;">bar</strong></p>'
      );
      const userInput = Controller.createNull().input;
      const editManager = EditManager.createNull({
        document: doc,
        userInput,
        onError: () => {}
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
  });

  describe('insertSpaceAfterTag', () => {
    it('insertSpaceAfterTag inserts a space at the boundary after the focused tag', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="display:inline;">bar</strong></p>'
      );
      const editManager = EditManager.createNull({
        document: doc,
        userInput: Controller.createNull().input,
        onError: () => {}
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

    it('insertSpaceAfterTag does not insert another space when one already exists', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em> <strong id="strong1" style="display:inline;">bar</strong></p>'
      );
      const editManager = EditManager.createNull({
        document: doc,
        userInput: Controller.createNull().input,
        onError: () => {}
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
      const textNodes = Array.from(p1.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
      expect(textNodes).toHaveLength(1);
      expect(textNodes[0]?.textContent).toBe(' ');

      editManager.destroy();
    });

    it('insertSpaceAfterTag inserts a space before intervening text', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em>bar<strong id="strong1" style="display:inline;">baz</strong></p>'
      );
      const editManager = EditManager.createNull({
        document: doc,
        userInput: Controller.createNull().input,
        onError: () => {}
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
      expect((em.nextSibling?.nextSibling as HTMLElement | null)?.classList.contains('jsed-token')).toBe(true);
      expect((em.nextSibling?.nextSibling as HTMLElement | null)?.textContent).toBe('bar');
      expect((strong.previousSibling as HTMLElement | null)?.textContent).toBe('bar');

      editManager.destroy();
    });
  });

  describe('removeSpaceAfterTag', () => {
    it('removeSpaceAfterTag removes boundary whitespace between adjacent tags', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em> <strong id="strong1" style="display:inline;">bar</strong></p>'
      );
      const editManager = EditManager.createNull({
        document: doc,
        userInput: Controller.createNull().input,
        onError: () => {}
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

    it('removeSpaceAfterTag removes leading whitespace from intervening text', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em> bar<strong id="strong1" style="display:inline;">baz</strong></p>'
      );
      const editManager = EditManager.createNull({
        document: doc,
        userInput: Controller.createNull().input,
        onError: () => {}
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
      expect((em.nextSibling as HTMLElement | null)?.classList.contains('jsed-token')).toBe(true);
      expect((em.nextSibling as HTMLElement | null)?.textContent).toBe('bar');
      expect((strong.previousSibling as HTMLElement | null)?.textContent).toBe('bar');

      editManager.destroy();
    });
  });

  describe('insertAnchorBeforeTag', () => {
    it('insertAnchorBeforeTag inserts an anchor at the boundary and enters editing on it', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="display:inline;">bar</strong></p>'
      );
      const userInput = Controller.createNull().input;
      const editManager = EditManager.createNull({
        document: doc,
        userInput,
        onError: () => {}
      });
      editManager.nav.connect();
      // const em = byId(doc, 'em1');
      const strong = byId(doc, 'strong1');

      editManager.nav.REQUEST_FOCUS(strong);

      // act
      const result = editManager.insertAnchorBeforeTag();

      // assert
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

    it('insertAnchorBeforeTag inserts an anchor before the focused tag when there is no previous sibling', () => {
      // arrange
      const doc = makeRoot('<p id="p1"><em id="em1" style="display:inline;">foo</em></p>');
      const userInput = Controller.createNull().input;
      const editManager = EditManager.createNull({
        document: doc,
        userInput,
        onError: () => {}
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

    it('insertAnchorBeforeTag inserts an anchor after existing whitespace and enters editing on it', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em> <strong id="strong1" style="display:inline;">bar</strong></p>'
      );
      const userInput = Controller.createNull().input;
      const editManager = EditManager.createNull({
        document: doc,
        userInput,
        onError: () => {}
      });
      editManager.nav.connect();
      const strong = byId(doc, 'strong1');

      editManager.nav.REQUEST_FOCUS(strong);

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
  });

  describe('insertSpaceBeforeTag', () => {
    it('insertSpaceBeforeTag inserts a space at the boundary before the focused tag', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em><span class="jsed-ignore"></span><strong id="strong1" style="display:inline;">bar</strong></p>'
      );
      const editManager = EditManager.createNull({
        document: doc,
        userInput: Controller.createNull().input,
        onError: () => {}
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

    it('insertSpaceBeforeTag does not insert another space when one already exists', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em> <strong id="strong1" style="display:inline;">bar</strong></p>'
      );
      const editManager = EditManager.createNull({
        document: doc,
        userInput: Controller.createNull().input,
        onError: () => {}
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
      const textNodes = Array.from(p1.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
      expect(textNodes).toHaveLength(1);
      expect(textNodes[0]?.textContent).toBe(' ');

      editManager.destroy();
    });

    it('insertSpaceBeforeTag inserts a space after intervening text', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em>bar<strong id="strong1" style="display:inline;">baz</strong></p>'
      );
      const editManager = EditManager.createNull({
        document: doc,
        userInput: Controller.createNull().input,
        onError: () => {}
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
      expect((strong.previousSibling?.previousSibling as HTMLElement | null)?.textContent).toBe('bar');

      editManager.destroy();
    });
  });

  describe('removeSpaceBeforeTag', () => {
    it('removeSpaceBeforeTag removes boundary whitespace between adjacent tags', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em> <strong id="strong1" style="display:inline;">bar</strong></p>'
      );
      const editManager = EditManager.createNull({
        document: doc,
        userInput: Controller.createNull().input,
        onError: () => {}
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

    it('removeSpaceBeforeTag removes trailing whitespace from intervening text', () => {
      // arrange
      const doc = makeRoot(
        '<p id="p1"><em id="em1" style="display:inline;">foo</em>bar <strong id="strong1" style="display:inline;">baz</strong></p>'
      );
      const editManager = EditManager.createNull({
        document: doc,
        userInput: Controller.createNull().input,
        onError: () => {}
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
      expect((strong.previousSibling as HTMLElement | null)?.classList.contains('jsed-token')).toBe(true);
      expect((strong.previousSibling as HTMLElement | null)?.textContent).toBe('bar');

      editManager.destroy();
    });
  });

  describe('insertAnchorInLine', () => {
    it('inserts an anchor into an empty LINE and enters editing on it', () => {
      // arrange
      const doc = makeRoot('<p id="p1"></p>');
      const userInput = Controller.createNull().input;
      const editManager = EditManager.createNull({
        document: doc,
        userInput,
        onError: () => {}
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
      const doc = makeRoot(
        p({ id: 'p1' }, span({ class: 'jsed-ignore' }, 'debug label'))
      );
      const userInput = Controller.createNull().input;
      const editManager = EditManager.createNull({
        document: doc,
        userInput,
        onError: () => {}
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

describe('input handling', () => {
  async function createEditManagerFixture(params?: { html?: string }) {
    const doc = makeRoot(params?.html ?? p({ id: 'p1' }, 'foo'));
    const line = byId(doc, 'p1');
    const firstToken = quickDescend(line);
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
    // handleTokenChange asynchronously selects the whole token text
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
    const [firstToken, secondToken, thirdToken] = Array.from(line.querySelectorAll('.jsed-token'));
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
