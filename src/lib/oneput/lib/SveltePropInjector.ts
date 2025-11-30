import SubscribedProps from '../components/InjectedProps.svelte';
import { createSubscriber } from 'svelte/reactivity';
import { mount, type Component } from 'svelte';

export type SveltePropInjectorProps<P extends Record<string, unknown>> = {
	createProps: () => P;
	subscribe: ReturnType<typeof createSubscriber>;
	Child: Component<P>;
};

export class SveltePropInjector {
	static create(): SveltePropInjector {
		return new SveltePropInjector();
	}

	private subscribe: ReturnType<typeof createSubscriber>;
	public notify?: () => void;

	constructor() {
		this.subscribe = createSubscriber((update) => {
			this.notify = update;
		});
	}

	mount = <P extends Record<string, unknown>>(
		node: HTMLElement,
		Child: Component<P>,
		createProps: () => P
	) => {
		return mount(SubscribedProps as Component<SveltePropInjectorProps<P>>, {
			target: node,
			props: {
				createProps,
				subscribe: this.subscribe,
				Child
			}
		});
	};
}
