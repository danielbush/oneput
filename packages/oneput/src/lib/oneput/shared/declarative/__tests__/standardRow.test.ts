import { describe, expect, test } from 'vitest';
import { infoRow, standardRow } from '../standardRow.js';

describe('standardRow', () => {
  test('text, detail, icon and action', () => {
    // arrange
    const row = { id: 'result', params: { text: 'Result', detail: 'A match', icon: 'Search' } };

    // act
    const item = standardRow.build(row, () => {});

    // assert
    expect(item).toMatchObject({
      id: 'result',
      tag: 'button',
      attr: { type: 'button' },
      classes: expect.arrayContaining(['oneput__std-menu-item']),
      children: [
        {
          id: 'result-top',
          children: expect.arrayContaining([
            expect.objectContaining({
              id: 'result-left',
              children: [expect.objectContaining({ icon: 'Search' })]
            }),
            expect.objectContaining({
              id: 'result-center',
              children: [expect.objectContaining({ id: 'result-title', textContent: 'Result' })]
            })
          ])
        },
        { id: 'result-divider', tag: 'hr' },
        {
          id: 'result-bottom',
          children: expect.arrayContaining([
            expect.objectContaining({ id: 'result-bottom-center', textContent: 'A match' })
          ])
        }
      ]
    });
  });

  test('no action', () => {
    // arrange
    const row = { id: 'result', params: { text: 'Result' } };

    // act
    const item = standardRow.build(row);

    // assert
    expect(item.action).toBeUndefined();
  });
});

describe('infoRow', () => {
  test.each([
    { icon: undefined, expectedIcon: 'Info' },
    { icon: 'Search', expectedIcon: 'Search' }
  ])('$expectedIcon icon', ({ icon, expectedIcon }) => {
    // arrange
    const row = { id: 'status', params: { text: 'Searching', icon } };

    // act
    const item = infoRow.build(row, () => {});

    // assert
    expect(item).toMatchObject({
      id: 'status',
      ignored: true,
      style: { color: '#777' },
      children: [{ icon: expectedIcon }, { textContent: 'Searching' }, { type: 'fchild' }]
    });
    expect(item.action).toBeUndefined();
  });
});
