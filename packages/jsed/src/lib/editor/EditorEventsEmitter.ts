import type {
  EditorElementChangeEvent,
  EditorError,
  EditorTextChangeEvent
} from './EditorState.js';

/**
 * Responsible for emitting events to subscribers outside of Editor.
 */
export class EditorEventsEmitter {
  static create() {
    return new EditorEventsEmitter();
  }

  /**
   * A callback that Editor or one of its helpers can call with errors.
   */
  onError?: (err: EditorError) => void;
  onFocusChange?: (focus: HTMLElement | null) => void;
  onCursorChange?: (target?: HTMLElement) => void;
  onTextChange?: (event: EditorTextChangeEvent) => void;
  onElementChange?: (event: EditorElementChangeEvent) => void;

  subscribe(subscriptions?: {
    onError?: (err: EditorError) => void;
    onFocusChange?: (focus: HTMLElement | null) => void;
    onCursorChange?: (target?: HTMLElement) => void;
    onTextChange?: (event: EditorTextChangeEvent) => void;
    onElementChange?: (event: EditorElementChangeEvent) => void;
  }) {
    this.onError = subscriptions?.onError;
    this.onFocusChange = subscriptions?.onFocusChange;
    this.onCursorChange = subscriptions?.onCursorChange;
    this.onTextChange = subscriptions?.onTextChange;
    this.onElementChange = subscriptions?.onElementChange;
  }

  destroy() {
    this.onError = undefined;
    this.onFocusChange = undefined;
    this.onCursorChange = undefined;
    this.onTextChange = undefined;
    this.onElementChange = undefined;
  }
}
