import type { UndoableOperationResult } from './UndoRecorder.js';

type UndoRecordingCursor = {
  _recordUndoResult(result: UndoableOperationResult): void;
};

export function recordUndo<
  This extends UndoRecordingCursor,
  Args extends unknown[],
  Result extends UndoableOperationResult
>(
  method: (this: This, ...args: Args) => Result,
  _context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Result>
) {
  return function (this: This, ...args: Args): Result {
    const result = method.apply(this, args);
    this._recordUndoResult(result);
    return result;
  };
}
