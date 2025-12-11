import type { Controller } from './controller.js';
import type { UILayout, FlexParams, OneputProps, UILayoutSettings } from './lib/lib.js';

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

	update<A extends Record<string, unknown> = Record<never, never>>(
		settings: UILayoutSettings,
		additional?: A
	) {
		this.ctl.app.enableGoBack(settings.enableGoBack ?? true);
		this.ctl.menu.enableMenuOpenClose(settings.enableMenuOpenClose ?? true);
		this.layout?.configure(
			{
				...settings,
				enableGoBack: settings.enableGoBack ?? true,
				enableMenuOpenClose: settings.enableMenuOpenClose ?? true
			},
			additional
		);
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
