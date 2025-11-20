import type { Controller } from './controller.js';

export type KeyBinding = {
	action: (c: Controller) => void;
	description: string;
	/**
	 * A list of bindings in tinykeys format.  Each binding represents one ore more key presses.
	 *
	 * Each binding is a string eg "control+y e e t".  The spaces separate keys,
	 * the pluses separate modifiers.
	 */
	bindings: string[];
};

export type KeyBindingSerializable = {
	description: string;
	bindings: string[];
	/**
	 * If action is passed an its is js it will cause an exception in some stores.
	 */
	action?: never;
};

export type KeyBindingMap = {
	[actionId: string]: KeyBinding;
};
export type KeyBindingMapSerializable = {
	[actionId: string]: KeyBindingSerializable;
};
