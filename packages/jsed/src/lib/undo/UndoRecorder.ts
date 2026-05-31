import type { EditorState } from '../editor/EditorState.js';

export interface UndoRecord {
  undo(state: EditorState): void;
  redo(state: EditorState): void;
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
