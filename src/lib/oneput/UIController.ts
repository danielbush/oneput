import type { DefaultUI, FlexParams, OneputProps } from './lib.js';

export class UIController {
	static create(currentProps: OneputProps) {
		return new UIController(currentProps);
	}

	private fallbackPlaceholder: string = 'Type here...';

	constructor(private currentProps: OneputProps) {
		this.currentProps.placeholder = this.fallbackPlaceholder;
	}

	setMenuUI(menuUI?: { header?: FlexParams; footer?: FlexParams }) {
		this.currentProps.menuUI = menuUI;
	}

	setInputUI(
		input?: OneputProps['inputUI'] | ((current: OneputProps['inputUI']) => OneputProps['inputUI'])
	) {
		this.currentProps.inputUI =
			typeof input === 'function' ? input(this.currentProps.inputUI) : input;
	}

	setPlaceholder(msg?: string) {
		this.currentProps.placeholder = msg || this.defaultUI?.placeholder || this.fallbackPlaceholder;
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
	resetUI() {
		this.currentProps.inputUI = this.defaultUI?.inputUI;
		this.currentProps.menuUI = this.defaultUI?.menuUI;
		this.currentProps.innerUI = this.defaultUI?.innerUI;
		this.currentProps.outerUI = this.defaultUI?.outerUI;
		this.currentProps.placeholder = this.defaultUI?.placeholder || this.fallbackPlaceholder;
	}

	private defaultUI?: DefaultUI;

	setDefaultUI(defaultUI?: DefaultUI) {
		this.defaultUI = defaultUI;
	}

	getDefaultUI<D extends DefaultUI = DefaultUI>(): D | undefined {
		// We'll assume you know what subtype of DefaultUI you are using.
		return this.defaultUI as D;
	}

	runDefaultUI<T extends Record<string, unknown>>(values?: T) {
		if (this.defaultUI && values) {
			this.defaultUI.runUI?.(values);
		}
		// TODO: runUI is partially running the ui but then relying on reset here:
		this.resetUI();
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

	injectUI(ui?: OneputProps['injectUI']) {
		this.currentProps.injectUI = ui;
	}
}
