import type { Controller } from '@oneput/oneput';
import {
  StandardLayout,
  type StandardLayoutIcons,
  type StandardLayoutParams
} from '@oneput/oneput/shared/ui/layout/StandardLayout.js';
import { icons } from '@oneput/jsed';

/** StandardLayout slots (roles) mapped to jsed's icons. */
const layoutIcons: StandardLayoutIcons = {
  Close: icons.X,
  Accept: icons.Check,
  Reject: icons.X,
  Send: icons.SendHorizontal,
  Back: icons.ArrowLeft,
  MenuToggle: icons.ChevronDown
};

/**
 * Host layout params (shared {@link StandardLayout} + jsed icons).
 */
export type LayoutSettings = StandardLayoutParams;

/**
 * Demo host layout — {@link StandardLayout} with jsed’s registered icons.
 */
export const Layout = {
  create: (ctl: Controller, params: LayoutSettings = {}) =>
    StandardLayout.create(ctl, params, layoutIcons)
};
