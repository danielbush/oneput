import type { Controller } from '$lib/oneput/controller.js';
import { DynamicPlaceholderBase } from '$lib/oneput/types.js';
import { DynamicText, type DynamicTextParams } from './DynamicText.js';

export class DynamicPlaceholder extends DynamicPlaceholderBase {
	static create(ctl: Controller, msg: (params: DynamicTextParams) => string) {
		const text = DynamicText.create(ctl);
		return new DynamicPlaceholder(ctl, text, msg);
	}
	constructor(
		private ctl: Controller,
		private text: DynamicText,
		private msg: (params: DynamicTextParams) => string
	) {
		super();
	}
	private unsubscribeMenuOpenChange?: () => void;
	private unsubscribeBindingsChange?: () => void;

	setPlaceholder(msg: (params: DynamicTextParams) => string) {
		this.msg = msg;
		this.ctl.input.setPlaceholder(this); // this should trigger enable(...)
	}

	enable(setPlaceholder: (msg?: string) => void) {
		setPlaceholder(this.text.text(this.msg));
		if (!this.unsubscribeMenuOpenChange) {
			this.unsubscribeMenuOpenChange = this.ctl.events.on('menu-open-change', () => {
				setPlaceholder(this.text.text(this.msg));
			});
		}
		if (!this.unsubscribeBindingsChange) {
			this.unsubscribeBindingsChange = this.ctl.events.on('bindings-change', () => {
				setPlaceholder(this.text.text(this.msg));
			});
		}
	}

	disable() {
		this.unsubscribeMenuOpenChange?.();
		this.unsubscribeMenuOpenChange = undefined;
		this.unsubscribeBindingsChange?.();
		this.unsubscribeBindingsChange = undefined;
	}
}
