import type { InputChangeEvent } from './lib.js';

// Internal event system for decoupled communication
export type InternalEvent = { type: 'input-change'; payload: InputChangeEvent };

export class InternalEventEmitter {
	private listeners = new Map<string, ((payload: InputChangeEvent) => void)[]>();

	emit(event: InternalEvent) {
		this.listeners.get(event.type)?.forEach((fn) => fn(event.payload));
	}

	on(type: 'input-change', handler: (payload: InputChangeEvent) => void): () => void {
		if (!this.listeners.has(type)) {
			this.listeners.set(type, []);
		}
		this.listeners.get(type)!.push(handler);

		return () => {
			const handlers = this.listeners.get(type)!;
			const index = handlers.indexOf(handler);
			if (index > -1) handlers.splice(index, 1);
		};
	}
}
