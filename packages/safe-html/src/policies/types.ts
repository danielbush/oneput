/**
 * What `setHTML(element, html, "document")` removes from a whole document.
 *
 * - `removeElements`: tags that are removed with their content.
 * - `comments`: `true` keeps HTML comments.
 *
 * It is not used for `SafeHtml`. `sanitiseHtml` uses the `"display"` and `"ui"`
 * policies in `lib/policies.ts`.
 */
export type DocumentPolicy = Readonly<{
  removeElements: readonly string[];
  comments: boolean;
}>;
