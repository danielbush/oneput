import { describe, expect, test } from 'vitest';
import { checkIconGeometry } from './geometry.js';

describe('icon geometry', () => {
  test.each([
    ['bad tag', [['script', {}]]],
    ['handler', [['path', { d: 'M0 0', onload: 'bad()' }]]],
    ['link', [['path', { href: 'https://example.test' }]]],
    ['namespaced link', [['path', { 'xlink:href': '#x' }]]],
    ['fill URL', [['path', { fill: 'url(#x)' }]]],
    ['stroke URL', [['path', { stroke: 'URL (#x)' }]]],
    ['escaped paint', [['path', { fill: 'u\\72l(#x)' }]]],
    ['foreignObject', [['foreignObject', {}]]],
    ['SVG text', '<svg><path d="M0 0"/></svg>'],
    ['factory', () => document.createElement('div')],
    ['too many nodes', Array.from({ length: 33 }, () => ['path', {}])],
    [
      'too many attributes',
      [
        [
          'rect',
          {
            cx: 1,
            cy: 1,
            d: 'M0 0',
            fill: 'none',
            stroke: 'none',
            height: 1,
            points: '0 0',
            r: 1,
            rx: 1,
            ry: 1,
            width: 1,
            x: 1,
            x1: 1,
            x2: 1,
            y: 1,
            y1: 1,
            y2: 1
          }
        ]
      ]
    ],
    [
      'unknown root field',
      { viewBox: [0, 0, 24, 24], nodes: [['path', {}]], extra: 'x'.repeat(16385) }
    ],
    ['long value', [['path', { d: 'M' + '0 '.repeat(2048) }]]],
    ['total size', Array.from({ length: 5 }, () => ['path', { d: 'M' + '0 '.repeat(2000) }])],
    ['infinite number', [['circle', { r: Infinity }]]],
    ['NaN', [['circle', { r: NaN }]]],
    ['infinite string', [['circle', { r: 'Infinity' }]]],
    ['NaN string', [['circle', { r: 'NaN' }]]],
    ['overflow', [['path', { d: 'M1e999 0' }]]],
    ['bad viewBox type', { viewBox: '0 0 24 24', nodes: [['path', {}]] }],
    ['bad viewBox count', { viewBox: [0, 0, 24], nodes: [['path', {}]] }],
    ['zero viewBox', { viewBox: [0, 0, 0, 24], nodes: [['path', {}]] }],
    ['negative viewBox', { viewBox: [0, 0, 24, -1], nodes: [['path', {}]] }],
    ['infinite viewBox', { viewBox: [0, 0, Infinity, 24], nodes: [['path', {}]] }],
    ['empty nodes', []],
    ['sparse viewBox', { viewBox: Array(4), nodes: [['path', {}]] }],
    ['missing data', null],
    ['bad attribute type', [['circle', { r: true }]]],
    ['style', [['path', { style: 'fill:red' }]]]
  ])('%s', (_, input) => {
    // arrange
    const candidate: unknown = input;

    // act
    const result = checkIconGeometry(candidate);

    // assert
    expect(result.isErr()).toBe(true);
  });

  test('seven geometry tags and custom view box', () => {
    // arrange
    const input = {
      viewBox: [-1, -2, 48, 48],
      nodes: [
        ['circle', { cx: 1, cy: 2, r: 3 }],
        ['ellipse', { rx: 3, ry: 2 }],
        ['line', { x1: 0, y1: 1, x2: 2, y2: 3 }],
        ['path', { d: 'M.5 -1e-2a2 2 0 0 1 4 4z', fill: 'currentColor' }],
        ['polygon', { points: '0,0 1,1 2,0' }],
        ['polyline', { points: '0 0 1 1', stroke: '#123abc' }],
        ['rect', { x: 0, y: 0, width: 24, height: 24, rx: undefined }]
      ]
    };

    // act
    const result = checkIconGeometry(input);

    // assert
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().viewBox).toEqual([-1, -2, 48, 48]);
    expect(result._unsafeUnwrap().nodes).toHaveLength(7);
    expect(result._unsafeUnwrap().nodes[6][1]).not.toHaveProperty('rx');
  });

  test('copies and freezes input', () => {
    // arrange
    const attrs = { d: 'M0 0' };

    // act
    const result = checkIconGeometry([['path', attrs]])._unsafeUnwrap();
    attrs.d = 'changed';

    // assert
    expect(result.nodes[0][1].d).toBe('M0 0');
    expect(Object.isFrozen(result.nodes[0][1])).toBe(true);
    expect(Object.isFrozen(result.viewBox)).toBe(true);
  });
});
