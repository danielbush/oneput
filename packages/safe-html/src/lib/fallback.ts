import DOMPurify from "dompurify";

let fallbackWorks: boolean | undefined;
/**
 * Returns `true` when DOMPurify works in this environment, so that it can be used
 * where the browser has no native `setHTML`.
 *
 * It cleans a fixed test string (with `onclick` attributes and a `script` tag)
 * and checks that they are removed. Some DOMs, such as happy-dom, fail this. The
 * result is computed once and then reused.
 */
export function canUseFallback(): boolean {
  if (!DOMPurify.isSupported) return false;
  fallbackWorks ??=
    DOMPurify.sanitize(
      '<i onclick="x()">a</i><b onclick="x()">b</b><script></script>',
      { ALLOWED_TAGS: ["i", "b"], ALLOWED_ATTR: [] },
    ) === "<i>a</i><b>b</b>";
  return fallbackWorks;
}
