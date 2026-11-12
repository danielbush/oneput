import type { SafeHtml } from '@oneput/safe-html';
import type { FChildParams } from '../types.js';
import type { StdMenuItemParams } from '../shared/ui/menuItems/stdMenuItem.js';

// @ts-expect-error Raw strings do not have package-owned authority.
const child: FChildParams['htmlContent'] = '<b>raw</b>';
// @ts-expect-error The menu title has the same checked contract.
const title: StdMenuItemParams['htmlContent'] = '<b>raw</b>';
// @ts-expect-error The bottom content has the same checked contract.
const bottom: NonNullable<StdMenuItemParams['bottom']>['htmlContent'] = '<b>raw</b>';
// @ts-expect-error A structural object cannot create SafeHtml.
const forged: SafeHtml = {};
void [child, title, bottom, forged];
