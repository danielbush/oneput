import { describe, expect, test } from 'vitest';
import { makeRoot, div, byId } from '../../test/util.js';
import { findNextNode, findPreviousNode } from '../walk.js';

describe('findNextNode - visit order', () => {
  test('root=ceiling / ceiling=start / start=root', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div({ id: '1-1' }),
        div({ id: '1-2' }),
        div({ id: '1-3' }),
        div({ id: '1-4' })
      )
    );
    const visited = [];
    const start = byId(doc, '1');
    const ceiling = byId(doc, '1');

    // act
    for (const el of findNextNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-1', '1-2', '1-3', '1-4']);
  });

  test('root=start / ceiling=start - deeper', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' },
        div(
          { id: '1-1' }, //
          div({ id: '1-1-1' }),
          div({ id: '1-1-2' })
        ),
        div(
          { id: '1-2' }, //
          div({ id: '1-2-1' })
        ),
        div(
          { id: '1-3' }, //
          div({ id: '1-3-1' })
        ),
        div(
          { id: '1-4' }, //
          div({ id: '1-4-1' })
        )
      )
    );
    const visited = [];
    const start = byId(doc, '1');
    const ceiling = byId(doc, '1');

    // act
    for (const el of findNextNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual([
      '1-1',
      '1-1-1',
      '1-1-2',
      '1-2',
      '1-2-1',
      '1-3',
      '1-3-1',
      '1-4',
      '1-4-1'
    ]);
  });

  test(`root > ceiling / ceiling=start - don't walk ceiling's peers`, () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div({ id: '1-1' }),
        div({ id: '1-2' }),
        div({ id: '1-3' }),
        div({ id: '1-4' })
      )
    );
    const visited = [];
    const start = byId(doc, '1-1');
    const ceiling = byId(doc, '1-1');

    // act
    for (const el of findNextNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual([]);
  });

  test(`root > ceiling / ceiling > start - don't walk ceiling's peers, walk start's peers`, () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div(
          { id: '1-1' }, //
          div({ id: '1-1-1' }),
          div({ id: '1-1-2' })
        ),
        div({ id: '1-2' }),
        div({ id: '1-3' }),
        div({ id: '1-4' })
      )
    );
    const visited = [];
    const start = byId(doc, '1-1-1');
    const ceiling = byId(doc, '1-1');

    // act
    for (const el of findNextNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-1-2']);
  });

  test('root=ceiling / ceiling > start', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' },
        div(
          { id: '1-1' }, //
          div({ id: '1-1-1' })
        ),
        div({ id: '1-2' }),
        div({ id: '1-3' }),
        div({ id: '1-4' })
      )
    );
    const visited = [];
    const start = byId(doc, '1-1-1');
    const ceiling = byId(doc, '1');

    // act
    for (const el of findNextNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-2', '1-3', '1-4']);
  });

  test('root=ceiling / ceiling > start - deeper', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div(
          { id: '1-1' }, //
          div(
            { id: '1-1-1' }, //
            div({ id: '1-1-1-1' }),
            div({ id: '1-1-1-2' })
          )
        ),
        div(
          { id: '1-2' }, //
          div({ id: '1-2-1' }),
          div({ id: '1-2-2' })
        ),
        div({ id: '1-3' }),
        div({ id: '1-4' })
      )
    );
    const visited = [];
    const start = byId(doc, '1-1-1-2');
    const ceiling = byId(doc, '1');

    // act
    for (const el of findNextNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-2', '1-2-1', '1-2-2', '1-3', '1-4']);
  });
});

describe('findNextNode - visit/descend separation', () => {
  test('visit rejects a node but descend allows recursing into it', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div(
          { id: 'skip' }, //
          div({ id: 'child-1' }),
          div({ id: 'child-2' })
        ),
        div({ id: '2' })
      )
    );
    const visited = [];
    const start = byId(doc, '1');
    const ceiling = byId(doc, '1');

    // act — skip the 'skip' node but descend into its children
    for (const el of findNextNode(start, ceiling, {
      visit: (n) => (n as HTMLElement).id !== 'skip'
    })) {
      visited.push((el as HTMLElement).id);
    }

    // assert — 'skip' not visited, but its children are
    expect(visited).toEqual(['child-1', 'child-2', '2']);
  });

  test('visit rejects a sibling of start but descend allows recursing into it', () => {
    // arrange — 'skip' is a sibling of start, not a child
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div({ id: 'start' }),
        div(
          { id: 'skip' }, //
          div({ id: 'child-1' }),
          div({ id: 'child-2' })
        ),
        div({ id: '2' })
      )
    );
    const visited = [];
    const start = byId(doc, 'start');
    const ceiling = byId(doc, '1');

    // act — skip the 'skip' node but descend into its children
    for (const el of findNextNode(start, ceiling, {
      visit: (n) => (n as HTMLElement).id !== 'skip'
    })) {
      visited.push((el as HTMLElement).id);
    }

    // assert — 'skip' not visited, but its children are
    expect(visited).toEqual(['child-1', 'child-2', '2']);
  });

  test('descend prevents recursion even when visit would accept children', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div(
          { id: 'island' }, //
          div({ id: 'hidden-1' }),
          div({ id: 'hidden-2' })
        ),
        div({ id: '2' })
      )
    );
    const visited = [];
    const start = byId(doc, '1');
    const ceiling = byId(doc, '1');

    // act — visit 'island' but don't descend into it
    for (const el of findNextNode(start, ceiling, {
      descend: (n) => (n as HTMLElement).id !== 'island'
    })) {
      visited.push((el as HTMLElement).id);
    }

    // assert — 'island' visited, its children are not
    expect(visited).toEqual(['island', '2']);
  });

  test('visit rejects AND descend rejects — node and children skipped', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div(
          { id: 'gone' }, //
          div({ id: 'gone-child' })
        ),
        div({ id: '2' })
      )
    );
    const visited = [];
    const start = byId(doc, '1');
    const ceiling = byId(doc, '1');

    // act
    for (const el of findNextNode(start, ceiling, {
      visit: (n) => (n as HTMLElement).id !== 'gone',
      descend: (n) => (n as HTMLElement).id !== 'gone'
    })) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['2']);
  });
});

describe('findPreviousNode - visit order', () => {
  test('root=ceiling ceiling > start', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div({ id: '1-1' }),
        div({ id: '1-2' }),
        div({ id: '1-3' }),
        div({ id: '1-4' })
      )
    );
    const visited = [];
    const start = byId(doc, '1-4');
    const ceiling = byId(doc, '1');

    // act
    for (const el of findPreviousNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-3', '1-2', '1-1']);
  });

  test('root=ceiling ceiling > start - more descendents', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div(
          { id: '1-1' }, //
          div({ id: '1-1-1' })
        ),
        div(
          { id: '1-2' }, //
          div({ id: '1-2-1' })
        ),
        div(
          { id: '1-3' }, //
          div({ id: '1-3-1' })
        ),
        div(
          { id: '1-4' }, //
          div({ id: '1-4-1' })
        )
      )
    );
    const visited = [];
    const start = byId(doc, '1-4');
    const ceiling = byId(doc, '1');

    // act
    for (const el of findPreviousNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-3-1', '1-3', '1-2-1', '1-2', '1-1-1', '1-1']);
  });

  test('root=ceiling / ceiling > start - deeper descendents', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div(
          { id: '1-1' }, //
          div({ id: '1-1-1' })
        ),
        div(
          { id: '1-2' }, //
          div({ id: '1-2-1' })
        ),
        div(
          { id: '1-3' }, //
          div(
            { id: '1-3-1' }, //
            div({ id: '1-3-1-1' }),
            div({ id: '1-3-1-2' })
          )
        ),
        div(
          { id: '1-4' }, //
          div({ id: '1-4-1' })
        )
      )
    );
    const visited = [];
    const start = byId(doc, '1-4');
    const ceiling = byId(doc, '1');

    // act
    for (const el of findPreviousNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-3-1-2', '1-3-1-1', '1-3-1', '1-3', '1-2-1', '1-2', '1-1-1', '1-1']);
  });

  test('root=ceiling / ceiling > start - start at end', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'a' }, //
        div(
          { id: '1' }, //
          div({ id: '1-1' }),
          div({ id: '1-2' }),
          div({ id: '1-3' }),
          div({ id: '1-4' })
        )
      )
    );
    const visited = [];
    const start = byId(doc, '1-4');
    const ceiling = byId(doc, 'a');

    // act
    for (const el of findPreviousNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-3', '1-2', '1-1', '1']);
  });

  test('root=ceiling / ceiling > start - go up to parent and visit its previous sibs', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'a' }, //
        div({ id: '1' }),
        div({ id: '2' }),
        div(
          { id: '3' }, //
          div({ id: '3-1' })
        )
      )
    );
    const visited = [];
    const start = byId(doc, '3-1');
    const ceiling = byId(doc, 'a');

    // act
    for (const el of findPreviousNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['3', '2', '1']);
  });

  test(`root > ceiling / ceiling=start - don't walk ceiling's peers`, () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div(
          { id: '1-1' }, //
          div({ id: '1-1-1' })
        ),
        div(
          { id: '1-2' }, //
          div({ id: '1-2-1' })
        ),
        div(
          { id: '1-3' }, //
          div({ id: '1-3-1' })
        ),
        div(
          { id: '1-4' }, //
          div({ id: '1-4-1' })
        )
      )
    );
    const visited = [];
    const start = byId(doc, '1-4');
    const ceiling = byId(doc, '1-4');

    // act
    for (const el of findPreviousNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual([]);
  });

  test(`root > ceiling / ceiling > start - don't walk ceiling's peers, walk start's peers`, () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div(
          { id: '1-1' }, //
          div({ id: '1-1-1' })
        ),
        div(
          { id: '1-2' }, //
          div({ id: '1-2-1' })
        ),
        div(
          { id: '1-3' }, //
          div({ id: '1-3-1' })
        ),
        div(
          { id: '1-4' }, //
          div({ id: '1-4-1' }),
          div({ id: '1-4-2' })
        )
      )
    );
    const visited = [];
    const start = byId(doc, '1-4-2');
    const ceiling = byId(doc, '1-4');

    // act
    for (const el of findPreviousNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-4-1']);
  });

  test('root=ceiling / ceiling > start - regression case 1', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div({ id: '2' }),
        div({ id: '3' }),
        div(
          { id: '4' }, //
          div({ id: '4-1' }),
          div({ id: '4-2' })
        )
      )
    );
    const visited = [];
    const start = byId(doc, '4-2');
    const ceiling = byId(doc, '1');

    // act
    for (const el of findPreviousNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['4-1', '4', '3', '2']);
  });

  test('root=ceiling / ceiling > start - regression case 2', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div(
          { id: '2' }, //
          div({ id: '2-1' })
        ),
        div(
          { id: '3' }, //
          div({ id: '3-1' })
        ),
        div(
          { id: '4' }, //
          div({ id: '4-1' })
        )
      )
    );
    const visited = [];
    const start = byId(doc, '4-1');
    const ceiling = byId(doc, '1');

    // act
    for (const el of findPreviousNode(start, ceiling)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['4', '3-1', '3', '2-1', '2']);
  });
});

describe('findPreviousNode - visit/descend separation', () => {
  test('visit rejects a node but descend allows recursing into it', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div({ id: '2' }),
        div(
          { id: 'skip' }, //
          div({ id: 'child-1' }),
          div({ id: 'child-2' })
        )
      )
    );
    const visited = [];
    const start = byId(doc, 'child-2');
    const ceiling = byId(doc, '1');

    // act — skip the 'skip' node but descend into its children
    for (const el of findPreviousNode(start, ceiling, {
      visit: (n) => (n as HTMLElement).id !== 'skip'
    })) {
      visited.push((el as HTMLElement).id);
    }

    // assert — 'skip' not visited, but child-1 is; then 2
    expect(visited).toEqual(['child-1', '2']);
  });

  test('visit rejects a sibling of start but descend allows recursing into it', () => {
    // arrange — 'skip' is a previous sibling of start, not a parent
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div({ id: '2' }),
        div(
          { id: 'skip' }, //
          div({ id: 'child-1' }),
          div({ id: 'child-2' })
        ),
        div({ id: 'start' })
      )
    );
    const visited = [];
    const start = byId(doc, 'start');
    const ceiling = byId(doc, '1');

    // act — skip the 'skip' node but descend into its children
    for (const el of findPreviousNode(start, ceiling, {
      visit: (n) => (n as HTMLElement).id !== 'skip'
    })) {
      visited.push((el as HTMLElement).id);
    }

    // assert — 'skip' not visited, but its children are
    expect(visited).toEqual(['child-2', 'child-1', '2']);
  });

  test('descend prevents recursion even when visit would accept children', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' }, //
        div({ id: '2' }),
        div(
          { id: 'island' }, //
          div({ id: 'hidden-1' }),
          div({ id: 'hidden-2' })
        ),
        div({ id: '3' })
      )
    );
    const visited = [];
    const start = byId(doc, '3');
    const ceiling = byId(doc, '1');

    // act — visit 'island' but don't descend into it
    for (const el of findPreviousNode(start, ceiling, {
      descend: (n) => (n as HTMLElement).id !== 'island'
    })) {
      visited.push((el as HTMLElement).id);
    }

    // assert — 'island' visited, its children are not
    expect(visited).toEqual(['island', '2']);
  });
});
