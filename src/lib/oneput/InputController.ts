import type { InputChangeEvent, InputChangeListener } from './lib.js';
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

	public defaultPlaceHolder: string = 'Type here...';
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

	setPlaceholder(msg?: string) {
		this.ctl.currentProps.placeholder =
			msg || this.ctl.ui.getDefaultUI()?.placeholder || this.defaultPlaceHolder;
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
