import type { InternalEventEmitter } from './InternalEventEmitter.js';
import type { InputChangeEvent, InputChangeListener, OneputControllerProps } from './lib.js';

export class InputController {
	public static create(currentProps: OneputControllerProps, events: InternalEventEmitter) {
		return new InputController(currentProps, events);
	}

	constructor(
		private currentProps: OneputControllerProps,
		private events: InternalEventEmitter,
		private defaultPlaceholder: string = 'Type here...'
	) {
		this.currentProps.placeholder = this.defaultPlaceholder;
		this.currentProps.onInputChange = (evt) => {
			this.runInputChangeListeners(evt);
			// Emit internal event for decoupled communication
			this.events.emit({ type: 'input-change', payload: evt });
		};
	}

	private inputElement: HTMLInputElement | undefined;

	/**
	 * Used by Oneput to tell the controller what the input element is.
	 */
	setInputElement(inputElement: HTMLInputElement | undefined) {
		this.inputElement = inputElement;
	}

	focusInput() {
		this.inputElement?.focus();
	}

	setPlaceholder(msg?: string) {
		this.currentProps.placeholder = msg || this.defaultPlaceholder;
	}

	/**
	 * Allows you to set the value in the input programmatically.  Typing by the user will also update it.
	 */
	setInputValue(val?: string) {
		this.currentProps.inputValue = val || '';
	}

	private inputChangeListeners: InputChangeListener[] = [];
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
}
