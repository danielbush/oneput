import { describe, expect, test } from 'vitest';
import { makeRoot, div, byId } from '../../test/util.js';
import { findNextNode, findPreviousNode } from '../walk.js';

describe('findNextNode - visit order', () => {
  test('root=limit / limit=start / start=root', () => {
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
    const limit = byId(doc, '1');

    // act
    for (const el of findNextNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-1', '1-2', '1-3', '1-4']);
  });

  test('root=start / limit=start - deeper', () => {
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
    const limit = byId(doc, '1');

    // act
    for (const el of findNextNode(start, limit)) {
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

  test(`root > limit / limit=start - don't walk limit's peers`, () => {
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
    const limit = byId(doc, '1-1');

    // act
    for (const el of findNextNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual([]);
  });

  test(`root > limit / limit > start - don't walk limit's peers, walk start's peers`, () => {
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
    const limit = byId(doc, '1-1');

    // act
    for (const el of findNextNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-1-2']);
  });

  test('root=limit / limit > start', () => {
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
    const limit = byId(doc, '1');

    // act
    for (const el of findNextNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-2', '1-3', '1-4']);
  });

  test('root=limit / limit > start - deeper', () => {
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
    const limit = byId(doc, '1');

    // act
    for (const el of findNextNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-2', '1-2-1', '1-2-2', '1-3', '1-4']);
  });
});

describe('findPreviousNode - visit order', () => {
  test('root=limit limit > start', () => {
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
    const limit = byId(doc, '1');

    // act
    for (const el of findPreviousNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-3', '1-2', '1-1']);
  });

  test('root=limit limit > start - more descendents', () => {
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
    const limit = byId(doc, '1');

    // act
    for (const el of findPreviousNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-3-1', '1-3', '1-2-1', '1-2', '1-1-1', '1-1']);
  });

  test('root=limit / limit > start - deeper descendents', () => {
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
    const limit = byId(doc, '1');

    // act
    for (const el of findPreviousNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-3-1-2', '1-3-1-1', '1-3-1', '1-3', '1-2-1', '1-2', '1-1-1', '1-1']);
  });

  test('root=limit / limit > start - start at end', () => {
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
    const limit = byId(doc, 'a');

    // act
    for (const el of findPreviousNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-3', '1-2', '1-1', '1']);
  });

  test('root=limit / limit > start - go up to parent and visit its previous sibs', () => {
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
    const limit = byId(doc, 'a');

    // act
    for (const el of findPreviousNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['3', '2', '1']);
  });

  test(`root > limit / limit=start - don't walk limit's peers`, () => {
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
    const limit = byId(doc, '1-4');

    // act
    for (const el of findPreviousNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual([]);
  });

  test(`root > limit / limit > start - don't walk limit's peers, walk start's peers`, () => {
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
    const limit = byId(doc, '1-4');

    // act
    for (const el of findPreviousNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['1-4-1']);
  });

  // TODO - delete?
  test('root=limit / limit > start - regression case 1', () => {
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
    const limit = byId(doc, '1');

    // act
    for (const el of findPreviousNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['4-1', '4', '3', '2']);
  });

  // TODO - delete?
  test('root=limit / limit > start - regression case 2', () => {
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
    const limit = byId(doc, '1');

    // act
    for (const el of findPreviousNode(start, limit)) {
      visited.push((el as HTMLElement).id);
    }

    // assert
    expect(visited).toEqual(['4', '3-1', '3', '2-1', '2']);
  });
});
