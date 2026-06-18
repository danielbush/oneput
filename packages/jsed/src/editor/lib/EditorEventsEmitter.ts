import type {
  EditorElementChangeEvent,
  EditorError,
  EditorTextChangeEvent
} from './EditorState.js';

/**
 * The callbacks a subscriber can register with EditorEventsEmitter.
 */
export interface EditorSubscription {
  onError?: (err: EditorError) => void;
  onFocusChange?: (focus: HTMLElement | null) => void;
  onCursorChange?: (target?: HTMLElement) => void;
  onTextChange?: (event: EditorTextChangeEvent) => void;
  onElementChange?: (event: EditorElementChangeEvent) => void;
}

/**
 * Emits editor events to any number of subscribers outside of Editor.
 */
export class EditorEventsEmitter {
  static create() {
    return new EditorEventsEmitter();
  }

  private subscribers: EditorSubscription[] = [];

  /**
   * Register a subscriber and return a function that removes it.
   */
  subscribe(subscription?: EditorSubscription): () => void {
    if (!subscription) {
      return () => {};
    }
    this.subscribers.push(subscription);
    return () => {
      const index = this.subscribers.indexOf(subscription);
      if (index !== -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  emitError(err: EditorError) {
    for (const subscriber of this.subscribers) {
      subscriber.onError?.(err);
    }
  }

  emitFocusChange(focus: HTMLElement | null) {
    for (const subscriber of this.subscribers) {
      subscriber.onFocusChange?.(focus);
    }
  }

  emitCursorChange(target?: HTMLElement) {
    for (const subscriber of this.subscribers) {
      subscriber.onCursorChange?.(target);
    }
  }

  emitTextChange(event: EditorTextChangeEvent) {
    for (const subscriber of this.subscribers) {
      subscriber.onTextChange?.(event);
    }
  }

  emitElementChange(event: EditorElementChangeEvent) {
    for (const subscriber of this.subscribers) {
      subscriber.onElementChange?.(event);
    }
  }

  destroy() {
    this.subscribers = [];
  }
}
