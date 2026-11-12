import type { SafeHtml } from '@oneput/safe-html';
import type { FChildParams } from '../types.js';
import type { StdMenuItemParams } from '../shared/ui/menuItems/stdMenuItem.js';

// @ts-expect-error A string is not SafeHtml; only sanitiseHtml() makes one.
const child: FChildParams['htmlContent'] = '<b>raw</b>';
// @ts-expect-error stdMenuItem's htmlContent refuses a string too.
const title: StdMenuItemParams['htmlContent'] = '<b>raw</b>';
// @ts-expect-error stdMenuItem's bottom.htmlContent refuses a string too.
const bottom: NonNullable<StdMenuItemParams['bottom']>['htmlContent'] = '<b>raw</b>';
// @ts-expect-error A plain object is not SafeHtml.
const forged: SafeHtml = {};
void [child, title, bottom, forged];
