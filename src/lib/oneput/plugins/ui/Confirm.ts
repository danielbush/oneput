import type { Controller } from '$lib/oneput/controller.js';

export class Confirm {
	static create(
		controller: Controller,
		{ additional, message }: { additional?: string; message: string }
	) {
		return new Confirm(controller, { additional, message });
	}

	constructor(
		private controller: Controller,
		private params: { additional?: string; message: string }
	) {}

	run(): Promise<boolean> {
		return Promise.resolve(true);
	}
}
