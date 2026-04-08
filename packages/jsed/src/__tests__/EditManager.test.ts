import { describe, expect, it, test } from 'vitest';
import { EditManager } from '../EditManager.js';
import { byId, frag, makeRoot, p } from '../test/util.js';
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

  it('canInsertAnchorAfterTag ignores IGNORABLE siblings between adjacent visible tags', () => {
    // arrange
    const doc = makeRoot(
      '<p id="p1"><em id="em1">foo</em><span class="jsed-ignore"></span><strong id="strong1">bar</strong></p>'
    );
    const editManager = EditManager.createNull({
      document: doc,
      userInput: Controller.createNull().input,
      onError: () => {}
    });
    editManager.nav.connect();
    const em = byId(doc, 'em1');

    editManager.nav.REQUEST_FOCUS(em);

    // act
    const result = editManager.canInsertAnchorAfterTag();

    // assert
    expect(result).toBe(true);

    editManager.destroy();
  });

  it('canInsertAnchorAfterTag returns false when a text node already represents the gap', () => {
    // arrange
    const doc = makeRoot(
      '<p id="p1"><em id="em1">foo</em> gap <strong id="strong1">bar</strong></p>'
    );
    const editManager = EditManager.createNull({
      document: doc,
      userInput: Controller.createNull().input,
      onError: () => {}
    });
    editManager.nav.connect();
    const em = byId(doc, 'em1');

    editManager.nav.FOCUS(em);

    // act
    const result = editManager.canInsertAnchorAfterTag();

    // assert
    expect(result).toBe(false);

    editManager.destroy();
  });

  test('insertAnchorAfterTag inserts an anchor at the boundary and enters editing on it', () => {
    // arrange
    const doc = makeRoot(
      '<p id="p1"><em id="em1">foo</em><span class="jsed-ignore"></span><strong id="strong1">bar</strong></p>'
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
});

describe('input handling', () => {
  // "..." represents the current input
  // "|" = input cursor position in input
  // "[...]" = selection range
  // => user-initiated transformation
  // ==> is a transformation performed automatically, not by the user

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
