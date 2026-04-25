import { describe, expect, test } from 'vitest';
import { byId, div, em, inlineStyleHackVal, makeRoot, p, span, strong } from '../../test/util';
import { tagImplicitLines } from '../interstitial';
import { JSED_IGNORE_CLASS, JSED_IMPLICIT_CLASS } from '../constants';

describe('inline IMPLICIT_LINE (interstitial)', () => {
  test('leading interstitial', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        'aaa', // leasding interstitial text
        p({ id: 'p1' }, 'bbb')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const wrapped = byId(doc, 'd').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(wrapped.length).toBe(1);
    expect(wrapped[0].tagName).toBe('SPAN');
    expect(wrapped[0].textContent).toBe('aaa');
    // p is untouched: still a single bare text-node child, no wrapper inside
    const p1 = byId(doc, 'p1');
    expect(p1.childNodes.length).toBe(1);
    expect(p1.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(p1.textContent).toBe('bbb');
    expect(p1.querySelectorAll(`.${JSED_IMPLICIT_CLASS}`).length).toBe(0);
  });

  test('between interstitial', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        p({ id: 'p1' }, 'aaa'),
        'bbb', // between interstitial text
        p({ id: 'p2' }, 'ccc')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const wrapped = byId(doc, 'd').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(wrapped.length).toBe(1);
    expect(wrapped[0].tagName).toBe('SPAN');
    expect(wrapped[0].textContent).toBe('bbb');
    // p's are untouched: bare text-node child, no wrapper inside
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');
    expect(p1.childNodes.length).toBe(1);
    expect(p1.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(p1.textContent).toBe('aaa');
    expect(p2.childNodes.length).toBe(1);
    expect(p2.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(p2.textContent).toBe('ccc');
    expect(p1.querySelectorAll(`.${JSED_IMPLICIT_CLASS}`).length).toBe(0);
    expect(p2.querySelectorAll(`.${JSED_IMPLICIT_CLASS}`).length).toBe(0);
  });

  test('between interstitial absorbs an INLINE_FLOW into a single wrapper', () => {
    // arrange
    // <div><p>aaa</p>bbb<em>x</em>ccc<p>ddd</p></div>
    // The run "bbb <em>x</em> ccc" is one contiguous between-interstitial and
    // should be wrapped in a single span.
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        p({ id: 'p1' }, 'aaa'),
        'bbb',
        em({ id: 'e1', style: inlineStyleHackVal }, 'x'),
        'ccc',
        p({ id: 'p2' }, 'ddd')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const wrapped = byId(doc, 'd').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(wrapped.length).toBe(1);
    expect(wrapped[0].tagName).toBe('SPAN');
    expect(wrapped[0].textContent).toBe('bbbxccc');
    // em is absorbed into the wrapper
    expect(wrapped[0].querySelector('#e1')).not.toBeNull();
    // p's are untouched
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');
    expect(p1.childNodes.length).toBe(1);
    expect(p1.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(p1.textContent).toBe('aaa');
    expect(p2.childNodes.length).toBe(1);
    expect(p2.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(p2.textContent).toBe('ddd');
    expect(p1.querySelectorAll(`.${JSED_IMPLICIT_CLASS}`).length).toBe(0);
    expect(p2.querySelectorAll(`.${JSED_IMPLICIT_CLASS}`).length).toBe(0);
  });

  test('between interstitial with nested inline (em > strong)', () => {
    // arrange
    // <div><p>aaa</p>bbb<em>x<strong>y</strong>z</em>ccc<p>ddd</p></div>
    // The em with a nested strong is part of one between-interstitial run.
    // Internal inline nesting should not affect wrapping — only the direct
    // children of the outer LINE matter.
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        p({ id: 'p1' }, 'aaa'),
        'bbb',
        em(
          { id: 'e1', style: inlineStyleHackVal },
          'x',
          strong({ id: 's1', style: inlineStyleHackVal }, 'y'),
          'z'
        ),
        'ccc',
        p({ id: 'p2' }, 'ddd')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const wrapped = byId(doc, 'd').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(wrapped.length).toBe(1);
    expect(wrapped[0].tagName).toBe('SPAN');
    expect(wrapped[0].textContent).toBe('bbbxyzccc');
    // em + strong absorbed; structure preserved
    expect(wrapped[0].querySelector('#e1')).not.toBeNull();
    expect(wrapped[0].querySelector('#s1')).not.toBeNull();
    expect(byId(doc, 'e1').contains(byId(doc, 's1'))).toBe(true);
    // No wrapper inserted inside em or strong
    expect(byId(doc, 'e1').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`).length).toBe(0);
  });

  test('IGNORABLE element in a between interstitial is absorbed into the wrapper', () => {
    // arrange
    // <div><p>aaa</p>bbb<span class="jsed-ignore">m</span>ccc<p>ddd</p></div>
    // jsed-ignore is skipped for normal DOM walks but for implicit-line
    // formation it counts as inline content within the run.
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        p({ id: 'p1' }, 'aaa'),
        'bbb',
        span({ id: 'ig1', class: JSED_IGNORE_CLASS, style: inlineStyleHackVal }, 'm'),
        'ccc',
        p({ id: 'p2' }, 'ddd')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const wrapped = byId(doc, 'd').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(wrapped.length).toBe(1);
    expect(wrapped[0].tagName).toBe('SPAN');
    expect(wrapped[0].textContent).toBe('bbbmccc');
    // ignorable is absorbed into the same wrapper
    expect(wrapped[0].querySelector('#ig1')).not.toBeNull();
  });

  test('IGNORABLE block element splits the run into two wrappers', () => {
    // arrange
    // <div><p>aaa</p>bbb<div class="jsed-ignore">m</div>ccc<p>ddd</p></div>
    // The ignorable is a block-level element, so it breaks the interstitial
    // run — "bbb" and "ccc" become two separate wrappers.
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        p({ id: 'p1' }, 'aaa'),
        'bbb',
        div({ id: 'ig1', class: JSED_IGNORE_CLASS }, 'm'),
        'ccc',
        p({ id: 'p2' }, 'ddd')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const wrapped = byId(doc, 'd').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(wrapped.length).toBe(2);
    expect(wrapped[0].textContent).toBe('bbb');
    expect(wrapped[1].textContent).toBe('ccc');
    // ignorable div is left in place between the two wrappers
    expect(byId(doc, 'ig1').parentElement?.id).toBe('d');
    expect(byId(doc, 'ig1').previousElementSibling).toBe(wrapped[0]);
    expect(byId(doc, 'ig1').nextElementSibling).toBe(wrapped[1]);
  });

  test('whitespace-only text between blocks is preserved as a bare text node', () => {
    // arrange
    // <div><p>aaa</p>   <p>bbb</p></div>
    // The "   " text node between the p's exists in the DOM (e.g. from
    // pretty-printed HTML) but holds no user-visible content and must not
    // become an implicit line.
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        p({ id: 'p1' }, 'aaa'),
        '   ',
        p({ id: 'p2' }, 'bbb')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const d = byId(doc, 'd');
    expect(d.querySelectorAll(`.${JSED_IMPLICIT_CLASS}`).length).toBe(0);
    // The whitespace text node is still present, between the two p's.
    expect(d.childNodes.length).toBe(3);
    expect(d.childNodes[0]).toBe(byId(doc, 'p1'));
    expect(d.childNodes[1].nodeType).toBe(Node.TEXT_NODE);
    expect(d.childNodes[1].textContent).toBe('   ');
    expect(d.childNodes[2]).toBe(byId(doc, 'p2'));
  });

  test('idempotent: running twice does not re-wrap', () => {
    // arrange
    // JsedDocument already runs tagImplicitLines at load time, so test
    // fixtures that call it again must not produce nested wrappers.
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        p({ id: 'p1' }, 'aaa'),
        'bbb',
        em({ id: 'e1', style: inlineStyleHackVal }, 'x'),
        'ccc',
        p({ id: 'p2' }, 'ddd')
      )
    );

    // act
    tagImplicitLines(doc.root);
    const afterFirst = byId(doc, 'd').innerHTML;
    tagImplicitLines(doc.root);
    const afterSecond = byId(doc, 'd').innerHTML;

    // assert
    expect(afterSecond).toBe(afterFirst);
    const wrapped = byId(doc, 'd').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(wrapped.length).toBe(1);
    // No wrapper got nested inside another
    expect(wrapped[0].querySelectorAll(`.${JSED_IMPLICIT_CLASS}`).length).toBe(0);
  });

  test('run consisting only of an INLINE_FLOW (no text) is wrapped', () => {
    // arrange
    // <div><em>x</em><p>y</p></div>
    // The leading run has no text, just an em. The em still needs an implicit
    // line wrapper so the cursor can reach it as part of the outer LINE.
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        em({ id: 'e1', style: inlineStyleHackVal }, 'x'),
        p({ id: 'p1' }, 'y')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const wrapped = byId(doc, 'd').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(wrapped.length).toBe(1);
    expect(wrapped[0].tagName).toBe('SPAN');
    expect(wrapped[0].textContent).toBe('x');
    expect(wrapped[0].querySelector('#e1')).not.toBeNull();
  });

  test('whitespace adjacent to an INLINE_FLOW stays bare; only the inline element is wrapped', () => {
    // arrange
    // <div><p>a</p>   <em></em>   <p>b</p></div>
    // Implicit lines never absorb whitespace — the whitespace either side of
    // the em is left bare so other operations can manipulate it without
    // descending into the wrapper. Only the em becomes an implicit line.
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        p({ id: 'p1' }, 'a'),
        '   ',
        em({ id: 'e1', style: inlineStyleHackVal }),
        '   ',
        p({ id: 'p2' }, 'b')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const d = byId(doc, 'd');
    const wrapped = d.querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(wrapped.length).toBe(1);
    expect(wrapped[0].tagName).toBe('SPAN');
    expect(wrapped[0].querySelector('#e1')).not.toBeNull();
    // wrapper holds only the em, no whitespace
    expect(wrapped[0].childNodes.length).toBe(1);
    // surrounding whitespace remains as bare text-node siblings
    expect(d.childNodes.length).toBe(5);
    expect(d.childNodes[1].nodeType).toBe(Node.TEXT_NODE);
    expect(d.childNodes[1].textContent).toBe('   ');
    expect(d.childNodes[2]).toBe(wrapped[0]);
    expect(d.childNodes[3].nodeType).toBe(Node.TEXT_NODE);
    expect(d.childNodes[3].textContent).toBe('   ');
  });

  test('comment node is absorbed into the run', () => {
    // arrange
    // <div><p>x</p>aaa<!-- c -->bbb<p>y</p></div>
    // Comments are invisible to the user, so an inline <!-- ... --> is
    // absorbed into the surrounding implicit line rather than splitting it.
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        p({ id: 'p1' }, 'x'),
        'aaa',
        '<!-- c -->',
        'bbb',
        p({ id: 'p2' }, 'y')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const wrapped = byId(doc, 'd').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(wrapped.length).toBe(1);
    expect(wrapped[0].textContent).toBe('aaabbb');
    // comment is preserved inside the wrapper
    const commentNodes = Array.from(wrapped[0].childNodes).filter(
      (n) => n.nodeType === Node.COMMENT_NODE
    );
    expect(commentNodes.length).toBe(1);
    expect(commentNodes[0].textContent).toBe(' c ');
  });

  test('<br> splits the run', () => {
    // arrange
    // <br> has inline display by default, so the inline style hack matches
    // real-browser computed style — without the special-case in
    // isInterstitialChild, <br> would be absorbed into the run.
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        p({ id: 'p1' }, 'aaa'),
        'bbb',
        `<br style="${inlineStyleHackVal}">`,
        'ccc',
        p({ id: 'p2' }, 'ddd')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const wrapped = byId(doc, 'd').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(wrapped.length).toBe(2);
    expect(wrapped[0].textContent).toBe('bbb');
    expect(wrapped[1].textContent).toBe('ccc');
  });

  test('<hr> splits the run', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        p({ id: 'p1' }, 'aaa'),
        'bbb',
        '<hr>',
        'ccc',
        p({ id: 'p2' }, 'ddd')
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const wrapped = byId(doc, 'd').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(wrapped.length).toBe(2);
    expect(wrapped[0].textContent).toBe('bbb');
    expect(wrapped[1].textContent).toBe('ccc');
  });

  test('trailing interstitial', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'd' }, //
        p({ id: 'p1' }, 'aaa'),
        'bbb' // trailing interstitial text
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const wrapped = byId(doc, 'd').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(wrapped.length).toBe(1);
    expect(wrapped[0].tagName).toBe('SPAN');
    expect(wrapped[0].textContent).toBe('bbb');
    // p is untouched
    const p1 = byId(doc, 'p1');
    expect(p1.childNodes.length).toBe(1);
    expect(p1.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(p1.textContent).toBe('aaa');
    expect(p1.querySelectorAll(`.${JSED_IMPLICIT_CLASS}`).length).toBe(0);
  });
});
