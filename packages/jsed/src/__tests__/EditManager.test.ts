import { describe, expect, it, vi } from 'vitest';
import { EditManager } from '../EditManager.js';
import { byId, frag, makeRoot, p } from '../test/util.js';
import { NullUserInput } from '../UserInput.js';

describe('EditManager', () => {
  it('first focus quick-descends but stays in view mode', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar'), p({ id: 'p2' }, 'baz qux')));
    const editManager = EditManager.createNull({
      document: doc,
      userInput: NullUserInput.createNull(),
      onError: vi.fn()
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
      userInput: NullUserInput.createNull(),
      onError: vi.fn()
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
      userInput: NullUserInput.createNull(),
      onError: vi.fn()
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
      userInput: NullUserInput.createNull(),
      onError: vi.fn()
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
      userInput: NullUserInput.createNull(),
      onError: vi.fn()
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
      userInput: NullUserInput.createNull(),
      onError: vi.fn()
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
      userInput: NullUserInput.createNull(),
      onError: vi.fn()
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
      userInput: NullUserInput.createNull(),
      onError: vi.fn()
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
      userInput: NullUserInput.createNull(),
      onError: vi.fn()
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
      userInput: NullUserInput.createNull(),
      onError: vi.fn()
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
    const nestedDoc = makeRoot('<div id="root-line"><p id="nested">inner</p></div>');
    const editManager = EditManager.createNull({
      document: nestedDoc,
      userInput: NullUserInput.createNull(),
      onError: vi.fn()
    });
    editManager.nav.connect();
    editManager.nav.REQUEST_FOCUS(byId(nestedDoc, 'nested'));

    // act
    editManager.handleParent();

    // assert
    expect(editManager.nav.getFocus()).toBe(byId(nestedDoc, 'root-line'));

    editManager.destroy();
  });
});
