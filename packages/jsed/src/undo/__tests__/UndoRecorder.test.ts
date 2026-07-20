import { Controller } from '@oneput/oneput';
import { describe, expect, test } from 'vitest';
import { EditorState } from '../../editor/lib/EditorState.js';
import { makeRoot, p } from '../../test/util.js';
import { CompositeUndoRecord } from '../CompositeUndoRecord.js';
import { UndoRecorder, type UndoRecord } from '../UndoRecorder.js';

/**
 * Concrete state change used to exercise undo history behavior.
 */
class ValueRecord implements UndoRecord {
  constructor(
    public readonly before: string,
    public readonly after: string,
    private readonly mergeable = false
  ) {}

  undo(state: EditorState): void {
    state.document.root.dataset.value = this.before;
  }

  redo(state: EditorState): void {
    state.document.root.dataset.value = this.after;
  }

  merge(next: UndoRecord): UndoRecord | void {
    if (!this.mergeable || !(next instanceof ValueRecord) || !next.mergeable) {
      return;
    }
    return new ValueRecord(this.before, next.after, true);
  }
}

/**
 * Create a null editor state whose document records example values.
 */
function createState(value: string): EditorState {
  const document = makeRoot(p('content'));
  document.root.dataset.value = value;
  return EditorState.createNull({
    document,
    userInput: Controller.createNull().input
  });
}

describe('CompositeUndoRecord', () => {
  test('undo reverses child order and redo restores forward order', () => {
    // arrange
    const state = createState('two');
    const composite = new CompositeUndoRecord([
      new ValueRecord('zero', 'one'),
      new ValueRecord('one', 'two')
    ]);

    // act
    composite.undo(state);

    // assert
    expect(state.document.root.dataset.value).toBe('zero');

    // act
    composite.redo(state);

    // assert
    expect(state.document.root.dataset.value).toBe('two');
  });
});

describe('UndoRecorder groups', () => {
  test('commits several records as one history entry', () => {
    // arrange
    const recorder = UndoRecorder.createNull();
    const first = new ValueRecord('zero', 'one');
    const second = new ValueRecord('one', 'two');

    // act
    recorder.beginGroup();
    recorder.record(first);
    recorder.record(second);
    const composite = recorder.commitGroup();

    // assert
    expect(composite?.records).toEqual([first, second]);
    expect(recorder.getRecords()).toEqual([composite]);
  });

  test('flattens nested groups into the outer composite', () => {
    // arrange
    const recorder = UndoRecorder.createNull();
    const first = new ValueRecord('zero', 'one');
    const second = new ValueRecord('one', 'two');
    const third = new ValueRecord('two', 'three');

    // act
    recorder.beginGroup();
    recorder.record(first);
    recorder.beginGroup();
    recorder.record(second);
    recorder.commitGroup();
    recorder.record(third);
    const composite = recorder.commitGroup();

    // assert
    expect(composite?.records).toEqual([first, second, third]);
    expect(recorder.getRecords()).toEqual([composite]);
  });

  test('cancels without changing history or redo', () => {
    // arrange
    const recorder = UndoRecorder.createNull();
    const previous = new ValueRecord('zero', 'one');
    const cancelled = new ValueRecord('one', 'two');
    recorder.record(previous);
    recorder.popUndo();

    // act
    recorder.beginGroup();
    recorder.record(cancelled);
    const records = recorder.cancelGroup();

    // assert
    expect(records).toEqual([cancelled]);
    expect(recorder.getRecords()).toEqual([]);
    expect(recorder.canRedo()).toBe(true);
  });

  test('clears redo only when the outer group commits a change', () => {
    // arrange
    const recorder = UndoRecorder.createNull();
    recorder.record(new ValueRecord('zero', 'one'));
    recorder.popUndo();

    // act & assert
    recorder.beginGroup();
    recorder.commitGroup();
    expect(recorder.canRedo()).toBe(true);

    recorder.beginGroup();
    recorder.record(new ValueRecord('one', 'two'));
    recorder.commitGroup();
    expect(recorder.canRedo()).toBe(false);
  });

  test('merges within a group but not across its boundary', () => {
    // arrange
    const recorder = UndoRecorder.createNull();
    const previous = new ValueRecord('before', 'zero', true);
    recorder.record(previous);

    // act
    recorder.beginGroup();
    recorder.record(new ValueRecord('zero', 'one', true));
    recorder.record(new ValueRecord('one', 'two', true));
    const composite = recorder.commitGroup();

    // assert
    expect(recorder.getRecords()).toEqual([previous, composite]);
    expect(composite?.records).toEqual([new ValueRecord('zero', 'two', true)]);
  });

  test('rejects unmatched commit and cancel calls', () => {
    // arrange
    const recorder = UndoRecorder.createNull();

    // act & assert
    expect(() => recorder.commitGroup()).toThrow(
      'Cannot commit an undo group when no group is active'
    );
    expect(() => recorder.cancelGroup()).toThrow(
      'Cannot cancel an undo group when no group is active'
    );
  });
});
