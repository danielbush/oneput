import type { FlexParams, OneputControllerProps } from './lib.js';

export class UIController {
	static create(currentProps: OneputControllerProps) {
		return new UIController(currentProps);
	}

	constructor(private currentProps: OneputControllerProps) {
		//
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

	setOuterUI(outer?: FlexParams) {
		this.currentProps.outerUI = outer;
	}

	setInnerUI(inner?: FlexParams) {
		this.currentProps.innerUI = inner;
	}
}
