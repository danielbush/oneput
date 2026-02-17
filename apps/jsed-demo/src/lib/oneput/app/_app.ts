import { Layout } from '$lib/oneput/app/_layout.js';
import { type Controller } from '@oneput/oneput';
import { Root } from './root.js';

export const setController = (ctl: Controller) => {
  ctl.ui.setLayout(Layout.create(ctl));
  ctl.app.run(Root.create(ctl));
};
