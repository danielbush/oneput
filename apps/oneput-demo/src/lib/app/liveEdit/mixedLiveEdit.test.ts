import { describe, expect, test } from 'vitest';
import { decideMixedLiveEdit } from './mixedLiveEdit.js';

describe('decideMixedLiveEdit', () => {
  test('filtering / activate field', () => {
    // arrange
    const state = { type: 'filtering' } as const;

    // act
    const intent = decideMixedLiveEdit(state, { type: 'activate-field', fieldId: 'name' });

    // assert
    expect(intent).toEqual({ type: 'start-editing', fieldId: 'name' });
  });

  test('editing / activate current field', () => {
    // arrange
    const state = { type: 'editing', fieldId: 'name' } as const;

    // act
    const intent = decideMixedLiveEdit(state, { type: 'activate-field', fieldId: 'name' });

    // assert
    expect(intent).toEqual({ type: 'stop-editing' });
  });

  test('editing / move focus', () => {
    // arrange
    const state = { type: 'editing', fieldId: 'name' } as const;

    // act
    const intent = decideMixedLiveEdit(state, { type: 'focus-field', fieldId: 'role' });

    // assert
    expect(intent).toEqual({ type: 'stop-editing' });
  });

  test('back', () => {
    // act & assert
    expect(decideMixedLiveEdit({ type: 'filtering' }, { type: 'back' })).toEqual({
      type: 'exit'
    });
    expect(decideMixedLiveEdit({ type: 'editing', fieldId: 'name' }, { type: 'back' })).toEqual({
      type: 'stop-editing'
    });
  });
});
