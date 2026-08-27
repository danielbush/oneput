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

/**
 * Demo host layout — {@link StandardLayout} with this app’s registered icons.
 */
export const Layout = {
  create: (ctl: Controller, params: LayoutSettings = {}) =>
    StandardLayout.create(ctl, params, icons)
};
