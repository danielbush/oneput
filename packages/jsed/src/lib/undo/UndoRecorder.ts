export type UndoableOperationResult = {
  type: string;
  undoable: boolean;
};

export class UndoRecorder {
  static create(): UndoRecorder {
    return new UndoRecorder();
  }

  static createNull(): UndoRecorder {
    return new UndoRecorder();
  }

  private records: UndoableOperationResult[] = [];
  private redoRecords: UndoableOperationResult[] = [];

  record(result: UndoableOperationResult): void {
    if (!result.undoable) {
      return;
    }
    this.records.push(result);
    this.redoRecords = [];
  }

  getRecords(): readonly UndoableOperationResult[] {
    return this.records;
  }

  canUndo(): boolean {
    return this.records.length > 0;
  }

  canRedo(): boolean {
    return this.redoRecords.length > 0;
  }

  undo(): UndoableOperationResult | null {
    const result = this.records.pop();
    if (!result) {
      return null;
    }
    this.redoRecords.push(result);
    return result;
  }

  redo(): UndoableOperationResult | null {
    const result = this.redoRecords.pop();
    if (!result) {
      return null;
    }
    this.records.push(result);
    return result;
  }
}
