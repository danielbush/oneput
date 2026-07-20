import type { EditorState } from '../editor/index.js';
import { CompositeUndoRecord } from './CompositeUndoRecord.js';

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
  private groups: UndoRecord[][] = [];

  record(result?: UndoRecord): void {
    if (!result) {
      return;
    }
    const group = this.groups[this.groups.length - 1];
    if (group) {
      this.addRecord(group, result);
      return;
    }
    this.addRecord(this.records, result);
    this.redoRecords = [];
  }

  /**
   * Start capturing records for one user-level change.
   */
  beginGroup(): void {
    this.groups.push([]);
  }

  /**
   * Commit the active group into its parent or the undo history.
   *
   * Nested groups flatten into the outer group. An outer group always commits
   * as a composite, even with one child, so records cannot merge across its
   * transaction boundary.
   */
  commitGroup(): CompositeUndoRecord | undefined {
    const records = this.popGroup('commit');
    if (records.length === 0) {
      return;
    }

    const composite = new CompositeUndoRecord(records);
    const parent = this.groups[this.groups.length - 1];
    if (parent) {
      parent.push(...records);
      return composite;
    }

    this.records.push(composite);
    this.redoRecords = [];
    return composite;
  }

  /**
   * Cancel the active group and return its records for rollback.
   */
  cancelGroup(): readonly UndoRecord[] {
    return this.popGroup('cancel');
  }

  /**
   * Add a record while preserving the existing consecutive-merge behavior.
   */
  private addRecord(records: UndoRecord[], result: UndoRecord): void {
    const last = records[records.length - 1];
    const merged = last?.merge?.(result);
    if (merged) {
      records[records.length - 1] = merged;
      return;
    }
    records.push(result);
  }

  /**
   * Remove the active capture group or reject an unmatched lifecycle call.
   */
  private popGroup(action: 'commit' | 'cancel'): UndoRecord[] {
    const records = this.groups.pop();
    if (!records) {
      throw new Error(`Cannot ${action} an undo group when no group is active`);
    }
    return records;
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
