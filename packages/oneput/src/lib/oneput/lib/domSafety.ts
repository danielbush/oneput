/**
 * One write policy for executable UI builders. Check before Svelte writes so
 * the same rules apply to server output, mounting, updates, and removals.
 * Callbacks and attachments remain code APIs. They are not a data boundary.
 */
import { isSafeHtml, safeHtmlMarkup, type SafeHtml } from '@oneput/safe-html';
import { checkElement } from './domSafety/checkElement.js';
import type { ElementDescription } from './domSafety/types.js';

export { checkElement } from './domSafety/checkElement.js';
export type { AttributeValue, ElementDescription } from './domSafety/types.js';

/** Warning output is separate from refusal. Production refuses the same input. */
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
export function checkedElement(params: ElementDescription) {
  const result = checkElement(params);
  warnings.report(result.refused);
  return result;
}

/** Svelte attachments use symbol keys. String keys must not bypass attributes. */
export function checkedAttachments(attachments?: Record<symbol, (element: HTMLElement) => void>) {
  const result: Record<symbol, (element: HTMLElement) => void> = {};
  for (const key of Object.getOwnPropertySymbols(attachments ?? {})) {
    const attachment = attachments?.[key];
    if (typeof attachment === 'function') result[key] = attachment;
  }
  return result;
}

/** The only rich-content reader used by the renderer, in a fixed div context. */
export function checkedRichContent(value: SafeHtml | null): string {
  if (value !== null && !isSafeHtml(value)) warnings.report(['content:SafeHtml']);
  return safeHtmlMarkup(value, 'div');
}
