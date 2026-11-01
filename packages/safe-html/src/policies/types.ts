/**
 * A sanitizer policy, in the shape of the HTML Sanitizer API configuration.
 *
 * An allowlist policy names the elements and attributes to keep. A blocklist
 * policy names the elements to remove and keeps all other safe markup. Both
 * remove scripts, event handlers and `javascript:` URLs.
 */
export type SanitizerPolicy =
  | {
      elements: string[];
      attributes: string[];
      dataAttributes: boolean;
      comments: boolean;
    }
  | {
      /** Other attributes, `data-*` included, stay. */
      removeElements: string[];
      comments: boolean;
    };
