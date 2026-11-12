import DOMPurify from "dompurify";

let fallbackWorks: boolean | undefined;
/** Check the DOM walker with a fixed policy, independent of caller policy. */
export function canUseFallback(): boolean {
  if (!DOMPurify.isSupported) return false;
  fallbackWorks ??=
    DOMPurify.sanitize(
      '<i onclick="x()">a</i><b onclick="x()">b</b><script></script>',
      { ALLOWED_TAGS: ["i", "b"], ALLOWED_ATTR: [] },
    ) === "<i>a</i><b>b</b>";
  return fallbackWorks;
}
