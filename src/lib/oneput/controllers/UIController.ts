import type { Controller } from './controller.js';
import type { UILayout, FlexParams, OneputProps, UIFlags } from '../types.js';

export class UIController {
	static create(ctl: Controller) {
		return new UIController(ctl);
	}

	constructor(private ctl: Controller) {}

	setMenuUI(menuUI?: { header?: FlexParams; footer?: FlexParams }) {
		this.ctl.currentProps.menuUI = menuUI;
	}

	setInputUI(
		input?: OneputProps['inputUI'] | ((current: OneputProps['inputUI']) => OneputProps['inputUI'])
	) {
		this.ctl.currentProps.inputUI =
			typeof input === 'function' ? input(this.ctl.currentProps.inputUI) : input;
	}

	setOuterUI(outer?: FlexParams) {
		this.ctl.currentProps.outerUI = outer;
	}

	setInnerUI(inner?: FlexParams) {
		this.ctl.currentProps.innerUI = inner;
	}

	private layout?: UILayout;

	setLayout(layout: UILayout) {
		this.layout = layout;
	}

	getLayout<D extends UILayout = UILayout>(): D | undefined {
		return this.layout as D;
	}

	/**
	 * Should perform similar reset to beforeRun logic in AppController.
	 */
	update<A extends Record<string, unknown> = Record<string, unknown>>(settings: {
		/**
		 * Does a full reset, similar to what happens in ctl.app.run(appObject)
		 * which resets state before running appObject.
		 *
		 * Defaults to false. Set it to true when running multiple uis within an
		 * appObject.
		 *
		 */
		reset?: boolean;
		/**
		 * Sets ui flags; if `reset` is not set, only these flags will change.
		 */
		flags?: UIFlags;
		/**
		 * Your LayoutSettings parameters..
		 */
		params?: A;
	}) {
		if (settings.reset) {
			this.ctl.app.reset(settings.flags);
		} else {
			this.ctl.app.applyFlags(settings.flags);
		}
		this.layout?.configure({ params: settings.params });
		this.ctl.currentProps.inputUI = this.layout?.inputUI;
		this.ctl.currentProps.menuUI = this.layout?.menuUI;
		this.ctl.currentProps.innerUI = this.layout?.innerUI;
		this.ctl.currentProps.outerUI = this.layout?.outerUI;
	}

	/**
	 * Activates the replaceMenuUI mechanism in the Oneput component.
	 *
	 * This will replace the menu.
	 * To restore ui, just call again with no argument.
	 * It's up to the caller to decide everything else.
	 */
	replaceMenuUI(ui?: OneputProps['replaceMenuUI']) {
		this.ctl.currentProps.replaceMenuUI = ui;
	}

	injectUI(ui?: OneputProps['injectUI']) {
		this.ctl.currentProps.injectUI = ui;
	}
}
