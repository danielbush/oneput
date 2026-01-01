import type { Controller } from './controller.js';
import type { UILayout, FlexParams, OneputProps, UILayoutSettings } from './types.js';

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

	private calcLayoutFlags(settings: Omit<UILayoutSettings, 'menuTitle'>) {
		const enableModal = settings.enableModal ?? false;
		const flags: UILayoutSettings = {
			enableGoBack: settings.enableGoBack ?? !enableModal,
			enableMenuOpenClose: settings.enableMenuOpenClose ?? !enableModal,
			enableKeys: settings.enableKeys ?? !enableModal,
			enableMenuActions: settings.enableMenuActions ?? !enableModal,
			enableMenuItemsFn: settings.enableMenuItemsFn ?? !enableModal,
			enableInputElement: settings.enableInputElement ?? !enableModal
		};
		return flags;
	}

	/**
	 * Should perform similar reset to beforeRun logic in AppController.
	 */
	update<A extends Record<string, unknown> = Record<never, never>>(
		settings?: UILayoutSettings,
		additional?: A
	) {
		// Reset environment
		const flags: UILayoutSettings = this.calcLayoutFlags(settings ?? {});
		this.ctl.app._enableGoBack(flags.enableGoBack);
		this.ctl.menu._enableMenuOpenClose(flags.enableMenuOpenClose);
		this.ctl.keys._enableKeys(flags.enableKeys);
		this.ctl.menu._enableMenuActions(flags.enableMenuActions);
		this.ctl.menu._enableMenuItemsFn(flags.enableMenuItemsFn);
		this.ctl.input._enableInputElement(flags.enableInputElement);

		// Layout
		if (settings?.menuTitle) {
			flags['menuTitle'] = settings.menuTitle;
		}
		this.layout?.configure(flags, additional);
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
