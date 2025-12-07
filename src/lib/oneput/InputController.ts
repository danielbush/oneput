import { DynamicPlaceholder } from './lib/lib.js';
import type { Controller } from './controller.js';

export class InputController {
	public static create(ctl: Controller) {
		return new InputController(ctl);
	}

	constructor(private ctl: Controller) {
		this.ctl.currentProps.onInputChange = (evt) => {
			// Emit internal event for decoupled communication
			this.ctl.events.emit({
				type: 'input-change',
				payload: { evt: evt as InputEvent, value: (evt.target as HTMLInputElement)?.value ?? '' }
			});
		};
	}

	triggerInputEvent() {
		// If you call setInputValue(...) and then trigger, the value in
		// setInputValue may not get applied.
		setTimeout(() => {
			this.inputElement?.dispatchEvent(new Event('input', { bubbles: true }));
		}, 0);
	}

	private defaultPlaceholder?: string | DynamicPlaceholder;
	private inputElement: HTMLInputElement | undefined;

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

	setDefaultPlaceholder(msg?: string | DynamicPlaceholder, apply = false) {
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

	private placeholderObject?: DynamicPlaceholder;
	private _setPlaceholder = (msg?: string) => {
		this.ctl.currentProps.placeholder = msg || '';
	};

	/**
	 * - setPlaceholder('') => empty placeholder
	 * - setPlaceholder()   => default placeholder
	 */
	setPlaceholder(msg?: string | DynamicPlaceholder) {
		if (this.placeholderObject) {
			this.placeholderObject.disable();
			this.placeholderObject = undefined;
		}
		if (msg instanceof DynamicPlaceholder) {
			this.placeholderObject = msg;
			this.placeholderObject.enable(this._setPlaceholder);
			return;
		}
		if (msg || msg === '') {
			this._setPlaceholder(msg);
			return;
		}
		if (this.defaultPlaceholder instanceof DynamicPlaceholder) {
			this.placeholderObject = this.defaultPlaceholder;
			this.placeholderObject.enable(this._setPlaceholder);
			return;
		}
		this._setPlaceholder(this.defaultPlaceholder);
	}

	refreshPlaceholder() {
		if (this.placeholderObject) {
			this.placeholderObject.enable(this._setPlaceholder);
		}
	}

	resetPlaceholder() {
		this.setPlaceholder(this.getDefaultPlaceholder());
	}

	getInputValue() {
		return this.ctl.currentProps.inputValue || '';
	}

	enableInputElement(on: boolean = true) {
		if (!this.inputElement) {
			return;
		}
		this.inputElement.disabled = !on;
	}

	private submitHandler?: (input: string) => void;
	private submitOnce?: typeof this.submitHandler;

	setSubmitHandler(fn: (input: string) => void) {
		this.submitHandler = fn;
		this.submitOnce = undefined;
	}

	setSubmitHandlerOnce(fn: (input: string) => void) {
		this.submitHandler = fn;
		this.submitOnce = fn;
	}

	runSubmitHandler() {
		const currHandler = this.submitHandler?.(this.getInputValue());
		// If setSubmitHandlerOnce or setSubmitHandler are called within the
		// current submit handler invocation above we will end up unsetting
		// them!
		//
		// To avoid this:
		// Store the reference to the original handler in currHandler then we
		// can use submitOnce to check:
		// (1) we are doing "submit once" logic
		// (2) the submit handler has not changed
		//
		if (this.submitOnce === currHandler) {
			this.submitHandler = undefined;
			this.submitOnce = undefined;
		}
	}

	resetSubmitHandler() {
		this.submitHandler = undefined;
	}
}
