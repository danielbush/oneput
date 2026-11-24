import type { Controller } from '@oneput/oneput';
import {
  StandardLayout,
  type StandardLayoutIcons,
  type StandardLayoutParams
} from '@oneput/oneput/shared/ui/layout/StandardLayout.js';
import { standardLayout } from '@oneput/oneput/shared/declarative/standardLayout.js';
import { icons } from './icons.js';

/** StandardLayout slots (roles) mapped to this demo's icons. */
const layoutIcons: StandardLayoutIcons = {
  Close: icons.X,
  Accept: icons.Check,
  Reject: icons.X,
  Send: icons.ArrowUp,
  Back: icons.ArrowLeft,
  MenuToggle: icons.ChevronDown
};

/**
 * Host layout params (shared {@link StandardLayout} + demo icons).
 */
export type LayoutSettings = StandardLayoutParams;

/**
 * Demo host layout — {@link StandardLayout} with this app’s registered icons.
 */
export const Layout = {
  create: (ctl: Controller, params: LayoutSettings = {}) =>
    StandardLayout.create(ctl, params, layoutIcons)
};

/** The layouts that declarative views can name: StandardLayout with this app's icons. */
export const viewLayouts = { standard: standardLayout({ ...layoutIcons, Busy: icons.RefreshCw }) };
