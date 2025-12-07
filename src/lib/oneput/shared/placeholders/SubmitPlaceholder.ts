import { DynamicPlaceholder } from '../../lib/lib.js';
import type { Controller } from '../../controller.js';

/**
 * A placeholder that lets you show the submit binding.
 */
export class SubmitPlaceholder extends DynamicPlaceholder {
	static create(ctl: Controller, msg: (submitBinding?: string) => string) {
		return new SubmitPlaceholder(ctl, msg);
	}

	constructor(
		private ctl: Controller,
		private msg: (submitBinding?: string) => string
	) {
		super();
	}

	private unsubscribe?: () => void;

	private getSubmitBinding() {
		const bindings = this.ctl.keys.getCurrentBindings(true);
		const binding = bindings['submit']?.bindings[0];
		return binding;
	}

	setPlaceholder(msg: (submitBinding?: string) => string) {
		this.msg = msg;
		this.ctl.input.setPlaceholder(this); // this should trigger enable(...)
	}

	enable(setPlaceholder: (submitBinding?: string) => void) {
		setPlaceholder(this.msg(this.getSubmitBinding()));

		// Only subscribe once.  disable() will be called by the controller
		// whenever a new setPlaceholder call is made.
		if (!this.unsubscribe) {
			this.unsubscribe = this.ctl.events.on('bindings-change', () => {
				// NOTE: we could allow submit whether menu is open (local=true)
				// or closed (local=false).
				setPlaceholder(this.msg(this.getSubmitBinding()));
			});
		}
	}

	disable() {
		this.unsubscribe?.();
		this.unsubscribe = undefined;
	}
}
