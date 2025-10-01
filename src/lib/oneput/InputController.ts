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

	private inputElement: HTMLInputElement | undefined;
	private inputChangeListeners: InputChangeListener[] = [];

	/**
	 * Used by Oneput to tell the controller what the input element is.
	 */
	setInputElement(inputElement: HTMLInputElement | undefined) {
		this.inputElement = inputElement;
	}

	focusInput() {
		this.inputElement?.focus();
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
