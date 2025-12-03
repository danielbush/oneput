import { type InputChangeEvent, type InputChangeListener, Placeholder } from './lib/lib.js';
import type { Controller } from './controller.js';

export class InputController {
	public static create(ctl: Controller) {
		return new InputController(ctl);
	}

	constructor(private ctl: Controller) {
		this.ctl.currentProps.onInputChange = (evt) => {
			this.runInputChangeListeners(evt);
			// Emit internal event for decoupled communication
			this.ctl.events.emit({ type: 'input-change', payload: evt });
		};
	}

	triggerInputEvent() {
		// If you call setInputValue(...) and then trigger, the value in
		// setInputValue may not get applied.
		setTimeout(() => {
			this.inputElement?.dispatchEvent(new Event('input', { bubbles: true }));
		}, 0);
	}

	private defaultPlaceholder?: string | Placeholder;
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
		this.ctl.currentProps.inputValue = val || '';
	}

	setDefaultPlaceholder(msg?: string | Placeholder, apply = false) {
		this.defaultPlaceholder = msg;
		if (apply) {
			this.resetPlaceholder();
		}
	}

	getDefaultPlaceholder() {
		return this.defaultPlaceholder || '';
	}

	/**
	 * Get the current placeholder.
	 *
	 * If default or current placeholder is a Placeholder instance, it will
	 * return the last value set by this instance.
	 */
	getPlaceholder() {
		return this.ctl.currentProps.placeholder || '';
	}

	private placeholderObject?: Placeholder;
	private _setPlaceholder = (msg?: string) => {
		this.ctl.currentProps.placeholder = msg || '';
	};

	/**
	 * - setPlaceholder('') => empty placeholder
	 * - setPlaceholder()   => default placeholder
	 */
	setPlaceholder(msg?: string | Placeholder) {
		if (this.placeholderObject) {
			this.placeholderObject.disable();
			this.placeholderObject = undefined;
		}
		if (msg instanceof Placeholder) {
			this.placeholderObject = msg;
			this.placeholderObject.enable(this._setPlaceholder);
			return;
		}
		if (msg || msg === '') {
			this._setPlaceholder(msg);
			return;
		}
		if (this.defaultPlaceholder instanceof Placeholder) {
			this.placeholderObject = this.defaultPlaceholder;
			this.placeholderObject.enable(this._setPlaceholder);
			return;
		}
		this._setPlaceholder(this.defaultPlaceholder);
	}

	resetPlaceholder() {
		this.setPlaceholder(this.getDefaultPlaceholder());
	}

	getInputValue() {
		return this.ctl.currentProps.inputValue || '';
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

	enableInputElement(on: boolean = true) {
		if (!this.inputElement) {
			return;
		}
		this.inputElement.disabled = !on;
	}

	private submitHandler?: (input: string) => void;
	private submitOnce = false;

	setSubmitHandler(fn: (input: string) => void) {
		this.submitHandler = fn;
		this.submitOnce = false;
	}

	setSubmitHandlerOnce(fn: (input: string) => void) {
		this.submitHandler = fn;
		this.submitOnce = true;
	}

	runSubmitHandler() {
		this.submitHandler?.(this.getInputValue());
		if (this.submitOnce) {
			this.submitHandler = undefined;
			this.submitOnce = false;
		}
	}

	resetSubmitHandler() {
		this.submitHandler = undefined;
	}
}
