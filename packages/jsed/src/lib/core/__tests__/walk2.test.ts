import { describe, expect, test } from 'vitest';
import { makeRoot, div, byId } from '../../../test/util.js';
import { findNextNode, findPreviousNode } from '../walk2.js';

const id = (n: Node) => (n as HTMLElement).id;

describe('findNextNode', () => {
  test('pre order', () => {
    // arrange
    const doc = makeRoot(
      div({ id: '1' }, div({ id: '1-1' }, div({ id: '1-1-1' })), div({ id: '1-2' }))
    );
    const start = byId(doc, '1');
    const out: string[] = [];

    // act
    findNextNode(start, { ceiling: start, pre: (n) => void out.push(id(n)) });

    // assert
    expect(out).toEqual(['1-1', '1-1-1', '1-2']);
  });

  test('post order', () => {
    // arrange
    const doc = makeRoot(
      div({ id: '1' }, div({ id: '1-1' }, div({ id: '1-1-1' })), div({ id: '1-2' }))
    );
    const start = byId(doc, '1');
    const out: string[] = [];

    // act
    findNextNode(start, { ceiling: start, post: (n) => void out.push(id(n)) });

    // assert
    expect(out).toEqual(['1-1-1', '1-1', '1-2']);
  });

  test('pre/post interleave', () => {
    // arrange
    const doc = makeRoot(div({ id: '1' }, div({ id: 'a' }), div({ id: 'b' })));
    const start = byId(doc, '1');
    const out: string[] = [];

    // act
    findNextNode(start, {
      ceiling: start,
      pre: (n) => void out.push(id(n)),
      post: (n) => void out.push('/' + id(n))
    });

    // assert
    expect(out).toEqual(['a', '/a', 'b', '/b']);
  });

  test('shouldDescend=false visits node, skips children', () => {
    // arrange
    const doc = makeRoot(
      div({ id: '1' }, div({ id: 'skip' }, div({ id: 'c1' }), div({ id: 'c2' })), div({ id: 'x' }))
    );
    const start = byId(doc, '1');
    const out: string[] = [];

    // act
    findNextNode(start, {
      ceiling: start,
      shouldDescend: (n) => id(n) !== 'skip',
      pre: (n) => void out.push(id(n))
    });

    // assert
    expect(out).toEqual(['skip', 'x']);
  });

  test('pre returning a node stops', () => {
    // arrange
    const doc = makeRoot(div({ id: '1' }, div({ id: 'a' }), div({ id: 'stop' }), div({ id: 'c' })));
    const start = byId(doc, '1');
    const out: string[] = [];

    // act
    const found = findNextNode(start, {
      ceiling: start,
      pre: (n) => (id(n) === 'stop' ? n : void out.push(id(n)))
    });

    // assert
    expect(out).toEqual(['a']);
    expect(id(found!)).toBe('stop');
  });

  test('climb: following siblings + ancestor post', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' },
        div({ id: 'a' }, div({ id: 'a1' }), div({ id: 'a2' })),
        div({ id: 'b' }, div({ id: 'b1' }))
      )
    );
    const start = byId(doc, 'a1');
    const out: string[] = [];

    // act
    findNextNode(start, {
      ceiling: byId(doc, '1'),
      pre: (n) => void out.push(id(n)),
      post: (n) => void out.push('/' + id(n))
    });

    // assert
    expect(out).toEqual(['a2', '/a2', '/a', 'b', 'b1', '/b1', '/b']);
  });

  test('ceiling bounds the walk', () => {
    // arrange
    const doc = makeRoot(
      div({ id: 'C' }, div({ id: '1' }, div({ id: 'a' }), div({ id: 'b' })), div({ id: '2' }))
    );
    const start = byId(doc, 'a');
    const out: string[] = [];

    // act
    findNextNode(start, { ceiling: byId(doc, '1'), pre: (n) => void out.push(id(n)) });

    // assert
    expect(out).toEqual(['b']);
  });

  test('visitStart includes start', () => {
    // arrange
    const doc = makeRoot(div({ id: '1' }, div({ id: 'a' }), div({ id: 'b' })));
    const start = byId(doc, '1');
    const out: string[] = [];

    // act
    findNextNode(start, { ceiling: start, visitStart: true, pre: (n) => void out.push(id(n)) });

    // assert
    expect(out).toEqual(['1', 'a', 'b']);
  });

  test('visitCeiling fires post on ceiling', () => {
    // arrange
    const doc = makeRoot(div({ id: 'C' }, div({ id: '1' }, div({ id: 'a' })), div({ id: '2' })));
    const start = byId(doc, 'a');
    const out: string[] = [];

    // act
    findNextNode(start, {
      ceiling: byId(doc, 'C'),
      visitCeiling: true,
      post: (n) => void out.push(id(n))
    });

    // assert
    expect(out).toEqual(['1', '2', 'C']);
  });
});

describe('findPreviousNode', () => {
  test('pre order', () => {
    // arrange
    const doc = makeRoot(
      div({ id: '1' }, div({ id: 'a' }, div({ id: 'a1' }), div({ id: 'a2' })), div({ id: 'b' }))
    );
    const start = byId(doc, 'b');
    const out: string[] = [];

    // act
    findPreviousNode(start, { ceiling: byId(doc, '1'), pre: (n) => void out.push(id(n)) });

    // assert
    expect(out).toEqual(['a', 'a2', 'a1']);
  });

  test('post order', () => {
    // arrange
    const doc = makeRoot(
      div({ id: '1' }, div({ id: 'a' }, div({ id: 'a1' }), div({ id: 'a2' })), div({ id: 'b' }))
    );
    const start = byId(doc, 'b');
    const out: string[] = [];

    // act
    findPreviousNode(start, { ceiling: byId(doc, '1'), post: (n) => void out.push(id(n)) });

    // assert
    expect(out).toEqual(['a2', 'a1', 'a']);
  });

  test('climb: ancestor via pre', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' },
        div({ id: 'a' }, div({ id: 'a1' }), div({ id: 'a2' })),
        div({ id: 'b' }, div({ id: 'b1' }))
      )
    );
    const start = byId(doc, 'b1');
    const out: string[] = [];

    // act
    findPreviousNode(start, { ceiling: byId(doc, '1'), pre: (n) => void out.push(id(n)) });

    // assert
    expect(out).toEqual(['b', 'a', 'a2', 'a1']);
  });

  test('climb: ancestor absent from post', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: '1' },
        div({ id: 'a' }, div({ id: 'a1' }), div({ id: 'a2' })),
        div({ id: 'b' }, div({ id: 'b1' }))
      )
    );
    const start = byId(doc, 'b1');
    const out: string[] = [];

    // act
    findPreviousNode(start, { ceiling: byId(doc, '1'), post: (n) => void out.push(id(n)) });

    // assert — 'b' is a climbed ancestor; its post lands after start, so it never fires
    expect(out).toEqual(['a2', 'a1', 'a']);
  });

  test('shouldDescend=false visits node, skips children', () => {
    // arrange
    const doc = makeRoot(
      div({ id: '1' }, div({ id: 'skip' }, div({ id: 'c1' }), div({ id: 'c2' })), div({ id: 'x' }))
    );
    const start = byId(doc, 'x');
    const out: string[] = [];

    // act
    findPreviousNode(start, {
      ceiling: byId(doc, '1'),
      shouldDescend: (n) => id(n) !== 'skip',
      pre: (n) => void out.push(id(n))
    });

    // assert
    expect(out).toEqual(['skip']);
  });

  test('pre returning a node stops', () => {
    // arrange
    const doc = makeRoot(
      div({ id: '1' }, div({ id: 'a' }), div({ id: 'stop' }), div({ id: 'b' }), div({ id: 'c' }))
    );
    const start = byId(doc, 'c');
    const out: string[] = [];

    // act
    const found = findPreviousNode(start, {
      ceiling: byId(doc, '1'),
      pre: (n) => (id(n) === 'stop' ? n : void out.push(id(n)))
    });

    // assert
    expect(out).toEqual(['b']);
    expect(id(found!)).toBe('stop');
  });

  test('ceiling bounds the walk', () => {
    // arrange
    const doc = makeRoot(
      div({ id: 'C' }, div({ id: '1' }, div({ id: 'a' }), div({ id: 'b' })), div({ id: '2' }))
    );
    const start = byId(doc, 'b');
    const out: string[] = [];

    // act
    findPreviousNode(start, { ceiling: byId(doc, '1'), pre: (n) => void out.push(id(n)) });

    // assert
    expect(out).toEqual(['a']);
  });

  test('visitCeiling fires pre on ceiling', () => {
    // arrange
    const doc = makeRoot(div({ id: 'C' }, div({ id: 'x' }), div({ id: '1' }, div({ id: 'a' }))));
    const start = byId(doc, 'a');
    const out: string[] = [];

    // act
    findPreviousNode(start, {
      ceiling: byId(doc, 'C'),
      visitCeiling: true,
      pre: (n) => void out.push(id(n))
    });

    // assert
    expect(out).toEqual(['1', 'x', 'C']);
  });
});
