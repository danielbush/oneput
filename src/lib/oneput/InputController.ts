import type { InternalEventEmitter, RequestInputFocusEvent } from './InternalEventEmitter.js';
import type { InputChangeEvent, InputChangeListener, OneputProps } from './lib.js';

export class InputController {
	public static create(currentProps: OneputProps, events: InternalEventEmitter) {
		return new InputController(currentProps, events);
	}

	constructor(
		private currentProps: OneputProps,
		private events: InternalEventEmitter
	) {
		this.currentProps.onInputChange = (evt) => {
			this.runInputChangeListeners(evt);
			// Emit internal event for decoupled communication
			this.events.emit({ type: 'input-change', payload: evt });
		};
		this.events.on<RequestInputFocusEvent>('request-input-focus', () => {
			this.focusInput();
		});
	}

	triggerInputEvent() {
		this.inputElement?.dispatchEvent(new Event('input', { bubbles: true }));
	}

	private inputElement: HTMLInputElement | undefined;
	private inputChangeListeners: InputChangeListener[] = [];

	/**
	 * Used by Oneput to tell the controller what the input element is.
	 */
	handleInputElementChange(inputElement: HTMLInputElement | undefined) {
		this.inputElement = inputElement;
	}

	focusInput() {
		// Edge case: we set multiline from 1 to n > 1; the input element
		// changes to textarea.  We call focus synchronously after this change.
		// It's very possible the inputElement will still be pointing to the old
		// input element.
		setTimeout(() => {
			this.inputElement?.focus();
		}, 0);
	}

	/**
	 * Allows you to set the value in the input programmatically.  Typing by the user will also update it.
	 */
	setInputValue(val?: string) {
		this.currentProps.inputValue = val || '';
	}

	onInputChange(handler: InputChangeListener): () => void {
		this.inputChangeListeners.push(handler);
		return () => {
			this.inputChangeListeners = this.inputChangeListeners.filter((l) => l !== handler);
		};
	}

	private runInputChangeListeners(evt: InputChangeEvent) {
		this.inputChangeListeners.forEach((listener) => {
			listener(evt);
		});
	}

	disableInputElement() {
		if (!this.inputElement) {
			return;
		}
		this.inputElement.disabled = true;
	}

	enableInputElement() {
		if (!this.inputElement) {
			return;
		}
		this.inputElement.disabled = false;
	}
}
