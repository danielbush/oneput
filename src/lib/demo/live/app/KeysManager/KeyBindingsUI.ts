import type { Controller } from '$lib/oneput/controller.js';
import { type KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import { keyboardIcon, xIcon } from '$lib/oneput/shared/icons.js';
import { stdMenuItem } from '$lib/oneput/shared/stdMenuItem.js';
import type { MenuItem } from '../../../../oneput/lib.js';
import { startKeyCapture } from './keyCapture.js';

export type KeybindingMenuItem = {
	id: string;
	text: string;
	/**
	 * To display to the user.
	 */
	bindings: string[];
	action: () => void;
};

export type UIChangeParams = {
	/**
	 * If not specified, then use a main title provided by the parent.
	 */
	title?: string;
	/**
	 * If not specified, parent should use its back action which will exit this plugin.
	 */
	back?: () => void;
	captureAction?: {
		accept: (evt: Event) => void;
		reject: (evt: Event) => void;
	};
};

/**
 * Let's you add / remove bindings to actions in keyMap via the Oneput interface.
 *
 * It controls inputValue and placeholder.
 *
 * This is written to be re-usable.  It calls onUIChange to tell the parent ui
 * what to update in the ui and sticks to only changing the input.  It doesn't
 * have to be done this way we could just have one ui object that knows about
 * whatever our default ui is; this is just exploring how reusable a ui object can be.
 *
 * The assumption is that keyMap is stored somewhere by the consumer.
 */
export class KeyBindingsUI {
	static create(params: {
		controller: Controller;
		onChange: (keyMap: KeyBindingMap) => Promise<void>;
		onUIChange: (ui: UIChangeParams) => void;
		keybindingMenuItem: (params: KeybindingMenuItem) => MenuItem;
	}) {
		return new KeyBindingsUI(params);
	}

	private ctl: Controller;
	private onChange: (keyMap: KeyBindingMap) => Promise<void>;
	private onUIChange: (ui: UIChangeParams) => void;
	private keyBindingMap: KeyBindingMap = {};
	private keybindingMenuItem: (params: KeybindingMenuItem) => MenuItem;

	private constructor(params: {
		controller: Controller;
		onChange: (keyMap: KeyBindingMap) => Promise<void>;
		onUIChange: (ui: UIChangeParams) => void;
		keybindingMenuItem: (params: KeybindingMenuItem) => MenuItem;
	}) {
		this.ctl = params.controller;
		this.onChange = params.onChange;
		this.onUIChange = params.onUIChange;
		this.keybindingMenuItem = params.keybindingMenuItem;
	}

	runUI(keyMap: KeyBindingMap) {
		this.keyBindingMap = keyMap;
		this.actionsUI();
	}

	/**
	 * UI for selecting an action from a list of actions in order to edit its bindings.
	 */
	private actionsUI = () => {
		this.onUIChange({});
		this.ctl.menu.setMenuItems(
			Object.entries(this.keyBindingMap).map(([id, { description, bindings }]) =>
				this.keybindingMenuItem({
					id,
					text: description,
					bindings,
					action: () => {
						this.ctl.runInlineUI({ runUI: () => this.actionUI(id) });
					}
				})
			)
		);
	};

	/**
	 * UI displays bindings for a given action and lets you add/remove bindings.
	 */
	private actionUI = (actionId: string) => {
		const { description, bindings } = this.keyBindingMap[actionId];
		this.onUIChange({ title: `Key bindings for "${description}"`, back: this.actionsUI });
		// TODO: should placeholder be handled by onUIChange?
		// TOOD: or move placeholder into .input and keep it here; convention: input is controlled ?
		this.ctl.input.setPlaceholder();
		this.ctl.input.setInputValue('');
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'add-binding',
				textContent: 'Add binding...',
				action: () => {
					this.ctl.runInlineUI({ runUI: () => this.captureBindingUI(actionId) });
				}
			}),
			...bindings.map((binding) => {
				return stdMenuItem({
					id: binding,
					textContent: binding,
					left: (b) => [b.icon({ innerHTMLUnsafe: keyboardIcon })],
					right: (b) => [b.icon({ innerHTMLUnsafe: xIcon })],
					action: () => {
						this.removeBinding(actionId, binding);
					}
				});
			})
		]);
	};

	/**
	 * Triggered by actionUI when a new binding is being created for a given action.
	 */
	private captureBindingUI(actionId: string) {
		const oldKeyBindingMap = this.keyBindingMap;
		const { accept, reject } = startKeyCapture(
			this.ctl,
			actionId,
			this.keyBindingMap,
			(newKeyBindingMap) => {
				// Optimistic update...
				this.keyBindingMap = newKeyBindingMap;
				return this.onChange(newKeyBindingMap).catch(() => {
					this.keyBindingMap = oldKeyBindingMap;
				});
			}
		);
		this.onUIChange({ captureAction: { accept, reject } });
		this.ctl.input.setPlaceholder('Type the keys...');
	}

	private removeBinding = async (actionId: string, binding: string) => {
		const confirm = this.ctl.confirm({ message: 'Remove binding?' });
		const yes = await confirm.userChooses();
		if (!yes) {
			return;
		}
		const oldBindings = this.keyBindingMap;
		const newBindings = {
			...oldBindings,
			[actionId]: {
				...this.keyBindingMap[actionId],
				bindings: this.keyBindingMap[actionId].bindings.filter((b) => b !== binding)
			}
		};
		// Optimistic update
		this.keyBindingMap = newBindings;
		this.onChange?.(this.keyBindingMap).catch(() => {
			// Revert optimistic update...
			this.keyBindingMap = oldBindings;
		});
		this.actionUI(actionId);
	};
}
