import { describe, expect, test } from 'vitest';
import {
  a,
  byId,
  div,
  em,
  findTokenByText,
  identify,
  identifyChildren,
  inlineStyleHackVal,
  makeRoot,
  p,
  s,
  t
} from '../../../test/util.js';
import { JsedDocument } from '../../../JsedDocument.js';
import { Tokenizer } from '../../ops/Tokenizer.js';
import { Cursor } from '../Cursor.js';
import { EditorEventsEmitter } from '../../editor/EditorEventsEmitter.js';
import { UndoRecorder } from '../../undo/index.js';
import { getValue } from '../../ops/token.js';
import { addImplicitLines } from '../../ops/implicitLine.js';
import { isAnchor, JSED_ANCHOR_CLASS, JSED_TOKEN_CLASS } from '../../core/taxonomy.js';
import { getSeparatorBefore } from '../../ops/space.js';
import type { EditorState } from '../../editor/EditorState.js';
import {
  CURSOR_APPEND_CLASS,
  CURSOR_INSERT_AFTER_CLASS,
  CURSOR_INSERT_BEFORE_CLASS,
  CURSOR_PREPEND_CLASS
} from '../CursorState.js';

/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyle = { style: 'display:inline;' };

function createCursor(doc: JsedDocument, tok: HTMLElement) {
  const changes: string[] = [];
  const errors: string[] = [];
  const tokenizer = Tokenizer.createNull();
  const cursor = Cursor.create(tok, {
    document: doc,
    tokenizer,
    onCursorChange: (t) => t && changes.push(getValue(t)),
    onCursorError: (err) => errors.push(err.type),
    eventsEmitter: EditorEventsEmitter.create(),
    undo: UndoRecorder.createNull()
  });
  cursor.place(tok);

  return { cursor, changes, errors };
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
  test('CURSOR_APPEND', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    cursor.setInsertState('CURSOR_APPEND');

    // act
    cursor.splitAtToken();

    // assert
    expect(identify(cursor.getPlace())).toBe('world');
    expect(doc.root.querySelectorAll('p')).toHaveLength(2);
  });

  test('CURSOR_INSERT_AFTER', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    cursor.setInsertState('CURSOR_INSERT_AFTER');

    // act
    cursor.splitAtToken();

    // assert
    expect(identify(cursor.getPlace())).toBe('world');
    expect(doc.root.querySelectorAll('p')).toHaveLength(2);
  });

  test('default split before current TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.splitAtToken();

    // assert
    expect(identify(cursor.getPlace())).toBe('foo');
    expect(doc.root.querySelectorAll('p')).toHaveLength(2);
  });

  // ANCHOR_ISLAND_EDGE_CASE
  test('split after first TOKEN that precedes an ISLAND', () => {
    // arrange — the TOKEN is the only TOKEN on the LINE, followed by an ISLAND
    const doc = makeRoot(p(t('foo'), s(), '<span class="katex" style="display:inline;">x²</span>'));
    const { cursor } = createCursor(doc, tokens(doc)[0]); // foo
    cursor.setInsertState('CURSOR_APPEND');

    // act
    cursor.splitAtToken();

    // assert — the ISLAND moves to a new LINE, fronted by an ANCHOR with a space between
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(lines[0].textContent).toContain('foo');
    const newLine = lines[1];
    expect(identifyChildren(lines[1])).toEqual([
      '[nodeType=3:" "]',
      '[anchor]',
      '[island:span]',
      '[anchor]'
    ]);
    const anchor = newLine.querySelector(`.${JSED_ANCHOR_CLASS}`) as HTMLElement | null;
    const island = newLine.querySelector('.katex');
    expect(anchor).not.toBeNull();
    expect(island).not.toBeNull();
    // ANCHOR comes before the ISLAND
    expect(
      anchor!.compareDocumentPosition(island!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    // a separator space is auto-generated between the ANCHOR and the ISLAND
    expect(getSeparatorBefore(anchor!)?.nodeValue).toBe(' ');
  });

  test('split before first TOKEN → ANCHOR on emptied original LINE', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[0]); // hello
    cursor.setInsertState('CURSOR_PREPEND');

    // act
    cursor.splitAtToken();

    // assert
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0])).toEqual(['[anchor]']);
    expect(identifyChildren(lines[1])).toEqual(['hello', '[nodeType=3:" "]', 'world']);
    expect(identify(cursor.getPlace())).toBe('hello');
  });

  test('split after last TOKEN → ANCHOR on new empty LINE', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[1]); // world
    cursor.setInsertState('CURSOR_APPEND');

    // act
    cursor.splitAtToken();

    // assert
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0])).toEqual(['hello', '[nodeType=3:" "]', 'world']);
    expect(identifyChildren(lines[1])).toEqual(['[anchor]']);
    expect(identify(cursor.getPlace())).toBe('[anchor]');
  });

  test('split with TOKENs both sides → no ANCHOR', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[1]); // world
    cursor.setInsertState('CURSOR_PREPEND');

    // act
    cursor.splitAtToken();

    // assert
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0])).toEqual(['hello', '[nodeType=3:" "]']);
    expect(identifyChildren(lines[1])).toEqual(['world']);
    expect(doc.root.querySelectorAll(`.${JSED_ANCHOR_CLASS}`)).toHaveLength(0);
  });

  test('split after TOKEN in nested INLINE_FLOW → ANCHOR in emptied peer', () => {
    // arrange
    const doc = makeRoot(p(em(inlineStyle, t('a'))));
    const { cursor } = createCursor(doc, tokens(doc)[0]); // a
    cursor.setInsertState('CURSOR_APPEND');

    // act
    cursor.splitAtToken();

    // assert — anchoring targets the bottom (em) split, not the outer LINE
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0].querySelector('em')!)).toEqual(['a']);
    expect(identifyChildren(lines[1].querySelector('em')!)).toEqual(['[anchor]']);
    expect(identify(cursor.getPlace())).toBe('[anchor]');
  });

  test('action / undo / redo — generates ANCHOR and places CURSOR on it', () => {
    // arrange — split after the last TOKEN: the new LINE is empty so it gets an
    // ANCHOR and the CURSOR lands on it.
    const doc = makeRoot(
      p(
        t('hello'), //
        s(),
        t('world')
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[1]); // world
    cursor.setInsertState('CURSOR_APPEND');
    const state = { cursor } as unknown as EditorState; // record.undo/redo only touch state.cursor
    const ps = () => doc.root.querySelectorAll('p');

    // act — split
    const record = cursor.splitAtToken()!;

    // assert — new empty LINE fronted by an ANCHOR, CURSOR on it
    expect(ps()).toHaveLength(2);
    expect(identifyChildren(ps()[1])).toEqual(['[anchor]']);
    expect(isAnchor(cursor.getPlace())).toBe(true);

    // act — undo
    record.undo(state);

    // assert — one LINE again, CURSOR back on the original TOKEN. The ANCHOR is
    // soft-deleted (IGNORABLE) and retained on the LINE so redo can reuse it.
    expect(ps()).toHaveLength(1);
    expect(identify(cursor.getPlace())).toBe('world');
    expect(identifyChildren(ps()[0])).toEqual(['hello', '[nodeType=3:" "]', 'world']);

    // act — redo
    record.redo(state);

    // assert — split restored, CURSOR back on the same ANCHOR
    expect(ps()).toHaveLength(2);
    expect(identifyChildren(ps()[1])).toEqual(['[anchor]']);
    expect(isAnchor(cursor.getPlace())).toBe(true);
  });
});

describe('replaceWithText', () => {
  test('TOKEN text', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, findTokenByText(doc.root, 'hello'));

    // act
    cursor.replaceWithText('goodbye');

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['goodbye', '[nodeType=3:" "]', 'world']);
    expect(identify(cursor.getPlace())).toBe('goodbye');
  });

  test('TOKEN after ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const { cursor } = createCursor(doc, findTokenByText(doc.root, 'bbb'));

    // act
    cursor.replaceWithText('ccc');

    // assert
    expect(identify(cursor.getPlace())).toBe('ccc');
  });

  test('ISLAND no-op', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const { cursor } = createCursor(doc, island);
    expect(identify(cursor.getPlace())).toBe('[island:span]');

    // act
    cursor.replaceWithText('oops');

    // assert
    expect(identify(cursor.getPlace())).toBe('[island:span]');
  });

  test('multiple TOKEN replacement', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, findTokenByText(doc.root, 'hello'));

    // act
    const result = cursor.replaceWithText('goodbye friend');

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'goodbye',
      '[nodeType=3:" "]',
      'friend',
      '[nodeType=3:" "]',
      'world'
    ]);
    expect(result).not.toBeNull();
    expect(identify(cursor.getPlace())).toBe('friend');
  });

  test('multi-word on last TOKEN → no trailing separator', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, findTokenByText(doc.root, 'world'));

    // act
    cursor.replaceWithText('aaa bbb');

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'hello',
      '[nodeType=3:" "]',
      'aaa',
      '[nodeType=3:" "]',
      'bbb'
    ]);
    expect(identify(cursor.getPlace())).toBe('bbb');
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
  test('first TOKEN in doc', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        t('hello'),
        s(),
        t('world'),
        s(),
        t('foo')
      )
    );
    const hello = findTokenByText(doc.root, 'hello');
    const { cursor } = createCursor(doc, hello);

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('world');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'd("hello")',
      '[deleted-space]',
      'world',
      '[nodeType=3:" "]',
      'foo'
    ]);
  });

  test('last TOKEN in doc', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        t('hello'),
        s(),
        t('world')
      )
    );
    const world = findTokenByText(doc.root, 'world');
    const { cursor } = createCursor(doc, world);

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('hello');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'hello', //
      '[deleted-space]',
      'd("world")'
    ]);
  });

  test('only TOKEN in doc', () => {
    // arrange
    const doc = makeRoot(t('aaa'));
    const aaa = findTokenByText(doc.root, 'aaa');
    const { cursor } = createCursor(doc, aaa);

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(identifyChildren(doc.root)).toEqual([
      '[anchor]', //
      'd("aaa")'
    ]);

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(identifyChildren(doc.root)).toEqual([
      '[anchor]', //
      'd("aaa")'
    ]);
  });

  test('only ANCHOR in doc', () => {
    // arrange
    const doc = makeRoot(a());
    const { cursor } = createCursor(doc, doc.root.firstChild as HTMLElement);

    // act
    cursor.delete();

    // assert
    expect(cursor.getPlace()).toBe(doc.root.firstChild); // should be no-op
    expect(identifyChildren(doc.root)).toEqual([
      '[anchor]' //
    ]);
  });

  test.todo('ISLAND no-op', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('aaa'), //
        s(),
        '<span class="katex" style="display:inline;">x²</span>',
        s(),
        t('bbb')
      )
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const { cursor } = createCursor(doc, island);
    expect(identify(cursor.getPlace())).toBe('[island:span]');

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('aaa');
  });

  test('ANCHOR empty doc - <p>A</p>', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        a()
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    expect(identify(cursor.getPlace())).toBe('[anchor]');

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(tokens(doc)).toHaveLength(1);
  });

  test('ANCHOR empty doc - <p>foo</p>', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        t('foo')
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    expect(identify(cursor.getPlace())).toBe('foo');

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(tokens(doc)).toHaveLength(2);
    expect(identify(cursor.getPlace().nextSibling)).toBe('d("foo")');
  });

  test('ANCHOR ∅<em>foo</em>∅', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        em({ id: 'em1', style: inlineStyleHackVal }, t('foo'))
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    expect(identify(cursor.getPlace())).toBe('foo');

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(tokens(doc)).toHaveLength(2);
    expect(identify(cursor.getPlace().nextSibling)).toBe('d("foo")');
  });

  test('ANCHOR ...<em>bbb</em>...', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        t('aaa'),
        s(),
        em({ id: 'em1', style: inlineStyleHackVal }, t('bbb')),
        s(),
        t('ccc')
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[1]);
    expect(identify(cursor.getPlace())).toBe('bbb');

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(identify(cursor.getPlace().nextSibling)).toBe('d("bbb")');
  });

  test('ANCHOR ...<em>A</em>... (deleteHighestEmpty)', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        t('aaa'),
        s(),
        em({ id: 'em1', style: inlineStyleHackVal }, a()),
        s(),
        t('ccc')
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[1]);
    expect(identify(cursor.getPlace())).toBe('[anchor]');

    // act
    cursor.delete();

    // assert
    // The empty <em> is soft-deleted in place; cursor falls back to 'aaa'.
    expect(identify(cursor.getPlace())).toBe('aaa');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'aaa',
      '[nodeType=3:" "]',
      '[deleted-element]',
      '[nodeType=3:" "]',
      'ccc'
    ]);
  });

  test('TOKEN after ISLAND with next TOKEN', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('aaa'),
        s(),
        '<span class="katex" style="display:inline;">x²</span>',
        s(),
        t('bbb'),
        s(),
        t('ccc')
      )
    );
    expect(identify(tokens(doc)[1])).toEqual('bbb');
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[island:span]');
  });

  test('last TOKEN after ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        t('aaa'),
        s(),
        '<span class="katex" style="display:inline;">x²</span>',
        s(),
        t('bbb')
      )
    );
    expect(identify(tokens(doc)[1])).toEqual('bbb');
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[island:span]');
    expect(identify(cursor.getPlace().nextElementSibling)).toBe('[deleted-space]'); // not removed from dom
    expect(identify(cursor.getPlace().nextElementSibling?.nextElementSibling)).toBe('d("bbb")'); // not removed from dom
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
