import { tinykeys } from 'tinykeys';
import type {
	FlexParams,
	InputChangeEvent,
	InputChangeListener,
	OneputControllerProps
} from './lib.js';
import { MenuController } from './MenuController.js';
import { InternalEventEmitter } from './InternalEventEmitter.js';

export type KeyBinding = {
	action: (c: Controller) => void;
	description: string;
	/**
	 * Bindings in tinykeys format eg "Control+D" .
	 * Each item in the array is a complete binding.
	 */
	bindings: string[];
};
export type KeyBindingMap = {
	[actionId: string]: KeyBinding;
};

/**
 * Key things you want to manage when Oneput goes from one mode to another...
 *
 * UI
 *
 * - setMenuUI - controls menu and menu header / footer
 * - setInputUI - set the ui around the input and placeholder
 * - setInnerUI - controls the ui between input and menu
 * - setOuterUI - controls ui on the open side of the input
 *
 * Key bindings
 *
 * - setBackBinding - controls the back action that you can set a keybinding for
 * - setKeys - controls global and local keybindings
 *
 * Events
 *
 * - onInputChange
 * - onMenuOpenChange
 *
 * Input Control
 */
export class Controller {
	private events = new InternalEventEmitter();
	public menu: MenuController;

	/**
	 * @param currentProps Should be reactive eg $state<OneputControllerProps>({...})
	 */
	constructor(
		private currentProps: OneputControllerProps,
		private defaultPlaceholder: string = 'Type here...',
		private unsubscribeGlobalKeys: () => void = () => {},
		private unsubscribeLocalKeys: () => void = () => {}
	) {
		this.currentProps.onInputChange = (evt) => {
			this.runInputChangeListeners(evt);
			// Emit internal event for decoupled communication
			this.events.emit({ type: 'input-change', payload: evt });
		};
		this.menu = MenuController.create(this.currentProps, this.events);
	}

	// #region menu

	setMenuUI(menuUI?: { header?: FlexParams; footer?: FlexParams }) {
		this.currentProps.menuUI = menuUI;
	}

	doAction() {
		if (this.menu.currentMenuItem) {
			if (this.menu.currentMenuItem.action) {
				this.menu.currentMenuItem.action(this);
			}
		}
	}

	// #endregion

	// #region input

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

	setInputUI(input?: {
		left?: FlexParams;
		right?: FlexParams;
		outerLeft?: FlexParams;
		outerRight?: FlexParams;
	}) {
		this.currentProps.inputUI = input;
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

	// #endregion

	// #region keys

	/**
	 * Only run globals when menu is closed.
	 */
	private handleGlobalKeys(keys: KeyBindingMap) {
		this.unsubscribeGlobalKeys();
		const adjustedBindings = Object.entries(keys).reduce<{
			[key: string]: (evt: KeyboardEvent) => void;
		}>((acc, [, { action, bindings }]) => {
			bindings.forEach((binding) => {
				acc[binding] = (evt) => {
					evt.preventDefault();
					if (this.keysDisabled) {
						return;
					}
					if (!this.menu.menuOpen) {
						// MENU_OPEN_CLOSE_RACE
						setTimeout(() => action(this));
					}
				};
			});
			return acc;
		}, {});
		const unsubscribe = tinykeys(window, adjustedBindings);
		this.unsubscribeGlobalKeys = unsubscribe;
	}

	/**
	 * Only run locals when menu is open.
	 */
	private handleLocalKeys(keys: KeyBindingMap) {
		this.unsubscribeLocalKeys();
		const adjustedBindings = Object.entries(keys).reduce<{
			[key: string]: (evt: KeyboardEvent) => void;
		}>((acc, [, { action, bindings }]) => {
			bindings.forEach((binding) => {
				acc[binding] = (evt) => {
					evt.preventDefault();
					if (this.keysDisabled) {
						return;
					}
					if (this.menu.menuOpen) {
						// MENU_OPEN_CLOSE_RACE
						setTimeout(() => action(this));
					}
				};
			});
			return acc;
		}, {});
		const unsubscribe = tinykeys(document.body, adjustedBindings);
		this.unsubscribeLocalKeys = unsubscribe;
	}

	private keysDisabled = false;

	disableKeys() {
		this.keysDisabled = true;
	}

	enableKeys() {
		this.keysDisabled = false;
	}

	setKeys(bindings: KeyBindingMap, isLocal: boolean = false) {
		if (isLocal) {
			this.handleLocalKeys(bindings);
		} else {
			this.handleGlobalKeys(bindings);
		}
	}

	/**
	 * This is intended for triggering a back action via keyboard.
	 */
	goBack: () => void = () => {};

	setBackBinding(back?: () => void) {
		this.goBack = back || (() => {});
	}

	// #endregion

	// #region ui

	setOuterUI(outer?: FlexParams) {
		this.currentProps.outerUI = outer;
	}

	setInnerUI(inner?: FlexParams) {
		this.currentProps.innerUI = inner;
	}

	// #endregion
}
