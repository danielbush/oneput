import type { InputChangeEvent as InputChangeEventLib } from './lib/lib.js';

// Internal event system for decoupled communication
export type InternalEvent = InputChangeEvent;

export type InputChangeEvent = { type: 'input-change'; payload: InputChangeEventLib };

export class InternalEventEmitter {
	private listeners = new Map<string, ((payload: unknown) => void)[]>();

	emit(event: InternalEvent) {
		this.listeners.get(event.type)?.forEach((fn) => fn(event.payload));
	}

	on<T extends InternalEvent>(
		type: T['type'],
		handler: (payload: T['payload']) => void
	): () => void {
		if (!this.listeners.has(type)) {
			this.listeners.set(type, []);
		}
		this.listeners.get(type)!.push(handler as (payload: unknown) => void);

		return () => {
			const handlers = this.listeners.get(type)!;
			const index = handlers.indexOf(handler as (payload: unknown) => void);
			if (index > -1) handlers.splice(index, 1);
		};
	}
}
