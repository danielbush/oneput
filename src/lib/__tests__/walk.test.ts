import { describe, it, expect, test } from 'vitest';
import { makeRoot, div, byId } from '../../../test/util';
import { findNextNode, findPreviousNode } from '../walk';

describe('findNextNode - visit order', () => {
  // Test visit order assuming we visit everything here...
  describe('start = limit', () => {
    it('should visit root and descend and visit pre-order', () => {
      // arrange
      const doc = makeRoot(
        div({ id: '1' }, div({ id: '2' }), div({ id: '3' })),
      );
      const visited = [];
      const start = byId(doc, '1');
      const limit = start;

      // act
      for (const el of findNextNode(start, limit)) {
        visited.push((el as HTMLElement).id);
      }

      // assert
      expect(visited).toEqual(['2', '3']);
    });
  });

  describe('when limit is above start', () => {
    test('simple case', () => {
      // arrange
      const doc = makeRoot(
        div({ id: '1' }, div({ id: '2' }), div({ id: '3' })),
      );
      const start = byId(doc, '2');
      const limit = byId(doc, '1');
      const visited = [];

      // act
      for (const el of findNextNode(start, limit)) {
        visited.push((el as HTMLElement).id);
      }

      // assert
      expect(visited).toEqual(['3']);
    });

    test('extend a bit more', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: '1' },
          div({ id: '2' }, div({ id: '2-1' })),
          div({ id: '3' }, div({ id: '3-1' })),
        ),
      );
      const start = byId(doc, '2');
      const limit = byId(doc, '1');
      const visited = [];

      // act
      for (const el of findNextNode(start, limit)) {
        visited.push((el as HTMLElement).id);
      }

      // assert
      expect(visited).toEqual(['2-1', '3', '3-1']);
    });

    test('start at 2-1', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: '1' },
          div({ id: '2' }, div({ id: '2-1' })),
          div({ id: '3' }, div({ id: '3-1' })),
        ),
      );
      const start = byId(doc, '2-1');
      const limit = byId(doc, '1');
      const visited = [];

      // act
      for (const el of findNextNode(start, limit)) {
        visited.push((el as HTMLElement).id);
      }

      // assert
      expect(visited).toEqual(['3', '3-1']);
    });
  });
});

describe('findPreviousNode - visit order', () => {
  // Test visit order assuming we visit everything here...
  test('simple case 2', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' },
        div({ id: '2' }),
        div({ id: '3' }),
        div({ id: '4' }, div({ id: '4-1' }), div({ id: '4-2' })),
      ),
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
});
