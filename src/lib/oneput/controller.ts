import type { FlexParams, OneputControllerProps } from './lib.js';
import { MenuController } from './MenuController.js';
import { InternalEventEmitter } from './InternalEventEmitter.js';
import { InputController } from './InputController.js';
import { KeysController } from './KeysController.js';

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
	public input: InputController;
	public keys: KeysController;

	/**
	 * @param currentProps Should be reactive eg $state<OneputControllerProps>({...})
	 */
	constructor(private currentProps: OneputControllerProps) {
		this.menu = MenuController.create(this.currentProps, this.events);
		this.input = InputController.create(this.currentProps, this.events);
		this.keys = KeysController.create(this.events, this);
	}

	// #region menu

	setMenuUI(menuUI?: { header?: FlexParams; footer?: FlexParams }) {
		this.currentProps.menuUI = menuUI;
	}

	// #endregion

	/**
	 * This is intended for triggering a back action via keyboard.
	 */
	goBack: () => void = () => {};

	setBackBinding(back?: () => void) {
		this.goBack = back || (() => {});
	}

	doAction() {
		if (this.menu.currentMenuItem) {
			if (this.menu.currentMenuItem.action) {
				this.menu.currentMenuItem.action(this);
			}
		}
	}

	// #region input

	setInputUI(input?: {
		left?: FlexParams;
		right?: FlexParams;
		outerLeft?: FlexParams;
		outerRight?: FlexParams;
	}) {
		this.currentProps.inputUI = input;
	}

	// #endregion

	// #region keys

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
