import { describe, expect, test } from 'vitest';
import { EditorEventsEmitter } from '../EditorEventsEmitter.js';

describe('EditorEventsEmitter', () => {
  describe('onDocumentChange', () => {
    test('fires on a text change', () => {
      // arrange
      const emitter = EditorEventsEmitter.create();
      let changes = 0;
      emitter.subscribe({
        onDocumentChange: () => {
          changes += 1;
        }
      });

      // act
      emitter.emitTextChange({ type: 'token-text-change', token: document.createElement('span') });

      // assert
      expect(changes).toBe(1);
    });

    test('fires on an element change', () => {
      // arrange
      const emitter = EditorEventsEmitter.create();
      let changes = 0;
      emitter.subscribe({
        onDocumentChange: () => {
          changes += 1;
        }
      });

      // act
      emitter.emitElementChange({
        type: 'focusable-inserted',
        element: document.createElement('p')
      });

      // assert
      expect(changes).toBe(1);
    });

    test('does not fire on cursor, focus, or error', () => {
      // arrange
      const emitter = EditorEventsEmitter.create();
      let changes = 0;
      emitter.subscribe({
        onDocumentChange: () => {
          changes += 1;
        }
      });

      // act
      emitter.emitCursorChange(document.createElement('span'));
      emitter.emitFocusChange(document.createElement('p'));
      emitter.emitError({ type: 'no-token-under-focus' });

      // assert
      expect(changes).toBe(0);
    });

    test('stops firing after unsubscribe', () => {
      // arrange
      const emitter = EditorEventsEmitter.create();
      let changes = 0;
      const unsubscribe = emitter.subscribe({
        onDocumentChange: () => {
          changes += 1;
        }
      });
      emitter.emitTextChange({ type: 'token-text-change', token: document.createElement('span') });
      expect(changes).toBe(1);

      // act
      unsubscribe();
      emitter.emitTextChange({ type: 'token-text-change', token: document.createElement('span') });

      // assert
      expect(changes).toBe(1);
    });

    test('a second subscriber also fires', () => {
      // arrange
      const emitter = EditorEventsEmitter.create();
      let menuChanges = 0;
      let saveChanges = 0;
      emitter.subscribe({ onTextChange: () => (menuChanges += 1) });
      emitter.subscribe({
        onDocumentChange: () => {
          saveChanges += 1;
        }
      });

      // act
      emitter.emitTextChange({ type: 'token-text-change', token: document.createElement('span') });

      // assert
      expect(menuChanges).toBe(1);
      expect(saveChanges).toBe(1);
    });

    test('fires from a history-applied element change', () => {
      // arrange
      const emitter = EditorEventsEmitter.create();
      let documentChanges = 0;
      const elementChanges: Array<{ type: string; direction?: string }> = [];
      emitter.subscribe({
        onDocumentChange: () => {
          documentChanges += 1;
        },
        onElementChange: (event) => {
          elementChanges.push(event);
        }
      });

      // act
      emitter.emitElementChange({ type: 'history-applied', direction: 'undo' });

      // assert
      expect(documentChanges).toBe(1);
      expect(elementChanges).toEqual([{ type: 'history-applied', direction: 'undo' }]);
    });
  });
});
