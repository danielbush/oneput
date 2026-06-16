import type { EditorState } from '../editor/index.js';

export interface UndoRecord {
  undo(state: EditorState): void;
  redo(state: EditorState): void;
  merge?(next: UndoRecord): UndoRecord | void;
}

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
    const last = this.getLastUndo();
    const merged = last?.merge?.(result);
    if (merged) {
      this.updateLastUndo(merged);
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

  getLastUndo(): UndoRecord | void {
    return this.records[this.records.length - 1];
  }

  updateLastUndo(rec: UndoRecord) {
    if (this.records.length === 0) {
      this.records.push(rec);
    } else {
      this.records[this.records.length - 1] = rec;
    }
  }

  popUndo(): UndoRecord | null {
    const result = this.records.pop();
    if (!result) {
      return null;
    }
    this.redoRecords.push(result);
    return result;
  }

  popRedo(): UndoRecord | null {
    const result = this.redoRecords.pop();
    if (!result) {
      return null;
    }
    this.records.push(result);
    return result;
  }
}
