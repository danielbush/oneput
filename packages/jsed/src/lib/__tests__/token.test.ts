import { describe, test, expect } from 'vitest';
import { byId, makeRoot, div, p, em } from '../../test/util.js';
import { tokenizeLine, tagImplicitLines } from '../token.js';
import { JSED_IMPLICIT_CLASS } from '../constants.js';

/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyleHack = { style: 'display:inline;' };
/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyleHackVal = 'display:inline;';

describe('tokenizeLine', () => {
  test('simple LINE: <p>foo bar baz</p>', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
    const p1 = byId(doc, 'p1');

    // act
    const first = tokenizeLine(p1);

    // assert
    expect(p1).toMatchSnapshot();
    expect(first!.textContent!.trim()).toBe('foo');
  });

  test('complex LINE: <p>foo <em>bar</em> baz</p>', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo ', em(inlineStyleHack, 'bar'), ' baz'));
    const p1 = byId(doc, 'p1');

    // act
    const first = tokenizeLine(p1);

    // assert
    expect(byId(doc, 'p1')).toMatchSnapshot();
    expect(first!.textContent!.trim()).toBe('foo');
  });

  test('NESTED_LINE: <div><div>nested</div>outer</div>', () => {
    // arrange — "outer" after div2 is wrapped in IMPLICIT_LINE by tagImplicitLines.
    // tokenizeLine(div1) returns null because there's no direct text to tokenize.
    const doc = makeRoot(
      div(
        { id: 'div1' }, //
        div({ id: 'div2' }, 'nested'),
        'outer'
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    const first = tokenizeLine(div1);

    // assert — "outer" is in IMPLICIT_LINE, not tokenized at this level
    expect(div1).toMatchSnapshot();
    expect(first).toBeNull();
  });

  test('text before NESTED_LINE: <div>outer<div>nested</div></div>', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' }, //
        'outer',
        div({ id: 'div2' }, 'nested')
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    const first = tokenizeLine(div1);

    // assert
    expect(div1).toMatchSnapshot();
    expect(first!.textContent!.trim()).toBe('outer');
  });

  test('only NESTED_LINE, no text: <div><div>nested</div></div>', () => {
    // arrange
    const doc = makeRoot(div({ id: 'div1' }, div({ id: 'div2' }, 'nested')));
    const div1 = byId(doc, 'div1');

    // act
    const first = tokenizeLine(div1);

    // assert
    expect(div1).toMatchSnapshot();
    console.log('first token:', first?.textContent ?? 'null');
  });

  test('inline-block NESTED_LINE: <p>outer<span style="display:inline-block">nested</span></p>', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        'outer',
        `<span id="span1" style="display:inline-block;">nested</span>`
      )
    );
    const p1 = byId(doc, 'p1');

    // act
    const first = tokenizeLine(p1);

    // assert
    expect(p1).toMatchSnapshot();
    expect(first!.textContent!.trim()).toBe('outer');
  });

  describe('SHALLOW_TOKENIZATION', () => {
    test('case 1', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'div1' },
          p(
            { id: 'p1' },
            'foo ', //
            em(inlineStyleHack, 'bar'),
            ' baz'
          ),
          p(
            { id: 'p2' }, //
            'foo ',
            em(inlineStyleHack, 'bar'),
            ' baz'
          )
        )
      );
      const div1 = byId(doc, 'div1');

      // act
      tokenizeLine(div1);

      // assert
      expect(div1).toMatchSnapshot('Should not tokenize p1 and p2');
    });

    test('case 2', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'div1' },
          p(
            { id: 'p1' }, //
            'foo ',
            em(inlineStyleHack, 'bar'),
            ' baz'
          ),
          p(
            { id: 'p2' }, //
            'foo ',
            em(inlineStyleHack, 'bar'),
            ' baz'
          )
        )
      );
      const p1 = byId(doc, 'p1');
      const div1 = byId(doc, 'div1');

      // act
      tokenizeLine(p1);

      // assert
      expect(div1).toMatchSnapshot('Should only tokenize p1');
    });
  });
});

describe('tagImplicitLines', () => {
  test('text after a LINE is wrapped', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p(
          { id: 'p1' }, //
          'foo ',
          em(inlineStyleHack, 'bar'),
          ' baz'
        ),
        'this is the IMPLICIT_LINE'
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).not.toBeNull();
    expect(implicit!.tagName).toBe('SPAN');
    expect(implicit!.textContent).toBe('this is the IMPLICIT_LINE');
  });

  test('IMPLICIT_LINE slurps up adjacent INLINE', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p(
          { id: 'p1' }, //
          'foo ',
          em(inlineStyleHack, 'bar'),
          ' baz'
        ),
        `this is the <em id="em2" style="${inlineStyleHackVal}">implicit</em> line`
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).not.toBeNull();
    expect(implicit!.textContent).toBe('this is the implicit line');
    expect(implicit!.querySelector('#em2')).not.toBeNull();
  });

  test('IMPLICIT_LINE starting with an INLINE', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p(
          { id: 'p1' }, //
          'foo ',
          em(inlineStyleHack, 'bar'),
          ' baz'
        ),
        `<em id="em2" style="${inlineStyleHackVal}">implicit</em> line`
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).not.toBeNull();
    expect(implicit!.textContent).toBe('implicit line');
    expect(implicit!.querySelector('#em2')).not.toBeNull();
  });

  test('br tags are INLINE — absorbed into one IMPLICIT_LINE; hr is block — creates a new one', () => {
    // br tags are inline so buildImplicitLine slurps them along with adjacent
    // text into a single IMPLICIT_LINE. An <hr> is block-level (a LINE), so it
    // stops the slurp and text after the <hr> becomes a second IMPLICIT_LINE.
    //
    // br tags need INLINE_COMPUTED_STYLE because jsdom returns empty display for <br>
    const br = `<br style="display:inline">`;
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'A paragraph.'),
        `First sentence.${br}Second sentence.${br}Third sentence.<hr>After the rule.`
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicits = byId(doc, 'div1').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicits.length).toBe(2);

    // First IMPLICIT_LINE: text and br's before the <hr>
    expect(implicits[0].textContent).toBe('First sentence.Second sentence.Third sentence.');
    expect(implicits[0].querySelectorAll('br').length).toBe(2);

    // Second IMPLICIT_LINE: text after the <hr>
    expect(implicits[1].textContent).toBe('After the rule.');
  });

  test("whitespace-only text between LINE's is ignored", () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' }, //
        p({ id: 'p1' }, 'foo'),
        ' ',
        p({ id: 'p2' }, 'foo')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicit = byId(doc, 'div1').querySelector(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicit).toBeNull();
    expect(byId(doc, 'p1').nextSibling).toHaveProperty('nodeType', 3);
  });
});
