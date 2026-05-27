import type { UndoOperation } from './UndoOperation.js';

export type UndoRecord = {
  ops: UndoOperation[];
};

export class UndoRecorder {
  static create(): UndoRecorder {
    return new UndoRecorder();
  }

  static createNull(): UndoRecorder {
    return new UndoRecorder();
  }

  private records: UndoRecord[] = [];
  private redoRecords: UndoRecord[] = [];

  record(result?: UndoRecord): void {
    if (!result) {
      return;
    }
    if (result.ops.length === 0) {
      return;
    }
    this.records.push(result);
    this.redoRecords = [];
  }

  getRecords(): readonly UndoRecord[] {
    return this.records;
  }

  canUndo(): boolean {
    return this.records.length > 0;
  }

  canRedo(): boolean {
    return this.redoRecords.length > 0;
  }

  undo(): UndoRecord | null {
    const result = this.records.pop();
    if (!result) {
      return null;
    }
    this.redoRecords.push(result);
    return result;
  }

  redo(): UndoRecord | null {
    const result = this.redoRecords.pop();
    if (!result) {
      return null;
    }
    this.records.push(result);
    return result;
  }
}
