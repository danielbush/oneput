import SubscribedProps from '../components/InjectedProps.svelte';
import { createSubscriber } from 'svelte/reactivity';
import { mount, type Component, type ComponentProps } from 'svelte';

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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	mount = <C extends Component<any>>(
		node: HTMLElement,
		Child: C,
		createProps: () => ComponentProps<C>
	) => {
		return mount(SubscribedProps as Component<SveltePropInjectorProps<ComponentProps<C>>>, {
			target: node,
			props: {
				createProps,
				subscribe: this.subscribe,
				Child
			}
		});
	};
}
