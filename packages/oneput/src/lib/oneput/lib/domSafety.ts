/**
 * Checks what Oneput's builders (FChild and Flex) write to the
 * page. The components call these functions before Svelte writes an element, so
 * the same rules apply on the server, on mount and on every update.
 *
 * These checks do not make builder params safe to take from untrusted data.
 * Event handler functions and attachments are code, and they run as given.
 */
import { isSafeHtml, safeHtmlMarkup, type SafeHtml } from '@oneput/safe-html';
import { checkElement } from './domSafety/checkElement.js';
import type { ElementDescription } from './domSafety/types.js';

export { checkElement } from './domSafety/checkElement.js';
export type { AttributeValue, ElementDescription } from './domSafety/types.js';

/**
 * Tells the developer when Oneput has removed something unsafe from an element
 * (an attribute, URL, style or tag) before writing it to the page.
 *
 * - `create()`: in development, writes "Oneput refused <rule>" to the console.
 *   In production, it says nothing.
 * - `createNull()`: writes nothing, and keeps the messages so that a test can
 *   read them.
 *
 * It only reports. `checkElement` removes the unsafe parts, in production too.
 */
export class DomWriteWarnings {
  static create() {
    return new DomWriteWarnings(
      (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true,
      (message) => console.warn(message)
    );
  }
  static createNull(development = true) {
    return new DomWriteWarnings(development);
  }
  private messages: string[] = [];
  constructor(
    private development: boolean,
    private output?: (message: string) => void
  ) {}
  report(refused: string[]) {
    if (!this.development) return;
    for (const rule of refused) {
      const message = `Oneput refused ${rule}`;
      if (!this.output) this.messages.push(message);
      this.output?.(message);
    }
  }
  trackWarnings() {
    return { data: this.messages };
  }
}

const warnings = DomWriteWarnings.create();
/** Runs `checkElement` and warns in development about what it removed. */
export function checkedElement(params: ElementDescription) {
  const result = checkElement(params);
  warnings.report(result.refused);
  return result;
}

/**
 * Returns only the symbol-keyed functions in `attachments`, for Flex to spread
 * onto its element. Svelte attachments use symbol keys. A string key such as
 * `onclick` or `href` is dropped, so it cannot skip the attribute checks.
 */
export function checkedAttachments(attachments?: Record<symbol, (element: HTMLElement) => void>) {
  const result: Record<symbol, (element: HTMLElement) => void> = {};
  for (const key of Object.getOwnPropertySymbols(attachments ?? {})) {
    const attachment = attachments?.[key];
    if (typeof attachment === 'function') result[key] = attachment;
  }
  return result;
}

/**
 * Returns the cleaned HTML of a `SafeHtml` for FChild's `{@html}`, which is
 * inside a `div`. FChild reads `htmlContent` only through this function.
 *
 * A value that `sanitiseHtml` did not make gives "Content unavailable", and a
 * warning in development. `null` gives "Content unavailable" with no warning.
 */
export function checkedRichContent(value: SafeHtml | null): string {
  if (value !== null && !isSafeHtml(value)) warnings.report(['content:SafeHtml']);
  return safeHtmlMarkup(value, 'div');
}
