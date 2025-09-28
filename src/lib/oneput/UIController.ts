import type { FlexParams, OneputProps } from './lib.js';

export interface DefaultUI<V extends Record<string, unknown> = Record<string, unknown>> {
	setValues?(values: V): void;
	input?: OneputProps['inputUI'];
	menu?: OneputProps['menuUI'];
	inner?: OneputProps['innerUI'];
	outer?: OneputProps['outerUI'];
}

export class UIController {
	static create(currentProps: OneputProps) {
		return new UIController(currentProps);
	}

	constructor(
		private currentProps: OneputProps,
		private defaultPlaceholder: string = 'Type here...'
	) {
		this.currentProps.placeholder = this.defaultPlaceholder;
	}

	setMenuUI(menuUI?: { header?: FlexParams; footer?: FlexParams }) {
		this.currentProps.menuUI = menuUI;
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

	setOuterUI(outer?: FlexParams) {
		this.currentProps.outerUI = outer;
	}

	setInnerUI(inner?: FlexParams) {
		this.currentProps.innerUI = inner;
	}

	/**
	 * Reverts the different ui areas in Oneput back to defaults.
	 *
	 * If setDefaultUI has not been called, the ui will be set to nothing.
	 */
	clearUI() {
		this.currentProps.inputUI = this.defaultUI?.input;
		this.currentProps.menuUI = this.defaultUI?.menu;
		this.currentProps.innerUI = this.defaultUI?.inner;
		this.currentProps.outerUI = this.defaultUI?.outer;
	}

	private defaultUI?: DefaultUI;

	setDefaultUI(defaultUI?: DefaultUI) {
		this.defaultUI = defaultUI;
	}

	configureDefaultUI<T extends Record<string, unknown>>(values?: T) {
		if (this.defaultUI && values) {
			this.defaultUI.setValues?.(values);
		}
		this.clearUI();
	}

	/**
	 * Activates the replaceUI mechanism in the Oneput component.
	 *
	 * This will replace the menu.
	 * To restore ui, just call again with no argument.
	 * It's up to the caller to decide everything else.
	 */
	replaceUI(ui?: OneputProps['replaceUI']) {
		this.currentProps.replaceUI = ui;
	}
}
