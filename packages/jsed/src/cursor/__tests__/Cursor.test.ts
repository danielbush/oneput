import { describe, expect, test } from 'vitest';
import {
  byId,
  div,
  em,
  findTokenByText,
  identify,
  identifyChildren,
  makeRoot,
  p,
  s,
  t
} from '../../test/util.js';
import { JsedDocument } from '../../JsedDocument.js';
import { Tokenizer } from '../../lib/ops/Tokenizer.js';
import { Cursor } from '../Cursor.js';
import { EditorEventsEmitter } from '../../editor/index.js';
import { UndoRecorder } from '../../undo/index.js';
import { getValue } from '../../lib/ops/token.js';
import { addImplicitLines } from '../../lib/ops/implicitLine.js';
import { JSED_ANCHOR_CLASS, JSED_TOKEN_CLASS } from '../../lib/core/taxonomy.js';
import type { EditorState } from '../../editor/index.js';
import {
  CURSOR_APPEND_CLASS,
  CURSOR_INSERT_AFTER_CLASS,
  CURSOR_INSERT_BEFORE_CLASS,
  CURSOR_PREPEND_CLASS
} from '../lib/CursorState.js';

/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyle = { style: 'display:inline;' };

function createCursor(doc: JsedDocument, tok: HTMLElement, undo = UndoRecorder.createNull()) {
  const changes: string[] = [];
  const errors: string[] = [];
  const tokenizer = Tokenizer.createNull();
  const cursor = Cursor.create(tok, {
    document: doc,
    tokenizer,
    onCursorChange: (t) => t && changes.push(getValue(t)),
    onCursorError: (err) => errors.push(err.type),
    eventsEmitter: EditorEventsEmitter.create(),
    undo
  });
  cursor.place(tok);

  return { cursor, changes, errors, undo };
}

function tokenizeAndCursor(doc: JsedDocument, selector: string) {
  const el = doc.root.querySelector(selector) as HTMLElement;
  const firstToken = Tokenizer.createNull().tokenizeLineAt(el)!;
  return createCursor(doc, firstToken);
}

function tokens(doc: JsedDocument): HTMLElement[] {
  return Array.from(
    doc.root.querySelectorAll(`.${JSED_TOKEN_CLASS}, .${JSED_ANCHOR_CLASS}`)
  ) as HTMLElement[];
}

describe('moveNext / movePrevious', () => {
  describe('simple paragraph: <p>hello world foo</p>', () => {
    function setup() {
      const doc = makeRoot(p({ id: 'p1' }, 'hello world foo'));
      return tokenizeAndCursor(doc, '#p1');
    }

    test('moveNext advances to the next token', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getPlace())).toBe('world');
    });

    test('moveNext twice reaches the third token', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.moveNext();
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getPlace())).toBe('foo');
    });

    test('moveNext at the last token stays put', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.moveNext();

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getPlace())).toBe('foo');
    });

    test('movePrevious from the second token goes back to first', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getPlace())).toBe('hello');
    });

    test('movePrevious at the first token stays put', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getPlace())).toBe('hello');
    });

    test('onCursorChange fires on each move', () => {
      // arrange
      const { cursor, changes } = setup();

      // act
      cursor.moveNext();
      cursor.moveNext();
      cursor.movePrevious();

      // assert - first entry is from construction (#setToken in constructor)
      expect(changes).toEqual(['hello', 'world', 'foo', 'world']);
    });
  });

  describe('INLINE_FLOW: <p>aaa <em>bbb</em> ccc</p>', () => {
    function setup() {
      const doc = makeRoot(p({ id: 'p1' }, 'aaa ', em(inlineStyle, 'bbb'), ' ccc'));
      return tokenizeAndCursor(doc, '#p1');
    }

    test('moveNext traverses seamlessly through the INLINE_FLOW', () => {
      // arrange
      const { cursor } = setup();

      // act & assert
      expect(getValue(cursor.getPlace())).toBe('aaa');
      cursor.moveNext();
      expect(getValue(cursor.getPlace())).toBe('bbb');
      cursor.moveNext();
      expect(getValue(cursor.getPlace())).toBe('ccc');
    });

    test('movePrevious traverses seamlessly back through the INLINE_FLOW', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.moveNext();

      // act & assert
      expect(getValue(cursor.getPlace())).toBe('ccc');
      cursor.movePrevious();
      expect(getValue(cursor.getPlace())).toBe('bbb');
      cursor.movePrevious();
      expect(getValue(cursor.getPlace())).toBe('aaa');
    });
  });

  describe('nested INLINE_FLOW: <p>aaa <em>bbb <em>ccc</em> ddd</em> eee</p>', () => {
    function setup() {
      const doc = makeRoot(
        p({ id: 'p1' }, 'aaa ', em(inlineStyle, 'bbb ', em(inlineStyle, 'ccc'), ' ddd'), ' eee')
      );
      return tokenizeAndCursor(doc, '#p1');
    }

    test('moveNext traverses through nested INLINE_FLOW depth', () => {
      // arrange
      const { cursor } = setup();

      // act & assert
      expect(getValue(cursor.getPlace())).toBe('aaa');
      cursor.moveNext();
      expect(getValue(cursor.getPlace())).toBe('bbb');
      cursor.moveNext();
      expect(getValue(cursor.getPlace())).toBe('ccc');
      cursor.moveNext();
      expect(getValue(cursor.getPlace())).toBe('ddd');
      cursor.moveNext();
      expect(getValue(cursor.getPlace())).toBe('eee');
    });

    test('movePrevious traverses back through nested INLINE_FLOW depth', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.moveNext();
      cursor.moveNext();
      cursor.moveNext();

      // act & assert
      expect(getValue(cursor.getPlace())).toBe('eee');
      cursor.movePrevious();
      expect(getValue(cursor.getPlace())).toBe('ddd');
      cursor.movePrevious();
      expect(getValue(cursor.getPlace())).toBe('ccc');
      cursor.movePrevious();
      expect(getValue(cursor.getPlace())).toBe('bbb');
      cursor.movePrevious();
      expect(getValue(cursor.getPlace())).toBe('aaa');
    });
  });

  describe('adjacent INLINEs: <p>aaa <em>bbb</em><em>ccc</em> ddd</p>', () => {
    function setup() {
      const doc = makeRoot(
        p({ id: 'p1' }, 'aaa ', em(inlineStyle, 'bbb'), em(inlineStyle, 'ccc'), ' ddd')
      );
      return tokenizeAndCursor(doc, '#p1');
    }

    test('moveNext crosses from one INLINE_FLOW to the adjacent INLINE_FLOW', () => {
      // arrange
      const { cursor } = setup();

      // act & assert
      expect(getValue(cursor.getPlace())).toBe('aaa');
      cursor.moveNext();
      expect(getValue(cursor.getPlace())).toBe('bbb');
      cursor.moveNext();
      expect(getValue(cursor.getPlace())).toBe('ccc');
      cursor.moveNext();
      expect(getValue(cursor.getPlace())).toBe('ddd');
    });

    test('movePrevious crosses back across adjacent INLINEs', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.moveNext();
      cursor.moveNext();

      // act & assert
      expect(getValue(cursor.getPlace())).toBe('ddd');
      cursor.movePrevious();
      expect(getValue(cursor.getPlace())).toBe('ccc');
      cursor.movePrevious();
      expect(getValue(cursor.getPlace())).toBe('bbb');
      cursor.movePrevious();
      expect(getValue(cursor.getPlace())).toBe('aaa');
    });
  });

  describe("walks non-TOKEN LINE_SIBLING's", () => {
    describe('(1) ISLAND: visit=yes, descend=no', () => {
      test('moveNext visits ISLAND, then continues to next TOKEN', () => {
        // arrange
        const doc = makeRoot(
          p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert
        expect(identify(cursor.getPlace())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('[island:span]');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('bbb');
      });

      test('movePrevious visits ISLAND in reverse', () => {
        // arrange
        const doc = makeRoot(
          p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');
        cursor.moveNext();
        cursor.moveNext();

        // act & assert
        expect(identify(cursor.getPlace())).toBe('bbb');
        cursor.movePrevious();
        expect(identify(cursor.getPlace())).toBe('[island:span]');
        cursor.movePrevious();
        expect(identify(cursor.getPlace())).toBe('aaa');
      });

      test('ISLAND at start of LINE: cursor starts on the ISLAND', () => {
        // arrange
        const doc = makeRoot(
          p({ id: 'p1' }, '<span class="katex" style="display:inline;">x²</span>', ' aaa')
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert - quick-descend now lands on the first LINE_SIBLING
        expect(identify(cursor.getPlace())).toBe('[island:span]');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('aaa');
      });

      test('ISLAND at end of LINE is the last cursor position', () => {
        // arrange
        const doc = makeRoot(
          p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>')
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert
        expect(identify(cursor.getPlace())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('[island:span]');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('[island:span]');
      });

      test('ISLAND inside INLINE_FLOW', () => {
        // arrange
        const doc = makeRoot(
          p(
            { id: 'p1' },
            'aaa ',
            em(
              inlineStyle,
              'bbb ',
              '<span class="katex" style="display:inline;">x²</span>',
              ' ccc'
            ),
            ' ddd'
          )
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert - CURSOR descends into the INLINE_FLOW, visits the ISLAND within it
        expect(identify(cursor.getPlace())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('bbb');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('[island:span]');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('ccc');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('ddd');
      });

      test('adjacent ISLANDs', () => {
        // arrange
        const doc = makeRoot(
          p(
            { id: 'p1' },
            'aaa ',
            '<span class="katex" style="display:inline;">x²</span>',
            '<span class="katex" style="display:inline;">y³</span>',
            ' bbb'
          )
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert - both ISLANDs are visited
        expect(identify(cursor.getPlace())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('[island:span]');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('[island:span]');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('bbb');
      });
    });

    describe(`(2) non-ISLAND's: visit=no, descend=yes`, () => {
      const transparent = 'jsed-cursor-transparent';

      test('moveNext descends into nested div to visit its TOKEN', () => {
        // arrange
        const doc = makeRoot(
          div({ id: 'outer' }, 'aaa ', div({ id: 'inner', class: transparent }, 'nested'), ' bbb')
        );
        const { cursor } = tokenizeAndCursor(doc, '#outer');

        // act & assert
        expect(identify(cursor.getPlace())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('nested');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('bbb');
      });

      test('movePrevious exits nested div seamlessly', () => {
        // arrange
        const doc = makeRoot(
          div({ id: 'outer' }, 'aaa ', div({ id: 'inner', class: transparent }, 'nested'), ' bbb')
        );
        const { cursor } = tokenizeAndCursor(doc, '#outer');
        cursor.moveNext();
        cursor.moveNext();

        // act & assert
        expect(identify(cursor.getPlace())).toBe('bbb');
        cursor.movePrevious();
        expect(identify(cursor.getPlace())).toBe('nested');
        cursor.movePrevious();
        expect(identify(cursor.getPlace())).toBe('aaa');
      });

      test('deeply nested blocks: CURSOR descends through multiple levels', () => {
        // arrange
        const doc = makeRoot(
          div(
            { id: 'outer' },
            'aaa ',
            div(
              { id: 'mid', class: transparent },
              'bbb ',
              div({ id: 'deep', class: transparent }, 'ccc'),
              ' ddd'
            ),
            ' eee'
          )
        );
        const { cursor } = tokenizeAndCursor(doc, '#outer');

        // act & assert
        expect(identify(cursor.getPlace())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('bbb');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('ccc');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('ddd');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('eee');
      });

      test('empty element nesting: CURSOR recurses through to find TOKEN', () => {
        // arrange
        const doc = makeRoot(
          div(
            { id: 'outer' },
            'aaa ',
            div(
              { id: 'mid', class: transparent },
              div({ id: 'deep', class: transparent }, 'nested')
            ),
            ' bbb'
          )
        );
        const { cursor } = tokenizeAndCursor(doc, '#outer');

        // act & assert
        expect(identify(cursor.getPlace())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('nested');
        cursor.moveNext();
        expect(identify(cursor.getPlace())).toBe('bbb');
      });

      test('empty element nesting: movePrevious recurses back out', () => {
        // arrange
        const doc = makeRoot(
          div(
            { id: 'outer' },
            'aaa ',
            div(
              { id: 'mid', class: transparent },
              div({ id: 'deep', class: transparent }, 'nested')
            ),
            ' bbb'
          )
        );
        const { cursor } = tokenizeAndCursor(doc, '#outer');
        cursor.moveNext();
        cursor.moveNext();

        // act & assert
        expect(identify(cursor.getPlace())).toBe('bbb');
        cursor.movePrevious();
        expect(identify(cursor.getPlace())).toBe('nested');
        cursor.movePrevious();
        expect(identify(cursor.getPlace())).toBe('aaa');
      });
    });
  });

  test('cross line: moveNext past end of <p> lands in the following IMPLICIT_LINE', () => {
    // arrange
    const doc = makeRoot(div(p({ id: 'p1' }, 'hello world'), 'trailing text'));
    addImplicitLines(doc.root);
    const { cursor } = tokenizeAndCursor(doc, '#p1');

    expect(identify(cursor.getPlace())).toBe('hello');
    cursor.moveNext();
    expect(identify(cursor.getPlace())).toBe('world');

    // act
    cursor.moveNext();

    // assert
    expect(identify(cursor.getPlace())).toBe('trailing');
  });
});

describe('splitAtToken', () => {
  test('multiple splits can be undone and redone', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('one'), s(), t('two'), s(), t('three')));
    const undo = UndoRecorder.createNull();
    const { cursor } = createCursor(doc, findTokenByText(doc.root, 'two'), undo);
    const state = { cursor } as unknown as EditorState;

    // act
    cursor.splitAtToken();
    cursor.setInsertState('CURSOR_APPEND');
    cursor.splitAtToken();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(
      Array.from(doc.root.querySelectorAll('p')).map((line) => identifyChildren(line))
    ).toEqual([
      [
        'one', //
        '[nodeType=3:" "]',
        'two'
      ],
      ['[nodeType=3:" "]', 'three'],
      ['[anchor]']
    ]);

    // act
    undo.popUndo()?.undo(state);
    undo.popUndo()?.undo(state);

    // assert
    expect(identify(cursor.getPlace())).toBe('two');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'one', //
      '[nodeType=3:" "]',
      'two',
      '[nodeType=3:" "]',
      'three'
    ]);

    // act
    undo.popRedo()?.redo(state);
    undo.popRedo()?.redo(state);

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(
      Array.from(doc.root.querySelectorAll('p')).map((line) => identifyChildren(line))
    ).toEqual([
      [
        'one', //
        '[nodeType=3:" "]',
        'two'
      ],
      ['[nodeType=3:" "]', 'three'],
      ['[anchor]']
    ]);
  });
});

describe('replaceWithText', () => {
  test('multiple replacements can be undone and redone', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('one'), s(), t('two'), s(), t('three')));
    const undo = UndoRecorder.createNull();
    const { cursor } = createCursor(doc, findTokenByText(doc.root, 'one'), undo);
    const state = { cursor } as unknown as EditorState;

    // act
    cursor.replaceWithText('alpha');
    cursor.moveNext();
    cursor.replaceWithText('beta');

    // assert
    expect(identify(cursor.getPlace())).toBe('beta');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'alpha',
      '[nodeType=3:" "]',
      'beta',
      '[nodeType=3:" "]',
      'three'
    ]);

    // act
    undo.popUndo()?.undo(state);
    undo.popUndo()?.undo(state);

    // assert
    expect(identify(cursor.getPlace())).toBe('one');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'one',
      '[nodeType=3:" "]',
      'two',
      '[nodeType=3:" "]',
      'three'
    ]);

    // act
    undo.popRedo()?.redo(state);
    undo.popRedo()?.redo(state);

    // assert
    expect(identify(cursor.getPlace())).toBe('beta');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'alpha',
      '[nodeType=3:" "]',
      'beta',
      '[nodeType=3:" "]',
      'three'
    ]);
  });
});

describe('insertTextAfter', () => {
  test('multiple TOKEN insert after', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.insertTextAfter('new words');

    // assert
    expect(identifyChildren(doc.root)).toEqual(['[element:p]']);
    expect(identifyChildren(doc.root.firstChild)).toEqual([
      'hello',
      '[nodeType=3:" "]',
      'new',
      '[nodeType=3:" "]',
      'words',
      '[nodeType=3:" "]',
      'world'
    ]);
    expect(identify(cursor.getPlace())).toBe('words');
  });
});

describe('insertTextBefore', () => {
  test('multiple TOKEN insert before', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[1]);
    expect(identify(tokens(doc)[1])).toBe('world');

    // act
    const result = cursor.insertTextBefore('new words');

    // assert
    expect(identifyChildren(doc.root)).toEqual(['[element:p]']);
    expect(identifyChildren(doc.root.firstChild)).toEqual([
      'hello',
      '[nodeType=3:" "]',
      'new',
      '[nodeType=3:" "]',
      'words',
      '[nodeType=3:" "]',
      'world'
    ]);
    expect(result).not.toBeNull();
    expect(identify(cursor.getPlace())).toBe('words');
  });
});

describe('delete', () => {
  test('multiple deletes can be undone and redone', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('one'), s(), t('two'), s(), t('three')));
    const undo = UndoRecorder.createNull();
    const { cursor } = createCursor(doc, findTokenByText(doc.root, 'one'), undo);
    const state = { cursor } as unknown as EditorState;

    // act
    cursor.delete();
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('three');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'd("one")',
      '[deleted-space]',
      'd("two")',
      '[deleted-space]',
      'three'
    ]);

    // act
    undo.popUndo()?.undo(state);
    undo.popUndo()?.undo(state);

    // assert
    expect(identify(cursor.getPlace())).toBe('one');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'one',
      '[nodeType=3:" "]',
      'two',
      '[nodeType=3:" "]',
      'three'
    ]);

    // act
    undo.popRedo()?.redo(state);
    undo.popRedo()?.redo(state);

    // assert
    expect(identify(cursor.getPlace())).toBe('three');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'd("one")',
      '[deleted-space]',
      'd("two")',
      '[deleted-space]',
      'three'
    ]);
  });
});

describe('CURSOR_STATE', () => {
  function setup() {
    const doc = makeRoot(p({ id: 'p1' }, 'hello world foo'));
    return tokenizeAndCursor(doc, '#p1');
  }

  function markerClasses(token: HTMLElement): string[] {
    return [
      CURSOR_APPEND_CLASS,
      CURSOR_PREPEND_CLASS,
      CURSOR_INSERT_AFTER_CLASS,
      CURSOR_INSERT_BEFORE_CLASS
    ].filter((cls) => token.classList.contains(cls));
  }

  describe('CURSOR_APPEND', () => {
    test('setState sets CURSOR_APPEND marker', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.setInsertState('CURSOR_APPEND');

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_APPEND_CLASS]);
    });

    test('moveNext clears CURSOR_APPEND marker', () => {
      // arrange
      const { cursor } = setup();
      cursor.setInsertState('CURSOR_APPEND');

      // act
      cursor.moveNext();

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });
  });

  describe('CURSOR_PREPEND', () => {
    test('setState sets CURSOR_PREPEND marker', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.setInsertState('CURSOR_PREPEND');

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_PREPEND_CLASS]);
    });

    test('movePrevious clears CURSOR_PREPEND marker', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.setInsertState('CURSOR_PREPEND');

      // act
      cursor.movePrevious();

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });
  });

  describe('null state (no marker)', () => {
    test('setState(null) clears all markers', () => {
      // arrange
      const { cursor } = setup();
      cursor.setInsertState('CURSOR_APPEND');

      // act
      cursor.setInsertState(null);

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });

    test('cycling through states replaces the previous marker', () => {
      // arrange
      const { cursor } = setup();

      // act & assert
      cursor.setInsertState('CURSOR_APPEND');
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_APPEND_CLASS]);

      cursor.setInsertState('CURSOR_PREPEND');
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_PREPEND_CLASS]);

      cursor.setInsertState(null);
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });
  });

  describe('CURSOR_INSERT_AFTER', () => {
    test('setState sets CURSOR_INSERT_AFTER marker', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.setInsertState('CURSOR_INSERT_AFTER');

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_INSERT_AFTER_CLASS]);
    });

    test('movePrevious cancels CURSOR_INSERT_AFTER without moving', () => {
      // arrange
      const { cursor } = setup();
      cursor.setInsertState('CURSOR_INSERT_AFTER');

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getPlace())).toBe('hello');
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });

    test('moveNext still moves forward from CURSOR_INSERT_AFTER', () => {
      // arrange
      const { cursor } = setup();
      cursor.setInsertState('CURSOR_INSERT_AFTER');

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getPlace())).toBe('world');
    });
  });

  describe('CURSOR_INSERT_BEFORE', () => {
    test('setState sets CURSOR_INSERT_BEFORE marker', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.setInsertState('CURSOR_INSERT_BEFORE');

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_INSERT_BEFORE_CLASS]);
    });

    test('moveNext cancels CURSOR_INSERT_BEFORE without moving', () => {
      // arrange
      const { cursor } = setup();
      cursor.setInsertState('CURSOR_INSERT_BEFORE');

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getPlace())).toBe('hello');
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });

    test('movePrevious still moves backward from CURSOR_INSERT_BEFORE', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.setInsertState('CURSOR_INSERT_BEFORE');

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getPlace())).toBe('hello');
    });
  });
});
