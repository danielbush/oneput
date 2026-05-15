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

  record(result: UndoableOperationResult): void {
    if (!result.undoable) {
      return;
    }
    this.records.push(result);
  }

  getRecords(): readonly UndoableOperationResult[] {
    return this.records;
  }
}
