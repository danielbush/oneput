import { describe, expect, test } from 'vitest';
import { createActor, type EventFrom } from 'xstate';
import { createGatedFieldEdit } from './gatedFieldEdit.js';

const gatedFieldEdit = createGatedFieldEdit<'name' | 'role'>();
const completionCases = [
  ['same field', { type: 'EDIT_FIELD', field: 'name' }, 'submit'],
  [
    'focus moves',
    { type: 'ITEM_FOCUSED', menuId: 'profile', id: 'role-row', index: 1, cause: 'keyboard' },
    'focus-changed'
  ],
  ['claim releases', { type: 'INPUT_RELEASED', id: 'name-row', reason: 'released' }, 'released'],
  ['Back', { type: 'BACK' }, 'back']
] satisfies [string, EventFrom<typeof gatedFieldEdit>, string][];

describe('gated field edit', () => {
  test.each(completionCases)('%s commits the buffer', (_, completion, reason) => {
    // arrange
    const actor = createActor(gatedFieldEdit).start();
    actor.send({
      type: 'BEGIN_EDIT',
      field: 'name',
      owner: 'name-row',
      menuId: 'profile',
      value: 'Grace'
    });
    actor.send({ type: 'INPUT_CHANGED', value: 'Ada' });

    // act
    actor.send({ type: 'EDIT_FIELD', field: 'role' });
    actor.send({ type: 'INPUT_RELEASED', id: 'role-row', reason: 'released' });
    const stillEditing = actor.getSnapshot();
    actor.send(completion);

    // assert
    expect(stillEditing.matches('editing')).toBe(true);
    expect(actor.getSnapshot().output).toEqual({
      field: 'name',
      value: 'Ada',
      reason,
      backRequested: completion.type === 'BACK'
    });
  });
});
