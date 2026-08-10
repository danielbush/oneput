import type { Controller } from '@oneput/oneput';
import {
  StandardLayout,
  type StandardLayoutParams
} from '@oneput/oneput/shared/ui/layout/StandardLayout.js';
import { icons } from './_icons.js';

/**
 * Host layout params (shared {@link StandardLayout} + demo icons).
 */
export type LayoutSettings = StandardLayoutParams;

const layoutIcons = {
  X: icons.X,
  Check: icons.Check,
  SendHorizontal: icons.SendHorizontal,
  ArrowLeft: icons.ArrowLeft,
  ChevronDown: icons.ChevronDown
};

/**
 * Demo host layout — {@link StandardLayout} with this app’s registered icons.
 */
export const Layout = {
  create: (ctl: Controller, params: LayoutSettings = {}) =>
    StandardLayout.create(ctl, params, layoutIcons)
};
