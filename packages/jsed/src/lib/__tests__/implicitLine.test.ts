import { describe, expect, test } from 'vitest';
import { byId, div, em, inlineStyleHackVal, makeRoot, p, span } from '../../test/util';
import { tagImplicitLines } from '../implicitLine';
import { JSED_IMPLICIT_CLASS } from '../constants';

describe('block-based IMPLICIT_LINE', () => {
  // IMPLICIT_LINE algorithm: only created when a LINE contains a block child.
  // Each bare-text run (plus any adjacent INLINE_FLOWs) extending up to the
  // next block or LINE edge becomes a block-IMPLICIT_LINE — a true LINE.
  // A LINE with only inline content gets no IMPLICIT_LINEs.
  test('LINE with a block child: runs become block-IMPLICIT_LINEs (absorbing inlines)', () => {
    // arrange
    // <div>aaa<em>x</em>bbb<h2>hh</h2>ccc</div>
    // aaa / em / bbb all see <h2> to the right before the LINE edge ->
    // one block-IMPLICIT_LINE wrapping the run. ccc sees <h2> to the left ->
    // its own block-IMPLICIT_LINE.
    const doc = makeRoot(
      div(
        { id: 'div1' },
        'aaa',
        em({ id: 'em1', style: inlineStyleHackVal }, 'x'),
        'bbb',
        `<h2 id="h2">hh</h2>`,
        'ccc'
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const implicits = byId(doc, 'div1').querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicits.length).toBe(2);

    // First wraps aaa + em + bbb and is block-level (not a <span>).
    expect(implicits[0].tagName).not.toBe('SPAN');
    expect(implicits[0].textContent).toBe('aaaxbbb');
    expect(implicits[0].querySelector('#em1')).not.toBeNull();

    // Second wraps ccc and is block-level.
    expect(implicits[1].tagName).not.toBe('SPAN');
    expect(implicits[1].textContent).toBe('ccc');
  });

  test('floats are pass-over: not a boundary, not absorbed into the wrapper', () => {
    // arrange
    // <div><p>foo</p><span float>F</span>trailing</div>
    // The <p> is a block boundary. The float is out-of-flow and stays in place
    // as its own LINE — it does NOT partition (so `trailing` isn't fragmented
    // by it) and it is NOT absorbed into the implicit-line wrapping `trailing`.
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'foo'),
        span({ id: 'float1', style: 'float:left;' }, 'F'),
        'trailing'
      )
    );

    // act
    tagImplicitLines(doc.root);

    // assert
    const div1 = byId(doc, 'div1');
    const implicits = div1.querySelectorAll(`.${JSED_IMPLICIT_CLASS}`);
    expect(implicits.length).toBe(1);
    expect(implicits[0].textContent).toBe('trailing');

    // The float is still a direct child of div1 (not moved into the wrapper).
    expect(byId(doc, 'float1').parentElement).toBe(div1);
  });
});
